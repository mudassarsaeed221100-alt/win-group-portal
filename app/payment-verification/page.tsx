"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentVerificationPage() {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    setLoading(true);
    const r = await fetch("/api/payments", { headers: { Authorization: `Bearer ${await token()}` } });
    const j = await r.json();
    if (!r.ok) setMsg("❌ " + (j.error || "Load nahi hua")); else setList(j.list || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function review(id: string, approve: boolean) {
    if (!approve && !confirm("Reject karna hai?")) return;
    const r = await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id, approve }),
    });
    setMsg(r.ok ? (approve ? "✅ Account approve ho gaya" : "✅ Reject ho gaya") : "❌ Nahi hua");
    load();
  }

  const shown = list.filter((x) => filter === "all" || x.account_status === filter);
  const count = (k: string) => list.filter((x) => k === "all" || x.account_status === k).length;
  const card: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18, marginBottom: 14 };
  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, marginRight: 6 });
  const badge = (s: string) => (s === "active" ? "#14532d" : s === "rejected" ? "#7f1d1d" : "#78350f");

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#eee", padding: 20 }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <a href="/dashboard" style={{ color: "#888", fontSize: 13 }}>← Founder Dashboard</a>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "10px 0 6px" }}>💳 Payment Verification</h1>
        <p style={{ color: "#888", marginBottom: 16 }}>Easypaisa mein TRX ID check karein, phir Approve karein. 24 ghante baad pending request khud reject ho jati hai.</p>
        {msg && <div style={card}>{msg}</div>}

        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["pending", "⏳ Pending"], ["active", "✅ Approved"], ["rejected", "❌ Rejected"], ["all", "Sab"]].map(([k, l]) => (
            <button key={k} style={btn(filter === k ? "#444" : "#1f1f1f")} onClick={() => setFilter(k)}>{l} ({count(k)})</button>
          ))}
          <button style={btn("#1f1f1f")} onClick={load}>↻ Refresh</button>
        </div>

        {loading ? <p>Load ho raha hai...</p> : shown.length === 0 ? <p style={{ color: "#777" }}>Koi request nahi</p> : shown.map((x) => (
          <div key={x.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <b style={{ fontSize: 16 }}>{`${x.first_name || ""} ${x.surname || ""}`.trim()} <span style={{ color: "#777" }}>@{x.username}</span></b>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: badge(x.account_status) }}>{x.account_status}</span>
            </div>
            <p style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>📧 {x.email} &nbsp;|&nbsp; 📱 {x.phone || "—"} &nbsp;|&nbsp; 👥 Team: {x.team_code || "—"} &nbsp;|&nbsp; 🔗 Referrer: {x.referrer}</p>
            <p style={{ fontSize: 15, margin: "8px 0" }}>🧾 TRX ID: <b>{x.payment_trx_id}</b> &nbsp; 💰 Rs. {x.payment_amount}</p>
            <p style={{ fontSize: 12, color: "#777" }}>📅 {x.payment_submitted_at ? new Date(x.payment_submitted_at).toLocaleString() : "—"}</p>
            {x.account_status === "pending" && (
              <div style={{ marginTop: 10 }}>
                <button style={btn("#16a34a")} onClick={() => review(x.id, true)}>✅ Approve</button>
                <button style={btn("#b91c1c")} onClick={() => review(x.id, false)}>❌ Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
