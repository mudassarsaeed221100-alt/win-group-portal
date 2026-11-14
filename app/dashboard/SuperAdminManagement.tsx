"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  referred_by: string | null;
  created_at: string;
};

export default function SuperAdminManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Login session nahi mili.");

      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();
      if (founderError) throw founderError;
      if (founder.role !== "founder_owner") throw new Error("Sirf Founder is module ko access kar sakta hai.");

      const { data, error: dataError } = await supabase
        .from("profiles")
        .select("id, username, first_name, surname, role, team_code, referred_by, created_at")
        .order("created_at", { ascending: false });
      if (dataError) throw dataError;

      setProfiles((data || []) as Profile[]);
    } catch (err: any) {
      setError(err.message || "Super Admin data load nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  // ---- Founder: Team Code dena / badalna ----
  async function assignCode(admin: Profile) {
    const code = (codes[admin.id] || "").trim().toUpperCase();
    setMessage("");
    setError("");
    if (!code) return setError("Pehle Team Code likhein.");
    if (admin.team_code && !confirm("Is Super Admin ki poori team ka code " + admin.team_code + " se " + code + " ho jayega. Aage barhein?")) return;

    setSavingId(admin.id);
    const { data, error } = await supabase.rpc("assign_team_code", { target_id: admin.id, new_code: code });
    setSavingId(null);
    if (error) return setError(error.message);

    setCodes({ ...codes, [admin.id]: "" });
    setMessage(getName(admin) + " ko Team Code " + data + " de diya gaya.");
    loadData();
  }

  const superAdmins = useMemo(() => profiles.filter((p) => p.role === "super_admin"), [profiles]);

  const getName = (profile: Profile | undefined) => {
    if (!profile) return "Unknown Member";
    const name = ((profile.first_name || "") + " " + (profile.surname || "")).trim();
    return name || profile.username || "Unnamed Member";
  };

  const getTeamMembers = (teamCode: string | null) => {
    if (!teamCode) return [];
    return profiles.filter(
      (p) => p.team_code === teamCode && p.role !== "super_admin" && p.role !== "founder_owner"
    );
  };

  const getReferrer = (id: string | null) => {
    if (!id) return "Not Assigned";
    return getName(profiles.find((p) => p.id === id));
  };

  const filteredAdmins = superAdmins.filter((admin) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      getName(admin).toLowerCase().includes(term) ||
      (admin.username || "").toLowerCase().includes(term) ||
      (admin.team_code || "").toLowerCase().includes(term)
    );
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Super Admin Management</h2>
          <p className="mt-1 text-sm text-gray-500">Tamam Super Admins aur unki team ka Founder-level overview.</p>
        </div>
        <button onClick={loadData} disabled={loading} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Super Admins</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{superAdmins.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Admins</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{profiles.filter((p) => p.role === "admin").length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{profiles.filter((p) => p.role === "staff").length}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-gray-900">Super Admin List</h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name ya team code search karein..."
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        {loading ? (
          <p className="py-6 text-center text-gray-500">Super Admins load ho rahe hain...</p>
        ) : filteredAdmins.length === 0 ? (
          <p className="py-6 text-center text-gray-500">Koi Super Admin record nahi mila.</p>
        ) : (
          <div className="space-y-3">
            {filteredAdmins.map((admin) => {
              const team = getTeamMembers(admin.team_code);
              const admins = team.filter((m) => m.role === "admin").length;
              const staff = team.filter((m) => m.role === "staff").length;
              const isSelected = selectedId === admin.id;

              return (
                <div key={admin.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-gray-900">{getName(admin)}</h4>
                      <p className="mt-1 text-sm text-gray-500">Team Code: <b>{admin.team_code || "Not Assigned"}</b></p>
                      <p className="text-xs text-gray-500">Joined: {formatDate(admin.created_at)}</p>
                    </div>
                    <button
                      onClick={() => setSelectedId(isSelected ? null : admin.id)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      {isSelected ? "Close Details" : "View Team"}
                    </button>
                  </div>

                  {/* Team Code dena */}
                  <div className="mt-4 flex flex-wrap gap-2 rounded-lg bg-gray-50 p-3">
                    <input
                      value={codes[admin.id] || ""}
                      onChange={(e) => setCodes({ ...codes, [admin.id]: e.target.value.toUpperCase() })}
                      placeholder={admin.team_code ? "Naya Team Code" : "Team Code likhein (jaise WIN01)"}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => assignCode(admin)}
                      disabled={savingId === admin.id}
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
                    >
                      {savingId === admin.id ? "Saving..." : admin.team_code ? "Code Badlein" : "Code Dein"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-xl font-bold text-gray-900">{team.length}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-xl font-bold text-blue-700">{admins}</p>
                      <p className="text-xs text-gray-500">Admins</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3 text-center">
                      <p className="text-xl font-bold text-green-700">{staff}</p>
                      <p className="text-xs text-gray-500">Staff</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-5 border-t pt-4">
                      <h5 className="mb-3 font-bold text-gray-900">Team Members</h5>
                      {team.length === 0 ? (
                        <p className="text-sm text-gray-500">Is Super Admin ki team mein abhi koi member nahi.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[650px] text-left text-sm">
                            <thead>
                              <tr className="border-b bg-gray-50 text-gray-600">
                                <th className="p-3">Member</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Referred By</th>
                                <th className="p-3">Joined</th>
                              </tr>
                            </thead>
                            <tbody>
                              {team.map((member) => (
                                <tr key={member.id} className="border-b last:border-0">
                                  <td className="p-3 font-semibold text-gray-900">{getName(member)}</td>
                                  <td className="p-3 text-gray-600">{member.role === "admin" ? "Admin" : "Staff"}</td>
                                  <td className="p-3 text-gray-600">{getReferrer(member.referred_by)}</td>
                                  <td className="p-3 text-gray-600">{formatDate(member.created_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
