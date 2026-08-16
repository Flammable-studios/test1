import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { styles } from "../styles";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const titleId = "jt-modal-title";
  return (
    <div className="jt-backdrop" onClick={onClose}>
      <div
        className="jt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHead}>
          <h2 id={titleId} style={styles.modalTitle}>
            {title}
          </h2>
          <button type="button" style={styles.iconBtn} onClick={onClose} aria-label="Close" autoFocus>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}