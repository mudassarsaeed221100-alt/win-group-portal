
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
  role: string;
  phone: string | null;
  phone_verified: boolean | null;
  team_code: string | null;
  referred_by: string | null;
  created_at: string;
};

export default function CompanyMembers() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMember, setSelectedMember] =
    useState<Profile | null>(null);

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

      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (founderError) throw founderError;

      if (founder.role !== "founder_owner") {
        throw new Error("Sirf Founder is module ko access kar sakta hai.");
      }

      const { data, error: membersError } = await supabase
        .from("profiles")
        .select(
          "id, username, first_name, surname, role, phone, phone_verified, team_code, referred_by, created_at"
        )
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      setMembers((data || []) as Profile[]);
    } catch (err: any) {
      setError(err.message || "Members load nahi ho sake.");
    } finally {
      setLoading(false);
    }
  }

  const memberMap = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );

  const getName = (member: Profile | undefined) => {
    if (!member) return "Unknown Member";

    const name =
      `${member.first_name || ""} ${member.surname || ""}`.trim();

    return name || member.username || "Unnamed Member";
  };

  const getRoleName = (role: string) => {
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

  const filteredMembers = members.filter((member) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      getName(member).toLowerCase().includes(term) ||
      (member.username || "").toLowerCase().includes(term) ||
      (member.phone || "").toLowerCase().includes(term) ||
      (member.team_code || "").toLowerCase().includes(term);

    const matchesRole =
      roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const counts = {
    founder: members.filter((m) => m.role === "founder_owner").length,
    superAdmin: members.filter((m) => m.role === "super_admin").length,
    admin: members.filter((m) => m.role === "admin").length,
    staff: members.filter((m) => m.role === "staff").length,
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
            Company-wide Member Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Company ke tamam accounts aur team details.
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: "Total Accounts", value: members.length },
          { label: "Founders", value: counts.founder },
          { label: "Super Admins", value: counts.superAdmin },
          { label: "Admins", value: counts.admin },
          { label: "Staff", value: counts.staff },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border bg-white p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          All Company Members
        </h3>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, username, phone ya team code search karein..."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="founder_owner">Founder</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <div className="mb-3 text-sm text-gray-500">
          Showing {filteredMembers.length} of {members.length} accounts
        </div>

        {loading ? (
          <p className="py-8 text-center text-gray-500">
            Members load ho rahe hain...
          </p>
        ) : filteredMembers.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            Koi member record nahi mila.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="p-3">Member</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Team Code</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="p-3">
                      <p className="font-semibold text-gray-900">
                        {getName(member)}
                      </p>
                      <p className="text-xs text-gray-500">
                        @{member.username || "No username"}
                      </p>
                    </td>

                    <td className="p-3 text-gray-600">
                      {getRoleName(member.role)}
                    </td>

                    <td className="p-3 text-gray-600">
                      {member.phone || "Not Added"}
                      {member.phone_verified && (
                        <span className="ml-1 text-green-600">
                          Verified
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-gray-600">
                      {member.team_code || "Not Assigned"}
                    </td>

                    <td className="p-3 text-gray-600">
                      {formatDate(member.created_at)}
                    </td>

                    <td className="p-3">
                      <button
                        onClick={() => setSelectedMember(member)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedMember && (
        <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-gray-900">
              Member Details
            </h3>

            <button
              onClick={() => setSelectedMember(null)}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="font-semibold text-gray-900">
                {getName(selectedMember)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Role</p>
              <p className="font-semibold text-gray-900">
                {getRoleName(selectedMember.role)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Username</p>
              <p className="font-semibold text-gray-900">
                {selectedMember.username || "Not Added"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-semibold text-gray-900">
                {selectedMember.phone || "Not Added"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Team Code</p>
              <p className="font-semibold text-gray-900">
                {selectedMember.team_code || "Not Assigned"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Referred By</p>
              <p className="font-semibold text-gray-900">
                {selectedMember.referred_by
                  ? getName(memberMap.get(selectedMember.referred_by))
                  : "No Referrer"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Joined Date</p>
              <p className="font-semibold text-gray-900">
                {formatDate(selectedMember.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Account ID</p>
              <p className="break-all font-mono text-xs text-gray-700">
                {selectedMember.id}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
