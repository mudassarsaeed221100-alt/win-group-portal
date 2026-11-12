
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Department = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── Load Departments ── */
  async function loadDepartments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDepartments((data || []) as Department[]);
      setCurrentPage(1);
    } catch (err: any) {
      setMessage(err.message || "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  /* ── Filter & Search ── */
  useEffect(() => {
    let filtered = departments;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (dept) =>
          dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((dept) => dept.status === statusFilter);
    }

    setFilteredDepartments(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, departments]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const paginatedDepartments = filteredDepartments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Save Department ── */
  async function saveDepartment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim()) {
      setMessage("Department name zaroori hai.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
    };

    try {
      const result = editingId
        ? await supabase
            .from("departments")
            .update(payload)
            .eq("id", editingId)
        : await supabase.from("departments").insert(payload);

      if (result.error) throw result.error;

      setMessage(
        editingId
          ? "Department successfully update ho gaya."
          : "Department successfully create ho gaya."
      );
      setName("");
      setDescription("");
      setEditingId(null);
      await loadDepartments();
    } catch (err: any) {
      setMessage(err.message || "Operation failed.");
    } finally {
      setSaving(false);
    }
  }

  /* ── Edit Department ── */
  function editDepartment(department: Department) {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description || "");
    setMessage("");
  }

  /* ── Toggle Status ── */
  async function toggleStatus(department: Department) {
    const newStatus = department.status === "active" ? "inactive" : "active";

    try {
      const { error } = await supabase
        .from("departments")
        .update({ status: newStatus })
        .eq("id", department.id);

      if (error) throw error;
      setMessage("Department status update ho gaya.");
      await loadDepartments();
    } catch (err: any) {
      setMessage(err.message || "Failed to update status.");
    }
  }

  /* ── Delete Department ── */
  async function deleteDepartment(department: Department) {
    const confirmed = window.confirm(
      `Kya aap "${department.name}" department delete karna chahte hain?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", department.id);

      if (error) throw error;
      setMessage("Department delete ho gaya.");
      if (editingId === department.id) cancelEdit();
      await loadDepartments();
    } catch (err: any) {
      setMessage(err.message || "Failed to delete department.");
    }
  }

  /* ── Cancel Edit ── */
  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDescription("");
    setMessage("");
  }

  /* ── Stats ── */
  const activeCount = departments.filter((d) => d.status === "active").length;
  const inactiveCount = departments.length - activeCount;

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
              ORGANIZATION MANAGEMENT
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Departments Management</h2>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
              Create aur manage karein WIN GROUP ke company departments.
            </p>
          </div>
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "12px 16px",
              textAlign: "center",
              minWidth: "120px",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fff" }}>
              {departments.length}
            </div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>Total Departments</div>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total", value: departments.length, color: "#3b82f6" },
            { label: "Active", value: activeCount, color: "#10b981" },
            { label: "Inactive", value: inactiveCount, color: "#ef4444" },
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
              <div style={{ fontSize: "20px", fontWeight: "bold", color: stat.color, marginTop: "6px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Message ── */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            background: message.includes("success") ? "#064e3b" : "#7f1d1d",
            color: message.includes("success") ? "#86efac" : "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {message}
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
            {editingId ? "EDIT DEPARTMENT" : "NEW DEPARTMENT"}
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
            {editingId ? "Update Department" : "Create Department"}
          </h3>
        </div>

        <form onSubmit={saveDepartment} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Department Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: Human Resources"
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
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Department ki details likhein..."
              rows={3}
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
              {saving ? "Saving..." : editingId ? "Update Department" : "Create Department"}
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

      {/* ── Search & Filter ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search departments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
          }}
        />

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
      </div>

      {/* ── Departments Table ── */}
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
                COMPANY STRUCTURE
              </div>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>All Departments</h3>
            </div>
            <div style={{ color: "#888", fontSize: "11px" }}>
              {filteredDepartments.length} Records
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading departments...</div>
        ) : filteredDepartments.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            {searchTerm || statusFilter !== "all" ? "No departments match your filters." : "Abhi koi department create nahi hua."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Department
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Description
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Created
                  </th>
                  <th style={{ padding: "12px", textAlign: "center", color: "#888", fontWeight: "normal" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedDepartments.map((dept) => (
                  <tr key={dept.id} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{dept.name}</td>
                    <td style={{ padding: "12px", color: "#aaa" }}>{dept.description || "—"}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          background: dept.status === "active" ? "#064e3b" : "#7f1d1d",
                          color: dept.status === "active" ? "#86efac" : "#fca5a5",
                        }}
                      >
                        {dept.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#888" }}>
                      {new Date(dept.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          onClick={() => editDepartment(dept)}
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
                          onClick={() => toggleStatus(dept)}
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
                          {dept.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => deleteDepartment(dept)}
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
                ))}
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

