import type { Job } from "./data";

/**
 * Best-effort transactional email via the Freebuff serverless function
 * (`api/send_email.py`). The actual send happens server-side with the
 * secret RESEND_API_KEY. In the local preview there is no API server,
 * so failures are silently ignored.
 */
export async function notifyClaimed(job: Job): Promise<void> {
  if (!job.posterEmail || !job.notifyEmail) return;
  try {
    await fetch("/api/send_email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: job.posterEmail,
        subject: `Your JobTag job was claimed: ${job.title}`,
        text: [
          `Hi,`,
          ``,
          `Your JobTag job "${job.title}" (${job.location}) was just claimed.`,
          `Message the tasker to confirm timing and details.`,
          ``,
          `— JobTag`,
        ].join("\n"),
      }),
    });
  } catch {
    // Email is best-effort; the app works fine without it.
  }
}