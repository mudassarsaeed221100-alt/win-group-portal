"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function SubmissionsPage() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("pending");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [view, setView] = useState("");

  async function headers() {
    const { data } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/submissions", { headers: await headers(), cache: "no-store" });
    const json = await res.json();
    if (!res.ok) setMsg("❌ " + (json.error || "Load nahi hua"));
    else setSubs(json.submissions || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function review(s: any, action: "approve" | "reject") {
    const amount = amounts[s.id] ?? String(s.reward_amount || 0);
    if (action === "approve" && !(Number(amount) > 0)) return setMsg("❌ Earning amount likhein");
    if (action === "reject" && !confirm("Ye kaam reject karna hai?")) return;
    setBusy(s.id); setMsg("");
    const res = await fetch("/api/admin/submissions", {
      method: "PATCH", headers: await headers(),
      body: JSON.stringify({ id: s.id, action, amount }),
    });
    const json = await res.json();
    setBusy("");
    if (!res.ok) return setMsg("❌ " + (json.error || "Nahi hua"));
    setMsg(action === "approve" ? "✅ Approve ho gaya" : "✅ Reject ho gaya");
    load();
  }

  const count = (k: string) => subs.filter((s) => k === "all" || s.status === k).length;
  const shown = subs.filter((s) => filter === "all" || s.status === filter);
  const card: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 20, marginBottom: 20 };
  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, marginRight: 6 });
  const badge = (st: string) => (st === "approved" ? "#14532d" : st === "rejected" ? "#7f1d1d" : "#78350f");

  return (
    <div style={{ color: "#eee" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>📥 Submissions</h1>
      <p style={{ color: "#888", marginBottom: 20 }}>Staff ka kaam check karein, approve ya reject karein.</p>

      {msg && <div style={{ ...card, padding: 12 }} onClick={() => setMsg("")}>{msg}</div>}

      <div style={card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["pending", "⏳ Pending"], ["approved", "✅ Approved"], ["rejected", "❌ Rejected"], ["all", "Sab"]].map(([k, l]) => (
            <button key={k} style={btn(filter === k ? "#444" : "#1f1f1f")} onClick={() => setFilter(k)}>{l} ({count(k)})</button>
          ))}
          <button style={btn("#1f1f1f")} onClick={load}>↻ Refresh</button>
        </div>

        {loading ? <p>Load ho raha hai...</p> : shown.length === 0 ? <p style={{ color: "#777" }}>Koi submission nahi</p> : (
          shown.map((s) => (
            <div key={s.id} style={{ borderTop: "1px solid #222", padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <b style={{ fontSize: 16 }}>{s.task_title}</b>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: badge(s.status) }}>{s.status}</span>
              </div>
              <p style={{ fontSize: 13, color: "#888", margin: "4px 0" }}>
                👤 {s.staff_name} · 📅 {new Date(s.created_at).toLocaleString("en-PK")} · 💰 Reward: Rs. {s.reward_amount}
              </p>
              {s.work_description && <p style={{ color: "#bbb", margin: "6px 0" }}>{s.work_description}</p>}

              {s.proof_link ? (
                <div onClick={() => setView(s.proof_link)} style={{ cursor: "pointer", marginTop: 8, display: "inline-block" }}>
                  <img src={s.proof_link} alt="Proof" style={{ display: "block", maxWidth: 260, maxHeight: 200, objectFit: "cover", borderRadius: 10, border: "1px solid #333" }} />
                  <span style={{ color: "#60a5fa", fontSize: 12 }}>🔍 Bara dekhne ke liye click karein</span>
                </div>
              ) : s.proof_url ? (
                <p style={{ color: "#f87171", fontSize: 12 }}>⚠️ Proof file nahi mili</p>
              ) : null}

              {s.status === "pending" ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input type="number" value={amounts[s.id] ?? String(s.reward_amount || 0)}
                    onChange={(e) => setAmounts({ ...amounts, [s.id]: e.target.value })}
                    style={{ width: 120, padding: "7px 10px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />
                  <button style={btn("#16a34a")} disabled={busy === s.id} onClick={() => review(s, "approve")}>✅ Approve</button>
                  <button style={btn("#b91c1c")} disabled={busy === s.id} onClick={() => review(s, "reject")}>❌ Reject</button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>
                  {s.status === "approved" ? `💵 Earning: Rs. ${s.earning_amount}` : "Reject kiya gaya"}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {view && (
        <div onClick={() => setView("")} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <img src={view} alt="Proof" style={{ maxWidth: "95%", maxHeight: "90vh", borderRadius: 10 }} />
          <span style={{ position: "fixed", top: 18, right: 24, color: "#fff", fontSize: 30, cursor: "pointer" }}>✕</span>
        </div>
      )}
    </div>
  );
}

