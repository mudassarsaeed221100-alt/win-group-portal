
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (error || !data || data.role !== "super_admin") {
        router.replace("/");
        return;
      }

      setUsername(data.username);
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <main style={{ padding: 40 }}>Loading Super Admin Dashboard...</main>;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f3f6fa",
      fontFamily: "Arial, sans-serif",
      color: "#102b50"
    }}>
      <header style={{
        background: "#102b50",
        color: "white",
        padding: "22px 30px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h1 style={{ margin: 0 }}>WIN GROUP</h1>
          <small>Super Admin Control Panel</small>
        </div>
        <button onClick={logout} style={{
          padding: "10px 18px",
          border: 0,
          borderRadius: 6,
          cursor: "pointer"
        }}>
          Logout
        </button>
      </header>

      <section style={{ padding: 30 }}>
        <h2>Welcome, {username}</h2>
        <p>Super Admin Dashboard</p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 18,
          marginTop: 25
        }}>
          {[
            ["Team Members", "Manage team accounts"],
            ["Departments", "View company departments"],
            ["Business Records", "Manage business information"],
            ["Reports", "View company reports"]
          ].map(([title, description]) => (
            <div key={title} style={{
              background: "white",
              padding: 22,
              borderRadius: 10,
              border: "1px solid #e2e8f0"
            }}>
              <h3>{title}</h3>
              <p style={{ color: "#718096", fontSize: 13 }}>
                {description}
              </p>
              <small>Coming soon</small>
            </div>
          ))}
        </div>

        <div style={{
          background: "white",
          padding: 22,
          borderRadius: 10,
          marginTop: 25
        }}>
          <h3>Account Information</h3>
          <p>Role: Super Admin</p>
          <p>Username: {username}</p>
        </div>
      </section>
    </main>
  );
}
