
"use client";

import { useState } from "react";

type Department = {
  id: number;
  name: string;
  description: string;
  createdAt: string;
};

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  function saveDepartment() {
    setError("");

    if (!name.trim()) {
      setError("Department ka naam zaroor likhein.");
      return;
    }

    if (editingId !== null) {
      setDepartments((previous) =>
        previous.map((department) =>
          department.id === editingId
            ? { ...department, name: name.trim(), description: description.trim() }
            : department
        )
      );
      setEditingId(null);
    } else {
      setDepartments((previous) => [
        ...previous,
        {
          id: Date.now(),
          name: name.trim(),
          description: description.trim(),
          createdAt: new Date().toLocaleDateString(),
        },
      ]);
    }

    setName("");
    setDescription("");
  }

  function editDepartment(department: Department) {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description);
    setError("");
  }

  function deleteDepartment(id: number) {
    if (!window.confirm("Kya aap is department ko delete karna chahte hain?")) {
      return;
    }

    setDepartments((previous) =>
      previous.filter((department) => department.id !== id)
    );
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDescription("");
    setError("");
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Departments</h1>
          <p style={styles.subtitle}>
            Apni team ke departments manage karein.
          </p>
        </div>
        <div style={styles.count}>
          Total Departments: {departments.length}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>
          {editingId !== null ? "Edit Department" : "Create New Department"}
        </h2>

        <label style={styles.label}>Department Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Example: Sales Department"
          style={styles.input}
        />

        <label style={styles.label}>Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Department ki details likhein..."
          rows={4}
          style={styles.textarea}
        />

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button onClick={saveDepartment} style={styles.primaryButton}>
            {editingId !== null ? "Update Department" : "Create Department"}
          </button>

          {editingId !== null && (
            <button onClick={cancelEdit} style={styles.cancelButton}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.sectionTitle}>Department List</h2>

        {departments.length === 0 ? (
          <div style={styles.empty}>
            Abhi koi department create nahi hua.
          </div>
        ) : (
          <div style={styles.list}>
            {departments.map((department) => (
              <div key={department.id} style={styles.department}>
                <div style={{ flex: 1 }}>
                  <h3 style={styles.departmentName}>{department.name}</h3>
                  <p style={styles.description}>
                    {department.description || "No description"}
                  </p>
                  <span style={styles.date}>
                    Created: {department.createdAt}
                  </span>
                </div>

                <div style={styles.actions}>
                  <button
                    onClick={() => editDepartment(department)}
                    style={styles.editButton}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteDepartment(department.id)}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
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
  heading: { fontSize: 26, fontWeight: 700, margin: 0 },
  subtitle: { color: "#64748b", fontSize: 14, marginTop: 7 },
  count: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "10px 15px",
    borderRadius: 8,
    fontWeight: 600,
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
    resize: "vertical",
  },
  actions: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryButton: {
    background: "#1d4ed8",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "11px 18px",
    cursor: "pointer",
    fontWeight: 600,
  },
  cancelButton: {
    background: "#e2e8f0",
    color: "#334155",
    border: 0,
    borderRadius: 8,
    padding: "11px 18px",
    cursor: "pointer",
  },
  empty: { padding: 25, textAlign: "center", color: "#64748b" },
  list: { display: "grid", gap: 12 },
  department: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    padding: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 9,
  },
  departmentName: { margin: 0, fontSize: 16 },
  description: { margin: "7px 0", color: "#64748b", fontSize: 13 },
  date: { color: "#94a3b8", fontSize: 12 },
  editButton: {
    background: "#e0f2fe",
    color: "#0369a1",
    border: 0,
    padding: "9px 13px",
    borderRadius: 7,
    cursor: "pointer",
  },
  deleteButton: {
    background: "#fee2e2",
    color: "#b91c1c",
    border: 0,
    padding: "9px 13px",
    borderRadius: 7,
    cursor: "pointer",
  },
  error: { color: "#dc2626", fontSize: 13, marginBottom: 12 },
};
