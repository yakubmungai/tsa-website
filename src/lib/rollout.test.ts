import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('isCardPaymentEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off by default', async () => {
    vi.stubEnv('STRIPE_ENABLED', '');
    const { isCardPaymentEnabled } = await import('./rollout');
    expect(isCardPaymentEnabled()).toBe(false);
  });

  it('stays off with the flag but no keys, or keys but no flag', async () => {
    const { isCardPaymentEnabled } = await import('./rollout');
    vi.stubEnv('STRIPE_ENABLED', 'true');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    expect(isCardPaymentEnabled()).toBe(false);
    vi.stubEnv('STRIPE_ENABLED', 'false');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x');
    expect(isCardPaymentEnabled()).toBe(false);
  });

  it('is on only with the flag and both keys', async () => {
    const { isCardPaymentEnabled } = await import('./rollout');
    vi.stubEnv('STRIPE_ENABLED', 'true');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x');
    expect(isCardPaymentEnabled()).toBe(true);
  });
});
