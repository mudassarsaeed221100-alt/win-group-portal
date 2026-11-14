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

function money(n: number) {
  return "Rs. " + n.toLocaleString("en-PK");
}

export default function StaffEarningsPage() {
  const [staff, setStaff] = useState<StaffEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadEarnings() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please login first.");

      // Staff list API se
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

      const { data: subs, error } = await supabase
        .from("submissions")
        .select("id, user_id, earning_amount, reviewed_at, created_at")
        .in("user_id", people.map((p: any) => p.id))
        .eq("status", "approved");
      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(todayStart);
      const day = weekStart.getDay();
      weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const rows = people.map((p: any) => {
        const recs = (subs || []).filter((x) => x.user_id === p.id);
        let total = 0, daily = 0, weekly = 0, monthly = 0;
        for (const r of recs) {
          const amt = Number(r.earning_amount || 0);
          const d = new Date(r.reviewed_at || r.created_at);
          total += amt;
          if (d >= todayStart) daily += amt;
          if (d >= weekStart) weekly += amt;
          if (d >= monthStart) monthly += amt;
        }
        return {
          id: p.id,
          name: [p.first_name, p.surname].filter(Boolean).join(" ") || p.username || "Staff",
          username: p.username || "",
          total, daily, weekly, monthly,
          submissions: recs.length,
        };
      });

      rows.sort((a: StaffEarning, b: StaffEarning) => b.total - a.total);
      setStaff(rows);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data load nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEarnings();
  }, []);

  const totals = staff.reduce(
    (s, p) => ({
      total: s.total + p.total,
      daily: s.daily + p.daily,
      weekly: s.weekly + p.weekly,
      monthly: s.monthly + p.monthly,
      count: s.count + p.submissions,
    }),
    { total: 0, daily: 0, weekly: 0, monthly: 0, count: 0 }
  );

  const cards = [
    { title: "Total Earning", amount: totals.total },
    { title: "Today", amount: totals.daily },
    { title: "This Week", amount: totals.weekly },
    { title: "This Month", amount: totals.monthly },
  ];

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Staff Earnings</h1>
            <p className="mt-2 text-slate-400">Approved submissions ki earning report.</p>
          </div>
          <button onClick={loadEarnings} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700">
            Refresh
          </button>
        </div>

        {message && <div className="rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{message}</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">{c.title}</p>
              <h2 className="mt-2 text-2xl font-bold text-green-400">{money(c.amount)}</h2>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-4">Staff Name</th>
                <th className="p-4">Total</th>
                <th className="p-4">Today</th>
                <th className="p-4">Weekly</th>
                <th className="p-4">Monthly</th>
                <th className="p-4">Approved Work</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading earnings...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Koi staff nahi mila.</td></tr>
              ) : (
                staff.map((p) => (
                  <tr key={p.id} className="border-t border-slate-800">
                    <td className="p-4 font-medium">
                      {p.name}
                      <p className="text-xs text-slate-500">{p.username}</p>
                    </td>
                    <td className="p-4 font-semibold text-green-400">{money(p.total)}</td>
                    <td className="p-4">{money(p.daily)}</td>
                    <td className="p-4">{money(p.weekly)}</td>
                    <td className="p-4">{money(p.monthly)}</td>
                    <td className="p-4">{p.submissions}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && staff.length > 0 && (
              <tfoot className="border-t border-slate-700 bg-slate-800 font-bold">
                <tr>
                  <td className="p-4">Team Total</td>
                  <td className="p-4">{money(totals.total)}</td>
                  <td className="p-4">{money(totals.daily)}</td>
                  <td className="p-4">{money(totals.weekly)}</td>
                  <td className="p-4">{money(totals.monthly)}</td>
                  <td className="p-4">{totals.count}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
