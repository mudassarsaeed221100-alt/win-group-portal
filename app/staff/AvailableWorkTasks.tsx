
"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

export type WorkTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
  created_at: string;
};

type SubmissionStatus = {
  task_id: string;
  status: string;
};

type Props = {
  onSelectTask: (task: WorkTask) => void;
};

/* ───────── Component ───────── */

export default function AvailableWorkTasks({ onSelectTask }: Props) {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ── Single fetch function (FIX #3: no duplicate code) ── */
  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("User session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    const [tasksResult, submissionsResult] = await Promise.all([
      /* Fetch active tasks for staff */
      supabase
        .from("work_tasks")
        .select("id, title, description, reward_amount, deadline, created_at")
        .eq("status", "active")
        .contains("target_roles", ["staff"])
        .order("created_at", { ascending: false }),

      /* FIX #1: Fetch staff's existing submissions to show status on each task */
      supabase
        .from("work_submissions")
        .select("task_id, status")
        .eq("user_id", user.id),
    ]);

    if (tasksResult.error) {
      setError(tasksResult.error.message);
      setTasks([]);
    } else {
      setTasks((tasksResult.data || []) as WorkTask[]);
    }

    if (!submissionsResult.error) {
      setSubmissions((submissionsResult.data || []) as SubmissionStatus[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  /* ───────── Helpers ───────── */

  /* FIX #5: Pakistan timezone in date formatting */
  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /* FIX #2: Check if deadline has passed */
  function isExpired(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  }

  /* FIX #1: Get submission status for a task */
  function getSubmissionStatus(taskId: string): string | null {
    /* Priority: Approved > Pending > Rejected */
    const taskSubmissions = submissions.filter((s) => s.task_id === taskId);
    if (taskSubmissions.length === 0) return null;
    if (taskSubmissions.some((s) => s.status === "approved")) return "approved";
    if (taskSubmissions.some((s) => s.status === "pending")) return "pending";
    if (taskSubmissions.some((s) => s.status === "rejected")) return "rejected";
    return null;
  }

  /* Determine if Select button should be disabled */
  function isTaskBlocked(task: WorkTask): boolean {
    const status = getSubmissionStatus(task.id);
    if (status === "pending" || status === "approved") return true;
    if (isExpired(task.deadline)) return true;
    return false;
  }

  /* Get button text based on status */
  function getButtonInfo(task: WorkTask): { text: string; style: CSSProperties } {
    const status = getSubmissionStatus(task.id);

    if (status === "approved") {
      return { text: "✅ Completed", style: btnCompleted };
    }
    if (status === "pending") {
      return { text: "⏳ Pending Review", style: btnPending };
    }
    if (isExpired(task.deadline)) {
      return { text: "⛔ Deadline Expired", style: btnExpired };
    }
    if (status === "rejected") {
      return { text: "🔄 Resubmit Work", style: btnResubmit };
    }
    return { text: "Select Task", style: btnDefault };
  }

  /* ───────── Render ───────── */

  return (
    <div style={styles.container}>
      <div style={styles.label}>STAFF WORKSPACE</div>
      <h2 style={styles.heading}>Available Work Tasks</h2>
      <p style={styles.description}>
        Company ke available tasks yahan nazar aayenge.
        Proof submit karne ke liye pehle task select karein.
      </p>

      {loading ? (
        <div style={styles.message}>Tasks load ho rahe hain...</div>
      ) : error ? (
        <div style={styles.errorMessage}>
          Tasks load nahi ho sake: {error}
          <button type="button" onClick={loadData} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div style={styles.message}>
          <strong>No Active Tasks</strong>
          <p style={{ color: "#aeb4bd", fontSize: "14px", margin: "8px 0 0" }}>
            Filhal aapke liye koi active task available nahi hai.
          </p>
          <button type="button" onClick={loadData} style={styles.retryBtn}>
            Refresh Tasks
          </button>
        </div>
      ) : (
        <>
          <div style={styles.taskCount}>
            {tasks.length} active task(s) available
            <button type="button" onClick={loadData} style={styles.refreshBtn}>
              Refresh
            </button>
          </div>

          <div style={styles.grid}>
            {tasks.map((task) => {
              const expired = isExpired(task.deadline);
              const status = getSubmissionStatus(task.id);
              const blocked = isTaskBlocked(task);
              const btnInfo = getButtonInfo(task);

              return (
                <div
                  key={task.id}
                  style={{
                    ...styles.card,
                    opacity: expired ? 0.6 : 1,
                  }}
                >
                  {/* ── Status Badge ── */}
                  <div style={styles.badgeRow}>
                    {status === "approved" && (
                      <span style={{ ...styles.badge, background: "#1c3027", color: "#a8e6bf", border: "1px solid #315b43" }}>
                        ✅ Completed
                      </span>
                    )}
                    {status === "pending" && (
                      <span style={{ ...styles.badge, background: "#302a1e", color: "#f5d28a", border: "1px solid #6b5c2e" }}>
                        ⏳ Pending
                      </span>
                    )}
                    {status === "rejected" && (
                      <span style={{ ...styles.badge, background: "#3a2024", color: "#ffb8bf", border: "1px solid #754047" }}>
                        ❌ Rejected — Resubmit allowed
                      </span>
                    )}
                    {expired && (
                      <span style={{ ...styles.badge, background: "#2b2022", color: "#ff9999", border: "1px solid #63383d" }}>
                        ⛔ Expired
                      </span>
                    )}
                  </div>

                  {/* ── Task Title ── */}
                  <h3 style={styles.cardTitle}>{task.title}</h3>

                  {/* ── Description ── */}
                  <p style={styles.cardDesc}>
                    {task.description || "No description provided."}
                  </p>

                  {/* ── Task Details ── */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Reward</span>
                    <span style={styles.detailValue}>
                      Rs. {Number(task.reward_amount).toLocaleString("en-PK")}
                    </span>
                  </div>

                  {task.deadline && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Deadline</span>
                      <span
                        style={{
                          ...styles.detailValue,
                          color: expired ? "#ff9999" : "#e0e1e5",
                        }}
                      >
                        {formatDate(task.deadline)}
                        {expired && " (Expired)"}
                      </span>
                    </div>
                  )}

                  {/* FIX #4: Show posted date */}
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Posted</span>
                    <span style={styles.detailValue}>
                      {formatDate(task.created_at)}
                    </span>
                  </div>

                  {/* ── Action Button ── */}
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => {
                      if (!blocked) onSelectTask(task);
                    }}
                    style={{
                      ...btnBase,
                      ...btnInfo.style,
                      cursor: blocked ? "not-allowed" : "pointer",
                    }}
                  >
                    {btnInfo.text}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ───────── Styles ───────── */

const styles: Record<string, CSSProperties> = {
  container: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: 14,
    padding: 28,
    color: "#f1f3f5",
  },
  label: {
    fontSize: 13,
    color: "#aeb4bd",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 24,
    margin: "10px 0",
  },
  description: {
    color: "#aeb4bd",
    lineHeight: 1.7,
    fontSize: 14,
  },
  message: {
    marginTop: 24,
    padding: 20,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    color: "#f1f3f5",
  },
  errorMessage: {
    marginTop: 24,
    padding: 20,
    background: "#2b2022",
    border: "1px solid #63383d",
    borderRadius: 10,
    color: "#ffb4b4",
  },
  retryBtn: {
    display: "block",
    marginTop: 14,
    padding: "10px 16px",
    border: "none",
    borderRadius: 7,
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 600,
    cursor: "pointer",
  },
  taskCount: {
    marginTop: 20,
    color: "#aeb4bd",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  refreshBtn: {
    padding: "7px 12px",
    border: "1px solid #59616d",
    borderRadius: 6,
    background: "#22262d",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
    marginTop: 16,
  },
  card: {
    padding: 20,
    borderRadius: 10,
    background: "#22262d",
    border: "1px solid #3a414b",
    display: "flex",
    flexDirection: "column",
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
    minHeight: 0,
  },
  badge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  cardTitle: {
    fontSize: 17,
    margin: "0 0 10px",
  },
  cardDesc: {
    color: "#aeb4bd",
    fontSize: 14,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
    flex: 1,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderTop: "1px solid #353740",
    fontSize: 13,
  },
  detailLabel: {
    color: "#858995",
  },
  detailValue: {
    color: "#e0e1e5",
    fontWeight: 600,
  },
};

/* ── Button Styles ── */

const btnBase: CSSProperties = {
  width: "100%",
  marginTop: 16,
  padding: 12,
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 14,
};

const btnDefault: CSSProperties = {
  background: "#e5e7eb",
  color: "#17191d",
};

const btnCompleted: CSSProperties = {
  background: "#1c3027",
  color: "#a8e6bf",
  border: "1px solid #315b43",
};

const btnPending: CSSProperties = {
  background: "#302a1e",
  color: "#f5d28a",
  border: "1px solid #6b5c2e",
};

const btnExpired: CSSProperties = {
  background: "#2b2022",
  color: "#ff9999",
  border: "1px solid #63383d",
};

const btnResubmit: CSSProperties = {
  background: "#1e2a3a",
  color: "#93c5fd",
  border: "1px solid #2e4a6a",
};

