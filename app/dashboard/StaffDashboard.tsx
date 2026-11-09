"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Stats = {
  pendingWork: number;
  approvedWork: number;
  rejectedWork: number;
  totalEarnings: number;
  paidEarnings: number;
  unpaidEarnings: number;
  openTickets: number;
};

export default function StaffDashboard() {
  const [stats, setStats] = useState<Stats>({
    pendingWork: 0,
    approvedWork: 0,
    rejectedWork: 0,
    totalEarnings: 0,
    paidEarnings: 0,
    unpaidEarnings: 0,
    openTickets: 0,
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const user = sessionData.session?.user;

    if (sessionError || !user) {
      setMessage("Login session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    const [
      { data: submissions, error: submissionError },
      { data: earnings, error: earningsError },
      { data: tickets, error: ticketError },
    ] = await Promise.all([
      supabase
        .from("work_submissions")
        .select("status")
        .eq("user_id", user.id),

      supabase
        .from("earnings_ledger")
        .select("amount, payment_status")
        .eq("user_id", user.id),

      supabase
        .from("support_tickets")
        .select("status")
        .eq("user_id", user.id),
    ]);

    if (submissionError || earningsError || ticketError) {
      setMessage(
        "Dashboard data load nahi hua: " +
          [
            submissionError?.message,
            earningsError?.message,
            ticketError?.message,
          ]
            .filter(Boolean)
            .join(" | ")
      );
      setLoading(false);
      return;
    }

    const work = submissions || [];
    const paymentRecords = earnings || [];
    const supportRecords = tickets || [];

    const paid = paymentRecords
      .filter((item) => item.payment_status === "paid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const unpaid = paymentRecords
      .filter((item) => item.payment_status === "unpaid")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    setStats({
      pendingWork: work.filter((item) => item.status === "pending").length,
      approvedWork: work.filter((item) => item.status === "approved").length,
      rejectedWork: work.filter((item) => item.status === "rejected").length,
      totalEarnings: paid + unpaid,
      paidEarnings: paid,
      unpaidEarnings: unpaid,
      openTickets: supportRecords.filter(
        (item) =>
          item.status === "open" || item.status === "in_progress"
      ).length,
    });

    setLoading(false);
  }

  const cards = [
    {
      label: "Pending Work",
      value: stats.pendingWork,
      color: "text-yellow-400",
    },
    {
      label: "Approved Work",
      value: stats.approvedWork,
      color: "text-green-400",
    },
    {
      label: "Rejected Work",
      value: stats.rejectedWork,
      color: "text-red-400",
    },
    {
      label: "Total Earnings",
      value: `Rs. ${stats.totalEarnings.toLocaleString("en-PK")}`,
      color: "text-blue-400",
    },
    {
      label: "Paid Earnings",
      value: `Rs. ${stats.paidEarnings.toLocaleString("en-PK")}`,
      color: "text-green-400",
    },
    {
      label: "Unpaid Earnings",
      value: `Rs. ${stats.unpaidEarnings.toLocaleString("en-PK")}`,
      color: "text-orange-400",
    },
    {
      label: "Open Support Tickets",
      value: stats.openTickets,
      color: "text-purple-400",
    },
  ];

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Staff dashboard load ho raha hai...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">My Work Dashboard</h2>
          <p className="mt-1 text-sm text-gray-400">
            Apne work, earnings aur support ka overview dekhein.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-700 bg-gray-900 p-5"
          >
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className={`mt-3 text-2xl font-bold ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
        <h3 className="text-lg font-semibold">Flexible Working</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">
          WIN GROUP mein koi fixed duty hours nahi hain. Aap apni
          sahulat ke mutabiq kaam kar sakte hain. Har task ka reward
          Founder set karega aur earning approved work ke mutabiq
          calculate hogi.
        </p>
      </div>
    </div>
  );
}
