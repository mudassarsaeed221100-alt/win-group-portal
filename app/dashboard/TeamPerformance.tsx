
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  first_name: string | null;
  surname: string | null;
  username: string | null;
  role: string;
  team_code: string | null;
  referred_by: string | null;
  created_at: string;
};

export default function TeamPerformance() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadPerformance();
  }, []);

  async function loadPerformance() {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Login session nahi mili.");
      }

      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (founderError) throw founderError;

      if (founder.role !== "founder_owner") {
        throw new Error("Sirf Founder is module ko access kar sakta hai.");
      }

      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, surname, username, role, team_code, referred_by, created_at"
        )
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      setProfiles((data || []) as Profile[]);
    } catch (err: any) {
      setError(err.message || "Team performance load nahi ho saki.");
    } finally {
      setLoading(false);
    }
  }

  const superAdmins = useMemo(
    () => profiles.filter((p) => p.role === "super_admin"),
    [profiles]
  );

  const teams = useMemo(() => {
    return superAdmins.map((admin) => {
      const members = profiles.filter(
        (p) =>
          p.team_code === admin.team_code &&
          p.role !== "super_admin" &&
          p.role !== "founder_owner"
      );

      return {
        admin,
        members,
        adminCount: members.filter((p) => p.role === "admin").length,
        staffCount: members.filter((p) => p.role === "staff").length,
        totalMembers: members.length,
        directReferrals: profiles.filter(
          (p) => p.referred_by === admin.id
        ).length,
      };
    });
  }, [profiles, superAdmins]);

  const totalMembers = profiles.filter(
    (p) => p.role !== "founder_owner"
  ).length;

  const totalAdmins = profiles.filter((p) => p.role === "admin").length;
  const totalStaff = profiles.filter((p) => p.role === "staff").length;

  const totalReferrals = profiles.filter(
    (p) => p.referred_by !== null
  ).length;

  const filteredTeams = teams.filter(({ admin }) => {
    const name =
      `${admin.first_name || ""} ${admin.surname || ""}`.toLowerCase();

    const term = search.trim().toLowerCase();

    return (
      !term ||
      name.includes(term) ||
      (admin.team_code || "").toLowerCase().includes(term)
    );
  });

  const getName = (profile: Profile) => {
    const name =
      `${profile.first_name || ""} ${profile.surname || ""}`.trim();

    return name || profile.username || "Unnamed Member";
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Team Performance
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Har Super Admin ki team growth aur member statistics.
          </p>
        </div>

        <button
          onClick={loadPerformance}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Members</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalMembers}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Super Admin Teams</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">
            {superAdmins.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Admins</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalAdmins}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="mt-2 text-3xl font-bold text-green-700">
            {totalStaff}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Company Referral Growth
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Ab tak record hone wale tamam referral connections.
          </p>
        </div>

        <p className="text-3xl font-bold text-purple-700">
          {totalReferrals}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Total recorded referrals
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Team-wise Performance
            </h3>
            <p className="text-sm text-gray-500">
              Super Admin teams ka comparison.
            </p>
          </div>

          <span className="text-sm text-gray-500">
            {filteredTeams.length} Teams
          </span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Super Admin name ya team code search karein..."
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Performance data load ho raha hai...
          </p>
        ) : filteredTeams.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            Abhi koi team record available nahi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="p-3">Super Admin</th>
                  <th className="p-3">Team Code</th>
                  <th className="p-3">Admins</th>
                  <th className="p-3">Staff</th>
                  <th className="p-3">Total Members</th>
                  <th className="p-3">Direct Referrals</th>
                  <th className="p-3">Joined</th>
                </tr>
              </thead>

              <tbody>
                {filteredTeams.map((team) => (
                  <tr
                    key={team.admin.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="p-3 font-semibold text-gray-900">
                      {getName(team.admin)}
                    </td>

                    <td className="p-3 text-gray-600">
                      {team.admin.team_code || "Not Assigned"}
                    </td>

                    <td className="p-3 font-semibold text-blue-700">
                      {team.adminCount}
                    </td>

                    <td className="p-3 font-semibold text-green-700">
                      {team.staffCount}
                    </td>

                    <td className="p-3 font-bold text-gray-900">
                      {team.totalMembers}
                    </td>

                    <td className="p-3 text-gray-600">
                      {team.directReferrals}
                    </td>

                    <td className="p-3 text-gray-600">
                      {formatDate(team.admin.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Note: Yeh report profiles aur referral records par based hai.
        Yeh earning ya sales performance report nahi hai.
      </p>
    </div>
  );
}
