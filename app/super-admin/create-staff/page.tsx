
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Staff = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  created_at: string;
};

export default function CreateStaffPage() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function getToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      throw new Error("Login session nahi mili. Dobara login karein.");
    }

    return data.session.access_token;
  }

  async function loadStaff() {
    try {
      setListLoading(true);
      const token = await getToken();

      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Staff list load nahi hui.");
      }

      setStaff(result.staff || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Staff list load nahi hui."
      );
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          surname,
          username,
          email,
          phone,
          password,
          role: "staff",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Account create nahi hua.");
      }

      setMessage("Staff account successfully create ho gaya!");

      setFirstName("");
      setSurname("");
      setUsername("");
      setEmail("");
      setPhone("");
      setPassword("");

      await loadStaff();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Account create nahi hua."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">

        <div>
          <h1 className="text-3xl font-bold">Create Staff</h1>
          <p className="mt-2 text-slate-400">
            Apni team ke liye naya Staff account banayein.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="mb-6 text-xl font-semibold">
            Staff Account Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  First Name
                </label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                  placeholder="First Name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Surname
                </label>
                <input
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                  placeholder="Surname"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Username
                </label>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                  placeholder="Email Address"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Phone Number
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                  placeholder="Phone Number"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Password
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            {message && (
              <p className="rounded-lg bg-green-900/40 p-3 text-green-300">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-red-900/40 p-3 text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Staff Account"}
            </button>

          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">My Team Staff</h2>
              <p className="mt-1 text-sm text-slate-400">
                Total Staff: {staff.length}
              </p>
            </div>

            <button
              onClick={loadStaff}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>

          {listLoading ? (
            <p className="text-slate-400">Loading Staff...</p>
          ) : staff.length === 0 ? (
            <p className="text-slate-400">Abhi koi Staff account nahi hai.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="p-3">Name</th>
                    <th className="p-3">Username</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Team Code</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((person) => (
                    <tr
                      key={person.id}
                      className="border-b border-slate-800"
                    >
                      <td className="p-3">
                        {[person.first_name, person.surname]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="p-3">{person.username}</td>
                      <td className="p-3">{person.role}</td>
                      <td className="p-3">{person.team_code || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
