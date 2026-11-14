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
  rate: number;
};

function money(n: number) {
  return "Rs. " + n.toLocaleString("en-PK");
}

const medals = ["🥇", "🥈", "🥉"];

export default function StaffPerformancePage() {
  const [staff, setStaff] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPerformance() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please login first.");
      const userId = data.session.user.id;

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Staff list load nahi hui.");
      const people = result.staff || [];

      if (people.length === 0) {
        setStaff([]);
        return;
      }
      const ids = people.map((p: any) => p.id);

      const { data: tasks, error: taskError } = await supabase
        .from("staff_tasks")
        .select("id, assigned_to, status")
        .eq("created_by", userId)
        .in("assigned_to", ids);
      if (taskError) throw taskError;

      const { data: subs, error: subError } = await supabase
        .from("submissions")
        .select("id, user_id, status, earning_amount")
        .in("user_id", ids);
      if (subError) throw subError;

      const rows = people.map((p: any) => {
        const myTasks = (tasks || []).filter((t) => t.assigned_to === p.id);
        const completed = myTasks.filter((t) => t.status === "completed").length;
        const approvedSubs = (subs || []).filter((x) => x.user_id === p.id && x.status === "approved");
        const earning = approvedSubs.reduce((s, x) => s + Number(x.earning_amount || 0), 0);
        return {
          id: p.id,
          name: [p.first_name, p.surname].filter(Boolean).join(" ") || p.username || "Staff",
          username: p.username || "",
          assigned: myTasks.length,
          completed,
          pending: myTasks.length - completed,
          approved: approvedSubs.length,
          earning,
          rate: myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0,
        };
      });

      rows.sort((a: Performance, b: Performance) => b.completed - a.completed || b.earning - a.earning);
      setStaff(rows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data load nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPerformance();
  }, []);

  const totals = staff.reduce(
    (s, p) => ({
      assigned: s.assigned + p.assigned,
      completed: s.completed + p.completed,
      pending: s.pending + p.pending,
      approved: s.approved + p.approved,
      earning: s.earning + p.earning,
    }),
    { assigned: 0, completed: 0, pending: 0, approved: 0, earning: 0 }
  );

  const cards = [
    { title: "Total Assigned Tasks", value: String(totals.assigned), color: "text-white" },
    { title: "Completed Tasks", value: String(totals.completed), color: "text-green-400" },
    { title: "Pending Tasks", value: String(totals.pending), color: "text-orange-400" },
    { title: "Approved Earnings", value: money(totals.earning), color: "text-blue-400" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Staff Performance</h1>
            <p className="mt-2 text-slate-400">Apni team ki work performance report dekhein.</p>
          </div>
          <button onClick={loadPerformance} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700">
            Refresh
          </button>
        </div>

        {message && <div className="rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{message}</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{c.title}</p>
              <h2 className={"mt-2 text-2xl font-bold " + c.color}>{c.value}</h2>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-4">#</th>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Assigned</th>
                <th className="p-4">Completed</th>
                <th className="p-4">Pending</th>
                <th className="p-4">Completion %</th>
                <th className="p-4">Approved Work</th>
                <th className="p-4">Total Earning</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading performance...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Koi staff nahi mila.</td></tr>
              ) : (
                staff.map((p, i) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="p-4">{p.completed > 0 && i < 3 ? medals[i] : i + 1}</td>
                    <td className="p-4 font-medium">
                      {p.name}
                      <p className="text-xs text-slate-500">{p.username}</p>
                    </td>
                    <td className="p-4">{p.assigned}</td>
                    <td className="p-4 font-semibold text-green-400">{p.completed}</td>
                    <td className="p-4 text-orange-400">{p.pending}</td>
                    <td className="p-4">
                      <div className="h-2 w-24 rounded bg-slate-700">
                        <div className="h-2 rounded bg-green-500" style={{ width: p.rate + "%" }} />
                      </div>
                      <span className="text-xs text-slate-400">{p.rate}%</span>
                    </td>
                    <td className="p-4">{p.approved}</td>
                    <td className="p-4 font-semibold">{money(p.earning)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && staff.length > 0 && (
              <tfoot className="border-t border-slate-700 bg-slate-800 font-bold">
                <tr>
                  <td className="p-4"></td>
                  <td className="p-4">Team Total</td>
                  <td className="p-4">{totals.assigned}</td>
                  <td className="p-4">{totals.completed}</td>
                  <td className="p-4">{totals.pending}</td>
                  <td className="p-4">
                    {totals.assigned ? Math.round((totals.completed / totals.assigned) * 100) : 0}%
                  </td>
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
