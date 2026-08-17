import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { JobDetail } from "./JobDetail";
import type { Job } from "../data";

afterEach(cleanup);

const job: Job = {
  id: "t1",
  title: "Old couch removal",
  category: "junk",
  price: 65,
  location: "Diamond Creek",
  note: "Curbside, easy load.",
  status: "open",
  posted: Date.now(),
  postedBy: "u1",
};

function renderDetail({
  isOwner = true,
}: {
  isOwner?: boolean;
} = {}) {
  const onDelete = vi.fn<(id: string) => void>();
  render(
    <JobDetail
      job={job}
      now={Date.now()}
      authed
      isOwner={isOwner}
      onClose={vi.fn()}
      onClaim={vi.fn()}
      onComplete={vi.fn()}
      onDelete={onDelete}
      onPromote={vi.fn()}
      onRequireAuth={vi.fn()}
    />,
  );
  return { onDelete };
}

describe("JobDetail — close own job", () => {
  it("shows a 'Close this job' action for the owner", () => {
    renderDetail({ isOwner: true });
    expect(screen.getByRole("button", { name: "Close this job" })).toBeTruthy();
  });

  it("does not show the close action to non-owners", () => {
    renderDetail({ isOwner: false });
    expect(screen.queryByRole("button", { name: "Close this job" })).toBeNull();
  });

  it("requires a second click to confirm before deleting", () => {
    const { onDelete } = renderDetail({ isOwner: true });

    // First click only reveals the confirm prompt — no delete yet.
    fireEvent.click(screen.getByRole("button", { name: "Close this job" }));
    expect(screen.getByText("Remove this listing?")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    // Confirm actually deletes with the job id.
    fireEvent.click(screen.getByRole("button", { name: "Yes, close it" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("t1");
  });

  it("lets the owner back out without deleting", () => {
    const { onDelete } = renderDetail({ isOwner: true });

    fireEvent.click(screen.getByRole("button", { name: "Close this job" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));

    expect(onDelete).not.toHaveBeenCalled();
    // Back to the idle state — the close prompt is gone.
    expect(screen.queryByText("Remove this listing?")).toBeNull();
    expect(screen.getByRole("button", { name: "Close this job" })).toBeTruthy();
  });
});
