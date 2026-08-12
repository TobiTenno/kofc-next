import { getCanonicalAppOrigin } from '@/lib/app-origin';
import { loadCouncilConfig, writeCouncilConfig } from '@/lib/council-config';
import { maskSecret } from '@/lib/utils';

const DEFAULT_SYNC_INTERVAL_MS = 60 * 60 * 1000;

type PaypalTokenCache = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: null | PaypalTokenCache = null;

export type PaypalPublicSettings = {
  clientId: string;
  clientSecretMasked: null | string;
  mode: 'live' | 'sandbox';
  restConfigured: boolean;
  subscriptionsReady: boolean;
  subSyncIntervalMs: number;
  webhookIdMasked: null | string;
};

export type PaypalSubscriptionDetails = {
  billing_info?: {
    last_payment?: {
      amount?: { currency_code?: string; value?: string };
      time?: string;
    };
    next_billing_time?: string;
  };
  custom_id?: string;
  id: string;
  plan_id?: string;
  status: PaypalSubscriptionStatus;
  subscriber?: {
    email_address?: string;
  };
};

export type PaypalSubscriptionStatus
  = | 'ACTIVE'
    | 'APPROVAL_PENDING'
    | 'APPROVED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'SUSPENDED';

const getDuesPaypal = () => loadCouncilConfig().dues;

const trimOrNull = (value: null | string | undefined): null | string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const getPaypalClientId = (): null | string =>
  trimOrNull(getDuesPaypal()?.paypalClientId)
  ?? trimOrNull(process.env.PAYPAL_CLIENT_ID);

export const getPaypalClientSecret = (): null | string =>
  trimOrNull(getDuesPaypal()?.paypalClientSecret)
  ?? trimOrNull(process.env.PAYPAL_CLIENT_SECRET);

export const isPaypalRestConfigured = (): boolean =>
  Boolean(getPaypalClientId() && getPaypalClientSecret());

export const getPaypalMode = (): 'live' | 'sandbox' => {
  const fromConfig = getDuesPaypal()?.paypalMode;
  if (fromConfig === 'live' || fromConfig === 'sandbox') {
    return fromConfig;
  }
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();
  return mode === 'live' ? 'live' : 'sandbox';
};

export const getPaypalApiBase = (): string =>
  getPaypalMode() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

