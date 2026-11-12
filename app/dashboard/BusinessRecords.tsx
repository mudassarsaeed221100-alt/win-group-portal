
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

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyForm = {
  title: "",
  record_type: "income" as "income" | "expense" | "other",
  category: "",
  description: "",
  amount: "",
  record_date: today(),
  reference_number: "",
  department_id: "",
};

export default function BusinessRecords() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BusinessRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  /* ── Load Data ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
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
      setError((previous) =>
        previous
          ? previous + " | " + departmentsResult.error.message
          : departmentsResult.error.message
      );
    } else {
      setDepartments(departmentsResult.data || []);
    }

    setLoading(false);
  }

  /* ── Filter & Search ── */
  useEffect(() => {
    let filtered = records;

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(term) ||
          record.category?.toLowerCase().includes(term) ||
          record.reference_number?.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((record) => record.record_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter((record) => record.record_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((record) => record.record_date <= dateTo);
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [searchTerm, typeFilter, statusFilter, dateFrom, dateTo, records]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Form Handler ── */
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  /* ── Submit Form ── */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Please enter a valid amount.");
      setSaving(false);
      return;
    }

    if (!form.title.trim()) {
      setError("Record title is required.");
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      record_type: form.record_type,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      amount,
      record_date: form.record_date,
      reference_number: form.reference_number.trim() || null,
      department_id: form.department_id || null,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("business_records")
        .update(payload)
        .eq("id", editingId);
    } else {
      const { data: authData } = await supabase.auth.getUser();

      result = await supabase.from("business_records").insert({
        ...payload,
        created_by: authData.user?.id,
      });
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(
        editingId ? "Record updated successfully." : "Record added successfully."
      );
      setForm({ ...emptyForm, record_date: today() });
      setEditingId(null);
      await loadData();
    }

    setSaving(false);
  }

  /* ── Edit Record ── */
  function handleEdit(record: BusinessRecord) {
    setForm({
      title: record.title,
      record_type: record.record_type,
      category: record.category || "",
      description: record.description || "",
      amount: String(record.amount),
      record_date: record.record_date,
      reference_number: record.reference_number || "",
      department_id: record.department_id || "",
    });

    setEditingId(record.id);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Toggle Status ── */
  async function toggleStatus(record: BusinessRecord) {
    setError("");
    setMessage("");

    const newStatus = record.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("business_records")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Record status updated successfully.");
      await loadData();
    }
  }

  /* ── Delete Record ── */
  async function deleteRecord(id: string) {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("business_records")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Record deleted successfully.");
      await loadData();
    }
  }

  /* ── Cancel Edit ── */
  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm, record_date: today() });
    setMessage("");
    setError("");
  }

  /* ── Calculate Stats ── */
  const activeRecords = filteredRecords.filter((r) => r.status === "active");
  const totalIncome = activeRecords
    .filter((r) => r.record_type === "income")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = activeRecords
    .filter((r) => r.record_type === "expense")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const netBalance = totalIncome - totalExpense;

  const formatAmount = (amount: number) =>
    `Rs. ${Number(amount).toLocaleString("en-PK")}`;

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
            FINANCIAL MANAGEMENT
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Business Records</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            Manage business income, expenses and other financial records.
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Income", value: formatAmount(totalIncome), color: "#10b981" },
            { label: "Total Expenses", value: formatAmount(totalExpense), color: "#ef4444" },
            { label: "Net Balance", value: formatAmount(netBalance), color: "#3b82f6" },
            { label: "Total Records", value: records.length, color: "#8b5cf6" },
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
              <div
                style={{
                  fontSize: typeof stat.value === "number" ? "20px" : "16px",
                  fontWeight: "bold",
                  color: stat.color,
                  marginTop: "6px",
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            background: "#064e3b",
            color: "#86efac",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {message}
        </div>
      )}

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

      {/* ── Create/Edit Form ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
            {editingId ? "EDIT RECORD" : "NEW RECORD"}
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
            {editingId ? "Update Business Record" : "Add Business Record"}
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Record Title *
              </label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                placeholder="Enter record title"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Record Type *
              </label>
              <select
                name="record_type"
                value={form.record_type}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Amount (PKR) *
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={handleChange}
                required
                placeholder="Enter amount"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Category
              </label>
              <input
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="e.g. Salary, Sales, Rent"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Record Date *
              </label>
              <input
                name="record_date"
                type="date"
                value={form.record_date}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Department
              </label>
              <select
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              >
                <option value="">No Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Reference Number
              </label>
              <input
                name="reference_number"
                value={form.reference_number}
                onChange={handleChange}
                placeholder="Optional reference"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Additional details"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#252525",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
                fontFamily: "Arial, sans-serif",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 16px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : editingId ? "Update Record" : "Add Record"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{
                  padding: "10px 16px",
                  background: "#444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Search & Filters ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search title, category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1a1a1a",
            border: "1px solid #333",
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
            background: "#1a1a1a",
            border: "1px solid #333",
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From date"
          style={{
            padding: "8px 12px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
          }}
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To date"
          style={{
            padding: "8px 12px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
          }}
        />

        <button
          onClick={() => {
            setSearchTerm("");
            setTypeFilter("all");
            setStatusFilter("all");
            setDateFrom("");
            setDateTo("");
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
      </div>

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
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>All Business Records</h3>
            </div>
            <div style={{ color: "#888", fontSize: "11px" }}>
              {filteredRecords.length} Records
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading records...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            {searchTerm || typeFilter !== "all" || statusFilter !== "all" || dateFrom || dateTo
              ? "No records match your filters."
              : "No business records found. Add your first record above."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Title
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Type
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Amount
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Category
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Date
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px", textAlign: "center", color: "#888", fontWeight: "normal" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => {
                  const typeColor = getRecordTypeColor(record.record_type);
                  return (
                    <tr key={record.id} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                        {record.title}
                      </td>
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
                      <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                        {formatAmount(Number(record.amount))}
                      </td>
                      <td style={{ padding: "12px", color: "#aaa" }}>
                        {record.category || "—"}
                      </td>
                      <td style={{ padding: "12px", color: "#888" }}>
                        {record.record_date}
                      </td>
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
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            onClick={() => handleEdit(record)}
                            style={{
                              padding: "4px 8px",
                              background: "#1e40af",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "10px",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => toggleStatus(record)}
                            style={{
                              padding: "4px 8px",
                              background: "#444",
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "10px",
                            }}
                          >
                            {record.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => deleteRecord(record.id)}
                            style={{
                              padding: "4px 8px",
                              background: "#7f1d1d",
                              color: "#fca5a5",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "10px",
                            }}
                          >
                            Delete
                          </button>
                        </div>
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

