
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type StaffPerformanceRecord = {
  user_id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  total_submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  total_earnings: number;
};

export default function StaffPerformance() {
  const [records, setRecords] = useState<StaffPerformanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadPerformance();
  }, []);

  async function loadPerformance() {
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

      const response = await fetch("/api/admin/staff-performance", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Performance data load nahi ho saka.");
        return;
      }

      setRecords(result.records || []);
    } catch {
      setError("Server se connection nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  const totalStaff = records.length;
  const totalSubmissions = records.reduce(
    (sum, item) => sum + Number(item.total_submissions || 0),
    0
  );
  const totalApproved = records.reduce(
    (sum, item) => sum + Number(item.approved || 0),
    0
  );
  const totalPending = records.reduce(
    (sum, item) => sum + Number(item.pending || 0),
    0
  );
  const totalRejected = records.reduce(
    (sum, item) => sum + Number(item.rejected || 0),
    0
  );
  const totalEarnings = records.reduce(
    (sum, item) => sum + Number(item.total_earnings || 0),
    0
  );

  const stats = [
    { title: "Total Staff", value: totalStaff, color: "#2563eb" },
    { title: "Total Submissions", value: totalSubmissions, color: "#7c3aed" },
    { title: "Approved", value: totalApproved, color: "#059669" },
    { title: "Pending", value: totalPending, color: "#d97706" },
    { title: "Rejected", value: totalRejected, color: "#dc2626" },
    {
      title: "Total Earnings",
      value: `Rs. ${totalEarnings.toLocaleString()}`,
      color: "#0891b2",
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Staff Performance</h1>
          <p style={styles.subtitle}>
            Apni team ki performance aur work progress dekhein.
          </p>
        </div>

        <button onClick={loadPerformance} style={styles.refreshButton}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={styles.message}>Loading performance...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <>
          <div style={styles.statsGrid}>
            {stats.map((item) => (
              <div key={item.title} style={styles.statCard}>
                <p style={styles.statTitle}>{item.title}</p>
                <h2 style={{ ...styles.statValue, color: item.color }}>
                  {item.value}
                </h2>
              </div>
            ))}
          </div>

          <div style={styles.tableCard}>
            <h2 style={styles.sectionTitle}>Staff Wise Performance</h2>

            {records.length === 0 ? (
              <div style={styles.message}>
                Abhi team performance ka record available nahi hai.
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Staff</th>
                      <th style={styles.th}>Submissions</th>
                      <th style={styles.th}>Approved</th>
                      <th style={styles.th}>Pending</th>
                      <th style={styles.th}>Rejected</th>
                      <th style={styles.th}>Earnings</th>
                    </tr>
                  </thead>

                  <tbody>
                    {records.map((staff) => (
                      <tr key={staff.user_id}>
                        <td style={styles.td}>
                          <strong>
                            {[staff.first_name, staff.surname]
                              .filter(Boolean)
                              .join(" ") || staff.username}
                          </strong>
                          <div style={styles.username}>
                            @{staff.username}
                          </div>
                        </td>

                        <td style={styles.td}>{staff.total_submissions}</td>
                        <td style={styles.td}>
                          <span style={styles.approved}>
                            {staff.approved}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.pending}>
                            {staff.pending}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.rejected}>
                            {staff.rejected}
                          </span>
                        </td>
                        <td style={styles.td}>
                          Rs. {Number(staff.total_earnings || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    color: "#172033",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  heading: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    color: "#64748b",
    marginTop: 7,
    fontSize: 14,
  },
  refreshButton: {
    background: "#172554",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "11px 20px",
    cursor: "pointer",
    fontWeight: 600,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
    gap: 15,
    marginBottom: 25,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 18,
    boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
  },
  statTitle: {
    color: "#64748b",
    fontSize: 13,
    margin: 0,
  },
  statValue: {
    fontSize: 25,
    margin: "12px 0 0",
    fontWeight: 700,
  },
  tableCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    margin: "0 0 18px",
    fontWeight: 700,
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 650,
    textAlign: "left",
  },
  th: {
    padding: 13,
    background: "#f8fafc",
    color: "#475569",
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: 13,
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
  },
  username: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  approved: {
    color: "#059669",
    fontWeight: 700,
  },
  pending: {
    color: "#d97706",
    fontWeight: 700,
  },
  rejected: {
    color: "#dc2626",
    fontWeight: 700,
  },
  message: {
    padding: 25,
    textAlign: "center",
    color: "#64748b",
  },
  error: {
    padding: 15,
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: 8,
  },
};
