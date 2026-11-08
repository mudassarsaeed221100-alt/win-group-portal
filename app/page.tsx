
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
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
          style={{
            width: "100%",
            padding: "12px",
            margin: "10px 0 20px",
            boxSizing: "border-box"
          }}
        />

        <label>Password</label>

        <div style={{
          display: "flex",
          border: "1px solid #aaa",
          borderRadius: "6px",
          margin: "10px 0 20px"
        }}>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: "12px",
              border: "none",
              outline: "none"
            }}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              padding: "0 12px",
              border: "none",
              background: "white"
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {error && (
          <p style={{
            color: "red",
            background: "#fff0f0",
            padding: "10px",
            overflowWrap: "anywhere"
          }}>
            {error}
          </p>
        )}

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
