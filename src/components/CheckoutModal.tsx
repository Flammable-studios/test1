import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { PROMO_DAYS, PROMO_PRICE_USD, type Job } from "../data";
import { styles } from "../styles";
import { Modal } from "./Modal";

export function CheckoutModal({
  job,
  onClose,
  onPaid,
}: {
  job: Job;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const pay = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    window.setTimeout(onPaid, 1400);
  };

  return (
    <Modal title="Promote your post" onClose={onClose}>
      <div style={styles.checkoutSummary}>
        <p style={styles.checkoutTitle}>{job.title}</p>
        <p style={styles.checkoutMeta}>
          <Sparkles size={12} /> Top of the board with a Promoted badge for {PROMO_DAYS} days
        </p>
      </div>
      <form onSubmit={pay}>
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
          {busy ? "Processing…" : `Pay $${PROMO_PRICE_USD}.00`}
        </button>
        <p style={styles.hint}>Demo checkout — no real charge. Connect Stripe to accept real payments.</p>
      </form>
    </Modal>
  );
}