"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type BusinessRecord = {
  id: string;
  title: string;
  record_type: "income" | "expense" | "other";
  category: string | null;
  description: string | null;
  amount: number;
  record_date: string;
  reference_number: string | null;
  department_id: string | null;
  status: "active" | "inactive";
};

export default function Reports() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("business_records")
      .select("*")
      .order("record_date", { ascending: false });

    if (error) {
      setError(error.message);
      setRecords([]);
    } else {
      setRecords((data || []) as BusinessRecord[]);
    }

    setLoading(false);
  }

  const filteredRecords = records.filter((record) => {
    if (startDate && record.record_date < startDate) return false;
    if (endDate && record.record_date > endDate) return false;
    return true;
  });

  const activeRecords = filteredRecords.filter(
    (record) => record.status === "active"
  );

  const totalIncome = activeRecords
    .filter((record) => record.record_type === "income")
    .reduce((total, record) => total + Number(record.amount), 0);

  const totalExpenses = activeRecords
    .filter((record) => record.record_type === "expense")
    .reduce((total, record) => total + Number(record.amount), 0);

  const otherRecords = activeRecords
    .filter((record) => record.record_type === "other")
    .reduce((total, record) => total + Number(record.amount), 0);

  const balance = totalIncome - totalExpenses;

  function formatAmount(amount: number) {
    return `Rs. ${amount.toLocaleString("en-PK")}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Business Reports
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Income, expenses and financial performance reports.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear Filters
        </button>

        <button
          onClick={fetchRecords}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Income</p>
          <h3 className="mt-2 text-2xl font-bold text-green-600">
            {formatAmount(totalIncome)}
          </h3>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <h3 className="mt-2 text-2xl font-bold text-red-600">
            {formatAmount(totalExpenses)}
          </h3>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Net Balance</p>
          <h3 className="mt-2 text-2xl font-bold text-blue-600">
            {formatAmount(balance)}
          </h3>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Other Records</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-800">
            {formatAmount(otherRecords)}
          </h3>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4">
          <h3 className="font-bold text-gray-900">
            Financial Records
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {filteredRecords.length} records found
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-500">
            Loading reports...
          </p>
        ) : filteredRecords.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No records found for this date range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap p-3">
                      {record.record_date}
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {record.title}
                    </td>
                    <td className="p-3 capitalize">
                      {record.record_type}
                    </td>
                    <td className="p-3">
                      {record.category || "-"}
                    </td>
                    <td className="whitespace-nowrap p-3 font-medium">
                      {formatAmount(Number(record.amount))}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          record.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
