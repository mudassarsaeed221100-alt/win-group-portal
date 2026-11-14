
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

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Please login again.");
        return;
      }

      const response = await fetch("/api/admin/reports", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Reports load nahi ho sake.");
        return;
      }

      setRecords(result.records || []);
      setStaff(result.staff || []);
    } catch {
      setError("Server se connection nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  const filteredRecords =
    filter === "All"
      ? records
      : records.filter(
          (record) => record.status?.toLowerCase() === filter.toLowerCase()
        );

  const totalEarnings = records.reduce(
    (sum, record) => sum + Math.max(0, Number(record.earning_amount || 0)),
    0
  );

  const approved = records.filter(
    (record) => record.status?.toLowerCase() === "approved"
  ).length;

  const pending = records.filter(
    (record) => record.status?.toLowerCase() === "pending"
  ).length;

  const rejected = records.filter(
    (record) => record.status?.toLowerCase() === "rejected"
  ).length;

  function staffName(userId: string) {
    const member = staff.find((item) => item.id === userId);

    if (!member) return "Staff";

    return (
      [member.first_name, member.surname].filter(Boolean).join(" ") ||
      member.username ||
      "Staff"
    );
  }

  function exportCSV() {
    const headers = [
      "Staff",
      "Status",
      "Earning Amount",
      "Submission Date",
    ];

    const rows = filteredRecords.map((record) => [
      staffName(record.user_id),
      record.status || "Unknown",
      String(record.earning_amount || 0),
      new Date(record.created_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "admin-team-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Reports</h1>
          <p style={styles.subtitle}>
            Apni team ki submissions aur earnings reports dekhein.
          </p>
        </div>

        <div style={styles.actions}>
          <button onClick={loadReports} style={styles.refreshButton}>
            Refresh
          </button>
          <button
            onClick={exportCSV}
            style={styles.exportButton}
            disabled={loading || filteredRecords.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={styles.message}>Reports loading...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <>
          <div style={styles.stats}>
            <div style={styles.statCard}>
              <span>Total Staff</span>
              <strong>{staff.length}</strong>
            </div>
            <div style={styles.statCard}>
              <span>Total Submissions</span>
              <strong>{records.length}</strong>
            </div>
            <div style={styles.statCard}>
              <span>Approved</span>
              <strong style={{ color: "#059669" }}>{approved}</strong>
            </div>
            <div style={styles.statCard}>
              <span>Pending</span>
              <strong style={{ color: "#d97706" }}>{pending}</strong>
            </div>
            <div style={styles.statCard}>
              <span>Rejected</span>
              <strong style={{ color: "#dc2626" }}>{rejected}</strong>
            </div>
            <div style={styles.statCard}>
              <span>Total Earnings</span>
              <strong style={{ color: "#2563eb" }}>
                Rs. {totalEarnings.toLocaleString()}
              </strong>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.tableHeader}>
              <h2 style={styles.sectionTitle}>Submission Report</h2>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                style={styles.select}
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {filteredRecords.length === 0 ? (
              <div style={styles.message}>Koi report record nahi mila.</div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Staff</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Earnings</th>
                      <th style={styles.th}>Submission Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id}>
                        <td style={styles.td}>{staffName(record.user_id)}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.status,
                              color:
                                record.status?.toLowerCase() === "approved"
                                  ? "#059669"
                                  : record.status?.toLowerCase() === "rejected"
                                  ? "#dc2626"
                                  : "#d97706",
                            }}
                          >
                            {record.status || "Unknown"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          Rs. {Number(record.earning_amount || 0).toLocaleString()}
                        </td>
                        <td style={styles.td}>
                          {new Date(record.created_at).toLocaleString()}
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
  container: { width: "100%", color: "#172033" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 22,
  },
  heading: { fontSize: 26, fontWeight: 700, margin: 0 },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 7 },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  refreshButton: {
    background: "#e2e8f0",
    color: "#334155",
    border: 0,
    padding: "11px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },
  exportButton: {
    background: "#1d4ed8",
    color: "#fff",
    border: 0,
    padding: "11px 16px",
    borderRadius: 8,
    cursor: "pointer",
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))",
    gap: 14,
    marginBottom: 20,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    color: "#64748b",
    fontSize: 13,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, margin: 0, fontWeight: 700 },
  select: {
    padding: 10,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 600 },
  th: {
    padding: 12,
    textAlign: "left",
    background: "#f8fafc",
    color: "#475569",
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
  },
  td: {
    padding: 12,
    fontSize: 13,
    borderBottom: "1px solid #e2e8f0",
  },
  status: { fontWeight: 700 },
  message: { padding: 25, textAlign: "center", color: "#64748b" },
  error: {
    padding: 15,
    color: "#b91c1c",
    background: "#fef2f2",
    borderRadius: 8,
  },
};
