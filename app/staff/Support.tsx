
"use client";

import { useEffect, useState, FormEvent } from "react";
import { supabase } from "../../lib/supabase";

type SupportTicket = {
  id: string;
  subject: string;
  category: string;
  message: string;
  priority: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");

  async function loadTickets() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Aap ka login session nahi mila. Dobara login karein.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("support_tickets")
      .select(
        "id, subject, category, message, priority, status, admin_reply, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setTickets((data || []) as SupportTicket[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!subject.trim() || !message.trim()) {
      setError("Subject aur message dono zaroori hain.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Aap ka login session nahi mila. Dobara login karein.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        message: message.trim(),
        priority,
        status: "open",
      });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setSubject("");
    setCategory("general");
    setPriority("normal");
    setMessage("");
    setSuccess("Aap ki support request successfully submit ho gayi hai.");

    await loadTickets();
    setSubmitting(false);
  }

  function statusColor(status: string) {
    switch (status.toLowerCase()) {
      case "resolved":
      case "closed":
        return "#4ade80";
      case "in_progress":
      case "in progress":
        return "#60a5fa";
      default:
        return "#fbbf24";
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const styles = {
    card: {
      background: "#17191d",
      border: "1px solid #30343b",
      borderRadius: "14px",
      padding: "24px",
      color: "#f1f3f5",
      marginBottom: "22px",
    } as const,
    input: {
      width: "100%",
      padding: "12px 14px",
      borderRadius: "8px",
      border: "1px solid #3a414b",
      background: "#17191d",
      color: "#f1f3f5",
      outline: "none",
      fontSize: "14px",
      boxSizing: "border-box" as const,
    },
    label: {
      display: "block",
      marginBottom: "8px",
      color: "#c4cbd4",
      fontSize: "14px",
      fontWeight: 600,
    } as const,
  };

  return (
    <div style={{ color: "#f1f3f5" }}>
      <div style={styles.card}>
        <div style={{ color: "#aeb4bd", fontSize: "13px" }}>
          STAFF WORKSPACE
        </div>

        <h2 style={{ fontSize: "24px", margin: "10px 0" }}>
          Support & Help
        </h2>

        <p style={{ color: "#aeb4bd", lineHeight: 1.7, margin: 0 }}>
          Account, team ya company ke kaam se related masail ke liye
          support request submit karein. Aap apne tickets aur replies
          yahan check kar sakte hain.
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={{ fontSize: "19px", marginTop: 0 }}>
          Create Support Request
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label style={styles.label}>Subject</label>
            <input
              style={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Maslay ka subject likhein"
              maxLength={150}
              required
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            <div>
              <label style={styles.label}>Category</label>
              <select
                style={styles.input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="general">General</option>
                <option value="account">Account</option>
                <option value="team">Team</option>
                <option value="payment">Payment</option>
                <option value="technical">Technical</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Priority</label>
              <select
                style={styles.input}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={styles.label}>Message</label>
            <textarea
              style={{
                ...styles.input,
                minHeight: "130px",
                resize: "vertical",
                fontFamily: "inherit",
              }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Apna masla detail se likhein..."
              maxLength={5000}
              required
            />
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: "14px" }}>
              {error}
            </p>
          )}

          {success && (
            <p style={{ color: "#4ade80", fontSize: "14px" }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? "#475569" : "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 22px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <h3 style={{ fontSize: "19px", margin: 0 }}>
            My Support Tickets
          </h3>

          <button
            type="button"
            onClick={loadTickets}
            style={{
              background: "#252b34",
              color: "#e2e8f0",
              border: "1px solid #3a414b",
              borderRadius: "8px",
              padding: "9px 14px",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#aeb4bd" }}>Tickets load ho rahe hain...</p>
        ) : tickets.length === 0 ? (
          <p style={{ color: "#aeb4bd" }}>
            Abhi aap ki koi support request nahi hai.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  background: "#22262d",
                  border: "1px solid #3a414b",
                  borderRadius: "10px",
                  padding: "18px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: "16px" }}>
                    {ticket.subject}
                  </h4>

                  <span
                    style={{
                      color: statusColor(ticket.status),
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {ticket.status.replace("_", " ")}
                  </span>
                </div>

                <p
                  style={{
                    color: "#aeb4bd",
                    fontSize: "13px",
                    margin: "10px 0",
                  }}
                >
                  Category: {ticket.category} | Priority: {ticket.priority}
                </p>

                <p
                  style={{
                    color: "#d1d5db",
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontSize: "14px",
                  }}
                >
                  {ticket.message}
                </p>

                <p style={{ color: "#89919d", fontSize: "12px" }}>
                  Submitted: {formatDate(ticket.created_at)}
                </p>

                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    background: "#17191d",
                    borderRadius: "8px",
                    border: "1px solid #30343b",
                  }}
                >
                  <div
                    style={{
                      color: "#93c5fd",
                      fontSize: "13px",
                      fontWeight: 600,
                      marginBottom: "8px",
                    }}
                  >
                    Founder / Admin Reply
                  </div>

                  <p
                    style={{
                      color: ticket.admin_reply ? "#e2e8f0" : "#89919d",
                      fontSize: "14px",
                      lineHeight: 1.7,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {ticket.admin_reply || "Abhi tak koi reply nahi aaya."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
