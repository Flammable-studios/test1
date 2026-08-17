import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { PROMO_DAYS, PROMO_PRICE_USD, type Job } from "../data";
import { startPromoCheckout } from "../stripe";
import { styles } from "../styles";
import { Modal } from "./Modal";

export function CheckoutModal({
  job,
  email,
  onClose,
  onPaid,
}: {
  job: Job;
  email?: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  /** True once real Stripe checkout was attempted but unavailable — show the demo form. */
  const [demo, setDemo] = useState(false);

  const payDemo = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    window.setTimeout(onPaid, 1400);
  };

  const payWithStripe = async () => {
    if (busy) return;
    setBusy(true);
    const started = await startPromoCheckout(job.id, email);
    if (!started) {
      // No serverless function (preview) and no Payment Link — fall back to demo.
      setBusy(false);
      setDemo(true);
    }
  };

  return (
    <Modal title="Promote your post" onClose={onClose}>
      <div style={styles.checkoutSummary}>
        <p style={styles.checkoutTitle}>{job.title}</p>
        <p style={styles.checkoutMeta}>
          <Sparkles size={12} /> Top of the board with a Promoted badge for {PROMO_DAYS} days
        </p>
      </div>

      {!demo ? (
        <>
          <div style={styles.checkoutTotal}>
            <span>Total</span>
            <strong>${PROMO_PRICE_USD}.00</strong>
          </div>
          <button type="button" style={styles.primaryBtn} onClick={() => void payWithStripe()} disabled={busy}>
            {busy ? <Loader2 size={16} className="jt-spin" /> : <Sparkles size={16} />}
            {busy ? "Starting secure checkout…" : `Pay $${PROMO_PRICE_USD}.00 with Stripe`}
          </button>
          <p style={styles.hint}>
            You'll be redirected to Stripe's secure checkout to complete your payment.
          </p>
        </>
      ) : (
        <form onSubmit={payDemo}>
          <label style={styles.label} htmlFor="co-card">
            Card number
          </label>
          <input
            id="co-card"
            style={styles.input}
            placeholder="4242 4242 4242 4242"
            inputMode="numeric"
            autoComplete="cc-number"
            required
          />
          <div style={styles.twoCol}>
            <div style={{ flex: 1 }}>
              <label style={styles.label} htmlFor="co-exp">
                Expiry
              </label>
              <input
                id="co-exp"
                style={styles.input}
                placeholder="MM / YY"
                inputMode="numeric"
                autoComplete="cc-exp"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label} htmlFor="co-cvc">
                CVC
              </label>
              <input
                id="co-cvc"
                style={styles.input}
                placeholder="123"
                inputMode="numeric"
                autoComplete="cc-csc"
                required
              />
            </div>
          </div>
          <div style={styles.checkoutTotal}>
            <span>Total</span>
            <strong>${PROMO_PRICE_USD}.00</strong>
          </div>
          <button type="submit" style={styles.primaryBtn} disabled={busy}>
            {busy ? <Loader2 size={16} className="jt-spin" /> : <Sparkles size={16} />}
            {busy ? "Processing…" : `Pay $${PROMO_PRICE_USD}.00 (demo)`}
          </button>
          <p style={styles.hint}>
            Demo checkout — no real charge. Add <strong>STRIPE_SECRET_KEY</strong> (deploy) or{" "}
            <strong>VITE_STRIPE_PAYMENT_LINK</strong> in the Keys tab to accept real payments.
          </p>
        </form>
      )}
    </Modal>
  );
}
