import { Check, CheckCircle2, Clock, MapPin } from "lucide-react";
import { catInfo, jobLabel, type Job } from "../data";
import { formatPrice, timeAgo } from "../time";
import { styles } from "../styles";
import { Modal } from "./Modal";

export function JobDetail({
  job,
  now,
  authed,
  isOwner,
  onClose,
  onClaim,
  onComplete,
  onRequireAuth,
}: {
  job: Job;
  now: number;
  authed: boolean;
  isOwner?: boolean;
  onClose: () => void;
  onClaim: (id: string) => void;
  onComplete: (id: string) => void;
  onRequireAuth: () => void;
}) {
  const info = catInfo(job.category);
  const Icon = info.icon;
  return (
    <Modal title="Job details" onClose={onClose}>
      <div style={styles.detailTop}>
        <div style={{ ...styles.iconWrap, background: info.color }}>
          <Icon size={16} color="#F7F5F0" />
        </div>
        <span style={{ ...styles.detailChip, color: info.color, borderColor: info.color }}>
          {jobLabel(job)}
        </span>
        {job.status !== "open" && (
          <span
            style={job.status === "complete" ? styles.completeTag : styles.claimedTag}
          >
            {job.status === "complete" ? (
              <>
                <CheckCircle2 size={13} /> Complete
              </>
            ) : (
              <>
                <Check size={13} /> Claimed
              </>
            )}
          </span>
        )}
      </div>
      <p style={styles.detailPrice}>${formatPrice(job.price)}</p>
      <h3 style={styles.detailTitle}>{job.title}</h3>
      <div style={styles.detailMeta}>
        <span style={styles.metaItem}>
          <MapPin size={13} /> {job.location}
        </span>
        <span style={styles.metaItem}>
          <Clock size={13} /> Posted {timeAgo(job.posted, now)}
        </span>
      </div>
      {job.note ? <div style={styles.detailNote}>{job.note}</div> : null}
      <div style={styles.detailAction}>
        {job.status === "open" ? (
          isOwner ? (
            <span style={styles.ownerTag}>This is your job</span>
          ) : authed ? (
            <button type="button" style={styles.detailClaimBtn} onClick={() => onClaim(job.id)}>
              Claim this job
            </button>
          ) : (
            <button type="button" style={styles.detailClaimBtn} onClick={onRequireAuth}>
              Sign in to claim
            </button>
          )
        ) : job.status === "claimed" ? (
          isOwner ? (
            <button type="button" style={styles.detailMarkBtn} onClick={() => onComplete(job.id)}>
              Mark complete
            </button>
          ) : (
            <span style={styles.claimedBig}>
              <Check size={15} /> Claimed
            </span>
          )
        ) : (
          <span style={styles.claimedBig}>
            <CheckCircle2 size={15} /> Complete
          </span>
        )}
      </div>
    </Modal>
  );
}