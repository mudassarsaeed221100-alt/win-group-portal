
"use client";

import { useEffect, useState, FormEvent, type CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

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

type FilterStatus = "all" | "open" | "in_progress" | "resolved" | "closed";

/* ───────── Component ───────── */

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Form */
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");

  /* Filter & Expand */
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ── Load Tickets ── */
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

  /* ── Auto-clear success message ── */
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  /* ── Submit Ticket ── */
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

  /* ── Reset Form ── */
  function resetForm() {
    setSubject("");
    setCategory("general");
    setPriority("normal");
    setMessage("");
    setError("");
    setSuccess("");
  }

  /* ── Helpers ── */

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function relativeTime(date: string): string {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "Abhi abhi";
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay} days ago`;
    return formatDate(date);
  }

  function truncate(text: string, max: number = 150): string {
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + "...";
  }

  /* ── Badge Helpers ── */

  function getStatusBadge(status: string) {
    const map: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
      open: { bg: "#302a1e", color: "#f5d28a", border: "#6b5c2e", label: "Open", icon: "🟡" },
      in_progress: { bg: "#1e2a3a", color: "#93c5fd", border: "#2e4a6a", label: "In Progress", icon: "🔵" },
      resolved: { bg: "#1c3027", color: "#a8e6bf", border: "#315b43", label: "Resolved", icon: "✅" },
      closed: { bg: "#2a2d35", color: "#aeb4bd", border: "#4a5060", label: "Closed", icon: "⬜" },
    };
    return map[status.toLowerCase()] || map.open;
  }

  function getPriorityBadge(prio: string) {
    const map: Record<string, { bg: string; color: string; border: string; label: string; icon: string }> = {
      normal: { bg: "#1e2a3a", color: "#93c5fd", border: "#2e4a6a", label: "Normal", icon: "🔹" },
      high: { bg: "#302a1e", color: "#f5d28a", border: "#6b5c2e", label: "High", icon: "🔸" },
      urgent: { bg: "#3a2024", color: "#ffb8bf", border: "#754047", label: "Urgent", icon: "🔴" },
    };
    return map[prio.toLowerCase()] || map.normal;
  }

  function getCategoryIcon(cat: string): string {
    const map: Record<string, string> = {
      general: "📋",
      account: "👤",
      team: "👥",
      payment: "💰",
      technical: "🔧",
    };
    return map[cat.toLowerCase()] || "📋";
  }

  /* ── Filtered Tickets ── */
  const filtered = activeFilter === "all"
    ? tickets
    : tickets.filter((t) => t.status.toLowerCase() === activeFilter);

  /* ── Stats ── */
  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
  };

  /* ── Filter Tabs ── */
  const filterTabs: { key: FilterStatus; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "open", label: "Open", count: stats.open },
    { key: "in_progress", label: "In Progress", count: stats.inProgress },
    { key: "resolved", label: "Resolved", count: stats.resolved },
  ];

  /* ───────── Render ───────── */

  return (
    <div style={styles.wrapper}>
      {/* ── Header ── */}
      <div style={styles.card}>
        <div style={styles.smallTitle}>STAFF WORKSPACE</div>
        <h2 style={styles.heading}>Support & Help</h2>
        <p style={styles.muted}>
          Account, team ya company ke kaam se related masail ke liye support
          request submit karein. Aap apne tickets aur replies yahan check kar
          sakte hain.
        </p>
      </div>

      {/* ── Ticket Stats ── */}
      {!loading && tickets.length > 0 && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Total</span>
            <strong style={styles.statValue}>{stats.total}</strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Open</span>
            <strong style={{ ...styles.statValue, color: "#f5d28a" }}>{stats.open}</strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>In Progress</span>
            <strong style={{ ...styles.statValue, color: "#93c5fd" }}>{stats.inProgress}</strong>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Resolved</span>
            <strong style={{ ...styles.statValue, color: "#a8e6bf" }}>{stats.resolved}</strong>
          </div>
        </div>
      )}

      {/* ── Create Ticket Form ── */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Create Support Request</h3>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Subject</label>
            <input
              style={styles.input}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Maslay ka subject likhein"
              maxLength={150}
              disabled={submitting}
              required
            />
            <div style={styles.charCount}>{subject.length}/150</div>
          </div>

          <div style={styles.formRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Category</label>
              <select
                style={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                <option value="general">📋 General</option>
                <option value="account">👤 Account</option>
                <option value="team">👥 Team</option>
                <option value="payment">💰 Payment</option>
                <option value="technical">🔧 Technical</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>Priority</label>
              <select
                style={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={submitting}
              >
                <option value="normal">🔹 Normal</option>
                <option value="high">🔸 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Message</label>
            <textarea
              style={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Apna masla detail se likhein..."
              maxLength={5000}
              disabled={submitting}
              required
            />
            <div style={styles.charCount}>{message.length}/5000</div>
          </div>

          {error && (
            <div style={styles.errorMsg}>{error}</div>
          )}

          {success && (
            <div style={styles.successMsg}>{success}</div>
          )}

          <div style={styles.formActions}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.submitBtn,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              style={styles.resetBtn}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* ── Tickets List ── */}
      <div style={styles.card}>
        <div style={styles.ticketHeader}>
          <h3 style={styles.sectionTitle}>My Support Tickets</h3>
          <button type="button" onClick={loadTickets} style={styles.refreshBtn}>
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        {!loading && tickets.length > 0 && (
          <div style={styles.filterRow}>
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  ...styles.filterTab,
                  ...(activeFilter === tab.key ? styles.filterTabActive : {}),
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={styles.infoBox}>Tickets load ho rahe hain...</div>
        ) : tickets.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 28 }}>🎫</div>
            <p>Abhi aap ki koi support request nahi hai.</p>
            <p style={{ fontSize: 12, color: "#858995" }}>
              Upar form se apni pehli support request submit karein.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyState}>
            <p>Koi &quot;{activeFilter.replace("_", " ")}&quot; ticket nahi hai.</p>
          </div>
        ) : (
          <div style={styles.ticketList}>
            {filtered.map((ticket) => {
              const sBadge = getStatusBadge(ticket.status);
              const pBadge = getPriorityBadge(ticket.priority);
              const isExpanded = expandedId === ticket.id;
              const isLong = ticket.message.length > 150;
              const hasReply = !!ticket.admin_reply;
              const wasUpdated =
                ticket.updated_at &&
                ticket.updated_at !== ticket.created_at &&
                new Date(ticket.updated_at).getTime() - new Date(ticket.created_at).getTime() > 60000;

              return (
                <div key={ticket.id} style={styles.ticketCard}>
                  {/* Header */}
                  <div style={styles.ticketTop}>
                    <h4 style={styles.ticketSubject}>
                      {getCategoryIcon(ticket.category)} {ticket.subject}
                    </h4>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 600,
                        background: sBadge.bg,
                        color: sBadge.color,
                        border: `1px solid ${sBadge.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {sBadge.icon} {sBadge.label}
                    </span>
                  </div>

                  {/* Meta Row */}
                  <div style={styles.metaRow}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                        background: pBadge.bg,
                        color: pBadge.color,
                        border: `1px solid ${pBadge.border}`,
                      }}
                    >
                      {pBadge.icon} {pBadge.label}
                    </span>

                    <span style={styles.categoryTag}>
                      {getCategoryIcon(ticket.category)} {ticket.category}
                    </span>
                  </div>

                  {/* Message */}
                  <p
                    style={{
                      ...styles.ticketMessage,
                      cursor: isLong ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (isLong) setExpandedId(isExpanded ? null : ticket.id);
                    }}
                  >
                    {isExpanded || !isLong
                      ? ticket.message
                      : truncate(ticket.message)}
                  </p>

                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                      style={styles.expandBtn}
                    >
                      {isExpanded ? "Show Less ▲" : "Read More ▼"}
                    </button>
                  )}

                  {/* Date Row */}
                  <div style={styles.dateRow}>
                    <span style={styles.relativeTime}>
                      {relativeTime(ticket.created_at)}
                    </span>
                    <span style={styles.absoluteDate}>
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>

                  {/* Last Updated */}
                  {wasUpdated && (
                    <div style={styles.updatedRow}>
                      Updated: {relativeTime(ticket.updated_at)}
                    </div>
                  )}

                  {/* Admin Reply — only when exists */}
                  {hasReply && (
                    <div style={styles.replyBox}>
                      <div style={styles.replyHeader}>
                        💬 Founder / Admin Reply
                      </div>
                      <p style={styles.replyText}>{ticket.admin_reply}</p>
                    </div>
                  )}

                  {/* Awaiting reply indicator */}
                  {!hasReply && ticket.status === "open" && (
                    <div style={styles.awaitingReply}>
                      ⏳ Reply ka intezaar hai...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Styles ───────── */

const styles: Record<string, CSSProperties> = {
  wrapper: {
    color: "#f1f3f5",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  card: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: 14,
    padding: 24,
  },
  smallTitle: {
    fontSize: 13,
    color: "#aeb4bd",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 24,
    margin: "10px 0 6px",
  },
  muted: {
    color: "#aeb4bd",
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
  },
  sectionTitle: {
    fontSize: 18,
    margin: 0,
  },

  /* Stats */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  statCard: {
    padding: 16,
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#858995",
  },
  statValue: {
    fontSize: 22,
    color: "#ffffff",
  },

  /* Form */
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    display: "flex",
    gap: 14,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  label: {
    display: "block",
    marginBottom: 7,
    color: "#c4cbd4",
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #3a414b",
    background: "#22262d",
    color: "#f1f3f5",
    outline: "none",
    fontSize: 14,
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #3a414b",
    background: "#22262d",
    color: "#f1f3f5",
    outline: "none",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 14px",
    borderRadius: 8,
    border: "1px solid #3a414b",
    background: "#22262d",
    color: "#f1f3f5",
    outline: "none",
    fontSize: 14,
    minHeight: 130,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.7,
  },
  charCount: {
    textAlign: "right",
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
  },
  formActions: {
    display: "flex",
    gap: 10,
    marginTop: 4,
  },
  submitBtn: {
    padding: "12px 24px",
    border: "none",
    borderRadius: 8,
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  resetBtn: {
    padding: "12px 18px",
    border: "1px solid #59616d",
    borderRadius: 8,
    background: "transparent",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },

  /* Messages */
  errorMsg: {
    padding: 13,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 14,
    background: "#2b2022",
    border: "1px solid #63383d",
    color: "#ffb4b4",
  },
  successMsg: {
    padding: 13,
    borderRadius: 8,
    marginBottom: 14,
    fontSize: 14,
    background: "#1c3027",
    border: "1px solid #315b43",
    color: "#a8e6bf",
  },

  /* Ticket Header */
  ticketHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  refreshBtn: {
    padding: "8px 14px",
    border: "1px solid #59616d",
    borderRadius: 7,
    background: "#22262d",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },

  /* Filter */
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    padding: "7px 14px",
    border: "1px solid #3a414b",
    borderRadius: 20,
    background: "#22262d",
    color: "#aeb4bd",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },
  filterTabActive: {
    background: "#e5e7eb",
    color: "#17191d",
    border: "1px solid #e5e7eb",
    fontWeight: 700,
  },

  /* States */
  infoBox: {
    padding: 18,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    color: "#aeb4bd",
    fontSize: 14,
  },
  emptyState: {
    padding: 28,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    textAlign: "center",
    color: "#aeb4bd",
    fontSize: 14,
  },

  /* Ticket Cards */
  ticketList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  ticketCard: {
    padding: 18,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
  },
  ticketTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  ticketSubject: {
    margin: 0,
    fontSize: 15,
    overflowWrap: "anywhere",
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
  },
  categoryTag: {
    fontSize: 12,
    color: "#858995",
    textTransform: "capitalize",
  },
  ticketMessage: {
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    margin: "12px 0 0",
  },
  expandBtn: {
    marginTop: 4,
    padding: 0,
    border: "none",
    background: "transparent",
    color: "#93c5fd",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
  dateRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  relativeTime: {
    color: "#aeb4bd",
    fontSize: 12,
    fontWeight: 600,
  },
  absoluteDate: {
    color: "#6b7280",
    fontSize: 11,
  },
  updatedRow: {
    marginTop: 4,
    fontSize: 11,
    color: "#858995",
    fontStyle: "italic",
  },

  /* Admin Reply */
  replyBox: {
    marginTop: 14,
    padding: 14,
    background: "#1e2a3a",
    borderRadius: 8,
    border: "1px solid #2e4a6a",
  },
  replyHeader: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },
  replyText: {
    color: "#e2e8f0",
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  awaitingReply: {
    marginTop: 12,
    fontSize: 12,
    color: "#858995",
    fontStyle: "italic",
  },
};

