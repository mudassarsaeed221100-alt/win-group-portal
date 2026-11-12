
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
  role: string;
  phone: string | null;
  phone_verified: boolean | null;
  team_code: string | null;
  referred_by: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  role: string;
};

export default function CompanyMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("staff");
  const [teamCode, setTeamCode] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);

  /* ── Load Data ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        showNotice("Login session nahi mili.", "error");
        return;
      }

      // Check if user is founder
      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (founderError || founder?.role !== "founder_owner") {
        showNotice("Sirf Founder is module ko access kar sakta hai.", "error");
        return;
      }

      // Load all members
      const { data: membersData, error: membersError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      setMembers((membersData || []) as Profile[]);

      // Load user profiles for referrer names
      const userIds = (membersData || [])
        .map((m) => m.referred_by)
        .filter(Boolean) as string[];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, first_name, surname, role")
          .in("id", userIds);

        const userMap = new Map<string, UserProfile>();
        (profilesData || []).forEach((profile) => {
          userMap.set(profile.id, profile);
        });
        setUsers(userMap);
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to load data", "error");
    }
  }

  /* ── Refresh Data ── */
  async function refreshData() {
    setRefreshing(true);
    try {
      await loadData();
      showNotice("Data successfully refresh ho gaya.", "success");
    } catch (err: any) {
      showNotice(err.message || "Refresh nahi hua", "error");
    }
    setRefreshing(false);
  }

  /* ── Show Notice ── */
  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  }

  /* ── Get User Name ── */
  function getUserName(userId: string | null) {
    if (!userId) return "Unknown";
    const user = users.get(userId);
    if (user) {
      return user.first_name && user.surname
        ? `${user.first_name} ${user.surname}`
        : user.username;
    }
    return userId.slice(0, 8);
  }

  /* ── Get Display Name ── */
  function getDisplayName(member: Profile) {
    const name = `${member.first_name || ""} ${member.surname || ""}`.trim();
    return name || member.username || "Unnamed Member";
  }

  /* ── Get Role Name ── */
  function getRoleName(roleValue: string) {
    switch (roleValue) {
      case "founder_owner":
        return "Founder";
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "staff":
        return "Staff";
      default:
        return roleValue;
    }
  }

  /* ── Reset Form ── */
  function resetForm() {
    setFirstName("");
    setSurname("");
    setUsername("");
    setPhone("");
    setRole("staff");
    setTeamCode("");
    setEditingId(null);
  }

  /* ── Edit Member ── */
  function editMember(member: Profile) {
    setEditingId(member.id);
    setFirstName(member.first_name || "");
    setSurname(member.surname || "");
    setUsername(member.username || "");
    setPhone(member.phone || "");
    setRole(member.role);
    setTeamCode(member.team_code || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Save Member ── */
  async function saveMember() {
    if (!firstName.trim() || !username.trim()) {
      showNotice("First name aur username enter karein.", "error");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Session expire ho gaya.");

      if (editingId) {
        // Update existing member
        const { error } = await supabase
          .from("profiles")
          .update({
            first_name: firstName.trim(),
            surname: surname.trim() || null,
            username: username.trim(),
            phone: phone.trim() || null,
            role,
            team_code: teamCode.trim() || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        showNotice("Member successfully update ho gaya.", "success");
      } else {
        // Create new member (via auth)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: `${username.trim()}@win-group.local`,
          password: Math.random().toString(36).slice(-12),
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: authData.user.id,
              username: username.trim(),
              first_name: firstName.trim(),
              surname: surname.trim() || null,
              phone: phone.trim() || null,
              role,
              team_code: teamCode.trim() || null,
            });

          if (profileError) throw profileError;

          showNotice("New member successfully create ho gaya.", "success");
        }
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Member save nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Delete Member ── */
  async function deleteMember(memberId: string) {
    if (!window.confirm("Kya aap is member ko delete karna chahte hain?")) {
      return;
    }

    try {
      // Delete from profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", memberId);

      if (profileError) throw profileError;

      // Delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(memberId);

      if (authError) throw authError;

      showNotice("Member successfully delete ho gaya.", "success");
      if (editingId === memberId) resetForm();
      if (selectedMember?.id === memberId) setSelectedMember(null);
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Member delete nahi hua", "error");
    }
  }

  /* ── Change Role ── */
  async function changeRole(memberId: string, newRole: string) {
    if (!window.confirm(`Kya aap is member ka role ${getRoleName(newRole)} mein change karna chahte hain?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      showNotice("Member role successfully change ho gaya.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Role change nahi hua", "error");
    }
  }

  /* ── Filter Members ── */
  const filteredMembers = members.filter((member) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      getDisplayName(member).toLowerCase().includes(term) ||
      (member.username || "").toLowerCase().includes(term) ||
      (member.phone || "").toLowerCase().includes(term) ||
      (member.team_code || "").toLowerCase().includes(term);

    const matchesRole = roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  /* ── Stats ── */
  const stats = {
    total: members.length,
    founder: members.filter((m) => m.role === "founder_owner").length,
    superAdmin: members.filter((m) => m.role === "super_admin").length,
    admin: members.filter((m) => m.role === "admin").length,
    staff: members.filter((m) => m.role === "staff").length,
  };

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
              COMPANY MEMBERS
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Company-wide Member Management</h2>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
              Company ke tamam accounts aur team members ka complete management.
            </p>
          </div>

          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              padding: "10px 16px",
              background: refreshing ? "#444" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: refreshing ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Members", value: stats.total, color: "#3b82f6" },
            { label: "Founders", value: stats.founder, color: "#8b5cf6" },
            { label: "Super Admins", value: stats.superAdmin, color: "#f59e0b" },
            { label: "Admins", value: stats.admin, color: "#10b981" },
            { label: "Staff", value: stats.staff, color: "#06b6d4" },
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

      {/* ── Messages ── */}
      {notice && (
        <div
          style={{
            padding: "12px 16px",
            background: noticeType === "success" ? "#064e3b" : "#7f1d1d",
            color: noticeType === "success" ? "#86efac" : "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {noticeType === "success" ? "✓" : "✕"} {notice}
        </div>
      )}

      {/* ── Add/Edit Member Form ── */}
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
            {editingId ? "EDIT MEMBER" : "ADD NEW MEMBER"}
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
            {editingId ? "Edit Member Details" : "Add New Company Member"}
          </h3>
        </div>

        <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                First Name *
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
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
                Surname
              </label>
              <input
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Surname"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Username *
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                disabled={!!editingId}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: editingId ? "#1a1a1a" : "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                  opacity: editingId ? 0.5 : 1,
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
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
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
                <option value="founder_owner">Founder</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Team Code
              </label>
              <input
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value)}
                placeholder="Team code"
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
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={saveMember}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : editingId ? "Update Member" : "Add Member"}
          </button>

          {editingId && (
            <button
              onClick={resetForm}
              style={{
                padding: "10px 16px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Members List Section ── */}
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
            ALL MEMBERS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Company Members ({filteredMembers.length})</h3>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Roles</option>
            <option value="founder_owner">Founder</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("all");
              setPage(1);
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
            Clear
          </button>
        </div>

        {/* ── Members Table ── */}
        {paginatedMembers.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi member record nahi mila.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Member</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Role</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Phone</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Team Code</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Joined</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ color: "#fff", fontWeight: "bold" }}>
                        {getDisplayName(member)}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                        @{member.username || "No username"}
                      </div>
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background:
                            member.role === "founder_owner"
                              ? "#8b5cf620"
                              : member.role === "super_admin"
                              ? "#f59e0b20"
                              : member.role === "admin"
                              ? "#10b98120"
                              : "#06b6d420",
                          color:
                            member.role === "founder_owner"
                              ? "#d8b4fe"
                              : member.role === "super_admin"
                              ? "#fbbf24"
                              : member.role === "admin"
                              ? "#86efac"
                              : "#67e8f9",
                        }}
                      >
                        {getRoleName(member.role)}
                      </span>
                    </td>

                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {member.phone || "Not Added"}
                      {member.phone_verified && (
                        <span style={{ color: "#10b981", marginLeft: "6px" }}>✓</span>
                      )}
                    </td>

                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {member.team_code || "Not Assigned"}
                    </td>

                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>
                      {new Date(member.created_at).toLocaleDateString("en-PK")}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => editMember(member)}
                          style={{
                            padding: "6px 10px",
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          ✏️ Edit
                        </button>

                        <button
                          onClick={() => setSelectedMember(member)}
                          style={{
                            padding: "6px 10px",
                            background: "#444",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          👁️ View
                        </button>

                        <button
                          onClick={() => deleteMember(member.id)}
                          style={{
                            padding: "6px 10px",
                            background: "#7f1d1d",
                            color: "#fca5a5",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 10px",
                background: page === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "6px 10px",
                  background: page === p ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: page === p ? "bold" : "normal",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              style={{
                padding: "6px 10px",
                background: page === totalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {page} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Member Details Modal ── */}
      {selectedMember && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Member Details</h3>
            <button
              onClick={() => setSelectedMember(null)}
              style={{
                padding: "6px 12px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Full Name</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {getDisplayName(selectedMember)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Role</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {getRoleName(selectedMember.role)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Username</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedMember.username || "Not Added"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Phone</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedMember.phone || "Not Added"}
                {selectedMember.phone_verified && (
                  <span style={{ color: "#10b981", marginLeft: "6px" }}>✓ Verified</span>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Team Code</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedMember.team_code || "Not Assigned"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Referred By</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedMember.referred_by
                  ? getUserName(selectedMember.referred_by)
                  : "No Referrer"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Joined Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {new Date(selectedMember.created_at).toLocaleString("en-PK")}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Account ID</div>
              <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "monospace", wordBreak: "break-all" }}>
                {selectedMember.id}
              </div>
            </div>
          </div>

          {/* ── Role Change Options ── */}
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #333" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px", fontWeight: "bold" }}>
              Change Role:
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {["staff", "admin", "super_admin", "founder_owner"].map((r) => (
                <button
                  key={r}
                  onClick={() => changeRole(selectedMember.id, r)}
                  disabled={selectedMember.role === r}
                  style={{
                    padding: "6px 12px",
                    background: selectedMember.role === r ? "#333" : "#2563eb",
                    color: selectedMember.role === r ? "#888" : "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: selectedMember.role === r ? "not-allowed" : "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                    opacity: selectedMember.role === r ? 0.5 : 1,
                  }}
                >
                  {getRoleName(r)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

