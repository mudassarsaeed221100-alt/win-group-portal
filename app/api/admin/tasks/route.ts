"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function TaskManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/tasks", {
        headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Tasks load nahi huay.");
      setTasks(json.tasks || []);
      setStaff(json.staff || []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Kuch ghalat ho gaya.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  function name(id: string) {
    const s = staff.find((x) => x.id === id);
    if (!s) return "Staff";
    return `${s.first_name || ""} ${s.surname || ""}`.trim() || s.username || "Staff";
  }

  function isLate(t: any) {
    return t.deadline && new Date(t.deadline) < new Date() && t.status === "active";
  }

  const shown = tasks.filter((t) => {
    if (filter === "active") return t.status === "active" && !isLate(t);
    if (filter === "late") return isLate(t);
    if (filter === "inactive") return t.status !== "active";
    return true;
  });

  const lateCount = tasks.filter(isLate).length;
  const pendingPeople = tasks.reduce(
    (a, t) => a + t.assigned.filter((id: string) => !(t.submitted_by || []).includes(id)).length, 0
  );

  return (
    <div style={{ color: "#1e293b" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 25, fontWeight: 800, margin: 0 }}>Team Tasks</h2>
        <p style={{ color: "#64748b", marginTop: 7 }}>
          Apni team ke tasks dekhein. Task Super Admin deta hai. Aap staff ki madad karein taake kaam waqt par poora ho.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[["📋 Total Tasks", tasks.length], ["⏰ Late Tasks", lateCount], ["🕒 Staff ka kaam baqi", pendingPeople]].map(([l, v]) => (
          <div key={l as string} style={cardStyle}>
            <div style={{ color: "#64748b", fontSize: 13 }}>{l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{loading ? "..." : v}</div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {[["all", "Sab"], ["active", "Active"], ["late", "⏰ Late"], ["inactive", "Band"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={tabStyle(filter === k)}>{l}</button>
          ))}
          <button onClick={loadData} style={tabStyle(false)}>↻ Refresh</button>
        </div>

        {message && <p style={{ color: "#dc2626", fontWeight: 600 }}>{message}</p>}

        {loading ? (
          <p>Tasks load ho rahe hain...</p>
        ) : shown.length === 0 ? (
          <p style={{ color: "#64748b" }}>Koi task nahi.</p>
        ) : (
          <div style={{ display: "grid", gap: 13 }}>
            {shown.map((t) => {
              const notDone = t.assigned.filter((id: string) => !(t.submitted_by || []).includes(id));
              return (
                <div key={t.id} style={taskStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <strong style={{ fontSize: 16 }}>{t.title}</strong>
                    <span style={{ color: isLate(t) ? "#dc2626" : t.status === "active" ? "#059669" : "#64748b", fontSize: 12, fontWeight: 700 }}>
                      {isLate(t) ? "⏰ LATE" : t.status === "active" ? "ACTIVE" : "BAND"}
                    </span>
                  </div>
                  {t.description && <p style={{ color: "#64748b", margin: "8px 0" }}>{t.description}</p>}
                  <p style={{ fontSize: 13, color: "#475569", margin: "6px 0" }}>
                    💰 Rs. {t.reward_amount} &nbsp;|&nbsp; 📅 {t.deadline ? new Date(t.deadline).toLocaleDateString() : "Koi deadline nahi"}
                    &nbsp;|&nbsp; 📥 Submit: {t.submitted} &nbsp; ✅ Approve: {t.approved}
                  </p>
                  <p style={{ fontSize: 13, color: "#475569", margin: "6px 0" }}>
                    👥 Assigned: {t.assigned.length ? t.assigned.map(name).join(", ") : "Kisi ko nahi"}
                  </p>
                  {notDone.length > 0 && (
                    <p style={{ fontSize: 13, color: "#d97706", margin: "6px 0", fontWeight: 600 }}>
                      🕒 Abhi kaam nahi bheja: {notDone.map(name).join(", ")}
                    </p>
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

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer",
  fontWeight: 600, fontSize: 13, background: active ? "#1d4ed8" : "#ffffff", color: active ? "#ffffff" : "#334155",
});

const cardStyle: React.CSSProperties = {
  background: "#ffffff", padding: 20, borderRadius: 15, border: "1px solid #e2e8f0", marginBottom: 20,
};

const taskStyle: React.CSSProperties = {
  padding: 18, border: "1px solid #e2e8f0", borderRadius: 11, background: "#f8fafc",
};
