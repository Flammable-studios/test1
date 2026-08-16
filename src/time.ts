export function timeAgo(ts: number, now: number): string {
  const mins = Math.max(0, Math.floor((now - ts) / 60_000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1m ago";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}