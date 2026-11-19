"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const TABS = ["Sab", "Direct Referrer", "Admin", "Super Admin", "Founder", "Website", "Withdrawal Fee"];
const RATES = [
  ["Direct Referrer", 35],
  ["Admin", 10],
  ["Super Admin", 5],
  ["Founder", 40],
  ["Website", 10],
];

export default function CommissionBonusManagement() {
  const [list, setList] = useState<any[]>([]);
  const [tab, setTab] = useState("Sab");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);

  async function token() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/commissions", { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
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

  async function mark(c: any, s: string) {
    if (s === "paid" && !confirm(`${c.recipient_name} ko ${money(c.amount)} de diye? Paid mark karna hai?`)) return;
    const r = await fetch("/api/commissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ id: c.id, status: s }),
    });
    setOk(r.ok);
    setMsg(r.ok ? (s === "paid" ? "✅ Paid mark ho gaya" : "↩ Unpaid kar diya") : "❌ Nahi hua");
    load();
  }

  const money = (n: number) => "Rs. " + Number(n || 0).toLocaleString("en-PK");
  const sum = (a: any[]) => a.reduce((t, c) => t + Number(c.amount || 0), 0);
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const month = new Date(now.getFullYear(), now.getMonth(), 1);

  const inTab = (c: any, t: string) => t === "Sab" || String(c.share).startsWith(t);
  const q = search.toLowerCase();
  const shown = list.filter((c) =>
    inTab(c, tab) &&
    (status === "all" || c.status === status) &&
    (!q || `${c.recipient_name} ${c.member_name}`.toLowerCase().includes(q))
  );
  const members = new Set(list.filter((c) => c.source_type === "entry_fee").map((c) => c.source_user_id)).size;

  const cards = [
    ["👥 Approved members", String(members), "#93c5fd"],
    ["📅 Aaj", money(sum(list.filter((c) => new Date(c.created_at) >= day))), "#e5e7eb"],
    ["📆 Is Mahine", money(sum(list.filter((c) => new Date(c.created_at) >= month))), "#e5e7eb"],
    ["👑 Founder ki kamai", money(sum(list.filter((c) => /Founder|Website|Withdrawal/.test(c.share)))), "#86efac"],
    ["⏳ Members ko dena baqi", money(sum(list.filter((c) => c.status === "unpaid"))), "#fbbf24"],
  ];

  const box: React.CSSProperties = { background: "linear-gradient(145deg,#202020,#171717)", border: "1px solid #383838", borderRadius: 9, padding: 18 };
  const pill = (a: boolean): React.CSSProperties => ({ padding: "7px 13px", borderRadius: 20, border: "1px solid #444", background: a ? "#e3e3e3" : "#1c1c1c", color: a ? "#111" : "#bbb", cursor: "pointer", fontSize: 12, fontWeight: 700 });
  const th: React.CSSProperties = { textAlign: "left", padding: 10, color: "#999", fontSize: 11, borderBottom: "1px solid #333", background: "#1b1b1b" };
  const td: React.CSSProperties = { padding: 10, fontSize: 12, borderBottom: "1px solid #262626" };

  return (
    <div style={{ color: "#e9e9e9", marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>COMMISSION & BONUS</div>
          <h2 style={{ margin: 0, fontSize: 21, color: "#fff" }}>Commission & Bonus Management</h2>
          <p style={{ margin: "6px 0 0", color: "#999", fontSize: 12 }}>Har naye approved member ki Rs. 1000 fee khud in hisson mein bant jati hai.</p>
        </div>
        <button onClick={load} disabled={loading} style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      <div style={{ ...box, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "#999", letterSpacing: 1, marginBottom: 10 }}>🔒 FIX HISAAB (Rs. 1000)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
          {RATES.map(([n, p]) => (
            <div key={n as string} style={{ background: "#1b1b1b", border: "1px solid #333", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#aaa" }}>{n}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 4 }}>{p}%</div>
              <div style={{ fontSize: 11, color: "#86efac" }}>Rs. {(Number(p) * 10).toLocaleString()}</div>
            </div>
          ))}
          <div style={{ background: "#1b1b1b", border: "1px solid #333", borderRadius: 8, padding: 12, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#aaa" }}>Withdrawal Fee</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginTop: 4 }}>1%</div>
            <div style={{ fontSize: 11, color: "#22d3ee" }}>har withdrawal par</div>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#777", margin: "10px 0 0" }}>Total = 100%. Agar team mein Admin / Super Admin ya referrer na ho to us ka hissa Founder ko jata hai.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        {cards.map(([l, v, c]) => (
          <div key={l} style={box}>
            <div style={{ fontSize: 11, color: "#999" }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: c, marginTop: 8 }}>{loading ? "..." : v}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div onClick={() => setMsg("")} style={{ padding: "12px 16px", borderRadius: 6, marginBottom: 14, fontSize: 12, cursor: "pointer", background: ok ? "#064e3b" : "#7f1d1d", color: ok ? "#86efac" : "#fca5a5" }}>
          {msg}
        </div>
      )}

      <div style={box}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {TABS.map((t) => (
            <button key={t} style={pill(tab === t)} onClick={() => setTab(t)}>
              {t} ({list.filter((c) => inTab(c, t)).length})
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
          {[["all", "Sab"], ["unpaid", "⏳ Unpaid"], ["paid", "✅ Paid"]].map(([k, l]) => (
            <button key={k} style={pill(status === k)} onClick={() => setStatus(k)}>{l}</button>
          ))}
          <input placeholder="🔍 Naam dhoondein" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 180, padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12 }} />
          <span style={{ marginLeft: "auto", fontWeight: 700, fontSize: 13 }}>Is list ka total: {money(sum(shown))}</span>
        </div>

        {loading ? <p style={{ color: "#888" }}>Load ho raha hai...</p> : shown.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: 30 }}>Koi record nahi</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead><tr>
                {["Tareekh", "Hissa", "Kis ko mila", "Kis ki wajah se", "%", "Raqam", "Status", ""].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {shown.map((c) => (
                  <tr key={c.id}>
                    <td style={{ ...td, color: "#aaa" }}>{new Date(c.created_at).toLocaleString("en-PK")}</td>
                    <td style={{ ...td, color: "#fff", fontWeight: 700 }}>{c.share}</td>
                    <td style={td}>{c.recipient_name}</td>
                    <td style={{ ...td, color: "#aaa" }}>{c.source_type === "withdrawal_fee" ? "Withdrawal: " : "Join: "}{c.member_name}</td>
                    <td style={td}>{c.percent}%</td>
                    <td style={{ ...td, fontWeight: 700, color: "#4ade80" }}>{money(c.amount)}</td>
                    <td style={{ ...td, color: c.status === "paid" ? "#4ade80" : "#fbbf24", fontWeight: 700 }}>{c.status === "paid" ? "✅ Paid" : "⏳ Unpaid"}</td>
                    <td style={td}>
                      {c.status === "paid"
                        ? <button style={pill(false)} onClick={() => mark(c, "unpaid")}>↩</button>
                        : <button style={{ ...pill(true), background: "#064e3b", color: "#86efac", border: "none" }} onClick={() => mark(c, "paid")}>Paid karein</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
