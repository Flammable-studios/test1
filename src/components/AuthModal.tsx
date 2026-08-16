import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { signIn, signUp, type AuthUser } from "../auth";
import { styles } from "../styles";
import { Modal } from "./Modal";

export function AuthModal({
  onClose,
  onAuthed,
}: {
  onClose: () => void;
  onAuthed: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "");
    setError(null);
    setBusy(true);
    const result =
      mode === "signin" ? await signIn(email, password) : await signUp({ email, password, name });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong. Try again.");
      return;
    }
    if (result.user) onAuthed(result.user);
  };

  return (
    <Modal title={mode === "signin" ? "Sign in" : "Create account"} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {mode === "signup" && (
          <>
            <label style={styles.label} htmlFor="au-name">
              Name
            </label>
            <input
              id="au-name"
              name="name"
              style={styles.input}
              placeholder="Your name"
              autoComplete="name"
            />
          </>
        )}

        <label style={styles.label} htmlFor="au-email">
          Email
        </label>
        <input
          id="au-email"
          name="email"
          type="email"
          required
          style={styles.input}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <label style={styles.label} htmlFor="au-password">
          Password
        </label>
        <input
          id="au-password"
          name="password"
          type="password"
          required
          minLength={6}
          style={styles.input}
          placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {error ? (
          <p style={styles.formError} role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" style={styles.primaryBtn} disabled={busy}>
          {busy ? <Loader2 size={16} className="jt-spin" /> : null}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          style={styles.switchBtn}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>

        <p style={styles.hint}>Demo mode: accounts live in this browser only.</p>
      </form>
    </Modal>
  );
}