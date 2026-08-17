import { loadStripe } from "@stripe/stripe-js";

/**
 * Stripe integration for JobTag.
 *
 * Real payments go through a server-side Checkout Session created by the
 * `api/create_checkout_session.py` serverless function (which holds the
 * secret STRIPE_SECRET_KEY). The buyer is redirected to Stripe's hosted
 * checkout and comes back through the session's success URL, where the
 * job is marked promoted. If the serverless function isn't reachable
 * (e.g. local preview), we fall back to a Payment Link if one is set,
 * and finally to the in-app demo checkout.
 *
 * Keys:
 *   STRIPE_SECRET_KEY          - server-side secret (sk_...), used by the serverless function
 *   STRIPE_PRICE_ID            - optional Price ID; default is a $5 one-off charge
 *   VITE_STRIPE_PAYMENT_LINK   - optional fallback Payment Link URL for the $5 promo
 *   VITE_STRIPE_PUBLISHABLE_KEY - optional publishable key (pk_...), used to init Stripe.js
 */

export const STRIPE_PUBLISHABLE_KEY = import.meta.env
  .VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
export const STRIPE_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK as
  | string
  | undefined;

/** True once a Payment Link is configured, enabling real checkout. */
export const stripeConfigured = Boolean(STRIPE_PAYMENT_LINK);

const PROMO_PENDING_KEY = "jobtag:pendingPromo";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

/** Lazily initializes Stripe.js with the publishable key (for future Elements use). */
export function getStripe(): ReturnType<typeof loadStripe> | null {
  if (!STRIPE_PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

/**
 * Starts the promotion checkout. Tries the server-side Checkout Session
 * first (works once deployed with STRIPE_SECRET_KEY), then falls back
 * to the Payment Link, then returns false so the app can show the demo
 * checkout. Returns true once a redirect has been started.
 */
export async function startPromoCheckout(
  jobId: string,
  email?: string,
): Promise<boolean> {
  // 1) Real server-side Checkout Session (deployed env with STRIPE_SECRET_KEY).
  try {
    const res = await fetch("/api/create_checkout_session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, email, origin: window.location.origin }),
    });
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.assign(data.url);
        return true;
      }
    }
  } catch {
    // No API server (e.g. local preview) — fall through to the Payment Link.
  }

  // 2) Payment Link fallback.
  if (STRIPE_PAYMENT_LINK) {
    try {
      localStorage.setItem(PROMO_PENDING_KEY, jobId);
    } catch {
      /* ignore storage failures */
    }
    const url = new URL(STRIPE_PAYMENT_LINK);
    url.searchParams.set("client_reference_id", jobId);
    if (email) url.searchParams.set("prefilled_email", email);
    window.location.assign(url.toString());
    return true;
  }

  return false;
}

/**
 * Reads the result of a Stripe checkout return. Handles both flows:
 * - Checkout Session success URL: `?job=...&session_id=...` (server path)
 * - Payment Link return: `?redirect_status=succeeded|canceled|failed`
 * - Checkout Session cancel URL: `?canceled=1`
 */
export function readPromoRedirect(): {
  jobId: string | null;
  status: "succeeded" | "canceled" | "failed" | null;
} {
  const params = new URLSearchParams(window.location.search);
  const redirectStatus = params.get("redirect_status") as
    | "succeeded"
    | "canceled"
    | "failed"
    | null;
  const hasSession = Boolean(params.get("session_id"));
  const canceled = params.get("canceled") === "1";

  const status =
    redirectStatus === "succeeded" || hasSession
      ? "succeeded"
      : redirectStatus === "canceled" || canceled
        ? "canceled"
        : redirectStatus === "failed"
          ? "failed"
          : null;
  if (!status) return { jobId: null, status: null };

  let jobId: string | null = params.get("job");
  try {
    jobId = jobId ?? localStorage.getItem(PROMO_PENDING_KEY);
    localStorage.removeItem(PROMO_PENDING_KEY);
  } catch {
    /* ignore storage failures */
  }
  return { jobId, status };
}