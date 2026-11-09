
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Department = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "inactive";
  created_at: string;
};

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadDepartments() {
    setLoading(true);

    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
    } else {
      setDepartments((data || []) as Department[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDepartments();
  }, []);

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

    const result = editingId
      ? await supabase
          .from("departments")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("departments").insert(payload);

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(
        editingId
          ? "Department successfully update ho gaya."
          : "Department successfully create ho gaya."
      );
      setName("");
      setDescription("");
      setEditingId(null);
      await loadDepartments();
    }

    setSaving(false);
  }

  function editDepartment(department: Department) {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description || "");
    setMessage("");
  }

  async function toggleStatus(department: Department) {
    const newStatus =
      department.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("departments")
      .update({ status: newStatus })
      .eq("id", department.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Department status update ho gaya.");
      await loadDepartments();
    }
  }

  async function deleteDepartment(department: Department) {
    const confirmed = window.confirm(
      `Kya aap "${department.name}" department delete karna chahte hain?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("departments")
      .delete()
      .eq("id", department.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Department delete ho gaya.");
      if (editingId === department.id) cancelEdit();
      await loadDepartments();
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDescription("");
    setMessage("");
  }

  const activeCount = departments.filter(
    (department) => department.status === "active"
  ).length;

  return (
    <div className="departments">
      <div className="intro">
        <div>
          <span className="eyebrow">ORGANIZATION MANAGEMENT</span>
          <h2>Departments Management</h2>
          <p>Create aur manage karein WIN GROUP ke company departments.</p>
        </div>
        <div className="total-box">
          <strong>{departments.length}</strong>
          <span>Total Departments</span>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>Total Departments</span>
          <strong>{departments.length}</strong>
        </div>
        <div className="stat">
          <span>Active Departments</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="stat">
          <span>Inactive Departments</span>
          <strong>{departments.length - activeCount}</strong>
        </div>
      </div>

      <div className="form-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">
              {editingId ? "EDIT DEPARTMENT" : "NEW DEPARTMENT"}
            </span>
            <h3>{editingId ? "Update Department" : "Create Department"}</h3>
          </div>
        </div>

        <form onSubmit={saveDepartment}>
          <label>Department Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Human Resources"
            required
          />

          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Department ki details likhein..."
            rows={3}
          />

          <div className="form-actions">
            <button className="save" type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                ? "Update Department"
                : "Create Department"}
            </button>

            {editingId && (
              <button
                className="cancel"
                type="button"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {message && <p className="message">{message}</p>}
      </div>

      <div className="list-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">COMPANY STRUCTURE</span>
            <h3>All Departments</h3>
          </div>
          <span className="count">{departments.length} Records</span>
        </div>

        {loading ? (
          <p className="empty">Loading departments...</p>
        ) : departments.length === 0 ? (
          <p className="empty">Abhi koi department create nahi hua.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((department) => (
                  <tr key={department.id}>
                    <td className="department-name">{department.name}</td>
                    <td>{department.description || "—"}</td>
                    <td>
                      <span
                        className={
                          department.status === "active"
                            ? "status active"
                            : "status inactive"
                        }
                      >
                        {department.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="edit"
                          onClick={() => editDepartment(department)}
                        >
                          Edit
                        </button>
                        <button
                          className="toggle"
                          onClick={() => toggleStatus(department)}
                        >
                          {department.status === "active"
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                        <button
                          className="delete"
                          onClick={() => deleteDepartment(department)}
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

      <style jsx>{`
        .departments {
          color: #eee;
          padding-top: 25px;
        }

        .intro, .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .eyebrow {
          color: #999;
          font-size: 9px;
          letter-spacing: 2px;
        }

        h2, h3 { color: white; }
        .intro h2 { font-size: 23px; margin: 8px 0; }
        .intro p { color: #999; font-size: 12px; }

        .total-box, .stat, .form-panel, .list-panel {
          background: #1c1c1c;
          border: 1px solid #393939;
          border-radius: 9px;
        }

        .total-box {
          padding: 13px 18px;
          text-align: center;
          min-width: 120px;
        }

        .total-box strong, .total-box span { display: block; }
        .total-box strong { font-size: 24px; color: white; }
        .total-box span { font-size: 10px; color: #999; }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 22px 0;
        }

        .stat { padding: 17px; }
        .stat span { display: block; color: #999; font-size: 11px; }
        .stat strong { display: block; color: white; font-size: 24px; margin-top: 9px; }

        .form-panel, .list-panel {
          padding: 21px;
          margin-bottom: 20px;
        }

        .panel-heading { margin-bottom: 20px; }
        .panel-heading h3 { font-size: 17px; margin: 7px 0 0; }
        .count { color: #aaa; font-size: 10px; }

        form { display: grid; gap: 10px; }
        label { color: #ccc; font-size: 11px; margin-top: 5px; }

        input, textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #444;
          border-radius: 6px;
          background: #111;
          color: white;
          font: inherit;
          font-size: 12px;
          outline: none;
        }

        input:focus, textarea:focus { border-color: #aaa; }
        textarea { resize: vertical; }

        .form-actions, .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        button {
          border: 0;
          border-radius: 5px;
          padding: 9px 12px;
          font-size: 10px;
          cursor: pointer;
        }

        button:disabled { opacity: .6; cursor: not-allowed; }
        .save { background: #e5e5e5; color: #111; font-weight: bold; }
        .cancel, .toggle { background: #343434; color: white; }
        .edit { background: #ddd; color: #111; }
        .delete { background: #542b2b; color: #ffbaba; }

        .message { color: #c9d8c9; font-size: 11px; margin-top: 13px; }
        .empty { color: #999; text-align: center; padding: 25px 5px; font-size: 12px; }

        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 650px; }
        th, td { padding: 13px 10px; text-align: left; border-bottom: 1px solid #383838; font-size: 11px; }
        th { color: #999; font-weight: normal; }
        td { color: #bbb; }
        .department-name { color: white; font-weight: bold; }

        .status {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 9px;
          text-transform: capitalize;
        }

        .status.active { background: #24412f; color: #a8e0ba; }
        .status.inactive { background: #493333; color: #efb0b0; }

        @media (max-width: 700px) {
          .intro { align-items: flex-start; }
          .intro h2 { font-size: 19px; }
          .total-box { min-width: 95px; padding: 10px; }
          .stats { gap: 7px; }
          .stat { padding: 12px; }
          .stat span { font-size: 9px; }
          .stat strong { font-size: 20px; }
          .form-panel, .list-panel { padding: 14px; }
        }
      `}</style>
    </div>
  );
}
