
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  email?: string;
  role: string;
  team_code: string | null;
  created_at: string;
  phone: string | null;
  avatar_url: string | null;
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    surname: "",
    role: "staff",
    team_code: "",
    phone: "",
  });

  /* ── Load Users ── */
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, first_name, surname, role, team_code, created_at, phone, avatar_url")
        .in("role", ["super_admin", "admin", "staff"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers((data as UserProfile[]) || []);
    } catch (err) {
      setMessage("Failed to load users.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /* ── Create/Update Account ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!formData.username.trim() || !formData.email.trim()) {
      setMessage("Username and email are required.");
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 8)) {
      setMessage("Password must be at least 8 characters.");
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from("profiles")
          .update({
            username: formData.username,
            first_name: formData.first_name || null,
            surname: formData.surname || null,
            role: formData.role,
            team_code: formData.team_code || null,
            phone: formData.phone || null,
          })
          .eq("id", editingUser.id);

        if (error) throw error;
        setMessage("User updated successfully!");
      } else {
        // Create new user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setMessage("Please login again.");
          return;
        }

        const response = await fetch("/api/admin/users", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            first_name: formData.first_name,
            surname: formData.surname,
            team_code: formData.team_code,
            phone: formData.phone,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setMessage("Account created successfully!");
      }

      resetForm();
      await loadUsers();
    } catch (err: any) {
      setMessage(err.message || "Operation failed.");
    }
  }

  /* ── Delete User ── */
  async function deleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
      setMessage("User deleted successfully!");
      await loadUsers();
    } catch (err: any) {
      setMessage(err.message || "Failed to delete user.");
    }
  }

  /* ── Edit User ── */
  function startEdit(user: UserProfile) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || "",
      password: "",
      first_name: user.first_name || "",
      surname: user.surname || "",
      role: user.role,
      team_code: user.team_code || "",
      phone: user.phone || "",
    });
    setShowCreateForm(true);
  }

  /* ── Reset Form ── */
  function resetForm() {
    setFormData({
      username: "",
      email: "",
      password: "",
      first_name: "",
      surname: "",
      role: "staff",
      team_code: "",
      phone: "",
    });
    setEditingUser(null);
    setShowCreateForm(false);
  }

  /* ── Filter Users ── */
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.surname?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  /* ── Role Badge ── */
  function getRoleBadge(role: string) {
    const badges: Record<string, { bg: string; color: string; label: string }> = {
      founder_owner: { bg: "#2d1b4e", color: "#d8b4fe", label: "Founder" },
      super_admin: { bg: "#1e3a8a", color: "#93c5fd", label: "Super Admin" },
      admin: { bg: "#1f2937", color: "#d1d5db", label: "Admin" },
      staff: { bg: "#064e3b", color: "#86efac", label: "Staff" },
    };

    const badge = badges[role] || badges.staff;
    return (
      <span
        style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: "bold",
          background: badge.bg,
          color: badge.color,
        }}
      >
        {badge.label}
      </span>
    );
  }

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", color: "#fff" }}>User Management</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            Create, edit, and manage team accounts
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateForm(!showCreateForm);
          }}
          style={{
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "12px",
          }}
        >
          {showCreateForm ? "Cancel" : "+ Create Account"}
        </button>
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
      {showCreateForm && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "14px", color: "#fff" }}>
            {editingUser ? "Edit User" : "Create New Account"}
          </h3>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="First name"
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Surname
                </label>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  placeholder="Surname"
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Username"
                required
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
                required
                disabled={!!editingUser}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "12px",
                  opacity: editingUser ? 0.6 : 1,
                }}
              />
            </div>

            {!editingUser && (
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Password * (min 8 characters)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Temporary password"
                  required
                  minLength={8}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Team Code
                </label>
                <input
                  type="text"
                  value={formData.team_code}
                  onChange={(e) => setFormData({ ...formData, team_code: e.target.value })}
                  placeholder="e.g., TEAM-001"
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                padding: "10px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
                marginTop: "8px",
              }}
            >
              {editingUser ? "Update User" : "Create Account"}
            </button>
          </form>
        </div>
      )}

      {/* ── Search & Filter ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search by name or username..."
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "12px",
          }}
        >
          <option value="all">All Roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {/* ── Users Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#aaa" }}>No users found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #333" }}>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Name</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Username</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Role</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Team Code</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Phone</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Joined</th>
                <th style={{ padding: "12px", textAlign: "center", color: "#aaa", fontWeight: "bold" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #222" }}>
                  <td style={{ padding: "12px" }}>
                    {user.first_name || user.surname
                      ? `${user.first_name || ""} ${user.surname || ""}`.trim()
                      : "—"}
                  </td>
                  <td style={{ padding: "12px" }}>{user.username}</td>
                  <td style={{ padding: "12px" }}>{getRoleBadge(user.role)}</td>
                  <td style={{ padding: "12px", color: "#888" }}>{user.team_code || "—"}</td>
                  <td style={{ padding: "12px", color: "#888" }}>{user.phone || "—"}</td>
                  <td style={{ padding: "12px", color: "#888" }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => startEdit(user)}
                      style={{
                        padding: "4px 8px",
                        background: "#1e40af",
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "11px",
                        marginRight: "4px",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      style={{
                        padding: "4px 8px",
                        background: "#7f1d1d",
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "11px",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "20px" }}>
        {[
          { label: "Total Users", value: users.length },
          { label: "Super Admins", value: users.filter((u) => u.role === "super_admin").length },
          { label: "Admins", value: users.filter((u) => u.role === "admin").length },
          { label: "Staff", value: users.filter((u) => u.role === "staff").length },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "6px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2563eb" }}>{stat.value}</div>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

