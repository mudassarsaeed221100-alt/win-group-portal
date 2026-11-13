
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type StaffEarning = {
  id: string;
  name: string;
  username: string;
  total: number;
  daily: number;
  weekly: number;
  monthly: number;
  submissions: number;
};

export default function StaffEarningsPage() {
  const [staff, setStaff] = useState<StaffEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadEarnings() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("profiles")
      .select("role, team_code")
      .eq("id", user.id)
      .single();

    if (adminError || admin?.role !== "super_admin") {
      setMessage("Access denied.");
      setLoading(false);
      return;
    }

    const { data: staffProfiles, error: staffError } = await supabase
      .from("profiles")
      .select("id, first_name, surname, username")
      .eq("team_code", admin.team_code)
      .eq("role", "staff");

    if (staffError) {
      setMessage(staffError.message);
      setLoading(false);
      return;
    }

    if (!staffProfiles || staffProfiles.length === 0) {
      setStaff([]);
      setLoading(false);
      return;
    }

    const staffIds = staffProfiles.map((person) => person.id);

    const { data: submissions, error: submissionError } = await supabase
      .from("submissions")
      .select("id, user_id, earning_amount, created_at")
      .in("user_id", staffIds)
      .eq("status", "approved");

    if (submissionError) {
      setMessage(submissionError.message);
      setLoading(false);
      return;
    }

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const results = staffProfiles.map((person) => {
      const records = (submissions || []).filter(
        (item) => item.user_id === person.id
      );

      let total = 0;
      let daily = 0;
      let weekly = 0;
      let monthly = 0;

      records.forEach((item) => {
        const amount = Number(item.earning_amount || 0);
        const date = new Date(item.created_at);

        total += amount;

        if (date >= todayStart) daily += amount;
        if (date >= weekStart) weekly += amount;
        if (date >= monthStart) monthly += amount;
      });

      return {
        id: person.id,
        name:
          [person.first_name, person.surname].filter(Boolean).join(" ") ||
          person.username ||
          "Staff",
        username: person.username || "",
        total,
        daily,
        weekly,
        monthly,
        submissions: records.length,
      };
    });

    setStaff(results);
    setLoading(false);
  }

  const totals = staff.reduce(
    (sum, person) => ({
      total: sum.total + person.total,
      daily: sum.daily + person.daily,
      weekly: sum.weekly + person.weekly,
      monthly: sum.monthly + person.monthly,
    }),
    { total: 0, daily: 0, weekly: 0, monthly: 0 }
  );

  useEffect(() => {
    loadEarnings();
  }, []);

  const formatMoney = (amount: number) =>
    `Rs. ${amount.toLocaleString("en-PK")}`;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Staff Earnings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Approved submissions ki earning report.
            </p>
          </div>

          <button
            onClick={loadEarnings}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border bg-white p-3 text-sm text-red-600">
            {message}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Total Earning", amount: totals.total },
            { title: "Today's Earning", amount: totals.daily },
            { title: "This Week", amount: totals.weekly },
            { title: "This Month", amount: totals.monthly },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border bg-white p-5">
              <p className="text-sm text-gray-500">{item.title}</p>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                {formatMoney(item.amount)}
              </h2>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Total Earning</th>
                <th className="p-4">Today</th>
                <th className="p-4">Weekly</th>
                <th className="p-4">Monthly</th>
                <th className="p-4">Approved Work</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Loading earnings...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No staff members found.
                  </td>
                </tr>
              ) : (
                staff.map((person) => (
                  <tr key={person.id} className="border-t">
                    <td className="p-4 font-medium text-gray-900">
                      {person.name}
                      <p className="text-xs text-gray-400">
                        {person.username}
                      </p>
                    </td>
                    <td className="p-4 font-semibold">
                      {formatMoney(person.total)}
                    </td>
                    <td className="p-4">{formatMoney(person.daily)}</td>
                    <td className="p-4">{formatMoney(person.weekly)}</td>
                    <td className="p-4">{formatMoney(person.monthly)}</td>
                    <td className="p-4">{person.submissions}</td>
                  </tr>
                ))
              )}
            </tbody>

            {!loading && staff.length > 0 && (
              <tfoot className="border-t bg-gray-50 font-bold">
                <tr>
                  <td className="p-4">Team Total</td>
                  <td className="p-4">{formatMoney(totals.total)}</td>
                  <td className="p-4">{formatMoney(totals.daily)}</td>
                  <td className="p-4">{formatMoney(totals.weekly)}</td>
                  <td className="p-4">{formatMoney(totals.monthly)}</td>
                  <td className="p-4">
                    {staff.reduce((sum, person) => sum + person.submissions, 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
