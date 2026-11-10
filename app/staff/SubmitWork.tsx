
"use client";

import { useState } from "react";
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
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );
  const [fileInputKey, setFileInputKey] = useState(0);

  async function submitWork() {
    setMessage("");

    if (!selectedTask) {
      setMessageType("error");
      setMessage("Pehle Available Work Tasks se task select karein.");
      return;
    }

    if (!description.trim()) {
      setMessageType("error");
      setMessage("Apne completed work ki description likhein.");
      return;
    }

    if (!proofFile) {
      setMessageType("error");
      setMessage("Proof image ya PDF file select karein.");
      return;
    }

    const isImage = proofFile.type.startsWith("image/");
    const isPdf = proofFile.type === "application/pdf";

    if (!isImage && !isPdf) {
      setMessageType("error");
      setMessage("Sirf image ya PDF file upload kar sakte hain.");
      return;
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Proof file ka size 5 MB se kam hona chahiye.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("Session expire ho gaya. Dobara login karein.");

      const safeFileName = proofFile.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );

      const filePath = `${user.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("work-proofs")
        .upload(filePath, proofFile, {
          upsert: false,
          contentType: proofFile.type,
        });

      if (uploadError) throw uploadError;

      const { error: submissionError } = await supabase
        .from("work_submissions")
        .insert({
          task_id: selectedTask.id,
          user_id: user.id,
          work_description: description.trim(),
          proof_url: filePath,
          status: "pending",
          earning_amount: 0,
        });

      if (submissionError) throw submissionError;

      setMessageType("success");
      setMessage("Aapka work aur proof successfully submit ho gaya hai. Review ka intezar karein.");
      setDescription("");
      setProofFile(null);
      setFileInputKey((previous) => previous + 1);
    } catch (error) {
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Submission complete nahi ho saki."
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

  return (
    <div
      style={{
        background: "#17191d",
        border: "1px solid #30343b",
        borderRadius: "14px",
        padding: "28px",
        color: "#f1f3f5",
      }}
    >
      <div style={{ fontSize: "13px", color: "#aeb4bd" }}>
        STAFF WORKSPACE
      </div>

      <h2 style={{ fontSize: "24px", margin: "10px 0" }}>
        Submit Work & Proof
      </h2>

      <p style={{ color: "#aeb4bd", lineHeight: 1.7 }}>
        Selected task ka completed work aur uska proof yahan submit karein.
      </p>

      {!selectedTask ? (
        <div
          style={{
            marginTop: "24px",
            padding: "20px",
            borderRadius: "10px",
            background: "#22262d",
            border: "1px solid #3a414b",
          }}
        >
          <strong>Task Select Nahi Hua</strong>

          <p style={{ color: "#aeb4bd", fontSize: "14px", lineHeight: 1.7 }}>
            Proof submit karne se pehle Available Work Tasks mein se task select karein.
          </p>

          <button
            type="button"
            onClick={onBackToTasks}
            style={buttonStyle}
          >
            Available Work Tasks
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: "24px",
              padding: "20px",
              borderRadius: "10px",
              background: "#22262d",
              border: "1px solid #555b68",
            }}
          >
            <div style={{ color: "#aeb4bd", fontSize: "12px" }}>
              SELECTED TASK
            </div>

            <h3 style={{ margin: "9px 0", fontSize: "19px" }}>
              {selectedTask.title}
            </h3>

            <p style={{ color: "#aeb4bd", fontSize: "14px", lineHeight: 1.7 }}>
              {selectedTask.description || "No task description provided."}
            </p>

            <div style={{ fontSize: "14px", marginTop: "12px" }}>
              Reward: Rs. {Number(selectedTask.reward_amount).toLocaleString("en-PK")}
            </div>

            {selectedTask.deadline && (
              <div style={{ color: "#aeb4bd", fontSize: "13px", marginTop: "7px" }}>
                Deadline: {formatDate(selectedTask.deadline)}
              </div>
            )}

            <button
              type="button"
              onClick={onBackToTasks}
              style={{
                ...buttonStyle,
                background: "#343943",
                color: "#f1f3f5",
                border: "1px solid #555b68",
              }}
            >
              Change Task
            </button>
          </div>

          <div style={{ marginTop: "24px" }}>
            <label style={labelStyle}>
              Work Description
            </label>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Apne completed work ki details likhein..."
              rows={5}
              style={{
                ...inputStyle,
                resize: "vertical",
              }}
            />

            <label style={{ ...labelStyle, marginTop: "20px" }}>
              Upload Work Proof
            </label>

            <input
              key={fileInputKey}
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) =>
                setProofFile(event.target.files?.[0] || null)
              }
              style={{
                display: "block",
                width: "100%",
                color: "#d1d5db",
                marginTop: "10px",
              }}
            />

            <p style={{ color: "#aeb4bd", fontSize: "12px" }}>
              Image ya PDF. Maximum file size 5 MB.
            </p>

            {proofFile && (
              <p style={{ color: "#d1d5db", fontSize: "13px" }}>
                Selected file: {proofFile.name}
              </p>
            )}

            <button
              type="button"
              onClick={submitWork}
              disabled={submitting}
              style={{
                ...buttonStyle,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit Work & Proof"}
            </button>

            {message && (
              <p
                style={{
                  marginTop: "16px",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  color: messageType === "success" ? "#a7e0b5" : "#ffaaaa",
                }}
              >
                {message}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#d7d9df",
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "9px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "13px",
  background: "#101116",
  border: "1px solid #4a4d57",
  borderRadius: "8px",
  color: "#f1f3f5",
  fontSize: "14px",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "16px",
  padding: "11px 16px",
  border: "1px solid #888d99",
  borderRadius: "8px",
  background: "#e5e7eb",
  color: "#17191d",
  fontWeight: 600,
  cursor: "pointer",
};
