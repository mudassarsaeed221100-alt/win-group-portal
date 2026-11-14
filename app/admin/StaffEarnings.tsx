
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type EarningRecord = {
  id: string;
  user_id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  earning_amount: number;
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Please login again.");
        return;
      }

      const response = await fetch("/api/admin/staff-earnings", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to load earnings.");
        return;
      }

      setRecords(result.records || []);
    } catch {
      setError("Something went wrong while loading earnings.");
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(
    startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)
  );

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const getAmount = (items: EarningRecord[]) =>
    items.reduce(
      (total, item) => total + Number(item.earning_amount || 0),
      0
    );

  const dailyRecords = records.filter(
    (item) => new Date(item.created_at) >= startOfDay
  );

  const weeklyRecords = records.filter(
    (item) => new Date(item.created_at) >= startOfWeek
  );

  const monthlyRecords = records.filter(
    (item) => new Date(item.created_at) >= startOfMonth
  );

  const totalEarnings = getAmount(records);
  const dailyEarnings = getAmount(dailyRecords);
  const weeklyEarnings = getAmount(weeklyRecords);
  const monthlyEarnings = getAmount(monthlyRecords);

  const staffMap = new Map<string, {
    name: string;
    total: number;
  }>();

  records.forEach((item) => {
    const name =
      [item.first_name, item.surname].filter(Boolean).join(" ") ||
      item.username ||
      "Staff";

    const existing = staffMap.get(item.user_id);

    if (existing) {
      existing.total += Number(item.earning_amount || 0);
    } else {
      staffMap.set(item.user_id, {
        name,
        total: Number(item.earning_amount || 0),
      });
    }
  });

  const staffList = Array.from(staffMap.values()).sort(
    (a, b) => b.total - a.total
  );

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatMoney = (amount: number) =>
    `Rs. ${amount.toLocaleString("en-PK")}`;

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
                <tr>
                  <th>Staff Name</th>
                  <th>Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => (
                  <tr key={index}>
                    <td>{staff.name}</td>
                    <td className="amount">{formatMoney(staff.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel history">
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
                <tr>
                  <th>Staff</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {[item.first_name, item.surname]
                        .filter(Boolean)
                        .join(" ") || item.username}
                    </td>
                    <td className="amount">
                      {formatMoney(Number(item.earning_amount || 0))}
                    </td>
                    <td>
                      <span className="status">{item.status}</span>
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .earnings-page {
          display: grid;
          gap: 20px;
          color: #172c48;
          font-family: Arial, sans-serif;
        }

        .page-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .page-heading h2 {
          margin: 0;
          font-size: 22px;
        }

        .page-heading p, .panel > p {
          color: #8492a7;
          font-size: 12px;
        }

        button {
          padding: 10px 15px;
          background: white;
          border: 1px solid #dce4ee;
          border-radius: 7px;
          color: #2459a2;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .stat-card, .panel {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 11px;
          padding: 21px;
        }

        .stat-card span {
          color: #8492a7;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .stat-card h2 {
          margin: 17px 0 7px;
          font-size: 21px;
          overflow-wrap: anywhere;
        }

        .stat-card p {
          color: #8492a7;
          font-size: 11px;
        }

        .total {
          background: #17375f;
          color: white;
        }

        .total span, .total p {
          color: #c4d8f2;
        }

        .panel h3 {
          margin: 0;
          font-size: 17px;
        }

        .panel > p {
          margin: 7px 0 20px;
        }

        .table-wrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 480px;
          text-align: left;
        }

        th, td {
          padding: 14px 12px;
          border-bottom: 1px solid #edf0f5;
          font-size: 12px;
        }

        th {
          background: #f8fafd;
          color: #8292a8;
          font-size: 10px;
          text-transform: uppercase;
        }

        td {
          color: #42546c;
        }

        .amount {
          font-weight: bold;
          color: #18885b;
        }

        .status {
          display: inline-block;
          padding: 5px 9px;
          background: #e5f7ee;
          color: #18885b;
          border-radius: 15px;
          font-size: 10px;
        }

        .empty {
          padding: 25px 10px;
          color: #8492a7;
          font-size: 12px;
        }

        .error {
          padding: 13px;
          background: #fff0f0;
          color: #bd3333;
          border-radius: 8px;
          font-size: 12px;
        }

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 500px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }

          .page-heading {
            align-items: flex-start;
          }

          .stat-card, .panel {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
