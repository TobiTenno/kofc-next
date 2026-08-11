import { getCanonicalAppOrigin } from '@/lib/app-origin';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';

const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000;

type PaypalTokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: PaypalTokenCache | null = null;

export type PaypalSubscriptionStatus =
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PaypalSubscriptionDetails = {
  id: string;
  status: PaypalSubscriptionStatus;
  plan_id?: string;
  custom_id?: string;
  subscriber?: {
    email_address?: string;
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { value?: string; currency_code?: string };
      time?: string;
    };
  };
};

export const isPaypalRestConfigured = (): boolean => {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(clientId && clientSecret);
};

export const getPaypalMode = (): 'sandbox' | 'live' => {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();
  return mode === 'live' ? 'live' : 'sandbox';
};

export const getPaypalApiBase = (): string =>
  getPaypalMode() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const getPaypalSubSyncIntervalMs = (): number => {
  const raw = process.env.PAYPAL_SUB_SYNC_INTERVAL_MS?.trim();
  if (!raw) {
    return DEFAULT_SYNC_INTERVAL_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 60_000
    ? parsed
    : DEFAULT_SYNC_INTERVAL_MS;
};

export const getPaypalPlanIdForClass = (memberClass: string): string | null => {
  const plans = loadCouncilConfig().dues?.paypalPlans;
  const planId = plans?.[memberClass]?.trim();
  return planId || null;
};

export const hasPaypalPlansConfigured = (): boolean => {
  const plans = loadCouncilConfig().dues?.paypalPlans;
  if (!plans) {
    return false;
  }
  return Object.values(plans).some((id) => Boolean(id?.trim()));
};

export const isPaypalSubscriptionsReady = (): boolean =>
  isPaypalRestConfigured() && hasPaypalPlansConfigured();

const getBasicAuthHeader = (): string => {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('PayPal REST credentials are not configured');
  }
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
};

export const getPaypalAccessToken = async (): Promise<string> => {
  if (tokenCache && tokenCache.expiresAtMs > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const response = await fetch(`${getPaypalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicAuthHeader()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error('PayPal OAuth response missing access_token');
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + (payload.expires_in ?? 300) * 1000,
  };

  return payload.access_token;
};

const paypalFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = await getPaypalAccessToken();
  const response = await fetch(`${getPaypalApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayPal API ${path} failed (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const ensurePaypalProduct = async (
  existingProductId: string | undefined,
): Promise<string> => {
  if (existingProductId) {
    return existingProductId;
  }

  const product = await paypalFetch<{ id: string }>('/v1/catalogs/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Council dues',
      description: 'Annual Knights of Columbus council dues',
      type: 'SERVICE',
      category: 'MEMBERSHIP_CLUBS_AND_ORGANIZATIONS',
    }),
  });

  return product.id;
};

const createAnnualPlan = async (options: {
  productId: string;
  memberClass: string;
  amountCents: number;
  currency: string;
}): Promise<string> => {
  const amount = (options.amountCents / 100).toFixed(2);
  const plan = await paypalFetch<{ id: string }>('/v1/billing/plans', {
    method: 'POST',
    body: JSON.stringify({
      product_id: options.productId,
      name: `Council dues (${options.memberClass})`,
      description: `Annual dues for member class ${options.memberClass}`,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: 'YEAR', interval_count: 1 },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: amount,
              currency_code: options.currency,
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });

  return plan.id;
};

/** Ensure each member class has an annual plan. Existing plan IDs are kept (amount locked on PayPal until re-subscribe). */
export const syncPaypalPlansForRates = async (options: {
  rates: Record<string, number>;
  currency: string;
  existingPlans?: Record<string, string>;
  existingProductId?: string;
  recreateAll?: boolean;
}): Promise<{ productId: string; plans: Record<string, string> }> => {
  if (!isPaypalRestConfigured()) {
    return {
      productId: options.existingProductId ?? '',
      plans: options.existingPlans ?? {},
    };
  }

  const productId = await ensurePaypalProduct(options.existingProductId);
  const plans: Record<string, string> = options.recreateAll
    ? {}
    : { ...(options.existingPlans ?? {}) };

  for (const [memberClass, amountCents] of Object.entries(options.rates)) {
    if (plans[memberClass]?.trim()) {
      continue;
    }
    plans[memberClass] = await createAnnualPlan({
      productId,
      memberClass,
      amountCents,
      currency: options.currency,
    });
  }

  return { productId, plans };
};

export const persistPaypalPlans = (options: {
  productId: string;
  plans: Record<string, string>;
}): void => {
  const config = loadCouncilConfig();
  if (!config.dues) {
    return;
  }

  writeCouncilConfig({
    ...config,
    dues: {
      ...config.dues,
      paypalProductId: options.productId || config.dues.paypalProductId,
      paypalPlans: options.plans,
    },
  });
};

export const createPaypalSubscription = async (options: {
  planId: string;
  membershipNumber: string;
  councilYear: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; approveUrl: string }> => {
  const customId = `${options.membershipNumber}|${options.councilYear}`;
  const subscription = await paypalFetch<{
    id: string;
    links?: Array<{ rel?: string; href?: string }>;
  }>('/v1/billing/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      plan_id: options.planId,
      custom_id: customId,
      application_context: {
        brand_name: 'Knights of Columbus',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: options.returnUrl,
        cancel_url: options.cancelUrl,
      },
    }),
  });

  const approveUrl = subscription.links?.find(
    (link) => link.rel === 'approve',
  )?.href;

  if (!approveUrl) {
    throw new Error('PayPal subscription missing approve URL');
  }

  return { id: subscription.id, approveUrl };
};

export const getPaypalSubscription = async (
  subscriptionId: string,
): Promise<PaypalSubscriptionDetails> =>
  paypalFetch<PaypalSubscriptionDetails>(
    `/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );

export const mapPaypalStatusToLocal = (
  status: string,
):
  | 'approval_pending'
  | 'approved'
  | 'active'
  | 'suspended'
  | 'cancelled'
  | 'expired' => {
  switch (status.toUpperCase()) {
    case 'APPROVAL_PENDING':
      return 'approval_pending';
    case 'APPROVED':
      return 'approved';
    case 'ACTIVE':
      return 'active';
    case 'SUSPENDED':
      return 'suspended';
    case 'CANCELLED':
      return 'cancelled';
    case 'EXPIRED':
      return 'expired';
    default:
      return 'approval_pending';
  }
};

type WebhookVerifyPayload = {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
  webhookId: string;
  webhookEvent: unknown;
};

export const verifyPaypalWebhookSignature = async (
  options: WebhookVerifyPayload,
): Promise<boolean> => {
  if (!isPaypalRestConfigured()) {
    return false;
  }

  const result = await paypalFetch<{ verification_status?: string }>(
    '/v1/notifications/verify-webhook-signature',
    {
      method: 'POST',
      body: JSON.stringify({
        transmission_id: options.transmissionId,
        transmission_time: options.transmissionTime,
        cert_url: options.certUrl,
        auth_algo: options.authAlgo,
        transmission_sig: options.transmissionSig,
        webhook_id: options.webhookId,
        webhook_event: options.webhookEvent,
      }),
    },
  );

  return result.verification_status === 'SUCCESS';
};

export const getPaypalWebhookId = (): string | null =>
  process.env.PAYPAL_WEBHOOK_ID?.trim() || null;

export const getAppReturnBase = (): string => {
  const origin = getCanonicalAppOrigin();
  if (origin) {
    return origin;
  }
  return 'http://localhost:47831';
};
