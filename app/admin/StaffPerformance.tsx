"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Row = {
  id: string;
  name: string;
  username: string;
  assigned: number;
  submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  late: number;
  rate: number;
  earnings: number;
};

export default function StaffPerformance() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPerformance();
  }, []);

  async function loadPerformance() {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Please login again."); return; }

      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Performance data load nahi ho saka."); return; }

      const tasks: any[] = d.tasks || [];
      const asg: any[] = d.assignments || [];
      const subs: any[] = d.submissions || [];
      const earn: any[] = d.earnings || [];
      const now = new Date();

      const list: Row[] = (d.staff || []).map((s: any) => {
        const myTasks = asg.filter((a) => a.staff_id === s.id).map((a) => a.task_id)
          .filter((id) => tasks.some((t) => t.id === id));
        const mySubs = subs.filter((x) => x.user_id === s.id);
        const sentIds = new Set(mySubs.map((x) => x.task_id));
        const approved = mySubs.filter((x) => x.status === "approved").length;
        const rejected = mySubs.filter((x) => x.status === "rejected").length;
        const pending = mySubs.filter((x) => x.status === "pending").length;
        const late = myTasks.filter((id) => {
          const t = tasks.find((x) => x.id === id);
          return !sentIds.has(id) && t?.deadline && new Date(t.deadline) < now;
        }).length;
        return {
          id: s.id,
          name: [s.first_name, s.surname].filter(Boolean).join(" ") || s.username || "Staff",
          username: s.username || "",
          assigned: myTasks.length,
          submissions: mySubs.length,
          approved, pending, rejected, late,
          rate: approved + rejected ? Math.round((approved / (approved + rejected)) * 100) : 0,
          earnings: earn.filter((e) => e.user_id === s.id).reduce((a, e) => a + Number(e.amount || 0), 0),
        };
      }).sort((a: Row, b: Row) => b.approved - a.approved || b.earnings - a.earnings);

      setRows(list);
    } catch {
      setError("Server se connection nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  const total = (k: keyof Row) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`);

  const stats = [
    { title: "Total Staff", value: rows.length, cls: "c-blue" },
    { title: "Total Submissions", value: total("submissions"), cls: "c-purple" },
    { title: "Approved", value: total("approved"), cls: "c-green" },
    { title: "Pending", value: total("pending"), cls: "c-orange" },
    { title: "⏰ Late", value: total("late"), cls: "c-red" },
    { title: "Total Earnings", value: `Rs. ${total("earnings").toLocaleString()}`, cls: "c-cyan" },
  ];

  return (
    <div className="perf">
      <div className="header">
        <div>
          <h1>Staff Performance</h1>
          <p className="sub">Apni team ki performance aur work progress dekhein.</p>
        </div>
        <button className="refresh" onClick={loadPerformance} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="msg">Loading performance...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="grid">
            {stats.map((s) => (
              <div key={s.title} className="card">
                <p className="stitle">{s.title}</p>
                <h2 className={s.cls}>{s.value}</h2>
              </div>
            ))}
          </div>

          <div className="card">
            <h2 className="section">🏆 Staff Wise Performance</h2>
            {rows.length === 0 ? (
              <div className="msg">Abhi team performance ka record available nahi hai.</div>
            ) : (
              <div className="wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th><th>Staff</th><th>Tasks</th><th>Submissions</th>
                      <th>Approved</th><th>Pending</th><th>Rejected</th><th>Late</th>
                      <th>Approval %</th><th>Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id}>
                        <td>{medal(i)}</td>
                        <td>
                          <strong>{r.name}</strong>
                          {r.username && <div className="uname">@{r.username}</div>}
                        </td>
                        <td>{r.assigned}</td>
                        <td>{r.submissions}</td>
                        <td className="c-green b">{r.approved}</td>
                        <td className="c-orange b">{r.pending}</td>
                        <td className="c-red b">{r.rejected}</td>
                        <td className={r.late ? "c-red b" : ""}>{r.late}</td>
                        <td>
                          <div className="bar"><div style={{ width: `${r.rate}%` }} /></div>
                          <span className="uname">{r.rate}%</span>
                        </td>
                        <td className="b">Rs. {r.earnings.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <style jsx>{`
        .perf { width: 100%; color: #172033; font-family: Arial, sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
        h1 { font-size: 26px; font-weight: 700; margin: 0; }
        .sub { color: #64748b; margin-top: 7px; font-size: 14px; }
        .refresh { background: #172554; color: #fff; border: 0; border-radius: 8px; padding: 11px 20px; cursor: pointer; font-weight: 600; }
        .refresh:disabled { opacity: 0.6; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 15px; margin-bottom: 25px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; box-shadow: 0 2px 8px rgba(15,23,42,0.04); }
        .stitle { color: #64748b; font-size: 13px; margin: 0; }
        .card h2 { font-size: 25px; margin: 12px 0 0; font-weight: 700; }
        .section { font-size: 18px !important; margin: 0 0 18px !important; color: #172033; }
        .wrap { width: 100%; overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 820px; text-align: left; }
        th { padding: 13px; background: #f8fafc; color: #475569; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        td { padding: 13px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        .uname { color: #64748b; font-size: 12px; margin-top: 4px; }
        .b { font-weight: 700; }
        .bar { background: #e2e8f0; border-radius: 10px; height: 7px; width: 80px; }
        .bar div { background: #059669; height: 7px; border-radius: 10px; }
        .c-blue { color: #2563eb; } .c-purple { color: #7c3aed; } .c-green { color: #059669; }
        .c-orange { color: #d97706; } .c-red { color: #dc2626; } .c-cyan { color: #0891b2; }
        .msg { padding: 25px; text-align: center; color: #64748b; }
        .error { padding: 15px; background: #fef2f2; color: #b91c1c; border-radius: 8px; }

        :global(.dark) .perf { color: #e5e7eb; }
        :global(.dark) h1, :global(.dark) .section, :global(.dark) strong { color: #f1f3f5 !important; }
        :global(.dark) .card { background: #15181d; border-color: #262a31; box-shadow: none; }
        :global(.dark) th { background: #111418; color: #858995; border-color: #262a31; }
        :global(.dark) td { color: #cbd5e1; border-color: #262a31; }
        :global(.dark) .refresh { background: #1a1e24; color: #93c5fd; border: 1px solid #2c313a; }
        :global(.dark) .bar { background: #262a31; }
        :global(.dark) .bar div { background: #4ade80; }
        :global(.dark) .c-blue { color: #60a5fa; } :global(.dark) .c-purple { color: #a78bfa; }
        :global(.dark) .c-green { color: #4ade80; } :global(.dark) .c-orange { color: #fbbf24; }
        :global(.dark) .c-red { color: #f87171; } :global(.dark) .c-cyan { color: #22d3ee; }
        :global(.dark) .error { background: #2b2022; color: #ffb4b4; }
      `}</style>
    </div>
  );
}
