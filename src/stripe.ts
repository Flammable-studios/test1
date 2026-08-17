import { loadStripe } from "@stripe/stripe-js";

/**
 * Stripe integration for JobTag.
 *
 * This app is static and client-only, so we use Stripe Checkout via
 * Payment Links: the buyer is redirected to a Stripe-hosted checkout
 * page and comes back through the Payment Link's success URL, where
 * Stripe appends `?redirect_status=succeeded`. The job that was paid
 * for is tracked in localStorage while the buyer is away.
 *
 * Required in the Keys tab:
 *   VITE_STRIPE_PAYMENT_LINK      - the Payment Link URL for the $5 promo
 *   VITE_STRIPE_PUBLISHABLE_KEY   - publishable key (pk_...), used to init Stripe.js
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
 * Starts the promotion checkout. Remembers the job id locally, then
 * redirects to the Stripe Payment Link. Returns false if not configured.
 */
export function startPromoCheckout(jobId: string, email?: string): boolean {
  if (!STRIPE_PAYMENT_LINK) return false;
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

/**
 * Reads the result of a Stripe checkout return. Only consumes state when
 * Stripe actually redirected back (i.e. `redirect_status` is present).
 */
export function readPromoRedirect(): {
  jobId: string | null;
  status: "succeeded" | "canceled" | "failed" | null;
} {
  const status = new URLSearchParams(window.location.search).get("redirect_status") as
    | "succeeded"
    | "canceled"
    | "failed"
    | null;
  if (!status) return { jobId: null, status: null };
  let jobId: string | null = null;
  try {
    jobId = localStorage.getItem(PROMO_PENDING_KEY);
    localStorage.removeItem(PROMO_PENDING_KEY);
  } catch {
    /* ignore storage failures */
  }
  return { jobId, status };
}