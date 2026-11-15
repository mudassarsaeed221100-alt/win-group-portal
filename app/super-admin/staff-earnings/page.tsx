"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function StaffEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setMsg("");
    const { data: s } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${s.session?.access_token || ""}` },
    });
    const json = await res.json();
    if (!res.ok) setMsg("❌ " + (json.error || "Load nahi hua"));
    else setData(json);
  }

  useEffect(() => { load(); }, []);

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startDay); startWeek.setDate(startDay.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  function sum(list: any[], from?: Date) {
    return list
      .filter((e) => !from || new Date(e.created_at) >= from)
      .reduce((a, e) => a + Number(e.amount || 0), 0);
  }

  const earnings: any[] = data?.earnings || [];
  const rows = (data?.staff || []).map((s: any) => {
    const mine = earnings.filter((e) => e.user_id === s.id);
    return {
      id: s.id,
      name: `${s.first_name || ""} ${s.surname || ""}`.trim() || s.username || "—",
      today: sum(mine, startDay),
      week: sum(mine, startWeek),
      month: sum(mine, startMonth),
      total: sum(mine),
      unpaid: sum(mine.filter((e) => e.payment_status !== "paid")),
      paid: sum(mine.filter((e) => e.payment_status === "paid")),
    };
  })
    .filter((r: any) => r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a: any, b: any) => b.total - a.total);

  const card: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18 };
  const stats = [
    ["📅 Aaj", sum(earnings, startDay)],
    ["🗓 7 Din", sum(earnings, startWeek)],
    ["📆 Is Mahine", sum(earnings, startMonth)],
    ["💰 Total", sum(earnings)],
    ["⏳ Unpaid", sum(earnings.filter((e) => e.payment_status !== "paid"))],
    ["✅ Paid", sum(earnings.filter((e) => e.payment_status === "paid"))],
  ];
  const th: React.CSSProperties = { textAlign: "left", padding: 10, color: "#888", fontSize: 13, borderBottom: "1px solid #222" };
  const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #1a1a1a", fontSize: 14 };

  return (
    <div style={{ color: "#eee" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>💵 Staff Earnings</h1>
      <p style={{ color: "#888", marginBottom: 20 }}>Team ke staff ki kamai (approve hue kaam se)</p>
      {msg && <div style={{ ...card, marginBottom: 16 }}>{msg}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {stats.map(([l, v]) => (
          <div key={l as string} style={card}>
            <div style={{ color: "#888", fontSize: 13 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Rs. {Number(v).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input placeholder="🔍 Staff dhoondein" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: "9px 12px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, color: "#fff" }} />
          <button onClick={load} style={{ background: "#1f1f1f", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>↻ Refresh</button>
        </div>
        {!data ? <p>Load ho raha hai...</p> : rows.length === 0 ? <p style={{ color: "#777" }}>Koi staff nahi</p> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                {["Staff", "Aaj", "7 Din", "Mahina", "Total", "Unpaid", "Paid"].map((h) => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td style={td}><b>{r.name}</b></td>
                    <td style={td}>Rs. {r.today}</td>
                    <td style={td}>Rs. {r.week}</td>
                    <td style={td}>Rs. {r.month}</td>
                    <td style={td}><b>Rs. {r.total}</b></td>
                    <td style={{ ...td, color: "#fbbf24" }}>Rs. {r.unpaid}</td>
                    <td style={{ ...td, color: "#4ade80" }}>Rs. {r.paid}</td>
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
