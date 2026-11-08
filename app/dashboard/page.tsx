"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setUsername(data.username);
      setRole(data.role);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <main style={{
      minHeight: "100vh",
      background: "#edf1f7",
      padding: "30px",
      fontFamily: "Arial"
    }}>
      <h1 style={{ color: "#102b50" }}>WIN GROUP</h1>
      <h2>Founder / Owner Dashboard</h2>
      <p>Welcome, {username}</p>
      <p>Account Role: {role}</p>

      <hr />

      <h3>System Management</h3>
      <p>Manage Boss, Super Admin, Admin and Staff accounts.</p>

      <button onClick={logout}>Logout</button>
    </main>
  );
}
