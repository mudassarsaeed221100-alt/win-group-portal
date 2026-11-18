"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Support() {
  const [tab, setTab] = useState("team");
  const [team, setTeam] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Account Issue");

  async function headers() {
    const { data } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  async function load() {
    setLoading(true);
    const r = await fetch("/api/admin/support", { headers: await headers(), cache: "no-store" });
    const j = await r.json();
    if (!r.ok) setNotice("❌ " + (j.error || "Load nahi hua"));
    else { setTeam(j.team || []); setMine(j.mine || []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function reply(t: any, status: string) {
    const text = replies[t.id] ?? t.admin_reply ?? "";
    if (status === "resolved" && !text.trim()) return setNotice("❌ Pehle jawab likhein");
    const r = await fetch("/api/admin/support", {
      method: "PATCH", headers: await headers(),
      body: JSON.stringify({ id: t.id, reply: text, status }),
    });
    const j = await r.json();
    setNotice(r.ok ? "✅ Jawab save ho gaya" : "❌ " + (j.error || "Nahi hua"));
    if (r.ok) load();
  }

  async function submitTicket() {
    if (!subject.trim() || !message.trim()) return setNotice("❌ Subject aur message dono likhein");
    const r = await fetch("/api/admin/support", {
      method: "POST", headers: await headers(),
      body: JSON.stringify({ subject, message, category }),
    });
    const j = await r.json();
    if (!r.ok) return setNotice("❌ " + (j.error || "Nahi bheja"));
    setSubject(""); setMessage(""); setCategory("Account Issue");
    setNotice("✅ Aap ki request Founder ko chali gayi");
    load();
  }

  const isOpen = (s: string) => !["resolved", "closed"].includes((s || "").toLowerCase());
  const openCount = team.filter((t) => isOpen(t.status)).length;
  const color = (s: string) => (isOpen(s) ? "#b45309" : "#059669");

  return (
    <div style={{ color: "#172033", width: "100%" }}>
      <h1 style={{ fontSize: 25, marginBottom: 6 }}>Support & Help</h1>
      <p style={{ color: "#64748b", marginBottom: 18 }}>Apni team ke staff ke masle hal karein, ya apna masla Founder ko bhejein.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={() => setTab("team")} style={tabStyle(tab === "team")}>🛠️ Team ke Masle ({openCount})</button>
        <button onClick={() => setTab("mine")} style={tabStyle(tab === "mine")}>📤 Founder ko Request</button>
        <button onClick={load} style={tabStyle(false)}>↻ Refresh</button>
      </div>

      {notice && <div style={{ background: "#eff6ff", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{notice}</div>}

      {tab === "team" && (
        loading ? <p>Load ho raha hai...</p> : team.length === 0 ? (
          <div style={emptyStyle}>Team ke kisi staff ne abhi koi masla nahi bheja. 👍</div>
        ) : team.map((t) => (
          <div key={t.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <strong>{t.subject}</strong>
              <span style={{ fontSize: 12, fontWeight: 700, color: color(t.status) }}>{(t.status || "open").toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: "6px 0" }}>
              👤 {t.staff_name} · {t.category || "—"} · {new Date(t.created_at).toLocaleString()}
            </p>
            <p style={{ color: "#334155", fontSize: 14, margin: "8px 0" }}>{t.message}</p>
            <textarea
              rows={3}
              placeholder="Staff ko jawab likhein..."
              value={replies[t.id] ?? t.admin_reply ?? ""}
              onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
            />
                       <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => reply(t, "in_progress")} style={btn("#2563eb")}>📤 Reply Bhejein</button>
              <button onClick={() => reply(t, "resolved")} style={btn("#059669")}>✅ Reply + Masla Hal</button>
            </div>
          </div>
        ))
      )}

      {tab === "mine" && (
        <>
          <div style={cardStyle}>
            <h2 style={{ fontSize: 18, marginTop: 0 }}>New Support Request</h2>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
              <option>Account Issue</option>
              <option>Staff Management</option>
              <option>Task Issue</option>
              <option>Earnings Issue</option>
              <option>Technical Problem</option>
              <option>Other</option>
            </select>
            <label style={labelStyle}>Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Maslay ka title likhein" style={inputStyle} />
            <label style={labelStyle}>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Apna masla detail mein likhein..." rows={5} style={{ ...inputStyle, resize: "vertical" }} />
            <button onClick={submitTicket} style={btn("#172554")}>Submit Request</button>
          </div>

          <h2 style={{ fontSize: 18 }}>My Support Requests</h2>
          {mine.length === 0 ? <div style={emptyStyle}>Abhi koi support request nahi hai.</div> : mine.map((t) => (
            <div key={t.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <strong>{t.subject}</strong>
                <span style={{ fontSize: 12, fontWeight: 700, color: color(t.status) }}>{(t.status || "open").toUpperCase()}</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 13 }}>{t.message}</p>
              {t.admin_reply && <p style={{ fontSize: 13, background: "#f0fdf4", padding: 10, borderRadius: 8 }}>💬 Jawab: {t.admin_reply}</p>}
              <small style={{ color: "#94a3b8" }}>{t.category} · {new Date(t.created_at).toLocaleString()}</small>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const tabStyle = (a: boolean): React.CSSProperties => ({
  padding: "9px 14px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer",
  fontWeight: 600, fontSize: 13, background: a ? "#172554" : "#fff", color: a ? "#fff" : "#334155",
});

const btn = (bg: string): React.CSSProperties => ({
  background: bg, color: "white", border: "none", borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontWeight: 600,
});

const cardStyle: React.CSSProperties = {
  background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 18, marginBottom: 14,
};

const emptyStyle: React.CSSProperties = {
  background: "white", border: "1px dashed #cbd5e1", borderRadius: 12, padding: 35, textAlign: "center", color: "#64748b",
};

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: 12, border: "1px solid #dbe2ea", borderRadius: 8,
  marginTop: 7, marginBottom: 14, boxSizing: "border-box", fontSize: 14,
};

const labelStyle: React.CSSProperties = { display: "block", marginTop: 5, fontWeight: 600, fontSize: 13 };
