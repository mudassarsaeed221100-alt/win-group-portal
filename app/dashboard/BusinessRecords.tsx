
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Department = {
  id: string;
  name: string;
};

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

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyForm = {
  title: "",
  record_type: "income" as "income" | "expense" | "other",
  category: "",
  description: "",
  amount: "",
  record_date: today(),
  reference_number: "",
  department_id: "",
};

export default function BusinessRecords() {
  const [records, setRecords] = useState<BusinessRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const [recordsResult, departmentsResult] = await Promise.all([
      supabase
        .from("business_records")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    if (recordsResult.error) {
      setError(recordsResult.error.message);
    } else {
      setRecords((recordsResult.data || []) as BusinessRecord[]);
    }

    if (departmentsResult.error) {
      setError((previous) =>
        previous
          ? previous + " | " + departmentsResult.error.message
          : departmentsResult.error.message
      );
    } else {
      setDepartments(departmentsResult.data || []);
    }

    setLoading(false);
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Please enter a valid amount.");
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      record_type: form.record_type,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      amount,
      record_date: form.record_date,
      reference_number: form.reference_number.trim() || null,
      department_id: form.department_id || null,
      updated_at: new Date().toISOString(),
    };

    let result;

    if (editingId) {
      result = await supabase
        .from("business_records")
        .update(payload)
        .eq("id", editingId);
    } else {
      const { data: authData } = await supabase.auth.getUser();

      result = await supabase.from("business_records").insert({
        ...payload,
        created_by: authData.user?.id,
      });
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(editingId ? "Record updated successfully." : "Record added successfully.");
      setForm({ ...emptyForm, record_date: today() });
      setEditingId(null);
      await loadData();
    }

    setSaving(false);
  }

  function handleEdit(record: BusinessRecord) {
    setForm({
      title: record.title,
      record_type: record.record_type,
      category: record.category || "",
      description: record.description || "",
      amount: String(record.amount),
      record_date: record.record_date,
      reference_number: record.reference_number || "",
      department_id: record.department_id || "",
    });

    setEditingId(record.id);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleStatus(record: BusinessRecord) {
    setError("");
    setMessage("");

    const newStatus =
      record.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("business_records")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Record status updated successfully.");
      await loadData();
    }
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("business_records")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Record deleted successfully.");
      await loadData();
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({ ...emptyForm, record_date: today() });
    setMessage("");
    setError("");
  }

  const activeRecords = records.filter(
    (record) => record.status === "active"
  );

  const totalIncome = activeRecords
    .filter((record) => record.record_type === "income")
    .reduce((total, record) => total + Number(record.amount), 0);

  const totalExpense = activeRecords
    .filter((record) => record.record_type === "expense")
    .reduce((total, record) => total + Number(record.amount), 0);

  const formatAmount = (amount: number) =>
    `Rs. ${Number(amount).toLocaleString("en-PK")}`;

  return (
    <div className="space-y-6 text-gray-800">
      <div>
        <h1 className="text-2xl font-bold">Business Records</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage business income, expenses and other records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Income</p>
          <h2 className="mt-2 text-2xl font-bold text-green-600">
            {formatAmount(totalIncome)}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <h2 className="mt-2 text-2xl font-bold text-red-600">
            {formatAmount(totalExpense)}
          </h2>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Net Balance</p>
          <h2 className="mt-2 text-2xl font-bold text-blue-600">
            {formatAmount(totalIncome - totalExpense)}
          </h2>
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold">
          {editingId ? "Edit Business Record" : "Add Business Record"}
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Record Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="Enter record title"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Record Type *</label>
            <select
              name="record_type"
              value={form.record_type}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Amount (PKR) *</label>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              required
              placeholder="Enter amount"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="e.g. Salary, Sales, Rent"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Department</label>
            <select
              name="department_id"
              value={form.department_id}
              onChange={handleChange}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="">No Department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Record Date *</label>
            <input
              name="record_date"
              type="date"
              value={form.record_date}
              onChange={handleChange}
              required
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Reference Number</label>
            <input
              name="reference_number"
              value={form.reference_number}
              onChange={handleChange}
              placeholder="Optional reference"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              placeholder="Additional details"
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Record"
                : "Add Record"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">All Business Records</h2>
          <p className="mt-1 text-sm text-gray-500">
            Total records: {records.length}
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-center text-gray-500">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="p-6 text-center text-gray-500">
            No business records found. Add your first record above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {records.map((record) => {
                  const department = departments.find(
                    (item) => item.id === record.department_id
                  );

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium">{record.title}</p>
                        {record.category && (
                          <p className="text-xs text-gray-500">
                            {record.category}
                          </p>
                        )}
                      </td>

                      <td className="p-3 capitalize">
                        {record.record_type}
                      </td>

                      <td className="p-3 font-medium">
                        {formatAmount(Number(record.amount))}
                      </td>

                      <td className="p-3">
                        {department?.name || "—"}
                      </td>

                      <td className="p-3">{record.record_date}</td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            record.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:underline"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => toggleStatus(record)}
                            className="text-orange-600 hover:underline"
                          >
                            {record.status === "active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>

                          <button
                            onClick={() => deleteRecord(record.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
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
