"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Staff = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  phone: string | null;
  role: string;
  team_code: string | null;
  created_at: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500";

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

  // Edit ke liye
  const [editing, setEditing] = useState<Staff | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Security lock
  const [allowed, setAllowed] = useState<boolean | null>(null);

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
      setError("");
      const token = await getToken();

      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Staff list load nahi hui.");
      }
      setStaff(result.staff || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Staff list load nahi hui.");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    async function checkAccess() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setAllowed(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && ["super_admin", "admin"].includes(profile.role)) {
        setAllowed(true);
        loadStaff();
      } else {
        setAllowed(false);
      }
    }
    checkAccess();
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
      setError(err instanceof Error ? err.message : "Account create nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(person: Staff) {
    setEditing(person);
    setEditFirstName(person.first_name || "");
    setEditSurname(person.surname || "");
    setEditPhone(person.phone || "");
    setMessage("");
    setError("");
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: editFirstName,
          surname: editSurname,
          phone: editPhone,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Update nahi hua.");
      }

      setMessage("Staff update ho gaya!");
      setEditing(null);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update nahi hua.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff(person: Staff) {
    const name =
      [person.first_name, person.surname].filter(Boolean).join(" ") ||
      person.username;
    if (!confirm(`Kya aap waqai "${name}" ko delete karna chahte hain?`)) return;

    setDeletingId(person.id);
    setMessage("");
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/users/${person.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delete nahi hua.");
      }

      setMessage("Staff delete ho gaya!");
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete nahi hua.");
    } finally {
      setDeletingId(null);
    }
  }

  // ---------- Security screens ----------
  if (allowed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Checking access...
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-4 text-center text-white">
        <h1 className="text-2xl font-bold">🔒 Access Denied</h1>
        <p className="text-slate-400">
          Aapko is page ki permission nahi hai. Admin account se login karein.
        </p>
      </main>
    );
  }

  // ---------- Main page ----------
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Create Staff</h1>
          <p className="mt-2 text-slate-400">
            Apni team ke liye naya Staff account banayein.
          </p>
        </div>

        {message && (
          <p className="rounded-lg bg-green-900/40 p-3 text-green-300">{message}</p>
        )}
        {error && (
          <p className="rounded-lg bg-red-900/40 p-3 text-red-300">{error}</p>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="mb-6 text-xl font-semibold">Staff Account Details</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">First Name</label>
                <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} placeholder="First Name" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Surname</label>
                <input required value={surname} onChange={(e) => setSurname(e.target.value)} className={inputClass} placeholder="Surname" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Username</label>
                <input required value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="Username" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="Email Address" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Phone Number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="Phone Number" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-300">Password</label>
                <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="Minimum 8 characters" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Creating Account..." : "Create Staff Account"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">My Team Staff</h2>
              <p className="mt-1 text-sm text-slate-400">Total Staff: {staff.length}</p>
            </div>
            <button onClick={loadStaff} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
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
                    <th className="p-3">Phone</th>
                    <th className="p-3">Team Code</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((person) => (
                    <tr key={person.id} className="border-b border-slate-800">
                      <td className="p-3">
                        {[person.first_name, person.surname].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="p-3">{person.username}</td>
                      <td className="p-3">{person.phone || "—"}</td>
                      <td className="p-3">{person.team_code || "—"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(person)} className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold hover:bg-amber-700">
                            Edit
                          </button>
                          <button onClick={() => deleteStaff(person)} disabled={deletingId === person.id} className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                            {deletingId === person.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={saveEdit} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Edit Staff: {editing.username}</h2>

            <div>
              <label className="mb-2 block text-sm text-slate-300">First Name</label>
              <input required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Surname</label>
              <input required value={editSurname} onChange={(e) => setEditSurname(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Phone Number</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={inputClass} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-700 px-4 py-2 hover:bg-slate-800">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
