
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email ya password ghalat hai.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#edf1f7",
      display: "grid",
      placeItems: "center",
      fontFamily: "Arial",
      padding: "20px"
    }}>
      <form onSubmit={handleLogin} style={{
        background: "white",
        padding: "35px",
        borderRadius: "14px",
        width: "100%",
        maxWidth: "390px"
      }}>
        <h1 style={{ color: "#102b50", textAlign: "center" }}>
          WIN GROUP
        </h1>

        <p style={{ textAlign: "center" }}>
          Wolf Independent National Group
        </p>

        <h2>Secure Login</h2>

        <label>Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px", margin: "10px 0 20px" }}
        />

        <label>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px", margin: "10px 0 20px" }}
        />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: "#102b50",
            color: "white",
            border: "none",
            borderRadius: "7px"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ textAlign: "center", fontSize: "12px" }}>
          Authorized users only
        </p>
      </form>
    </main>
  );
}
