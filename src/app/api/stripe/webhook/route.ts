import { isCardPaymentEnabled } from '@/lib/rollout';

/**
 * Stripe webhook. Registered in the Stripe dashboard as
 * https://<site>/api/stripe/webhook.
 *
 * Not found at all until card payments are switched on, so the endpoint does
 * not exist on a site with no Stripe account.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isCardPaymentEnabled()) return new Response(null, { status: 404 });

  // Loaded only when enabled, so the Stripe SDK is never touched otherwise.
  const { handleEvent, verifyEvent } = await import('@/features/payments/stripe');

  // The signature is over the exact bytes Stripe sent: read the raw text.
  const body = await request.text();
  let event;
  try {
    event = verifyEvent(body, request.headers.get('stripe-signature'));
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error('[stripe] webhook handling failed', event.type, err);
    // 500 makes Stripe retry; handling is idempotent.
    return new Response('Handler error', { status: 500 });
  }
  return Response.json({ received: true });
}
