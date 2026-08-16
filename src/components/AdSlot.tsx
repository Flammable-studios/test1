import { styles } from "../styles";

export function AdBanner() {
  return (
    <div style={styles.adBanner} role="complementary" aria-label="Advertisement placeholder">
      <span style={styles.adBadge}>AD</span>
      <div>
        <p style={styles.adTitle}>Your ad here</p>
        <p style={styles.adText}>Ads keep JobTag free — this is how the app runs.</p>
      </div>
    </div>
  );
}

export function AdCard() {
  return (
    <div style={styles.adCard} role="complementary" aria-label="Advertisement placeholder">
      <span style={styles.adBadge}>AD</span>
      <p style={styles.adTitle}>Your ad here</p>
      <p style={styles.adText}>Ads keep JobTag free to use.</p>
    </div>
  );
}