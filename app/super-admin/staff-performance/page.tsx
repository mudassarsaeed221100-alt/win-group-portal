
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Performance = {
  id: string;
  name: string;
  username: string;
  assigned: number;
  completed: number;
  pending: number;
  approved: number;
  earning: number;
};

export default function StaffPerformancePage() {
  const [staff, setStaff] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPerformance() {
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

    const { data: profiles, error: staffError } = await supabase
      .from("profiles")
      .select("id, first_name, surname, username")
      .eq("team_code", admin.team_code)
      .eq("role", "staff");

    if (staffError) {
      setMessage(staffError.message);
      setLoading(false);
      return;
    }

    if (!profiles || profiles.length === 0) {
      setStaff([]);
      setLoading(false);
      return;
    }

    const staffIds = profiles.map((person) => person.id);

    const { data: tasks, error: taskError } = await supabase
      .from("staff_tasks")
      .select("id, assigned_to, status")
      .eq("created_by", user.id)
      .in("assigned_to", staffIds);

    if (taskError) {
      setMessage(taskError.message);
      setLoading(false);
      return;
    }

    const { data: submissions, error: submissionError } = await supabase
      .from("submissions")
      .select("id, user_id, status, earning_amount")
      .in("user_id", staffIds);

    if (submissionError) {
      setMessage(submissionError.message);
      setLoading(false);
      return;
    }

    const results = profiles.map((person) => {
      const personTasks = (tasks || []).filter(
        (task) => task.assigned_to === person.id
      );

      const completed = personTasks.filter((task) => {
        const status = String(task.status || "").toLowerCase();
        return ["completed", "complete", "done"].includes(status);
      }).length;

      const personSubmissions = (submissions || []).filter(
        (item) =>
          item.user_id === person.id &&
          String(item.status || "").toLowerCase() === "approved"
      );

      const earning = personSubmissions.reduce(
        (sum, item) => sum + Number(item.earning_amount || 0),
        0
      );

      return {
        id: person.id,
        name:
          [person.first_name, person.surname].filter(Boolean).join(" ") ||
          person.username ||
          "Staff",
        username: person.username || "",
        assigned: personTasks.length,
        completed,
        pending: personTasks.length - completed,
        approved: personSubmissions.length,
        earning,
      };
    });

    setStaff(results);
    setLoading(false);
  }

  useEffect(() => {
    loadPerformance();
  }, []);

  const totals = staff.reduce(
    (sum, person) => ({
      assigned: sum.assigned + person.assigned,
      completed: sum.completed + person.completed,
      pending: sum.pending + person.pending,
      approved: sum.approved + person.approved,
      earning: sum.earning + person.earning,
    }),
    { assigned: 0, completed: 0, pending: 0, approved: 0, earning: 0 }
  );

  const money = (amount: number) =>
    `Rs. ${amount.toLocaleString("en-PK")}`;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Staff Performance
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Apni team ki work performance report dekhein.
            </p>
          </div>

          <button
            onClick={loadPerformance}
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
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Total Assigned Tasks</p>
            <h2 className="mt-2 text-2xl font-bold">{totals.assigned}</h2>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Completed Tasks</p>
            <h2 className="mt-2 text-2xl font-bold text-green-600">
              {totals.completed}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Pending Tasks</p>
            <h2 className="mt-2 text-2xl font-bold text-orange-600">
              {totals.pending}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Approved Earnings</p>
            <h2 className="mt-2 text-xl font-bold text-blue-600">
              {money(totals.earning)}
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Assigned</th>
                <th className="p-4">Completed</th>
                <th className="p-4">Pending</th>
                <th className="p-4">Approved Work</th>
                <th className="p-4">Total Earning</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Loading performance...
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
                    <td className="p-4">{person.assigned}</td>
                    <td className="p-4 font-semibold text-green-600">
                      {person.completed}
                    </td>
                    <td className="p-4 text-orange-600">{person.pending}</td>
                    <td className="p-4">{person.approved}</td>
                    <td className="p-4 font-semibold">
                      {money(person.earning)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {!loading && staff.length > 0 && (
              <tfoot className="border-t bg-gray-50 font-bold">
                <tr>
                  <td className="p-4">Team Total</td>
                  <td className="p-4">{totals.assigned}</td>
                  <td className="p-4">{totals.completed}</td>
                  <td className="p-4">{totals.pending}</td>
                  <td className="p-4">{totals.approved}</td>
                  <td className="p-4">{money(totals.earning)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
