
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Member = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  referred_by: string | null;
  created_at: string;
};

export default function ReferralNetwork() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Login session nahi mili.");
      }

      const { data: currentProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

      if (profileError) throw profileError;

      if (currentProfile.role !== "founder_owner") {
        throw new Error("Sirf Founder is module ko access kar sakta hai.");
      }

      const { data, error: membersError } = await supabase
        .from("profiles")
        .select(
          "id, username, first_name, surname, role, team_code, referred_by, created_at"
        )
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      setMembers((data || []) as Member[]);
    } catch (err: any) {
      setError(err.message || "Referral data load nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  const memberMap = useMemo(() => {
    return new Map(members.map((member) => [member.id, member]));
  }, [members]);

  const referralCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    members.forEach((member) => {
      if (member.referred_by) {
        counts[member.referred_by] =
          (counts[member.referred_by] || 0) + 1;
      }
    });

    return counts;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return members;

    return members.filter((member) => {
      const referrer = member.referred_by
        ? memberMap.get(member.referred_by)
        : null;

      const memberName =
        `${member.first_name || ""} ${member.surname || ""}`.toLowerCase();

      const referrerName = referrer
        ? `${referrer.first_name || ""} ${referrer.surname || ""}`.toLowerCase()
        : "";

      return (
        memberName.includes(term) ||
        (member.username || "").toLowerCase().includes(term) ||
        member.role.toLowerCase().includes(term) ||
        (member.team_code || "").toLowerCase().includes(term) ||
        referrerName.includes(term)
      );
    });
  }, [members, search, memberMap]);

  const totalReferrals = members.filter(
    (member) => member.referred_by
  ).length;

  const membersWithoutReferrer = members.filter(
    (member) => member.role !== "founder_owner" && !member.referred_by
  ).length;

  const getName = (member: Member | undefined) => {
    if (!member) return "Unknown Member";

    const name =
      `${member.first_name || ""} ${member.surname || ""}`.trim();

    return name || member.username || "Unnamed Member";
  };

  const getRole = (role: string) => {
    switch (role) {
      case "founder_owner":
        return "Founder";
      case "super_admin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "staff":
        return "Staff";
      default:
        return role;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Referral Network
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Company ke tamam members aur unke referral relationships.
          </p>
        </div>

        <button
          onClick={loadMembers}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Members</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {members.length}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Successful Referrals</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {totalReferrals}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Without Referrer</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">
            {membersWithoutReferrer}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-lg font-bold text-gray-900">
          Top Referrers
        </h3>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(referralCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([id, count]) => {
                const member = memberMap.get(id);

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getName(member)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member ? getRole(member.role) : "Unknown"}
                        {member?.team_code
                          ? ` • ${member.team_code}`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                      {count} Referrals
                    </span>
                  </div>
                );
              })}

            {Object.keys(referralCounts).length === 0 && (
              <p className="text-sm text-gray-500">
                Abhi koi referral record available nahi hai.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">
            All Referral Relationships
          </h3>

          <span className="text-sm text-gray-500">
            {filteredMembers.length} Records
          </span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Member, referrer ya team code search karein..."
          className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
        />

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Referral records load ho rahe hain...
          </p>
        ) : filteredMembers.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            Koi record nahi mila.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="p-3">Member</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Referred By</th>
                  <th className="p-3">Team Code</th>
                  <th className="p-3">Direct Referrals</th>
                  <th className="p-3">Joined</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => {
                  const referrer = member.referred_by
                    ? memberMap.get(member.referred_by)
                    : undefined;

                  return (
                    <tr
                      key={member.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="p-3 font-semibold text-gray-900">
                        {getName(member)}
                      </td>

                      <td className="p-3 text-gray-600">
                        {getRole(member.role)}
                      </td>

                      <td className="p-3 text-gray-600">
                        {member.referred_by
                          ? getName(referrer)
                          : "No Referrer"}
                      </td>

                      <td className="p-3 text-gray-600">
                        {member.team_code || "Not Assigned"}
                      </td>

                      <td className="p-3">
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
                          {referralCounts[member.id] || 0}
                        </span>
                      </td>

                      <td className="p-3 text-gray-600">
                        {formatDate(member.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
