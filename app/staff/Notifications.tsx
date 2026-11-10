
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

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

      if (!active) return;

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

      if (!active) return;

      if (queryError) {
        setError(queryError.message);
        setNotifications([]);
      } else {
        setNotifications((data || []) as NotificationItem[]);
      }

      setLoading(false);
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function typeStyle(type: string): React.CSSProperties {
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

  return (
    <div style={styles.container}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>

      <h2 style={styles.heading}>Notifications</h2>

      <p style={styles.muted}>
        Company announcements, important instructions aur updates yahan
        dekhein.
      </p>

      {loading ? (
        <div style={styles.message}>Notifications load ho rahi hain...</div>
      ) : error ? (
        <div style={styles.error}>
          Notifications load nahi ho sakin: {error}
        </div>
      ) : notifications.length === 0 ? (
        <div style={styles.message}>
          <strong>No Notifications</strong>
          <p style={styles.muted}>
            Filhal aapke liye koi active notification available nahi hai.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {notifications.map((item) => (
            <article key={item.id} style={styles.notificationCard}>
              <div style={styles.cardTop}>
                <h3 style={styles.notificationTitle}>{item.title}</h3>

                <span
                  style={{
                    ...styles.typeBadge,
                    ...typeStyle(item.notification_type),
                  }}
                >
                  {item.notification_type}
                </span>
              </div>

              <p style={styles.notificationMessage}>{item.message}</p>

              <div style={styles.date}>
                {formatDate(item.created_at)}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
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
  },
  message: {
    marginTop: "24px",
    padding: "20px",
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: "10px",
    color: "#f1f3f5",
  },
  error: {
    marginTop: "24px",
    padding: "16px",
    background: "#2b2022",
    border: "1px solid #63383d",
    borderRadius: "10px",
    color: "#ffb4b4",
    lineHeight: 1.6,
  },
  list: {
    display: "grid",
    gap: "14px",
    marginTop: "24px",
  },
  notificationCard: {
    padding: "20px",
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: "10px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  notificationTitle: {
    fontSize: "17px",
    margin: 0,
    overflowWrap: "anywhere",
  },
  typeBadge: {
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "11px",
    textTransform: "capitalize",
    fontWeight: 600,
  },
  notificationMessage: {
    color: "#d1d5db",
    fontSize: "14px",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  date: {
    color: "#8f98a5",
    fontSize: "12px",
    marginTop: "14px",
  },
};