export const getPaypalSubSyncIntervalMs = (): number => {
  const fromConfig = getDuesPaypal()?.paypalSubSyncIntervalMs;
  if (
    typeof fromConfig === 'number'
    && Number.isFinite(fromConfig)
    && fromConfig >= 60_000
  ) {
    return fromConfig;
  }

  const raw = process.env.PAYPAL_SUB_SYNC_INTERVAL_MS?.trim();
  if (!raw) {
    return DEFAULT_SYNC_INTERVAL_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 60_000
    ? parsed
    : DEFAULT_SYNC_INTERVAL_MS;
};

export const getPaypalPlanIdForClass = (memberClass: string): null | string => {
  const plans = getDuesPaypal()?.paypalPlans;
  const planId = plans?.[memberClass]?.trim();
  return planId || null;
};

export const hasPaypalPlansConfigured = (): boolean => {
  const plans = getDuesPaypal()?.paypalPlans;
  if (!plans) {
    return false;
  }
  return Object.values(plans).some(id => Boolean(id?.trim()));
};

export const isPaypalSubscriptionsReady = (): boolean =>
  isPaypalRestConfigured() && hasPaypalPlansConfigured();

export const clearPaypalTokenCache = (): void => {
  tokenCache = null;
};

export const getPaypalWebhookId = (): null | string =>
  trimOrNull(getDuesPaypal()?.paypalWebhookId)
  ?? trimOrNull(process.env.PAYPAL_WEBHOOK_ID);

export const getPaypalPublicSettings = (): PaypalPublicSettings => ({
  clientId: getPaypalClientId() ?? '',
  clientSecretMasked: maskSecret(getPaypalClientSecret()),
  mode: getPaypalMode(),
  restConfigured: isPaypalRestConfigured(),
  subscriptionsReady: isPaypalSubscriptionsReady(),
  subSyncIntervalMs: getPaypalSubSyncIntervalMs(),
  webhookIdMasked: maskSecret(getPaypalWebhookId()),
});

const getBasicAuthHeader = (): string => {
  const clientId = getPaypalClientId();
  const clientSecret = getPaypalClientSecret();
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
    body: 'grant_type=client_credentials',
    headers: {
      'Authorization': `Basic ${getBasicAuthHeader()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
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
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...init?.headers,
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
    body: JSON.stringify({
      category: 'MEMBERSHIP_CLUBS_AND_ORGANIZATIONS',
      description: 'Annual Knights of Columbus council dues',
      name: 'Council dues',
      type: 'SERVICE',
    }),
    method: 'POST',
  });

  return product.id;
};

const createAnnualPlan = async (options: {
  amountCents: number;
  currency: string;
  memberClass: string;
  productId: string;
}): Promise<string> => {
  const amount = (options.amountCents / 100).toFixed(2);
  const plan = await paypalFetch<{ id: string }>('/v1/billing/plans', {
    body: JSON.stringify({
      billing_cycles: [
        {
          frequency: { interval_count: 1, interval_unit: 'YEAR' },
          pricing_scheme: {
            fixed_price: {
              currency_code: options.currency,
              value: amount,
            },
          },
          sequence: 1,
          tenure_type: 'REGULAR',
          total_cycles: 0,
        },
      ],
      description: `Annual dues for member class ${options.memberClass}`,
      name: `Council dues (${options.memberClass})`,
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
      product_id: options.productId,
      status: 'ACTIVE',
    }),
    method: 'POST',
  });

  return plan.id;
};

/**
Ensure each member class has an annual plan. Existing plan IDs are kept (amount locked on PayPal until re-subscribe).
*/
export const syncPaypalPlansForRates = async (options: {
  currency: string;
  existingPlans?: Record<string, string>;
  existingProductId?: string;
  rates: Record<string, number>;
  recreateAll?: boolean;
}): Promise<{ plans: Record<string, string>; productId: string }> => {
  if (!isPaypalRestConfigured()) {
    return {
      plans: options.existingPlans ?? {},
      productId: options.existingProductId ?? '',
    };
  }

  const productId = await ensurePaypalProduct(options.existingProductId);
  const plans: Record<string, string> = options.recreateAll
    ? {}
    : { ...options.existingPlans };

  for (const [memberClass, amountCents] of Object.entries(options.rates)) {
    if (plans[memberClass]?.trim()) {
      continue;
    }
    plans[memberClass] = await createAnnualPlan({
      amountCents,
      currency: options.currency,
      memberClass,
      productId,
    });
  }

  return { plans, productId };
};

export const persistPaypalPlans = (options: {
  plans: Record<string, string>;
  productId: string;
}): void => {
  const config = loadCouncilConfig();
  if (!config.dues) {
    return;
  }

  writeCouncilConfig({
    ...config,
    dues: {
      ...config.dues,
      paypalPlans: options.plans,
      paypalProductId: options.productId || config.dues.paypalProductId,
    },
  });
};

export const createPaypalSubscription = async (options: {
  cancelUrl: string;
  councilYear: string;
  membershipNumber: string;
  planId: string;
  returnUrl: string;
}): Promise<{ approveUrl: string; id: string }> => {
  const customId = `${options.membershipNumber}|${options.councilYear}`;
  const subscription = await paypalFetch<{
    id: string;
    links?: Array<{ href?: string; rel?: string }>;
  }>('/v1/billing/subscriptions', {
    body: JSON.stringify({
      application_context: {
        brand_name: 'Knights of Columbus',
        cancel_url: options.cancelUrl,
        return_url: options.returnUrl,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
      },
      custom_id: customId,
      plan_id: options.planId,
    }),
    method: 'POST',
  });

  const approveUrl = subscription.links?.find(
    link => link.rel === 'approve',
  )?.href;

  if (!approveUrl) {
    throw new Error('PayPal subscription missing approve URL');
  }

  return { approveUrl, id: subscription.id };
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
  | 'active'
  | 'approval_pending'
  | 'approved'
  | 'cancelled'
  | 'expired'
  | 'suspended' => {
  switch (status.toUpperCase()) {
    case 'ACTIVE': {
      return 'active';
    }
    case 'APPROVAL_PENDING': {
      return 'approval_pending';
    }
    case 'APPROVED': {
      return 'approved';
    }
    case 'CANCELLED': {
      return 'cancelled';
    }
    case 'EXPIRED': {
      return 'expired';
    }
    case 'SUSPENDED': {
      return 'suspended';
    }
    default: {
      return 'approval_pending';
    }
  }
};

type WebhookVerifyPayload = {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookEvent: unknown;
  webhookId: string;
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
      body: JSON.stringify({
        auth_algo: options.authAlgo,
        cert_url: options.certUrl,
        transmission_id: options.transmissionId,
        transmission_sig: options.transmissionSig,
        transmission_time: options.transmissionTime,
        webhook_event: options.webhookEvent,
        webhook_id: options.webhookId,
      }),
      method: 'POST',
    },
  );

  return result.verification_status === 'SUCCESS';
};

export const getAppReturnBase = (): string => {
  const origin = getCanonicalAppOrigin();
  if (origin) {
    return origin;
  }
  return 'http://localhost:47831';
};
