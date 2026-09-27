import 'server-only';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { writeAudit } from '@/lib/audit';
import { now } from '@/lib/clock';
import { isCardPaymentEnabled } from '@/lib/rollout';
import { confirmPaymentTx } from './service';

/**
 * Card, Apple/Google Pay and US bank (ACH) payments through Stripe Checkout.
 *
 * Stripe hosts the payment page, so card numbers never reach TSA's server
 * (PCI SAQ-A). The amount is always decided here, on the server, and a payment
 * only counts once Stripe's signed webhook says so — never because the
 * browser came back to a "success" page.
 *
 * Everything here refuses to run unless isCardPaymentEnabled().
 */

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!isCardPaymentEnabled()) throw new Error('Card payments are not enabled.');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!);
  return client;
}

export async function createCheckout(input: {
  memberId: string;
  memberName: string;
  amountCents: number;
  preference: 'AUTO' | 'ADVANCE';
  reportedByUserId: string | null;
  source: 'portal' | 'paylink';
  returnUrl: string;
}): Promise<string> {
  const paidOn = await now();
  const payment = await db.payment.create({
    data: {
      memberId: input.memberId,
      method: 'CARD',
      status: 'REPORTED',
      amountCents: input.amountCents,
      paidOn,
      preference: input.preference,
      reportedByUserId: input.reportedByUserId,
      source: input.source,
      memo: 'Stripe Checkout',
    },
  });
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    // Cards include Apple Pay and Google Pay. Bank debit settles in ~4 days.
    payment_method_types: ['card', 'us_bank_account'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: input.amountCents,
          product_data: { name: `TSA — ${input.memberName}` },
        },
      },
    ],
    metadata: { paymentId: payment.id, memberId: input.memberId },
    payment_intent_data: { metadata: { paymentId: payment.id, memberId: input.memberId } },
    success_url: `${input.returnUrl}?paid=1`,
    cancel_url: input.returnUrl,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

/** Verify a webhook against the raw body. Throws on a bad signature. */
export function verifyEvent(rawBody: string, signature: string | null): Stripe.Event {
  if (!signature) throw new Error('Missing Stripe-Signature header');
  return stripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
}

async function feeFor(paymentIntentId: string): Promise<number | null> {
  try {
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    });
    const charge = pi.latest_charge as Stripe.Charge | null;
    const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
    return bt?.fee ?? null;
  } catch {
    return null;
  }
}

async function confirmFromStripe(paymentId: string, paymentIntentId: string) {
  const fee = await feeFor(paymentIntentId);
  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: paymentId },
      data: { providerRef: `stripe:${paymentIntentId}`, feeCents: fee },
    });
    const { payment } = await confirmPaymentTx(tx, paymentId, null);
    await writeAudit({
      tx,
      action: 'PAYMENT_CONFIRMED',
      entityType: 'Payment',
      entityId: payment.id,
      onBehalfOfMemberId: payment.memberId,
      summary: `Card payment confirmed by Stripe (${paymentIntentId})`,
      actor: { label: 'stripe-webhook', role: 'SYSTEM' },
    });
  });
}

/**
 * Handle one verified event. Idempotent: Stripe retries, and confirming an
 * already-confirmed payment posts nothing.
 */
export async function handleEvent(event: Stripe.Event): Promise<void> {
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
    if (!paymentId || !pi) return;

    if (event.type === 'checkout.session.async_payment_failed') {
      await db.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED', providerRef: `stripe:${pi}`, rejectedReason: 'Bank payment failed' },
      });
      return;
    }
    // A bank debit completes the session "unpaid" and settles days later.
    if (session.payment_status !== 'paid') {
      await db.payment.update({ where: { id: paymentId }, data: { providerRef: `stripe:${pi}` } });
      return;
    }
    await confirmFromStripe(paymentId, pi);
  }
}
