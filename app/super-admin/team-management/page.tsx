"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type TeamMember = {
  id: string;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  avatar_url: string | null;
};

export default function TeamManagementPage() {
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamCode, setTeamCode] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Team data load nahi ho saka.");
      }

      setTeamCode(result.team_code || "");
      setMembers(result.members || []);
    } catch (err) {
      console.error("Team Management Error:", err);
      setError(
        err instanceof Error ? err.message : "Team data load nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  const admins = members.filter((member) => member.role === "admin");
  const staff = members.filter((member) => member.role === "staff");

  const filteredMembers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return members;

    return members.filter((member) => {
      const name = `${member.first_name || ""} ${member.surname || ""}`.toLowerCase();
      return (
        name.includes(term) ||
        member.role.toLowerCase().includes(term) ||
        (member.team_code || "").toLowerCase().includes(term)
      );
    });
  }, [members, search]);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>Team Management</h1>
          <p style={styles.subtitle}>
            WIN GROUP - Apni team ke Admin aur Staff manage karein
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadTeam} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div style={styles.error}>
          {error}
          <button onClick={loadTeam} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      <section style={styles.teamCodeBox}>
        <span>YOUR TEAM CODE</span>
        <h2>{teamCode || (loading ? "Loading..." : "—")}</h2>
      </section>

      <section style={styles.stats}>
        <div style={styles.statCard}>
          <p>Total Members</p>
          <h2>{members.length}</h2>
        </div>
        <div style={styles.statCard}>
          <p>Total Admins</p>
          <h2>{admins.length}</h2>
        </div>
        <div style={styles.statCard}>
          <p>Total Staff</p>
          <h2>{staff.length}</h2>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.listHeader}>
          <div>
            <h2>Team Members</h2>
            <p>Admins aur Staff ki complete list</p>
          </div>

          <input
            style={styles.search}
            placeholder="Search member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={styles.message}>Team data load ho raha hai...</p>
        ) : filteredMembers.length === 0 ? (
          <p style={styles.message}>Koi team member nahi mila.</p>
        ) : (
          <div style={styles.memberList}>
            {filteredMembers.map((member) => {
              const name =
                `${member.first_name || ""} ${member.surname || ""}`.trim() ||
                "Unnamed Member";

              return (
                <div key={member.id} style={styles.member}>
                  <div style={styles.memberInfo}>
                    <div style={styles.avatar}>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt={name} style={styles.avatarImage} />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <strong>{name}</strong>
                      <p>{member.team_code || "No Team Code"}</p>
                    </div>
                  </div>

                  <span
                    style={{
                      ...styles.role,
                      ...(member.role === "admin" ? styles.adminRole : styles.staffRole),
                    }}
                  >
                    {member.role === "admin" ? "Admin" : "Staff"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0b1020", color: "#f8fafc", padding: 25, fontFamily: "Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15, marginBottom: 25 },
  heading: { margin: 0, fontSize: 28 },
  subtitle: { color: "#94a3b8", fontSize: 14 },
  refreshButton: { padding: "11px 20px", background: "#2563eb", color: "white", border: 0, borderRadius: 8, cursor: "pointer" },
  teamCodeBox: { background: "#17243a", border: "1px solid #334155", padding: 20, borderRadius: 12, marginBottom: 20 },
  stats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15, marginBottom: 22 },
  statCard: { background: "#151f32", border: "1px solid #273449", borderRadius: 12, padding: 20 },
  panel: { background: "#151f32", border: "1px solid #273449", borderRadius: 12, padding: 20 },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15, marginBottom: 20 },
  search: { padding: 12, borderRadius: 8, border: "1px solid #475569", background: "#0b1020", color: "white", width: "100%", maxWidth: 260 },
  memberList: { display: "flex", flexDirection: "column", gap: 10 },
  member: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, background: "#1e293b", padding: 14, borderRadius: 9 },
  memberInfo: { display: "flex", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: "50%", background: "#334155", display: "grid", placeItems: "center", overflow: "hidden", fontWeight: 700 },
  avatarImage: { width: "100%", height: "100%", objectFit: "cover" },
  role: { padding: "6px 13px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  adminRole: { background: "#1e3a8a", color: "#bfdbfe" },
  staffRole: { background: "#14532d", color: "#bbf7d0" },
  message: { color: "#94a3b8", padding: 20, textAlign: "center" },
  error: { background: "#451a1a", color: "#fecaca", padding: 15, borderRadius: 8, marginBottom: 15 },
  retryButton: { marginLeft: 12, padding: 7, cursor: "pointer" },
};
