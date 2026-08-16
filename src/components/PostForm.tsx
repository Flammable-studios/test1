import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { CATEGORIES, type CategoryId } from "../data";
import { styles } from "../styles";

export function PostForm({
  onSubmit,
  onCancel,
  saving,
  posterName,
  prefillArea,
}: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  saving: boolean;
  posterName?: string;
  prefillArea?: string;
}) {
  const [category, setCategory] = useState<CategoryId>("junk");
  return (
    <form onSubmit={onSubmit} style={styles.formWrap}>
      <input type="hidden" name="category" value={category} />
      {posterName ? (
        <p style={styles.posterP}>
          Posting as <strong>{posterName}</strong>
        </p>
      ) : null}

      <label style={styles.label} htmlFor="jt-title">
        What needs doing?
      </label>
      <input
        id="jt-title"
        name="title"
        style={styles.input}
        placeholder="e.g. Two old mattresses, curbside pickup"
        required
        autoFocus
      />

      <label style={styles.label}>Category</label>
      <div style={styles.catGrid}>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              aria-pressed={active}
              style={{
                ...styles.catBtn,
                borderColor: active ? c.color : "#DEDAD0",
                background: active ? c.color : "#fff",
                color: active ? "#F7F5F0" : "#1F2421",
              }}
            >
              <Icon size={14} /> {c.label}
            </button>
          );
        })}
      </div>

      {category === "other" && (
        <>
          <label style={styles.label} htmlFor="jt-custom">
            Job type
          </label>
          <input
            id="jt-custom"
            name="customLabel"
            style={styles.input}
            placeholder="e.g. Dog sitting, furniture assembly"
            required
          />
        </>
      )}

      <div style={styles.twoCol}>
        <div style={{ flex: 1 }}>
          <label style={styles.label} htmlFor="jt-price">
            Price ($)
          </label>
          <input
            id="jt-price"
            name="price"
            type="number"
            min="1"
            max="100000"
            step="1"
            inputMode="numeric"
            style={styles.input}
            placeholder="65"
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label} htmlFor="jt-location">
            Neighborhood / area
          </label>
          <input
            id="jt-location"
            name="location"
            style={styles.input}
            placeholder="e.g. Sun City"
            defaultValue={prefillArea ?? ""}
            required
          />
        </div>
      </div>

      <label style={styles.label} htmlFor="jt-note">
        Details (optional)
      </label>
      <textarea
        id="jt-note"
        name="note"
        style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
        placeholder="Anything a tasker should know — access, timing, size of the job"
      />

      <div style={styles.formActions}>
        <button type="button" style={styles.cancelBtn} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="submit"
          style={{ ...styles.postBtn, ...(saving ? { opacity: 0.65, cursor: "default" } : {}) }}
          disabled={saving}
        >
          {saving ? <Loader2 size={16} className="jt-spin" /> : <Plus size={16} />}
          {saving ? "Posting…" : "Post job"}
        </button>
      </div>
      <p style={styles.formFoot}>
        Jobs post instantly and are visible to everyone browsing “Find work.”
      </p>
    </form>
  );
}