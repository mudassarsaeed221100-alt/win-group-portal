
"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import { supabase } from "../../lib/supabase";

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

export default function SubmitWork({
  selectedTask,
  onBackToTasks,
}: Props) {
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

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
  }

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
      setMessage("Aapka work aur proof successfully submit ho gaya. Review pending hai.");
      setDescription("");
      setProofFile(null);

      const fileInput = document.getElementById(
        "work-proof-file"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error ? error.message : "Submission mein error aa gaya."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

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
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>
      <h2 style={styles.heading}>Submit Work & Proof</h2>

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
            <div style={styles.fileName}>
              Selected: {proofFile.name}
            </div>
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
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: "14px",
    padding: "28px",
    color: "#f1f3f5",
  },
  smallTitle: {
    fontSize: "13px",
    color: "#aeb4bd",
  },
  heading: {
    fontSize: "24px",
    margin: "10px 0",
  },
  muted: {
    color: "#aeb4bd",
    fontSize: "14px",
    lineHeight: 1.7,
    whiteSpace: "pre-wrap",
  },
  taskBox: {
    margin: "22px 0",
    padding: "20px",
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: "10px",
  },
  taskLabel: {
    color: "#aeb4bd",
    fontSize: "12px",
    letterSpacing: "1px",
  },
  taskTitle: {
    fontSize: "19px",
    margin: "10px 0",
  },
  reward: {
    marginTop: "14px",
    fontSize: "14px",
    fontWeight: 600,
  },
  deadline: {
    marginTop: "8px",
    fontSize: "13px",
    color: "#aeb4bd",
  },
  changeButton: {
    marginTop: "16px",
    padding: "9px 14px",
    border: "1px solid #59616d",
    borderRadius: "7px",
    background: "transparent",
    color: "#f1f3f5",
    cursor: "pointer",
  },
  label: {
    display: "block",
    margin: "18px 0 9px",
    fontSize: "14px",
    fontWeight: 600,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    background: "#22262d",
    color: "#f1f3f5",
    border: "1px solid #3a414b",
    borderRadius: "8px",
    outline: "none",
    resize: "vertical",
    fontSize: "14px",
  },
  uploadBox: {
    padding: "16px",
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: "8px",
  },
  fileInput: {
    width: "100%",
    color: "#f1f3f5",
  },
  fileNote: {
    color: "#aeb4bd",
    fontSize: "12px",
    marginBottom: 0,
  },
  fileName: {
    marginTop: "10px",
    fontSize: "13px",
    color: "#d1d5db",
    overflowWrap: "anywhere",
  },
  message: {
    padding: "13px",
    borderRadius: "8px",
    marginTop: "18px",
    fontSize: "14px",
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
    marginTop: "20px",
    padding: "13px",
    border: "none",
    borderRadius: "8px",
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
  },
  footerNote: {
    marginTop: "18px",
    color: "#aeb4bd",
    fontSize: "13px",
    lineHeight: 1.6,
  },
};
