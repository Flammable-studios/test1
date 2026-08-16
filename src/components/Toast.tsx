import { CheckCircle2, Loader2 } from "lucide-react";
import { styles } from "../styles";

export function Toast({ message, saving }: { message: string | null; saving: boolean }) {
  if (!message) return null;
  return (
    <div style={styles.toast} role="status" aria-live="polite">
      {saving ? <Loader2 size={14} className="jt-spin" /> : <CheckCircle2 size={14} />}
      {message}
    </div>
  );
}