"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const TABS = ["Sab", "Direct Referrer", "Admin", "Super Admin", "Founder", "Website", "Withdrawal Fee"];

export default function CommissionReport() {
  const [list, setList] = useState<any[]>([]);
  const [tab, setTab] = useState("Sab");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    setLoading(true);
    const r = await fetch("/api/commissions", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
    const j = await r.json();
    if (!r.ok) setMsg("❌ " + (j.error || "Load nahi hua")); else setList(j.list || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function mark(id: string, s: string) {
    const r = await fetch("/api/commissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id, status: s }),
    });
    setMsg(r.ok ? (s === "paid" ? "✅ Paid mark ho gaya" : "↩ Unpaid kar diya") : "❌ Nahi hua");
    load();
  }

  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const sum = (a: any[]) => a.reduce((t, c) => t + Number(c.amount || 0), 0);
  const money = (n: number) => "Rs. " + n.toLocaleString("en-PK");

  const byTab = list.filter((c) => tab === "Sab" || String(c.share).startsWith(tab));
  const shown = byTab.filter((c) => status === "all" || c.status === status);
  const mine = list.filter((c) => /Founder|Website|Withdrawal/.test(c.share));

  const cards = [
    ["📅 Aaj (sab hisse)", sum(list.filter((c) => new Date(c.created_at) >= day))],
    ["📆 Is Mahine", sum(list.filter((c) => new Date(c.created_at) >= month))],
    ["💰 Total", sum(list)],
    ["👑 Founder ki kamai", sum(mine)],
    ["⏳ Members ko dena baqi", sum(list.filter((c) => c.status === "unpaid"))],
  ];

  const card: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 16 };
  const pill = (a: boolean): React.CSSProperties => ({ padding: "7px 13px", borderRadius: 20, border: "1px solid #333", background: a ? "#e5e7eb" : "#1a1a1a", color: a ? "#111" : "#aaa", cursor: "pointer", fontSize: 13, fontWeight: 600 });
  const th: React.CSSProperties = { textAlign: "left", padding: 10, color: "#888", fontSize: 12, borderBottom: "1px solid #222" };
  const td: React.CSSProperties = { padding: 10, fontSize: 13, borderBottom: "1px solid #1a1a1a" };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#eee", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <a href="/dashboard" style={{ color: "#888", fontSize: 13 }}>← Founder Dashboard</a>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: "10px 0 6px" }}>💰 Commission Report</h1>
        <p style={{ color: "#888", marginBottom: 16, fontSize: 13 }}>
          Fee ka hisaab: Direct 35% · Admin 10% · Super Admin 5% · Founder 40% · Website 10% · Withdrawal fee 1%
        </p>
        {msg && <div style={{ ...card, marginBottom: 14 }} onClick={() => setMsg("")}>{msg}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 16 }}>
          {cards.map(([l, v]) => (
            <div key={l as string} style={card}>
              <div style={{ color: "#888", fontSize: 12 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{loading ? "..." : money(v as number)}</div>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {TABS.map((t) => (
              <button key={t} style={pill(tab === t)} onClick={() => setTab(t)}>
                {t} ({list.filter((c) => t === "Sab" || String(c.share).startsWith(t)).length})
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            {[["all", "Sab"], ["unpaid", "⏳ Unpaid"], ["paid", "✅ Paid"]].map(([k, l]) => (
              <button key={k} style={pill(status === k)} onClick={() => setStatus(k)}>{l}</button>
            ))}
            <button style={pill(false)} onClick={load}>↻ Refresh</button>
            <span style={{ marginLeft: "auto", fontWeight: 700 }}>Is list ka total: {money(sum(shown))}</span>
          </div>

          {loading ? <p>Load ho raha hai...</p> : shown.length === 0 ? <p style={{ color: "#777" }}>Koi record nahi</p> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead><tr>
                  {["Tareekh", "Hissa", "Kis ko mila", "Kis ki wajah se", "%", "Raqam", "Status", ""].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td style={td}>{new Date(c.created_at).toLocaleString("en-PK")}</td>
                      <td style={td}><b>{c.share}</b></td>
                      <td style={td}>{c.recipient_name}</td>
                      <td style={td}>{c.source_type === "withdrawal_fee" ? "Withdrawal: " : "Join: "}{c.member_name}</td>
                      <td style={td}>{c.percent}%</td>
                      <td style={{ ...td, fontWeight: 700, color: "#4ade80" }}>{money(Number(c.amount || 0))}</td>
                      <td style={{ ...td, color: c.status === "paid" ? "#4ade80" : "#fbbf24" }}>{c.status === "paid" ? "✅ Paid" : "⏳ Unpaid"}</td>
                      <td style={td}>
                        {c.status === "paid"
                          ? <button style={pill(false)} onClick={() => mark(c.id, "unpaid")}>↩</button>
                          : <button style={{ ...pill(true), background: "#16a34a", color: "#fff", border: "none" }} onClick={() => mark(c.id, "paid")}>Paid karein</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
