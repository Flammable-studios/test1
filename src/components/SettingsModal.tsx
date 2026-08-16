import { useState } from "react";
import type { AuthUser } from "../auth";
import type { Settings } from "../settings";
import { levelInfo } from "../xp";
import { styles } from "../styles";
import { Modal } from "./Modal";

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div style={styles.settingRow}>
      <div style={{ flex: 1 }}>
        <p style={styles.settingLabel}>{label}</p>
        {desc ? <p style={styles.settingDesc}>{desc}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{ ...styles.toggle, ...(checked ? styles.toggleOn : {}) }}
      >
        <span style={{ ...styles.toggleKnob, ...(checked ? styles.toggleKnobOn : {}) }} />
      </button>
    </div>
  );
}

export function SettingsModal({
  user,
  settings,
  onChange,
  onSignOut,
  onResetData,
  onClose,
}: {
  user: AuthUser;
  settings: Settings;
  onChange: (next: Settings) => void;
  onSignOut: () => void;
  onResetData: () => void;
  onClose: () => void;
}) {
  const [area, setArea] = useState(settings.area);
  const level = levelInfo(user.xp);

  return (
    <Modal title="Settings" onClose={onClose}>
      <p style={styles.settingEmail}>{user.email}</p>

      <div style={styles.xpBox}>
        <p style={styles.settingLabel}>
          {level.title} · Level {level.level}
        </p>
        <div style={styles.xpBar}>
          <div style={{ ...styles.xpFill, width: `${Math.round(level.progress * 100)}%` }} />
        </div>
        <p style={styles.settingDesc}>
          {user.xp} XP
          {level.nextMin !== null
            ? ` · ${level.nextMin - user.xp} XP to ${level.nextTitle}`
            : " · Max level"}
        </p>
      </div>

      <label style={styles.label} htmlFor="st-area">
        Preferred area
      </label>
      <input
        id="st-area"
        style={styles.input}
        placeholder="e.g. Sun City"
        value={area}
        onChange={(e) => {
          setArea(e.target.value);
          onChange({ ...settings, area: e.target.value });
        }}
      />

      <Toggle
        checked={settings.notifyOnClaim}
        onChange={(v) => onChange({ ...settings, notifyOnClaim: v })}
        label="Claim notifications"
        desc="Get a notice when someone claims your job (demo)."
      />
      <Toggle
        checked={settings.reduceMotion}
        onChange={(v) => onChange({ ...settings, reduceMotion: v })}
        label="Reduce animation"
        desc="Minimize motion across the app."
      />

      <div style={styles.divider} />
      <p style={styles.settingLabel}>Account</p>
      <button type="button" style={styles.dangerBtnSoft} onClick={onSignOut}>
        Sign out
      </button>
      <button type="button" style={styles.dangerBtn} onClick={onResetData}>
        Reset demo data
      </button>
    </Modal>
  );
}