
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Department = {
  id: string;
  name: string;
};

type BusinessRecord = {
  id: string;
  title: string;
  record_type: "income" | "expense" | "other";
  category: string | null;
  description: string | null;
  amount: number;
  record_date: string;
  reference_number: string | null;
  department_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export default function Reports() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  /* ── Load Data ── */
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");

    const [recordsResult, departmentsResult] = await Promise.all([
      supabase
        .from("business_records")
        .select("*")
        .order("record_date", { ascending: false }),
      supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    if (recordsResult.error) {
      setError(recordsResult.error.message);
    } else {
      setRecords((recordsResult.data || []) as BusinessRecord[]);
    }

    if (departmentsResult.error) {
      setError((prev) =>
        prev ? prev + " | " + departmentsResult.error.message : departmentsResult.error.message
      );
    } else {
      setDepartments(departmentsResult.data || []);
    }

    setLoading(false);
  }

  /* ── Filter & Search ── */
  useEffect(() => {
    let filtered = records;

    // Status filter (only active by default)
    filtered = filtered.filter((r) => r.status === statusFilter);

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(term) ||
          r.category?.toLowerCase().includes(term) ||
          r.reference_number?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.record_type === typeFilter);
    }

    // Department filter
    if (departmentFilter !== "all") {
      filtered = filtered.filter((r) => r.department_id === departmentFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((r) => r.record_date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((r) => r.record_date <= endDate);
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [searchTerm, typeFilter, departmentFilter, statusFilter, startDate, endDate, records]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Calculate Stats ── */
  const totalIncome = filteredRecords
    .filter((r) => r.record_type === "income")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalExpense = filteredRecords
    .filter((r) => r.record_type === "expense")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const otherAmount = filteredRecords
    .filter((r) => r.record_type === "other")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const balance = totalIncome - totalExpense;

  /* ── Category Breakdown ── */
  const categoryBreakdown = filteredRecords.reduce(
    (acc, record) => {
      const key = record.category || "Uncategorized";
      if (!acc[key]) {
        acc[key] = { income: 0, expense: 0, other: 0 };
      }
      if (record.record_type === "income") {
        acc[key].income += Number(record.amount);
      } else if (record.record_type === "expense") {
        acc[key].expense += Number(record.amount);
      } else {
        acc[key].other += Number(record.amount);
      }
      return acc;
    },
    {} as Record<string, { income: number; expense: number; other: number }>
  );

  /* ── Export to CSV ── */
  function exportToCSV() {
    if (filteredRecords.length === 0) {
      alert("No records to export.");
      return;
    }

    const headers = ["Date", "Title", "Type", "Category", "Amount", "Department", "Status"];
    const rows = filteredRecords.map((record) => {
      const dept = departments.find((d) => d.id === record.department_id);
      return [
        record.record_date,
        record.title,
        record.record_type,
        record.category || "—",
        record.amount,
        dept?.name || "—",
        record.status,
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  function formatAmount(amount: number) {
    return `Rs. ${Number(amount).toLocaleString("en-PK")}`;
  }

  const getRecordTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return { bg: "#064e3b", color: "#86efac" };
      case "expense":
        return { bg: "#7f1d1d", color: "#fca5a5" };
      default:
        return { bg: "#1e3a8a", color: "#93c5fd" };
    }
  };

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            FINANCIAL ANALYSIS
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Business Reports</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            Income, expenses and financial performance reports.
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Income", value: formatAmount(totalIncome), color: "#10b981" },
            { label: "Total Expenses", value: formatAmount(totalExpense), color: "#ef4444" },
            { label: "Net Balance", value: formatAmount(balance), color: "#3b82f6" },
            { label: "Other Records", value: formatAmount(otherAmount), color: "#8b5cf6" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888" }}>{stat.label}</div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: stat.color, marginTop: "6px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error Message ── */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#7f1d1d",
            color: "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            FILTERS & SEARCH
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          <input
            type="text"
            placeholder="Search title, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="other">Other</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
              setTypeFilter("all");
              setDepartmentFilter("all");
            }}
            style={{
              padding: "8px 12px",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear Filters
          </button>

          <button
            onClick={exportToCSV}
            style={{
              padding: "8px 12px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ marginBottom: "12px" }}>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
              CATEGORY BREAKDOWN
            </div>
            <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Income & Expense by Category</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            {Object.entries(categoryBreakdown).map(([category, amounts]) => (
              <div
                key={category}
                style={{
                  background: "#252525",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", marginBottom: "8px" }}>
                  {category}
                </div>
                <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Income: <span style={{ color: "#86efac" }}>{formatAmount(amounts.income)}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Expense: <span style={{ color: "#fca5a5" }}>{formatAmount(amounts.expense)}</span>
                </div>
                {amounts.other > 0 && (
                  <div style={{ fontSize: "11px", color: "#aaa" }}>
                    Other: <span style={{ color: "#93c5fd" }}>{formatAmount(amounts.other)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Records Table ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "4px" }}>
                FINANCIAL RECORDS
              </div>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>All Records</h3>
            </div>
            <div style={{ color: "#888", fontSize: "11px" }}>
              {filteredRecords.length} Records
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading reports...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            No records found for the selected filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Date
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Title
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Type
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Category
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Amount
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Department
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => {
                  const typeColor = getRecordTypeColor(record.record_type);
                  const dept = departments.find((d) => d.id === record.department_id);
                  return (
                    <tr key={record.id} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: "12px", color: "#888" }}>{record.record_date}</td>
                      <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{record.title}</td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background: typeColor.bg,
                            color: typeColor.color,
                            textTransform: "capitalize",
                          }}
                        >
                          {record.record_type}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "#aaa" }}>{record.category || "—"}</td>
                      <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                        {formatAmount(Number(record.amount))}
                      </td>
                      <td style={{ padding: "12px", color: "#aaa" }}>{dept?.name || "—"}</td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background: record.status === "active" ? "#064e3b" : "#7f1d1d",
                            color: record.status === "active" ? "#86efac" : "#fca5a5",
                          }}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "6px 10px",
              background: currentPage === 1 ? "#333" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "6px 10px",
                background: currentPage === page ? "#2563eb" : "#333",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: currentPage === page ? "bold" : "normal",
              }}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "6px 10px",
              background: currentPage === totalPages ? "#333" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            Next →
          </button>

          <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

