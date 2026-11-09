"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Staff = {
  id: string;
  username: string;
  role: string;
  created_at: string;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

export default function TaskManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function loadData() {
    setLoading(true);
    setMessage("");

    try {
      const token = await getToken();

      if (!token) {
        setMessage("Session nahi mili. Dobara login karein.");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [staffResponse, taskResponse] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/tasks", { headers }),
      ]);

      const staffData = await staffResponse.json();
      const taskData = await taskResponse.json();

      if (!staffResponse.ok) {
        throw new Error(staffData.error || "Staff list load nahi hui.");
      }

      if (!taskResponse.ok) {
        throw new Error(taskData.error || "Tasks load nahi huay.");
      }

      setStaff(staffData.staff || []);
      setTasks(taskData.tasks || []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Kuch ghalat ho gaya."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Session nahi mili. Dobara login karein.");
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          assigned_to: assignedTo,
          due_date: dueDate || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Task assign nahi hua.");
      }

      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      setMessage("Task successfully assign ho gaya!");

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Task assign nahi hua."
      );
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: "#d97706",
    in_progress: "#2563eb",
    completed: "#059669",
  };

  return (
    <div style={{ color: "#1e293b" }}>
      <div style={{ marginBottom: 25 }}>
        <h2 style={{ fontSize: 25, fontWeight: 800, margin: 0 }}>
          Task Management
        </h2>
        <p style={{ color: "#64748b", marginTop: 7 }}>
          Staff members ko tasks assign aur manage karein.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          padding: 24,
          borderRadius: 15,
          border: "1px solid #e2e8f0",
          marginBottom: 25,
        }}
      >
        <h3 style={{ fontSize: 18, marginTop: 0, marginBottom: 20 }}>
          Assign New Task
        </h3>

        <form onSubmit={createTask}>
          <div style={{ display: "grid", gap: 15 }}>
            <div>
              <label style={labelStyle}>Task Title *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task ka naam likhein"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Task Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Task ki details likhein"
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={labelStyle}>Assign To Staff *</label>
              <select
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                style={inputStyle}
              >
                <option value="">Staff select karein</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username}
                  </option>
                ))}
              </select>
              {staff.length === 0 && !loading && (
                <p style={{ color: "#dc2626", fontSize: 13 }}>
                  Abhi koi Staff account available nahi hai.
                </p>
              )}
            </div>

            <div>
              <label style={labelStyle}>Deadline (Optional)</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving || staff.length === 0}
              style={{
                background: "#1d4ed8",
                color: "white",
                padding: "13px 20px",
                border: "none",
                borderRadius: 9,
                fontWeight: 700,
                cursor: "pointer",
                opacity: saving || staff.length === 0 ? 0.6 : 1,
              }}
            >
              {saving ? "Assigning..." : "Assign Task"}
            </button>
          </div>
        </form>

        {message && (
          <p style={{ marginTop: 15, fontWeight: 600 }}>
            {message}
          </p>
        )}
      </div>

      <div
        style={{
          background: "#ffffff",
          padding: 24,
          borderRadius: 15,
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <h3 style={{ fontSize: 18, margin: 0 }}>
            Assigned Tasks ({tasks.length})
          </h3>

          <button
            onClick={loadData}
            disabled={loading}
            style={refreshStyle}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p>Tasks load ho rahe hain...</p>
        ) : tasks.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            Abhi koi task assign nahi hua.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 13 }}>
            {tasks.map((task) => {
              const assignedStaff = staff.find(
                (member) => member.id === task.assigned_to
              );

              return (
                <div
                  key={task.id}
                  style={{
                    padding: 18,
                    border: "1px solid #e2e8f0",
                    borderRadius: 11,
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <strong style={{ fontSize: 16 }}>
                      {task.title}
                    </strong>

                    <span
                      style={{
                        color: statusColors[task.status] || "#64748b",
                        background: "#ffffff",
                        padding: "5px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {task.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  {task.description && (
                    <p style={{ color: "#64748b", marginBottom: 10 }}>
                      {task.description}
                    </p>
                  )}

                  <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                    Assigned to: {assignedStaff?.username || "Staff"}
                  </p>

                  <p style={{ fontSize: 13, color: "#64748b", marginBottom: 0 }}>
                    Deadline: {task.due_date || "Not specified"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 7,
  color: "#334155",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  background: "#ffffff",
  color: "#1e293b",
};

const refreshStyle: React.CSSProperties = {
  padding: "9px 15px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  color: "#334155",
};
