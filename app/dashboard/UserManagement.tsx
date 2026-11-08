
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function UserManagement() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
          username,
          email,
          password,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Account creation failed.");
        return;
      }

      setMessage("Account created successfully!");
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("admin");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="user-management">
      <h2>Create New Account</h2>
      <p>Founder / Owner can create and manage team accounts.</p>

      <form onSubmit={createAccount}>
        <label>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          required
        />

        <label>Temporary Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          minLength={8}
          required
        />

        <label>Account Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>

        {message && <p className="message">{message}</p>}
      </form>

      <style jsx>{`
        .user-management {
          background: white;
          padding: 25px;
          border-radius: 12px;
          border: 1px solid #e4eaf1;
          max-width: 650px;
          margin-top: 25px;
          color: #182b45;
        }

        h2 {
          color: #102b50;
          margin-top: 0;
        }

        .user-management > p {
          color: #718096;
          font-size: 13px;
        }

        form {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        label {
          font-size: 13px;
          font-weight: bold;
        }

        input, select {
          width: 100%;
          padding: 12px;
          border: 1px solid #dce3ec;
          border-radius: 7px;
          font-size: 14px;
          margin-bottom: 8px;
        }

        button {
          padding: 13px;
          border: none;
          border-radius: 7px;
          background: #102b50;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .message {
          font-size: 13px;
          font-weight: bold;
          overflow-wrap: anywhere;
        }
      `}</style>
    </section>
  );
}
