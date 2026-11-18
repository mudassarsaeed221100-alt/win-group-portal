"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type ReportRecord = {
  id: string;
  user_id: string;
  status: string | null;
  earning_amount: number | null;
  created_at: string;
};

type StaffMember = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
};

export default function Reports() {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError("Please login again."); return; }

      const response = await fetch("/api/admin/reports", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Reports load nahi ho sake."); return; }

      setRecords(result.records || []);
      setStaff(result.staff || []);
    } catch {
      setError("Server se connection nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startDay); startWeek.setDate(startDay.getDate() - 6);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromDate = period === "today" ? startDay : period === "week" ? startWeek : period === "month" ? startMonth : null;

  const inPeriod = records.filter((r) => !fromDate || new Date(r.created_at) >= fromDate);
  const st = (r: ReportRecord) => (r.status || "").toLowerCase();
  const filteredRecords = filter === "All" ? inPeriod : inPeriod.filter((r) => st(r) === filter.toLowerCase());

  const totalEarnings = inPeriod
    .filter((r) => st(r) === "approved")
    .reduce((sum, r) => sum + Math.max(0, Number(r.earning_amount || 0)), 0);
  const approved = inPeriod.filter((r) => st(r) === "approved").length;
  const pending = inPeriod.filter((r) => st(r) === "pending").length;
  const rejected = inPeriod.filter((r) => st(r) === "rejected").length;

  function staffName(userId: string) {
    const m = staff.find((x) => x.id === userId);
    if (!m) return "Staff";
    return [m.first_name, m.surname].filter(Boolean).join(" ") || m.username || "Staff";
  }

  function exportCSV() {
    const headers = ["Staff", "Status", "Earning Amount", "Submission Date"];
    const rows = filteredRecords.map((r) => [
      staffName(r.user_id),
      r.status || "Unknown",
      String(r.earning_amount || 0),
      new Date(r.created_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-team-report-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const statusClass = (r: ReportRecord) =>
    st(r) === "approved" ? "c-green" : st(r) === "rejected" ? "c-red" : "c-orange";

  return (
    <div className="rep">
      <div className="header">
        <div>
          <h1>Reports</h1>
          <p className="sub">Apni team ki submissions aur earnings reports dekhein.</p>
        </div>
        <div className="actions">
          <button className="btn-light" onClick={loadReports} disabled={loading}>
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
          <button className="btn-blue" onClick={exportCSV} disabled={loading || filteredRecords.length === 0}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="periods">
        {[["today", "Aaj"], ["week", "7 Din"], ["month", "Is Mahine"], ["all", "Sab"]].map(([k, l]) => (
          <button key={k} className={period === k ? "pill active" : "pill"} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="msg">Reports loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="stats">
            <div className="card stat"><span>Total Staff</span><strong>{staff.length}</strong></div>
            <div className="card stat"><span>Total Submissions</span><strong>{inPeriod.length}</strong></div>
            <div className="card stat"><span>Approved</span><strong className="c-green">{approved}</strong></div>
            <div className="card stat"><span>Pending</span><strong className="c-orange">{pending}</strong></div>
            <div className="card stat"><span>Rejected</span><strong className="c-red">{rejected}</strong></div>
            <div className="card stat"><span>Total Earnings</span><strong className="c-blue">Rs. {totalEarnings.toLocaleString()}</strong></div>
          </div>

          <div className="card">
            <div className="table-head">
              <h2>Submission Report</h2>
              <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="msg">Koi report record nahi mila.</div>
            ) : (
              <div className="wrap">
                <table>
                  <thead>
                    <tr><th>Staff</th><th>Status</th><th>Earnings</th><th>Submission Date</th></tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{staffName(r.user_id)}</strong></td>
                        <td><span className={"b " + statusClass(r)}>{r.status || "Unknown"}</span></td>
                        <td>Rs. {Number(r.earning_amount || 0).toLocaleString()}</td>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
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
        .rep { width: 100%; color: #172033; font-family: Arial, sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
        h1 { font-size: 26px; font-weight: 700; margin: 0; }
        .sub { color: #64748b; font-size: 14px; margin-top: 7px; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-light { background: #e2e8f0; color: #334155; border: 0; padding: 11px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-blue { background: #1d4ed8; color: #fff; border: 0; padding: 11px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .periods { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .pill { padding: 8px 16px; border-radius: 20px; border: 1px solid #cbd5e1; background: #fff; color: #334155; cursor: pointer; font-size: 13px; font-weight: 600; }
        .pill.active { background: #172554; color: #fff; border-color: #172554; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
        .stat { display: flex; flex-direction: column; gap: 12px; color: #64748b; font-size: 13px; padding: 18px; }
        .stat strong { font-size: 22px; color: #172033; }
        .table-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
        .table-head h2 { font-size: 18px; margin: 0; font-weight: 700; }
        select { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #172033; }
        .wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 600px; }
        th { padding: 12px; text-align: left; background: #f8fafc; color: #475569; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        .b { font-weight: 700; text-transform: capitalize; }
        .c-green { color: #059669 !important; } .c-orange { color: #d97706 !important; }
        .c-red { color: #dc2626 !important; } .c-blue { color: #2563eb !important; }
        .msg { padding: 25px; text-align: center; color: #64748b; }
        .error { padding: 15px; color: #b91c1c; background: #fef2f2; border-radius: 8px; }

        :global(.dark) .rep { color: #e5e7eb; }
        :global(.dark) h1, :global(.dark) .table-head h2, :global(.dark) .stat strong, :global(.dark) td strong { color: #f1f3f5; }
        :global(.dark) .card { background: #15181d; border-color: #262a31; }
        :global(.dark) .stat, :global(.dark) .sub, :global(.dark) .msg { color: #aeb4bd; }
        :global(.dark) .btn-light, :global(.dark) .pill { background: #1a1e24; color: #e5e7eb; border: 1px solid #2c313a; }
        :global(.dark) .pill.active { background: #e5e7eb; color: #111; border-color: #e5e7eb; }
        :global(.dark) select { background: #0f1216; color: #f1f3f5; border-color: #2c313a; }
        :global(.dark) th { background: #111418; color: #858995; border-color: #262a31; }
        :global(.dark) td { color: #cbd5e1; border-color: #262a31; }
        :global(.dark) .c-green { color: #4ade80 !important; } :global(.dark) .c-orange { color: #fbbf24 !important; }
        :global(.dark) .c-red { color: #f87171 !important; } :global(.dark) .c-blue { color: #60a5fa !important; }
        :global(.dark) .error { background: #2b2022; color: #ffb4b4; }
      `}</style>
    </div>
  );
}
