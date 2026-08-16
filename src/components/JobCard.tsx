import { memo } from "react";
import { Check, CheckCircle2, Clock, MapPin } from "lucide-react";
import { catInfo, jobLabel, type Job } from "../data";
import { formatPrice, timeAgo } from "../time";
import { styles } from "../styles";

export const JobCard = memo(function JobCard({
  job,
  now,
  yours,
  isOwner,
  onOpen,
  onClaim,
  onComplete,
}: {
  job: Job;
  now: number;
  yours?: boolean;
  isOwner?: boolean;
  onOpen: (id: string) => void;
  onClaim?: (id: string) => void;
  onComplete?: (id: string) => void;
}) {
  const info = catInfo(job.category);
  const Icon = info.icon;
  return (
    <article className="jt-card" style={styles.card} onClick={() => onOpen(job.id)}>
      <div style={styles.cardTop}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ ...styles.iconWrap, background: info.color }}>
            <Icon size={16} color="#F7F5F0" />
          </div>
          <span style={{ ...styles.cardCat, color: info.color }}>{jobLabel(job)}</span>
        </div>
        <span style={styles.price}>${formatPrice(job.price)}</span>
      </div>
      <h3 style={styles.cardTitle}>{job.title}</h3>
      {job.note ? <p style={styles.cardNote}>{job.note}</p> : null}
      <div style={styles.metaRow}>
        <span style={styles.metaItem}>
          <MapPin size={12} /> {job.location}
        </span>
        <span style={styles.metaItem}>
          <Clock size={12} /> {timeAgo(job.posted, now)}
        </span>
      </div>
      <div style={styles.cardFoot}>
        {job.status === "open" ? (
          isOwner ? (
            <span style={styles.ownerTag}>Your job</span>
          ) : (
            <button
              type="button"
              className="jt-claim-btn"
              style={styles.claimBtn}
              onClick={(e) => {
                e.stopPropagation();
                onClaim?.(job.id);
              }}
            >
              Claim job
            </button>
          )
        ) : job.status === "claimed" ? (
          isOwner ? (
            <button
              type="button"
              className="jt-claim-btn"
              style={styles.markCompleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                onComplete?.(job.id);
              }}
            >
              Mark complete
            </button>
          ) : (
            <span style={styles.claimedTag}>
              <Check size={13} /> {yours ? "Your claim" : "Claimed"}
            </span>
          )
        ) : (
          <span style={styles.completeTag}>
            <CheckCircle2 size={13} /> Complete
          </span>
        )}
      </div>
    </article>
  );
});