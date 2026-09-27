import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ db: {} }));
vi.mock('@/lib/audit', () => ({ writeAudit: vi.fn() }));
vi.mock('@/lib/clock', () => ({ now: async () => new Date() }));
vi.mock('@/lib/rollout', () => ({
  isCardPaymentEnabled: () => process.env.STRIPE_ENABLED === 'true',
}));
vi.mock('./service', () => ({ confirmPaymentTx: vi.fn() }));

const SECRET = 'whsec_test_secret';

describe('Stripe webhook signature', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_ENABLED', 'true');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_dummy');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  const payload = JSON.stringify({ id: 'evt_1', object: 'event', type: 'ping', data: { object: {} } });

  it('accepts an event signed with the webhook secret', async () => {
    const { verifyEvent } = await import('./stripe');
    const header = new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(verifyEvent(payload, header).id).toBe('evt_1');
  });

  it('rejects a forged or altered event', async () => {
    const { verifyEvent } = await import('./stripe');
    const forged = new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({ payload, secret: 'whsec_wrong' });
    expect(() => verifyEvent(payload, forged)).toThrow();
    const header = new Stripe('sk_test_dummy').webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(() => verifyEvent(payload.replace('evt_1', 'evt_2'), header)).toThrow();
    expect(() => verifyEvent(payload, null)).toThrow();
  });

  it('refuses to run at all while card payments are off', async () => {
    vi.stubEnv('STRIPE_ENABLED', 'false');
    const { stripe } = await import('./stripe');
    expect(() => stripe()).toThrow(/not enabled/);
  });
});
