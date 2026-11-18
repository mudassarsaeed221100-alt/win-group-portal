"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EarningRecord = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function StaffEarnings() {
  const [records, setRecords] = useState<EarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Please login again."); return; }

      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to load earnings."); return; }

      const staff: any[] = result.staff || [];
      const list: EarningRecord[] = (result.earnings || []).map((e: any, i: number) => {
        const s = staff.find((x) => x.id === e.user_id);
        const name = s ? ([s.first_name, s.surname].filter(Boolean).join(" ") || s.username || "Staff") : "Staff";
        return {
          id: e.id || `${e.user_id}-${i}`,
          user_id: e.user_id,
          name,
          amount: Number(e.amount || 0),
          status: e.payment_status || "unpaid",
          created_at: e.created_at,
        };
      }).sort((a: EarningRecord, b: EarningRecord) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecords(list);
    } catch {
      setError("Something went wrong while loading earnings.");
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const sum = (items: EarningRecord[]) => items.reduce((t, i) => t + i.amount, 0);
  const from = (d: Date) => records.filter((r) => new Date(r.created_at) >= d);

  const totalEarnings = sum(records);
  const dailyEarnings = sum(from(startOfDay));
  const weeklyEarnings = sum(from(startOfWeek));
  const monthlyEarnings = sum(from(startOfMonth));
  const unpaidEarnings = sum(records.filter((r) => r.status !== "paid"));
  const paidEarnings = sum(records.filter((r) => r.status === "paid"));

  const staffMap = new Map<string, { name: string; total: number; unpaid: number; paid: number }>();
  records.forEach((r) => {
    const e = staffMap.get(r.user_id) || { name: r.name, total: 0, unpaid: 0, paid: 0 };
    e.total += r.amount;
    if (r.status === "paid") e.paid += r.amount; else e.unpaid += r.amount;
    staffMap.set(r.user_id, e);
  });
  const staffList = Array.from(staffMap.values()).sort((a, b) => b.total - a.total);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString("en-PK")}`;

  return (
    <div className="earnings-page">
      <div className="page-heading">
        <div>
          <h2>Staff Earnings</h2>
          <p>Apni team ki earning details aur performance dekhein.</p>
        </div>
        <button onClick={loadEarnings} disabled={loading}>
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card total">
          <span>TOTAL EARNINGS</span>
          <h2>{formatMoney(totalEarnings)}</h2>
          <p>All recorded earnings</p>
        </div>
        <div className="stat-card">
          <span>TODAY</span>
          <h2>{formatMoney(dailyEarnings)}</h2>
          <p>Today's earnings</p>
        </div>
        <div className="stat-card">
          <span>THIS WEEK</span>
          <h2>{formatMoney(weeklyEarnings)}</h2>
          <p>Current week's earnings</p>
        </div>
        <div className="stat-card">
          <span>THIS MONTH</span>
          <h2>{formatMoney(monthlyEarnings)}</h2>
          <p>Current month's earnings</p>
        </div>
        <div className="stat-card">
          <span>UNPAID</span>
          <h2 className="warn">{formatMoney(unpaidEarnings)}</h2>
          <p>Abhi payment baqi hai</p>
        </div>
        <div className="stat-card">
          <span>PAID</span>
          <h2 className="ok">{formatMoney(paidEarnings)}</h2>
          <p>Payment ho chuki</p>
        </div>
      </div>

      <div className="panel">
        <h3>Staff-wise Earnings</h3>
        <p>Individual Staff ki total earning</p>
        {loading ? (
          <div className="empty">Loading earnings...</div>
        ) : staffList.length === 0 ? (
          <div className="empty">Abhi koi earning record available nahi.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Staff Name</th><th>Total</th><th>Unpaid</th><th>Paid</th></tr>
              </thead>
              <tbody>
                {staffList.map((s, i) => (
                  <tr key={i}>
                    <td>{s.name}</td>
                    <td className="amount">{formatMoney(s.total)}</td>
                    <td className="warn">{formatMoney(s.unpaid)}</td>
                    <td className="ok">{formatMoney(s.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Earning History</h3>
        <p>Team ke earning records</p>
        {loading ? (
          <div className="empty">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="empty">No earning records found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Staff</th><th>Amount</th><th>Status</th><th>Date</th></tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="amount">{formatMoney(r.amount)}</td>
                    <td><span className={r.status === "paid" ? "status" : "status unpaid"}>{r.status === "paid" ? "Paid" : "Unpaid"}</span></td>
                    <td>{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .earnings-page { display: grid; gap: 20px; color: #172c48; font-family: Arial, sans-serif; }
        .page-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
        .page-heading h2 { margin: 0; font-size: 22px; }
        .page-heading p, .panel > p { color: #8492a7; font-size: 12px; }
        button { padding: 10px 15px; background: white; border: 1px solid #dce4ee; border-radius: 7px; color: #2459a2; cursor: pointer; }
        button:disabled { opacity: 0.6; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .stat-card, .panel { background: white; border: 1px solid #e5eaf1; border-radius: 11px; padding: 21px; }
        .stat-card span { color: #8492a7; font-size: 10px; letter-spacing: 1px; }
        .stat-card h2 { margin: 17px 0 7px; font-size: 21px; overflow-wrap: anywhere; }
        .stat-card p { color: #8492a7; font-size: 11px; }
        .total { background: #17375f; color: white; }
        .total span, .total p { color: #c4d8f2; }
        .panel h3 { margin: 0; font-size: 17px; }
        .panel > p { margin: 7px 0 20px; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 480px; text-align: left; }
        th, td { padding: 14px 12px; border-bottom: 1px solid #edf0f5; font-size: 12px; }
        th { background: #f8fafd; color: #8292a8; font-size: 10px; text-transform: uppercase; }
        td { color: #42546c; }
        .amount { font-weight: bold; color: #18885b; }
        .warn { color: #b45309 !important; font-weight: bold; }
        .ok { color: #18885b !important; font-weight: bold; }
        .status { display: inline-block; padding: 5px 9px; background: #e5f7ee; color: #18885b; border-radius: 15px; font-size: 10px; }
        .status.unpaid { background: #fef3c7; color: #b45309; }
        .empty { padding: 25px 10px; color: #8492a7; font-size: 12px; }
        .error { padding: 13px; background: #fff0f0; color: #bd3333; border-radius: 8px; font-size: 12px; }

        :global(.dark) .earnings-page { color: #e5e7eb; }
        :global(.dark) .stat-card, :global(.dark) .panel { background: #15181d; border-color: #262a31; }
        :global(.dark) .total { background: #17375f; }
        :global(.dark) .page-heading h2, :global(.dark) .panel h3, :global(.dark) .stat-card h2 { color: #f1f3f5; }
        :global(.dark) button { background: #1a1e24; color: #93c5fd; border-color: #2c313a; }
        :global(.dark) th { background: #111418; color: #858995; }
        :global(.dark) td { color: #cbd5e1; }
        :global(.dark) th, :global(.dark) td { border-color: #262a31; }
        :global(.dark) .amount, :global(.dark) .ok { color: #4ade80 !important; }
        :global(.dark) .warn { color: #fbbf24 !important; }
        :global(.dark) .status { background: #1c3027; color: #a8e6bf; }
        :global(.dark) .status.unpaid { background: #302a1e; color: #f5d28a; }
        :global(.dark) .error { background: #2b2022; color: #ffb4b4; }

        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 500px) {
          .stats-grid { grid-template-columns: 1fr; }
          .page-heading { align-items: flex-start; }
          .stat-card, .panel { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
