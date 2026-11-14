
"use client";

import { useState } from "react";

type BusinessRecord = {
  id: number;
  title: string;
  category: string;
  amount: number;
  description: string;
  date: string;
};

export default function BusinessRecords() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  function saveRecord() {
    setError("");

    if (!title.trim() || !amount || Number(amount) <= 0) {
      setError("Title aur valid amount zaroor likhein.");
      return;
    }

    const record: BusinessRecord = {
      id: editingId ?? Date.now(),
      title: title.trim(),
      category,
      amount: Number(amount),
      description: description.trim(),
      date: new Date().toLocaleDateString(),
    };

    if (editingId !== null) {
      setRecords((old) =>
        old.map((item) => (item.id === editingId ? record : item))
      );
    } else {
      setRecords((old) => [record, ...old]);
    }

    resetForm();
  }

  function resetForm() {
    setTitle("");
    setCategory("Income");
    setAmount("");
    setDescription("");
    setEditingId(null);
    setError("");
  }

  function editRecord(record: BusinessRecord) {
    setEditingId(record.id);
    setTitle(record.title);
    setCategory(record.category);
    setAmount(String(record.amount));
    setDescription(record.description);
  }

  function deleteRecord(id: number) {
    if (!window.confirm("Kya aap ye record delete karna chahte hain?")) return;
    setRecords((old) => old.filter((item) => item.id !== id));
  }

  const income = records
    .filter((item) => item.category === "Income")
    .reduce((sum, item) => sum + item.amount, 0);

  const expenses = records
    .filter((item) => item.category === "Expense")
    .reduce((sum, item) => sum + item.amount, 0);

  const balance = income - expenses;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Business Records</h1>
          <p style={styles.subtitle}>
            Business ki income aur expenses ka record manage karein.
          </p>
        </div>
        <button onClick={resetForm} style={styles.resetButton}>
          Clear Form
        </button>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span>Total Income</span>
          <strong style={{ color: "#059669" }}>
            Rs. {income.toLocaleString()}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span>Total Expenses</span>
          <strong style={{ color: "#dc2626" }}>
            Rs. {expenses.toLocaleString()}
          </strong>
        </div>
        <div style={styles.statCard}>
          <span>Net Balance</span>
          <strong style={{ color: balance >= 0 ? "#2563eb" : "#dc2626" }}>
            Rs. {balance.toLocaleString()}
          </strong>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          {editingId !== null ? "Edit Record" : "Add New Record"}
        </h2>

        <label style={styles.label}>Record Title</label>
        <input
          style={styles.input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Record ka naam"
        />

        <label style={styles.label}>Record Type</label>
        <select
          style={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>

        <label style={styles.label}>Amount (PKR)</label>
        <input
          style={styles.input}
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount likhein"
        />

        <label style={styles.label}>Description</label>
        <textarea
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Details (optional)"
          rows={3}
        />

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button onClick={saveRecord} style={styles.saveButton}>
            {editingId !== null ? "Update Record" : "Save Record"}
          </button>
          {editingId !== null && (
            <button onClick={resetForm} style={styles.resetButton}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>All Business Records</h2>

        {records.length === 0 ? (
          <div style={styles.empty}>Abhi koi business record mojood nahi.</div>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Title</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>
                      <strong>{item.title}</strong>
                      {item.description && (
                        <div style={styles.description}>{item.description}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          color: item.category === "Income" ? "#059669" : "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td style={styles.td}>Rs. {item.amount.toLocaleString()}</td>
                    <td style={styles.td}>{item.date}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          style={styles.editButton}
                          onClick={() => editRecord(item)}
                        >
                          Edit
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteRecord(item.id)}
                        >
                          Delete
                        </button>
                      </div>
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
  heading: { fontSize: 26, margin: 0, fontWeight: 700 },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 7 },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
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
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, margin: "0 0 18px", fontWeight: 700 },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 7 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    marginBottom: 16,
    background: "#fff",
    fontSize: 14,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  saveButton: {
    background: "#1d4ed8",
    color: "#fff",
    border: 0,
    padding: "11px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
  resetButton: {
    background: "#e2e8f0",
    color: "#334155",
    border: 0,
    padding: "11px 18px",
    borderRadius: 8,
    cursor: "pointer",
  },
  editButton: {
    background: "#e0f2fe",
    color: "#0369a1",
    border: 0,
    padding: "8px 12px",
    borderRadius: 7,
    cursor: "pointer",
  },
  deleteButton: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: 0,
    padding: "8px 12px",
    borderRadius: 7,
    cursor: "pointer",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 650 },
  th: {
    textAlign: "left",
    padding: 12,
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
  description: { color: "#64748b", fontSize: 12, marginTop: 4 },
  empty: { padding: 25, textAlign: "center", color: "#64748b" },
  error: { color: "#dc2626", fontSize: 13, marginBottom: 12 },
};
