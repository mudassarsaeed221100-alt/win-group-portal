
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Notification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  recipient_roles: string[];
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  scheduled_for?: string;
};

const roles = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Admin", value: "admin" },
  { label: "Founder", value: "founder_owner" },
  { label: "Staff", value: "staff" },
];

const notificationTypes = [
  { label: "Information", value: "info", color: "#3b82f6" },
  { label: "Success", value: "success", color: "#10b981" },
  { label: "Warning", value: "warning", color: "#f59e0b" },
  { label: "Urgent", value: "urgent", color: "#ef4444" },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── Load Notifications ── */
  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
    } catch (err: any) {
      showNotice(err.message || "Failed to load notifications", "error");
    }
  }

  /* ── Filter & Search ── */
  useEffect(() => {
    let filtered = notifications;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.message.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((n) => n.notification_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((n) => n.status === statusFilter);
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1);
    setSelectedNotifications(new Set());
  }, [searchTerm, typeFilter, statusFilter, notifications]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Stats ── */
  const stats = {
    total: notifications.length,
    active: notifications.filter((n) => n.status === "active").length,
    inactive: notifications.filter((n) => n.status === "inactive").length,
    urgent: notifications.filter((n) => n.notification_type === "urgent").length,
  };

  /* ── Show Notice ── */
  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  }

  /* ── Toggle Role ── */
  function toggleRole(role: string) {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  }

  /* ── Toggle Notification Selection ── */
  function toggleNotificationSelection(id: string) {
    const newSet = new Set(selectedNotifications);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedNotifications(newSet);
  }

  /* ── Select All ── */
  function toggleSelectAll() {
    if (selectedNotifications.size === paginatedNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      const newSet = new Set(paginatedNotifications.map((n) => n.id));
      setSelectedNotifications(newSet);
    }
  }

  /* ── Reset Form ── */
  function resetForm() {
    setTitle("");
    setMessage("");
    setType("info");
    setSelectedRoles([]);
    setScheduledFor("");
    setEditingId(null);
    setNotice("");
  }

  /* ── Save Notification ── */
  async function saveNotification() {
    if (!title.trim() || !message.trim()) {
      showNotice("Title aur message dono zaroori hain.", "error");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        throw new Error("Aapka session expire ho gaya hai. Dobara login karein.");
      }

      const record = {
        title: title.trim(),
        message: message.trim(),
        notification_type: type,
        recipient_roles: selectedRoles,
        scheduled_for: scheduledFor || null,
        updated_at: new Date().toISOString(),
      };

      let error;

      if (editingId) {
        const result = await supabase
          .from("notifications")
          .update(record)
          .eq("id", editingId);

        error = result.error;
      } else {
        const result = await supabase
          .from("notifications")
          .insert({
            ...record,
            created_by: user.id,
          });

        error = result.error;
      }

      if (error) throw error;

      showNotice(
        editingId ? "Notification update ho gayi." : "Notification create ho gayi.",
        "success"
      );
      resetForm();
      await fetchNotifications();
    } catch (err: any) {
      showNotice(err.message || "Save nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Edit Notification ── */
  function editNotification(item: Notification) {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setType(item.notification_type);
    setSelectedRoles(item.recipient_roles || []);
    setScheduledFor(item.scheduled_for || "");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Toggle Status ── */
  async function toggleStatus(item: Notification) {
    const newStatus = item.status === "active" ? "inactive" : "active";

    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      showNotice("Notification status update ho gaya.", "success");
      await fetchNotifications();
    } catch (err: any) {
      showNotice(err.message || "Status update nahi hua", "error");
    }
  }

  /* ── Delete Notification ── */
  async function deleteNotification(id: string) {
    if (!window.confirm("Kya aap ye notification delete karna chahte hain?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showNotice("Notification delete ho gayi.", "success");
      if (editingId === id) resetForm();
      await fetchNotifications();
    } catch (err: any) {
      showNotice(err.message || "Delete nahi hua", "error");
    }
  }

  /* ── Bulk Delete ── */
  async function bulkDelete() {
    if (selectedNotifications.size === 0) {
      showNotice("Koi notification select nahi hai.", "error");
      return;
    }

    if (!window.confirm(`${selectedNotifications.size} notifications delete karenge?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", Array.from(selectedNotifications));

      if (error) throw error;

      showNotice(`${selectedNotifications.size} notifications delete ho gaye.`, "success");
      setSelectedNotifications(new Set());
      await fetchNotifications();
    } catch (err: any) {
      showNotice(err.message || "Bulk delete nahi hua", "error");
    }
  }

  /* ── Get Type Color ── */
  function getTypeColor(type: string) {
    return notificationTypes.find((t) => t.value === type)?.color || "#888";
  }

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            COMMUNICATION CENTER
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Notifications Center</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            System announcements aur important notifications manage karein.
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total", value: stats.total, color: "#3b82f6" },
            { label: "Active", value: stats.active, color: "#10b981" },
            { label: "Inactive", value: stats.inactive, color: "#888" },
            { label: "Urgent", value: stats.urgent, color: "#ef4444" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888" }}>{stat.label}</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: stat.color, marginTop: "6px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      {notice && (
        <div
          style={{
            padding: "12px 16px",
            background: noticeType === "success" ? "#064e3b" : "#7f1d1d",
            color: noticeType === "success" ? "#86efac" : "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {noticeType === "success" ? "✓" : "✕"} {notice}
        </div>
      )}

      {/* ── Create/Edit Form ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
            {editingId ? "EDIT NOTIFICATION" : "CREATE NOTIFICATION"}
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
            {editingId ? "Edit Notification" : "Create New Notification"}
          </h3>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Notification Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#252525",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Apna announcement ya message likhein..."
              rows={4}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#252525",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
                fontFamily: "Arial, sans-serif",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Notification Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              >
                {notificationTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Schedule For (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "8px", fontWeight: "bold" }}>
              Send To (Optional)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
              {roles.map((role) => (
                <label
                  key={role.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px",
                    background: selectedRoles.includes(role.value) ? "#2563eb" : "#252525",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    fontSize: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                    style={{ cursor: "pointer" }}
                  />
                  {role.label}
                </label>
              ))}
            </div>
            {selectedRoles.length === 0 && (
              <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "6px" }}>
                ⚠ Koi role select nahi: notification sirf Founder ke liye hogi.
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
          <button
            onClick={saveNotification}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : editingId ? "Update Notification" : "Create Notification"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              style={{
                padding: "10px 16px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
            FILTERS & SEARCH
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          <input
            type="text"
            placeholder="Search title or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Types</option>
            {notificationTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm("");
              setTypeFilter("all");
              setStatusFilter("all");
            }}
            style={{
              padding: "8px 12px",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ── Notifications List ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "4px" }}>
              ALL NOTIFICATIONS
            </div>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>
              {filteredNotifications.length} Notifications
            </h3>
          </div>

          {selectedNotifications.size > 0 && (
            <button
              onClick={bulkDelete}
              style={{
                padding: "8px 12px",
                background: "#7f1d1d",
                color: "#fca5a5",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              🗑 Delete {selectedNotifications.size}
            </button>
          )}
        </div>

        {filteredNotifications.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            Abhi koi notification nahi hai.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0" }}>
            {/* ── Select All ── */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #222",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#252525",
              }}
            >
              <input
                type="checkbox"
                checked={selectedNotifications.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                onChange={toggleSelectAll}
                style={{ cursor: "pointer" }}
              />
              <span style={{ fontSize: "11px", color: "#888" }}>
                {selectedNotifications.size > 0
                  ? `${selectedNotifications.size} selected`
                  : "Select all on this page"}
              </span>
            </div>

            {/* ── Notification Items ── */}
            {paginatedNotifications.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: "16px",
                  borderBottom: "1px solid #222",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <input
                    type="checkbox"
                    checked={selectedNotifications.has(item.id)}
                    onChange={() => toggleNotificationSelection(item.id)}
                    style={{ cursor: "pointer", marginTop: "4px" }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px", marginBottom: "6px" }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                          {item.title}
                        </h4>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#aaa", whiteSpace: "pre-wrap" }}>
                          {item.message}
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background: getTypeColor(item.notification_type) + "20",
                            color: getTypeColor(item.notification_type),
                            textTransform: "capitalize",
                          }}
                        >
                          {item.notification_type}
                        </span>

                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background: item.status === "active" ? "#064e3b" : "#333",
                            color: item.status === "active" ? "#86efac" : "#aaa",
                          }}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                      Recipients: {item.recipient_roles.length ? item.recipient_roles.join(", ") : "Founder only"} •{" "}
                      {new Date(item.created_at).toLocaleString("en-PK", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </div>

                    {item.scheduled_for && (
                      <div style={{ fontSize: "11px", color: "#f59e0b", marginBottom: "8px" }}>
                        📅 Scheduled for: {new Date(item.scheduled_for).toLocaleString("en-PK")}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button
                        onClick={() => editNotification(item)}
                        style={{
                          padding: "6px 12px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleStatus(item)}
                        style={{
                          padding: "6px 12px",
                          background: "#444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        {item.status === "active" ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() => deleteNotification(item.id)}
                        style={{
                          padding: "6px 12px",
                          background: "#7f1d1d",
                          color: "#fca5a5",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "6px 10px",
              background: currentPage === 1 ? "#333" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "6px 10px",
                background: currentPage === page ? "#2563eb" : "#333",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: currentPage === page ? "bold" : "normal",
              }}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "6px 10px",
              background: currentPage === totalPages ? "#333" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            Next →
          </button>

          <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

