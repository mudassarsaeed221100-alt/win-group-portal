"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function StaffDashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStaff() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (error || !profile || profile.role !== "staff") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setUsername(profile.username);
      setLoading(false);
    }

    checkStaff();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <main style={{ padding: 40 }}>Loading Staff Dashboard...</main>;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f1f5f9",
      padding: 30,
      fontFamily: "Arial, sans-serif"
    }}>
      <header style={{
        background: "#0f172a",
        color: "white",
        padding: 25,
        borderRadius: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 15
      }}>
        <div>
          <h1 style={{ margin: 0 }}>WIN GROUP</h1>
          <p style={{ marginBottom: 0 }}>Staff Dashboard</p>
        </div>

        <button onClick={logout} style={{
          padding: "10px 20px",
          background: "#dc2626",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer"
        }}>
          Logout
        </button>
      </header>

      <section style={{
        background: "white",
        marginTop: 25,
        padding: 25,
        borderRadius: 12
      }}>
        <h2>Welcome, {username}</h2>
        <p>You are successfully logged in as Staff.</p>
        <p><strong>Role:</strong> Staff</p>
      </section>

      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 20,
        marginTop: 25
      }}>
        {["My Tasks", "Departments", "My Reports", "Account Settings"].map(item => (
          <div key={item} style={{
            background: "white",
            padding: 25,
            borderRadius: 12,
            fontWeight: "bold"
          }}>
            {item}
            <p style={{ color: "#64748b", fontWeight: "normal" }}>
              Coming Soon
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
