
"use client";

import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

type SelectedTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
  created_at: string;
};

type Props = {
  selectedTask: SelectedTask | null;
  onBackToTasks: () => void;
};

type Submission = {
  id: string;
  task_id: string;
  work_description: string;
  proof_url: string | null;
  status: string;
  earning_amount: number;
  created_at: string;
  task_title?: string;
};

/* ───────── Component ───────── */

export default function SubmitWork({ selectedTask, onBackToTasks }: Props) {
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  /* Submission History */
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  /* Proof Preview Modal */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewType, setPreviewType] = useState<"image" | "pdf">("image");

  /* ── Load Submission History ── */
  async function loadHistory() {
    setHistoryLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setHistoryLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("work_submissions")
      .select("id, task_id, work_description, proof_url, status, earning_amount, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      /* Fetch task titles for history display */
      const taskIds = [...new Set(data.map((s) => s.task_id))];

      if (taskIds.length > 0) {
        const { data: tasks } = await supabase
          .from("work_tasks")
          .select("id, title")
          .in("id", taskIds);

        const taskMap = new Map((tasks || []).map((t) => [t.id, t.title]));

        const enriched = data.map((s) => ({
          ...s,
          task_title: taskMap.get(s.task_id) || "Unknown Task",
        }));

        setSubmissions(enriched as Submission[]);
      } else {
        setSubmissions(data as Submission[]);
      }
    }

    setHistoryLoading(false);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  /* ── FIX #1: Duplicate Submission Check ── */
  async function checkDuplicateSubmission(taskId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from("work_submissions")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .in("status", ["pending", "approved"]);

    if (error) return false;
    return (data || []).length > 0;
  }

  /* ── File Change Handler with Preview ── */
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    /* Clear previous preview */
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }

    if (!file) {
      setProofFile(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessageType("error");
      setMessage("Sirf JPG, PNG, WebP ya PDF file upload kar sakte hain.");
      setProofFile(null);
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessageType("error");
      setMessage("File ka size 5 MB se kam hona chahiye.");
      setProofFile(null);
      event.target.value = "";
      return;
    }

    setMessage("");
    setProofFile(file);

    /* FIX #7: Show image preview before upload */
    if (file.type.startsWith("image/")) {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  }

  /* ── Submit Handler ── */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedTask) {
      setMessageType("error");
      setMessage("Pehle Available Work Tasks se task select karein.");
      return;
    }

    if (!description.trim()) {
      setMessageType("error");
      setMessage("Work description likhna zaroori hai.");
      return;
    }

    if (!proofFile) {
      setMessageType("error");
      setMessage("Apna work proof upload karein.");
      return;
    }

    setSubmitting(true);

    try {
      /* FIX #1: Check for duplicate Pending/Approved submission */
      const isDuplicate = await checkDuplicateSubmission(selectedTask.id);
      if (isDuplicate) {
        throw new Error(
          "Aapne is task ke liye pehle se submission ki hai jo Pending ya Approved hai. Dobara submit nahi ho sakti."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Session expire ho gaya. Dobara login karein.");
      }

      const safeFileName = proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("work-proofs")
        .upload(filePath, proofFile, {
          contentType: proofFile.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error("Proof upload nahi hua: " + uploadError.message);
      }

      const { error: insertError } = await supabase
        .from("work_submissions")
        .insert({
          task_id: selectedTask.id,
          user_id: user.id,
          work_description: description.trim(),
          proof_url: filePath,
          status: "pending",
          earning_amount: 0,
        });

      if (insertError) {
        await supabase.storage.from("work-proofs").remove([filePath]);
        throw new Error("Submission save nahi hui: " + insertError.message);
      }

      setMessageType("success");
      setMessage(
        "Aapka work aur proof successfully submit ho gaya. Review pending hai."
      );
      setDescription("");
      setProofFile(null);

      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview(null);
      }

      const fileInput = document.getElementById(
        "work-proof-file"
      ) as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";

      /* FIX #6: Auto-refresh submission history after submit */
      await loadHistory();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Submission mein error aa gaya."
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── FIX #3: View Proof using Signed URL ── */
  async function viewProof(proofUrl: string) {
    setPreviewLoading(true);
    setPreviewUrl(null);

    const { data, error } = await supabase.storage
      .from("work-proofs")
      .createSignedUrl(proofUrl, 300); /* 5 minutes */

    if (error || !data?.signedUrl) {
      setMessageType("error");
      setMessage("Proof load nahi ho saka. Storage access check karein.");
      setPreviewLoading(false);
      return;
    }

    const isPdf = proofUrl.toLowerCase().endsWith(".pdf");
    setPreviewType(isPdf ? "pdf" : "image");
    setPreviewUrl(data.signedUrl);
    setPreviewLoading(false);
  }

  function closePreview() {
    setPreviewUrl(null);
  }

  /* ── Helpers ── */
  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function statusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
      pending: {
        bg: "#302a1e",
        color: "#f5d28a",
        border: "#6b5c2e",
        label: "⏳ Pending",
      },
      approved: {
        bg: "#1c3027",
        color: "#a8e6bf",
        border: "#315b43",
        label: "✅ Approved",
      },
      rejected: {
        bg: "#3a2024",
        color: "#ffb8bf",
        border: "#754047",
        label: "❌ Rejected",
      },
    };

    const s = map[status] || map.pending;

    return {
      display: "inline-block" as const,
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      label: s.label,
    };
  }

  /* ───────── Render: No Task Selected ───────── */

  if (!selectedTask) {
    return (
      <div style={styles.card}>
        <div style={styles.smallTitle}>STAFF WORKSPACE</div>
        <h2 style={styles.heading}>Submit Work & Proof</h2>
        <p style={styles.muted}>
          Proof submit karne ke liye pehle available task select karein.
        </p>
        <button type="button" onClick={onBackToTasks} style={styles.button}>
          Go to Available Tasks
        </button>

        {/* Show submission history even without task selected */}
        {renderHistory()}
      </div>
    );
  }

  /* ───────── Render: Submission History ───────── */

  function renderHistory() {
    return (
      <div style={styles.historySection}>
        <h3 style={styles.sectionTitle}>My Submission History</h3>
        <p style={styles.muted}>
          Aapki past submissions aur unka status yahan dikhega.
        </p>

        {historyLoading ? (
          <div style={styles.infoBox}>Submissions load ho rahi hain...</div>
        ) : submissions.length === 0 ? (
          <div style={styles.infoBox}>Abhi koi submission nahi ki gayi.</div>
        ) : (
          <div style={styles.historyList}>
            {submissions.map((sub) => {
              const badge = statusBadge(sub.status);

              return (
                <div key={sub.id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <strong style={{ fontSize: 14 }}>
                      {sub.task_title || "Task"}
                    </strong>
                    <span
                     style={{
                        display: badge.display,
                        padding: badge.padding,
                        borderRadius: badge.borderRadius,
                        fontSize: badge.fontSize,
                        fontWeight: badge.fontWeight,
                        background: badge.background,
                        color: badge.color,
                        border: badge.border,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p style={{ color: "#aeb4bd", fontSize: 13, margin: "8px 0", lineHeight: 1.5 }}>
                    {sub.work_description}
                  </p>

                  <div style={styles.historyMeta}>
                    <span>Submitted: {formatDate(sub.created_at)}</span>

                    {sub.status === "approved" && sub.earning_amount > 0 && (
                      <span style={{ color: "#a8e6bf", fontWeight: 600 }}>
                        Earned: Rs. {Number(sub.earning_amount).toLocaleString("en-PK")}
                      </span>
                    )}
                  </div>

                  {/* FIX #3: View Proof Button */}
                  {sub.proof_url && (
                    <button
                      type="button"
                      onClick={() => viewProof(sub.proof_url!)}
                      style={styles.viewProofBtn}
                    >
                      📎 View Proof
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ───────── Render: Main Form ───────── */

  return (
    <div style={styles.card}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>
      <h2 style={styles.heading}>Submit Work & Proof</h2>

      {/* Selected Task Info */}
      <div style={styles.taskBox}>
        <div style={styles.taskLabel}>SELECTED TASK</div>
        <h3 style={styles.taskTitle}>{selectedTask.title}</h3>

        <p style={styles.muted}>
          {selectedTask.description || "No task description provided."}
        </p>

        <div style={styles.reward}>
          Reward: Rs.{" "}
          {Number(selectedTask.reward_amount).toLocaleString("en-PK")}
        </div>

        {selectedTask.deadline && (
          <div style={styles.deadline}>
            Deadline: {formatDate(selectedTask.deadline)}
          </div>
        )}

        <button
          type="button"
          onClick={onBackToTasks}
          style={styles.changeButton}
          disabled={submitting}
        >
          Change Task
        </button>
      </div>

      {/* Submit Form */}
      <form onSubmit={handleSubmit}>
        <label style={styles.label}>Work Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Apne completed work ki details likhein..."
          rows={5}
          style={styles.textarea}
          disabled={submitting}
          required
        />

        <label style={styles.label}>Upload Work Proof</label>
        <div style={styles.uploadBox}>
          <input
            id="work-proof-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={submitting}
            style={styles.fileInput}
          />

          <p style={styles.fileNote}>
            JPG, PNG, WebP ya PDF. Maximum file size 5 MB.
          </p>

          {proofFile && (
            <div style={styles.fileName}>Selected: {proofFile.name}</div>
          )}

          {/* FIX #7: Image preview before upload */}
          {filePreview && (
            <img
              src={filePreview}
              alt="Preview"
              style={styles.imagePreview}
            />
          )}
        </div>

        {message && (
          <div
            style={{
              ...styles.message,
              ...(messageType === "success"
                ? styles.successMessage
                : styles.errorMessage),
            }}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            ...styles.button,
            opacity: submitting ? 0.6 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Submitting..." : "Submit Work & Proof"}
        </button>
      </form>

      <p style={styles.footerNote}>
        Submission ke baad status Pending rahega. Review aur approval ke baad
        earning update hogi.
      </p>

      {/* FIX #2: Submission History */}
      {renderHistory()}

      {/* FIX #3: Proof Preview Modal */}
      {(previewUrl || previewLoading) && (
        <div style={styles.modalOverlay} onClick={closePreview}>
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <strong>Proof Preview</strong>
              <button
                type="button"
                onClick={closePreview}
                style={styles.modalClose}
              >
                ✕
              </button>
            </div>

            {previewLoading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#aeb4bd" }}>
                Loading proof...
              </div>
            ) : previewType === "pdf" ? (
              <iframe
                src={previewUrl!}
                style={styles.pdfFrame}
                title="PDF Proof"
              />
            ) : (
              <img
                src={previewUrl!}
                alt="Work Proof"
                style={styles.proofImage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Styles ───────── */

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: 14,
    padding: 28,
    color: "#f1f3f5",
  },
  smallTitle: {
    fontSize: 13,
    color: "#aeb4bd",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 24,
    margin: "10px 0",
  },
  muted: {
    color: "#aeb4bd",
    fontSize: 14,
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  taskBox: {
    margin: "22px 0",
    padding: 20,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
  },
  taskLabel: {
    color: "#aeb4bd",
    fontSize: 12,
    letterSpacing: 1,
  },
  taskTitle: {
    fontSize: 19,
    margin: "10px 0",
  },
  reward: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: 600,
  },
  deadline: {
    marginTop: 8,
    fontSize: 13,
    color: "#aeb4bd",
  },
  changeButton: {
    marginTop: 16,
    padding: "9px 14px",
    border: "1px solid #59616d",
    borderRadius: 7,
    background: "transparent",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },
  label: {
    display: "block",
    margin: "18px 0 9px",
    fontSize: 14,
    fontWeight: 600,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    background: "#22262d",
    color: "#f1f3f5",
    border: "1px solid #3a414b",
    borderRadius: 8,
    outline: "none",
    resize: "vertical",
    fontSize: 14,
    lineHeight: 1.6,
  },
  uploadBox: {
    padding: 16,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 8,
  },
  fileInput: {
    width: "100%",
    color: "#f1f3f5",
  },
  fileNote: {
    color: "#aeb4bd",
    fontSize: 12,
    marginBottom: 0,
  },
  fileName: {
    marginTop: 10,
    fontSize: 13,
    color: "#d1d5db",
    overflowWrap: "anywhere",
  },
  imagePreview: {
    marginTop: 12,
    maxWidth: "100%",
    maxHeight: 200,
    borderRadius: 8,
    border: "1px solid #3a414b",
    objectFit: "contain",
  },
  message: {
    padding: 13,
    borderRadius: 8,
    marginTop: 18,
    fontSize: 14,
    lineHeight: 1.6,
  },
  successMessage: {
    background: "#1c3027",
    border: "1px solid #315b43",
    color: "#a8e6bf",
  },
  errorMessage: {
    background: "#2b2022",
    border: "1px solid #63383d",
    color: "#ffb4b4",
  },
  button: {
    width: "100%",
    marginTop: 20,
    padding: 13,
    border: "none",
    borderRadius: 8,
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  footerNote: {
    marginTop: 18,
    color: "#aeb4bd",
    fontSize: 13,
    lineHeight: 1.6,
  },

  /* ── History Section ── */
  historySection: {
    marginTop: 30,
    paddingTop: 24,
    borderTop: "1px solid #353740",
  },
  sectionTitle: {
    fontSize: 18,
    margin: "0 0 8px",
  },
  infoBox: {
    marginTop: 14,
    padding: 16,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 8,
    color: "#aeb4bd",
    fontSize: 14,
  },
  historyList: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  historyItem: {
    padding: 16,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  historyMeta: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    fontSize: 12,
    color: "#858995",
  },
  viewProofBtn: {
    marginTop: 10,
    padding: "7px 14px",
    border: "1px solid #59616d",
    borderRadius: 6,
    background: "transparent",
    color: "#93c5fd",
    cursor: "pointer",
    fontSize: 13,
  },

  /* ── Proof Preview Modal ── */
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    padding: 20,
  },
  modalContent: {
    background: "#1b1d24",
    border: "1px solid #41434b",
    borderRadius: 14,
    maxWidth: 700,
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #353740",
  },
  modalClose: {
    background: "transparent",
    border: "1px solid #59616d",
    color: "#f1f3f5",
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 14,
  },
  proofImage: {
    width: "100%",
    maxHeight: "70vh",
    objectFit: "contain",
    padding: 16,
  },
  pdfFrame: {
    width: "100%",
    height: "70vh",
    border: "none",
  },
};

