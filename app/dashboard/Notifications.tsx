
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
  created_at: string;
};

const roles = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Notifications load nahi ho sakin: " + error.message);
      return;
    }

    setNotifications(data || []);
  }

  function toggleRole(role: string) {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  }

  function resetForm() {
    setTitle("");
    setMessage("");
    setType("info");
    setSelectedRoles([]);
    setEditingId(null);
  }

  async function saveNotification() {
    if (!title.trim() || !message.trim()) {
      setNotice("Title aur message dono zaroori hain.");
      return;
    }

    setLoading(true);
    setNotice("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setNotice("Aapka session expire ho gaya hai. Dobara login karein.");
      setLoading(false);
      return;
    }

    const record = {
      title: title.trim(),
      message: message.trim(),
      notification_type: type,
      recipient_roles: selectedRoles,
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

    if (error) {
      setNotice("Save nahi hua: " + error.message);
    } else {
      setNotice(editingId ? "Notification update ho gayi." : "Notification create ho gayi.");
      resetForm();
      await fetchNotifications();
    }

    setLoading(false);
  }

  function editNotification(item: Notification) {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setType(item.notification_type);
    setSelectedRoles(item.recipient_roles || []);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleStatus(item: Notification) {
    const newStatus = item.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("notifications")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setNotice("Status update nahi hua: " + error.message);
      return;
    }

    setNotice("Notification status update ho gaya.");
    fetchNotifications();
  }

  async function deleteNotification(id: string) {
    if (!window.confirm("Kya aap ye notification delete karna chahte hain?")) {
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      setNotice("Delete nahi hua: " + error.message);
      return;
    }

    setNotice("Notification delete ho gayi.");
    if (editingId === id) resetForm();
    fetchNotifications();
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #444",
    background: "#202020",
    color: "white",
    boxSizing: "border-box" as const,
    marginTop: "7px",
  };

  return (
    <div style={{ color: "white", maxWidth: "100%" }}>
      <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
        Notifications Center
      </h2>

      <p style={{ color: "#aaa", marginBottom: "22px" }}>
        System announcements aur important notifications manage karein.
      </p>

      <div
        style={{
          background: "#171717",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "25px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {editingId ? "Edit Notification" : "Create Notification"}
        </h3>

        <label>Notification Title</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
        />

        <label style={{ display: "block", marginTop: "16px" }}>
          Message
        </label>
        <textarea
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Apna announcement ya message likhein..."
        />

        <label style={{ display: "block", marginTop: "16px" }}>
          Notification Type
        </label>
        <select
          style={inputStyle}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="info">Information</option>
          <option value="success">Success</option>
          <option value="warning">Warning</option>
          <option value="urgent">Urgent</option>
        </select>

        <div style={{ marginTop: "20px" }}>
          <strong>Send To (Optional)</strong>
          <p style={{ color: "#aaa", fontSize: "13px" }}>
            Jin roles ko notification bhejni hai unhein select karein.
          </p>

          {roles.map((role) => (
            <label
              key={role.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginTop: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.value)}
                onChange={() => toggleRole(role.value)}
              />
              {role.label}
            </label>
          ))}

          {selectedRoles.length === 0 && (
            <p style={{ color: "#f0b44d", fontSize: "13px" }}>
              Koi role select nahi: notification sirf Founder ke liye hogi.
            </p>
          )}
        </div>

        {notice && (
          <p style={{ color: "#9bd5a5", marginTop: "16px" }}>{notice}</p>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
          <button
            onClick={saveNotification}
            disabled={loading}
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "12px 20px",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {loading ? "Saving..." : editingId ? "Update Notification" : "Create Notification"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              style={{
                background: "#444",
                color: "white",
                border: "none",
                padding: "12px 20px",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <h3>All Notifications ({notifications.length})</h3>

      {notifications.length === 0 ? (
        <p style={{ color: "#aaa" }}>Abhi koi notification nahi hai.</p>
      ) : (
        <div style={{ display: "grid", gap: "14px" }}>
          {notifications.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#171717",
                border: "1px solid #333",
                borderRadius: "10px",
                padding: "17px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <strong>{item.title}</strong>
                <span style={{ color: item.status === "active" ? "#7dd3a0" : "#aaa" }}>
                  {item.status.toUpperCase()}
                </span>
              </div>

              <p style={{ color: "#ccc", whiteSpace: "pre-wrap" }}>
                {item.message}
              </p>

              <p style={{ color: "#aaa", fontSize: "13px" }}>
                Type: {item.notification_type} | Recipients:{" "}
                {item.recipient_roles.length
                  ? item.recipient_roles.join(", ")
                  : "Founder only"}
              </p>

              <p style={{ color: "#888", fontSize: "12px" }}>
                {new Date(item.created_at).toLocaleString()}
              </p>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => editNotification(item)}>Edit</button>
                <button onClick={() => toggleStatus(item)}>
                  {item.status === "active" ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => deleteNotification(item.id)}
                  style={{ color: "#dc6b6b" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
