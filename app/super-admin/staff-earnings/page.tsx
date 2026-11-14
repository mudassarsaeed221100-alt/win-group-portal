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
            <p className="mt-2 text-slate-400">Approved submissions ki earning report.
