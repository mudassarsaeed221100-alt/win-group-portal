
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
};

type FilterType = "all" | "info" | "success" | "warning" | "urgent";

/* ───────── Read Tracking (localStorage) ───────── */

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem("win_notif_read");
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem("win_notif_read", JSON.stringify([...ids]));
  } catch {}
}

/* ───────── Component ───────── */

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  /* ── Load Notifications ── */
  async function loadNotifications() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Staff profile load nahi ho saka.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("id, title, message, notification_type, created_at")
      .eq("status", "active")
      .contains("recipient_roles", [profile.role])
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setNotifications([]);
    } else {
      setNotifications((data || []) as NotificationItem[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    setReadIds(getReadIds());
    loadNotifications();
  }, []);

  /* ── Mark as Read ── */
  function markAsRead(id: string) {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    saveReadIds(updated);
  }

  function markAllAsRead() {
    const updated = new Set(readIds);
    notifications.forEach((n) => updated.add(n.id));
    setReadIds(updated);
    saveReadIds(updated);
  }

  /* ── Toggle Expand ── */
  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      markAsRead(id);
    }
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

  function typeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case "success": return "✅";
      case "warning": return "⚠️";
      case "urgent":
      case "danger": return "🚨";
      default: return "ℹ️";
    }
  }

  function typeStyle(type: string): CSSProperties {
    switch (type.toLowerCase()) {
      case "success":
        return {
          color: "#a8e6bf",
          background: "#1c3027",
          border: "1px solid #315b43",
        };
      case "warning":
        return {
          color: "#f5d28a",
          background: "#302a1e",
          border: "1px solid #5c4b2d",
        };
      case "urgent":
      case "danger":
        return {
          color: "#ffb4b4",
          background: "#2b2022",
          border: "1px solid #63383d",
        };
      default:
        return {
          color: "#b9d7ff",
          background: "#202b3a",
          border: "1px solid #354d69",
        };
    }
  }

  function truncateMessage(msg: string, maxLen: number = 120): string {
    if (msg.length <= maxLen) return msg;
    return msg.slice(0, maxLen).trimEnd() + "...";
  }

  /* ── Filtered Notifications ── */
  const filtered = activeFilter === "all"
    ? notifications
    : notifications.filter((n) => {
        const t = n.notification_type.toLowerCase();
        if (activeFilter === "urgent") return t === "urgent" || t === "danger";
        return t === activeFilter;
      });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  /* ── Filter Tabs ── */
  const filterTabs: { key: FilterType; label: string; icon: string }[] = [
    { key: "all", label: "All", icon: "📋" },
    { key: "info", label: "Info", icon: "ℹ️" },
    { key: "success", label: "Success", icon: "✅" },
    { key: "warning", label: "Warning", icon: "⚠️" },
    { key: "urgent", label: "Urgent", icon: "🚨" },
  ];

  /* ───────── Render ───────── */

  return (
    <div style={styles.container}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>

      <div style={styles.headerRow}>
        <div style={styles.headingRow}>
          <h2 style={styles.heading}>Notifications</h2>
          {unreadCount > 0 && (
            <span style={styles.unreadBadge}>{unreadCount} new</span>
          )}
        </div>
        <button type="button" onClick={loadNotifications} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>

      <p style={styles.muted}>
        Company announcements, important instructions aur updates yahan dekhein.
      </p>

      {/* ── Filter Tabs ── */}
      {!loading && !error && notifications.length > 0 && (
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
              {tab.icon} {tab.label}
            </button>
          ))}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              style={styles.markAllBtn}
            >
              ✓ Mark All Read
            </button>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={styles.message}>Notifications load ho rahi hain...</div>
      ) : error ? (
        <div style={styles.error}>
          Notifications load nahi ho sakin: {error}
          <button type="button" onClick={loadNotifications} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 28 }}>🔔</div>
          <p>
            {activeFilter === "all"
              ? "Filhal aapke liye koi active notification available nahi hai."
              : `Koi "${activeFilter}" notification nahi hai.`}
          </p>
        </div>
      ) : (
        <>
          <div style={styles.countRow}>
            {filtered.length} notification{filtered.length > 1 ? "s" : ""}
            {activeFilter !== "all" && ` (${activeFilter})`}
          </div>

          <div style={styles.list}>
            {filtered.map((item) => {
              const isRead = readIds.has(item.id);
              const isExpanded = expandedId === item.id;
              const isLong = item.message.length > 120;

              return (
                <article
                  key={item.id}
                  style={{
                    ...styles.notificationCard,
                    ...(isRead ? {} : styles.unreadCard),
                    cursor: isLong ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (isLong) toggleExpand(item.id);
                    else markAsRead(item.id);
                  }}
                >
                  {/* Unread dot */}
                  {!isRead && <div style={styles.unreadDot} />}

                  <div style={styles.cardTop}>
                    <h3 style={styles.notificationTitle}>
                      {typeIcon(item.notification_type)} {item.title}
                    </h3>

                    <span
                      style={{
                        ...styles.typeBadge,
                        ...typeStyle(item.notification_type),
                      }}
                    >
                      {item.notification_type}
                    </span>
                  </div>

                  <p style={styles.notificationMessage}>
                    {isExpanded || !isLong
                      ? item.message
                      : truncateMessage(item.message)}
                  </p>

                  {isLong && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                      }}
                      style={styles.expandBtn}
                    >
                      {isExpanded ? "Show Less ▲" : "Read More ▼"}
                    </button>
                  )}

                  <div style={styles.dateRow}>
                    <span style={styles.relativeTime}>
                      {relativeTime(item.created_at)}
                    </span>
                    <span style={styles.absoluteDate}>
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </article>
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
  smallTitle: {
    fontSize: 13,
    color: "#aeb4bd",
    letterSpacing: 1,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  headingRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  heading: {
    fontSize: 24,
    margin: "10px 0",
  },
  unreadBadge: {
    padding: "4px 10px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 700,
    background: "#e74c3c",
    color: "#ffffff",
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
  muted: {
    color: "#aeb4bd",
    fontSize: 14,
    lineHeight: 1.7,
  },

  /* Filter Tabs */
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
    alignItems: "center",
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
  markAllBtn: {
    marginLeft: "auto",
    padding: "7px 14px",
    border: "1px solid #315b43",
    borderRadius: 20,
    background: "transparent",
    color: "#a8e6bf",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  /* Count */
  countRow: {
    marginTop: 16,
    color: "#858995",
    fontSize: 13,
  },

  /* States */
  message: {
    marginTop: 24,
    padding: 20,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    color: "#f1f3f5",
  },
  error: {
    marginTop: 24,
    padding: 16,
    background: "#2b2022",
    border: "1px solid #63383d",
    borderRadius: 10,
    color: "#ffb4b4",
    lineHeight: 1.6,
  },
  retryBtn: {
    display: "block",
    marginTop: 12,
    padding: "9px 16px",
    border: "none",
    borderRadius: 7,
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 600,
    cursor: "pointer",
  },
  emptyState: {
    marginTop: 24,
    padding: 28,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    textAlign: "center",
    color: "#aeb4bd",
    fontSize: 14,
  },

  /* Notification Cards */
  list: {
    display: "grid",
    gap: 12,
    marginTop: 12,
  },
  notificationCard: {
    position: "relative",
    padding: 20,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    transition: "border-color 0.2s",
  },
  unreadCard: {
    borderLeft: "3px solid #e74c3c",
    background: "#252830",
  },
  unreadDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#e74c3c",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  notificationTitle: {
    fontSize: 16,
    margin: 0,
    overflowWrap: "anywhere",
  },
  typeBadge: {
    padding: "5px 10px",
    borderRadius: 6,
    fontSize: 11,
    textTransform: "capitalize",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  notificationMessage: {
    color: "#d1d5db",
    fontSize: 14,
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    margin: "10px 0 0",
  },
  expandBtn: {
    marginTop: 6,
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
};

