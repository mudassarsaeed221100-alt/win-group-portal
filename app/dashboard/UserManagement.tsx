"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  email: string | null;
  role: string;
  team_code: string | null;
  created_at: string;
  phone: string | null;
};

const emptyForm = { username: "", email: "", pw: "", first_name: "", surname: "", role: "staff", team_code: "", phone: "" };

const inp: React.CSSProperties = {
  width: "100%", padding: "8px", background: "#252525", border: "1px solid #444",
  borderRadius: "4px", color: "#fff", fontSize: "12px", boxSizing: "border-box",
};
const lbl: React.CSSProperties = { display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" };

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadUsers();
  }, []);

  function show(text: string, error = false) {
    setMessage(text);
    setIsError(error);
  }

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, first_name, surname, email, role, team_code, created_at, phone")
      .in("role", ["super_admin", "admin", "staff"])
      .order("created_at", { ascending: false });
    if (error) show("Users load nahi hue: " + error.message, true);
    setUsers((data as UserProfile[]) || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!formData.username.trim()) return show("Username zaroori hai.", true);

    setSaving(true);
    try {
      if (editingUser) {
        // Edit: email ki zaroorat nahi
        const { error } = await supabase.rpc("founder_update_user", {
          target_id: editingUser.id,
          p_username: formData.username,
          p_first_name: formData.first_name,
          p_surname: formData.surname,
          p_role: formData.role,
          p_team_code: formData.team_code,
          p_phone: formData.phone,
        });
        if (error) throw error;
        show("User update ho gaya!");
      } else {
        if (!formData.email.trim()) throw new Error("Email zaroori hai.");
        if (formData.pw.length < 8) throw new Error("Password kam az kam 8 characters ka ho.");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Dobara login karein.");

        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
          body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Account nahi bana.");
        show("Account ban gaya!");
      }
      resetForm();
      await loadUsers();
    } catch (err: any) {
      show(err.message || "Kaam nahi hua.", true);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserProfile) {
    if (!confirm("Kya aap waqai " + user.username + " ko delete karna chahte hain?")) return;
    const { error } = await supabase.rpc("founder_delete_user", { target_id: user.id });
    if (error) return show(error.message, true);
    show("User delete ho gaya!");
    await loadUsers();
  }

  function startEdit(user: UserProfile) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      pw: "",
      first_name: user.first_name || "",
      surname: user.surname || "",
      role: user.role,
      team_code: user.team_code || "",
      phone: user.phone || "",
    });
    setShowForm(true);
    setMessage("");
  }

  function resetForm() {
    setFormData(emptyForm);
    setEditingUser(null);
    setShowForm(false);
  }

  const term = searchTerm.toLowerCase();
  const filteredUsers = users.filter((u) => {
    const text = [u.username, u.first_name, u.surname, u.email, u.team_code].join(" ").toLowerCase();
    return text.includes(term) && (roleFilter === "all" || u.role === roleFilter);
  });

  function getRoleBadge(role: string) {
    const badges: Record<string, { bg: string; color: string; label: string }> = {
      super_admin: { bg: "#1e3a8a", color: "#93c5fd", label: "Super Admin" },
      admin: { bg: "#1f2937", color: "#d1d5db", label: "Admin" },
      staff: { bg: "#064e3b", color: "#86efac", label: "Staff" },
    };
    const b = badges[role] || badges.staff;
    return (
      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: b.bg, color: b.color }}>
        {b.label}
      </span>
    );
  }

  const set = (key: keyof typeof emptyForm, value: string) => setFormData({ ...formData, [key]: value });

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#fff" }}>User Management</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>Create, edit, and manage team accounts</p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : (setEditingUser(null), setFormData(emptyForm), setShowForm(true)))}
          style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
        >
          {showForm ? "Cancel" : "+ Create Account"}
        </button>
      </div>

      {message && (
        <div style={{ padding: "12px 16px", background: isError ? "#7f1d1d" : "#064e3b", color: isError ? "#fca5a5" : "#86efac", borderRadius: "6px", marginBottom: "16px", fontSize: "12px" }}>
          {message}
        </div>
      )}

      {showForm && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", color: "#fff" }}>
            {editingUser ? "Edit User: " + editingUser.username : "Create New Account"}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={lbl}>First Name</label>
                <input value={formData.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="First name" style={inp} />
              </div>
              <div>
                <label style={lbl}>Surname</label>
                <input value={formData.surname} onChange={(e) => set("surname", e.target.value)} placeholder="Surname" style={inp} />
              </div>
            </div>

            <div>
              <label style={lbl}>Username *</label>
              <input value={formData.username} onChange={(e) => set("username", e.target.value)} placeholder="Username" required style={inp} />
            </div>

            {editingUser ? (
              <div>
                <label style={lbl}>Email</label>
                <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{editingUser.email || "—"} (email yahan se nahi badalti)</p>
              </div>
            ) : (
              <>
                <div>
                  <label style={lbl}>Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => set("email", e.target.value)} placeholder="Email address" required style={inp} />
                </div>
                <div>
                  <label style={lbl}>Password * (min 8 characters)</label>
                  <input type="password" value={formData.pw} onChange={(e) => set("pw", e.target.value)} placeholder="Temporary password" required minLength={8} style={inp} />
                </div>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={lbl}>Role</label>
                <select value={formData.role} onChange={(e) => set("role", e.target.value)} style={inp}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Team Code</label>
                <input value={formData.team_code} onChange={(e) => set("team_code", e.target.value.toUpperCase())} placeholder="e.g., WIN01" style={inp} />
              </div>
            </div>

            <div>
              <label style={lbl}>Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Phone number" style={inp} />
            </div>

            <button type="submit" disabled={saving}
              style={{ padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", marginTop: "8px", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : editingUser ? "Update User" : "Create Account"}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input placeholder="Search by name, username, email, team code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...inp, flex: 1, background: "#1a1a1a", border: "1px solid #333", padding: "8px 12px", borderRadius: "6px", width: "auto" }} />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          style={{ ...inp, width: "auto", background: "#1a1a1a", border: "1px solid #333", padding: "8px 12px", borderRadius: "6px" }}>
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>No users found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", minWidth: "800px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                {["Name", "Username", "Email", "Role", "Team Code", "Phone", "Joined", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px", textAlign: h === "Actions" ? "center" : "left", color: "#aaa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "12px" }}>{[user.first_name, user.surname].filter(Boolean).join(" ") || "—"}</td>
                  <td style={{ padding: "12px" }}>{user.username}</td>
                  <td style={{ padding: "12px", color: "#888" }}>{user.email || "—"}</td>
                  <td style={{ padding: "12px" }}>{getRoleBadge(user.role)}</td>
                  <td style={{ padding: "12px", color: user.team_code ? "#fff" : "#888", fontWeight: user.team_code ? "bold" : "normal" }}>{user.team_code || "—"}</td>
                  <td style={{ padding: "12px", color: "#888" }}>{user.phone || "—"}</td>
                  <td style={{ padding: "12px", color: "#888" }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: "12px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => startEdit(user)}
                      style={{ padding: "4px 8px", background: "#1e40af", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px", marginRight: "4px" }}>
                      Edit
                    </button>
                    <button onClick={() => deleteUser(user)}
                      style={{ padding: "4px 8px", background: "#7f1d1d", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginTop: "20px" }}>
        {[
          { label: "Total Users", value: users.length },
          { label: "Super Admins", value: users.filter((u) => u.role === "super_admin").length },
          { label: "Admins", value: users.filter((u) => u.role === "admin").length },
          { label: "Staff", value: users.filter((u) => u.role === "staff").length },
        ].map((stat) => (
          <div key={stat.label} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "6px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2563eb" }}>{stat.value}</div>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
