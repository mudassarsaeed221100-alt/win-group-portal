
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Member = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
  role: string | null;
  team_code: string | null;
  referred_by: string | null;
  created_at: string;
};

export default function TeamHierarchy() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  useEffect(() => {
    async function loadHierarchy() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (founderError || founder?.role !== "founder_owner") {
        setError("Founder access required.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select(
          "id, username, first_name, surname, role, team_code, referred_by, created_at"
        )
        .order("created_at", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setMembers(data || []);
      }

      setLoading(false);
    }

    loadHierarchy();
  }, []);

  const name = (member: Member) =>
    `${member.first_name || ""} ${member.surname || ""}`.trim() ||
    member.username ||
    "Unnamed Member";

  const superAdmins = members.filter(
    (member) => member.role === "super_admin"
  );

  const getTeamMembers = (code: string) =>
    members.filter(
      (member) =>
        member.team_code === code &&
        member.role !== "founder_owner"
    );

  const getChildren = (parentId: string, code: string) =>
    members.filter(
      (member) =>
        member.referred_by === parentId &&
        member.team_code === code
    );

  function MemberTree({
    member,
    code,
    level = 0,
  }: {
    member: Member;
    code: string;
    level?: number;
  }) {
    const children = getChildren(member.id, code);

    return (
      <div style={{ marginLeft: level * 18 }}>
        <div style={styles.member}>
          <div>
            <strong>{name(member)}</strong>
            <p style={styles.role}>{member.role || "No role"}</p>
            <small style={styles.id}>
              ID: {member.id}
            </small>
          </div>
          <span style={styles.badge}>
            {member.role}
          </span>
        </div>

        {children.map((child) => (
          <MemberTree
            key={child.id}
            member={child}
            code={code}
            level={level + 1}
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return <p style={{ padding: 24 }}>Loading hierarchy...</p>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h2>Team Hierarchy</h2>
        <p style={{ color: "#dc2626" }}>{error}</p>
      </div>
    );
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Team Hierarchy</h1>
      <p style={styles.subtitle}>
        Complete WIN GROUP reporting and referral structure
      </p>

      <section style={styles.grid}>
        <div style={styles.card}>
          <span>Super Admins</span>
          <h2>{superAdmins.length}</h2>
        </div>
        <div style={styles.card}>
          <span>Total Admins</span>
          <h2>
            {members.filter((m) => m.role === "admin").length}
          </h2>
        </div>
        <div style={styles.card}>
          <span>Total Staff</span>
          <h2>
            {members.filter((m) => m.role === "staff").length}
          </h2>
        </div>
      </section>

      <h2 style={styles.sectionTitle}>Super Admin Teams</h2>

      {superAdmins.map((admin) => {
        const code = admin.team_code;
        const team = code ? getTeamMembers(code) : [];

        return (
          <section key={admin.id} style={styles.panel}>
            <div style={styles.teamHeader}>
              <div>
                <h3>{name(admin)}</h3>
                <p style={styles.subtitle}>
                  Team Code: {code || "Not assigned"}
                </p>
              </div>
              <button
                style={styles.button}
                onClick={() =>
                  setSelectedTeam(
                    selectedTeam === admin.id ? null : admin.id
                  )
                }
              >
                {selectedTeam === admin.id ? "Close Team" : "View Team"}
              </button>
            </div>

            <div style={styles.counts}>
              <span>Admins: {team.filter(m => m.role === "admin").length}</span>
              <span>Staff: {team.filter(m => m.role === "staff").length}</span>
              <span>Total: {team.length}</span>
            </div>

            {selectedTeam === admin.id && (
              <div style={styles.tree}>
                <MemberTree member={admin} code={code || ""} />

                {team.filter(
                  (m) =>
                    m.id !== admin.id &&
                    !m.referred_by
                ).map((member) => (
                  <MemberTree
                    key={member.id}
                    member={member}
                    code={code || ""}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {superAdmins.length === 0 && (
        <p>No Super Admin accounts found.</p>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    fontSize: 26,
    marginBottom: 6,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    margin: "22px 0",
  },
  card: {
    padding: 20,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    marginTop: 28,
  },
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
  },
  teamHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  button: {
    background: "#172033",
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "10px 16px",
    cursor: "pointer",
  },
  counts: {
    display: "flex",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 16,
    fontSize: 13,
    color: "#475569",
  },
  tree: {
    marginTop: 20,
    borderTop: "1px solid #e2e8f0",
    paddingTop: 15,
  },
  member: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: 13,
    marginBottom: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 9,
  },
  role: {
    color: "#64748b",
    fontSize: 12,
    margin: "5px 0",
  },
  id: {
    color: "#94a3b8",
    fontSize: 10,
    wordBreak: "break-all",
  },
  badge: {
    background: "#e2e8f0",
    padding: "5px 9px",
    borderRadius: 6,
    fontSize: 11,
  },
};
