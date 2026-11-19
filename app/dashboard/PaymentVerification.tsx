"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PaymentVerification() {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/payments", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setOk(false); setMsg(j.error || "Load nahi hua"); }
      else setList(j.list || []);
    } catch {
      setOk(false); setMsg("Server se connection nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function review(x: any, approve: boolean) {
    const name = `${x.first_name || ""} ${x.surname || ""}`.trim() || x.username;
    if (approve && !confirm(`${name} ki TRX ID ${x.payment_trx_id} Easypaisa mein check kar li? Approve karna hai?`)) return;
    if (!approve && !confirm(`${name} ki request reject karni hai?`)) return;
    setBusy(x.id);
    const r = await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id: x.id, approve }),
    });
    setBusy("");
    setOk(r.ok);
    setMsg(r.ok ? (approve ? "✅ Account approve ho gaya, commission bhi ban gaya" : "✅ Request reject ho gayi") : "❌ Nahi hua");
    load();
  }

  const q = search.toLowerCase();
  const match = (x: any) =>
    !q || `${x.first_name} ${x.surname} ${x.username} ${x.email} ${x.payment_trx_id}`.toLowerCase().includes(q);
  const count = (k: string) => list.filter((x) => k === "all" || x.account_status === k).length;
  const shown = list.filter((x) => (filter === "all" || x.account_status === filter) && match(x));
  const totalApproved = list
    .filter((x) => x.account_status === "active")
    .reduce((s, x) => s + Number(x.payment_amount || 0), 0);

  const badge = (s: string) =>
    s === "active" ? ["#10b98120", "#86efac", "APPROVED"] : s === "rejected" ? ["#ef444420", "#f87171", "REJECTED"] : ["#f59e0b20", "#fbbf24", "PENDING"];

  const box: React.CSSProperties = { background: "linear-gradient(145deg,#202020,#171717)", border: "1px solid #383838", borderRadius: 9, padding: 18 };
  const pill = (a: boolean): React.CSSProperties => ({ padding: "8px 14px", borderRadius: 20, border: "1px solid #444", background: a ? "#e3e3e3" : "#1c1c1c", color: a ? "#111" : "#bbb", cursor: "pointer", fontSize: 12, fontWeight: 700 });
  const btn = (bg: string, c = "#fff"): React.CSSProperties => ({ padding: "8px 14px", background: bg, color: c, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700 });

  return (
    <div style={{ color: "#e9e9e9", marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>ENTRY FEE</div>
          <h2 style={{ margin: 0, fontSize: 21, color: "#fff" }}>Payment Verification</h2>
          <p style={{ margin: "6px 0 0", color: "#999", fontSize: 12 }}>
            Easypaisa mein TRX ID check karein, phir Approve karein. 24 ghante baad pending request khud reject ho jati hai.
          </p>
        </div>
        <button style={btn("#2563eb")} onClick={load} disabled={loading}>{loading ? "Loading..." : "🔄 Refresh"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          ["⏳ Pending", count("pending"), "#fbbf24"],
          ["✅ Approved", count("active"), "#86efac"],
          ["❌ Rejected", count("rejected"), "#f87171"],
          ["💰 Fee jama hui", "Rs. " + totalApproved.toLocaleString("en-PK"), "#93c5fd"],
        ].map(([l, v, c]) => (
          <div key={l as string} style={box}>
            <div style={{ fontSize: 11, color: "#999" }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c as string, marginTop: 8 }}>{loading ? "..." : v}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div onClick={() => setMsg("")} style={{ padding: "12px 16px", borderRadius: 6, marginBottom: 14, fontSize: 12, cursor: "pointer", background: ok ? "#064e3b" : "#7f1d1d", color: ok ? "#86efac" : "#fca5a5" }}>
          {msg}
        </div>
      )}

      <div style={box}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          {[["pending", "⏳ Pending"], ["active", "✅ Approved"], ["rejected", "❌ Rejected"], ["all", "Sab"]].map(([k, l]) => (
            <button key={k} style={pill(filter === k)} onClick={() => setFilter(k)}>{l} ({count(k)})</button>
          ))}
          <input
            placeholder="🔍 Naam, email ya TRX ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginLeft: "auto", minWidth: 200, padding: "9px 12px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12 }}
          />
        </div>

        {loading ? (
          <p style={{ color: "#888" }}>Load ho raha hai...</p>
        ) : shown.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: 30 }}>Koi request nahi</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {shown.map((x) => {
              const [bg, c, label] = badge(x.account_status);
              return (
                <div key={x.id} style={{ background: "#1b1b1b", border: "1px solid #333", borderRadius: 8, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <b style={{ color: "#fff", fontSize: 15 }}>
                      {`${x.first_name || ""} ${x.surname || ""}`.trim() || x.username}
                      <span style={{ color: "#777", fontWeight: 400 }}> @{x.username}</span>
                    </b>
                    <span style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: bg, color: c }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#aaa", margin: "8px 0" }}>
                    📧 {x.email || "—"} &nbsp;|&nbsp; 📱 {x.phone || "—"} &nbsp;|&nbsp; 👥 Team: {x.team_code || "—"} &nbsp;|&nbsp; 🔗 Referrer: {x.referrer}
                  </p>
                  <p style={{ fontSize: 14, margin: "8px 0", color: "#eee" }}>
                    🧾 TRX ID: <b style={{ fontFamily: "monospace", color: "#fff" }}>{x.payment_trx_id}</b> &nbsp; 💰 Rs. {Number(x.payment_amount || 0).toLocaleString("en-PK")}
                  </p>
                  <p style={{ fontSize: 11, color: "#777", margin: 0 }}>
                    📅 Bheja: {x.payment_submitted_at ? new Date(x.payment_submitted_at).toLocaleString("en-PK") : "—"}
                    {x.payment_reviewed_at ? ` · Review: ${new Date(x.payment_reviewed_at).toLocaleString("en-PK")}` : ""}
                  </p>
                  {x.account_status === "pending" && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      <button disabled={busy === x.id} style={btn("#064e3b", "#86efac")} onClick={() => review(x, true)}>✅ Approve</button>
                      <button disabled={busy === x.id} style={btn("#7f1d1d", "#fca5a5")} onClick={() => review(x, false)}>❌ Reject</button>
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
