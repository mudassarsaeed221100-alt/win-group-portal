
"use client";

import { useState } from "react";

export default function CommissionBonusManagement() {
  const [active, setActive] = useState(false);

  const bonusRules = [
    {
      role: "Staff",
      type: "Direct Referral Bonus",
      detail: "Staff ko apne direct refer kiye gaye members par bonus milega.",
    },
    {
      role: "Admin",
      type: "Indirect Referral Bonus",
      detail: "Admin ke liye indirect referral bonus ka system hoga.",
    },
    {
      role: "Super Admin",
      type: "Indirect Referral Bonus",
      detail: "Super Admin ke liye apni team ke indirect referrals ka bonus hoga.",
    },
    {
      role: "Founder / Owner",
      type: "Company-wide Control",
      detail: "Founder bonus rates, approvals aur company-wide payments control karega.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Commission & Bonus Management
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Company referral bonuses, commission rules aur payment approvals ka
          central management.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-50 p-4">
          <div>
            <p className="font-semibold text-gray-900">
              Bonus System Status
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {active
                ? "Preview enabled only. Actual payments are not connected."
                : "Bonus system abhi inactive hai."}
            </p>
          </div>

          <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
            INACTIVE
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Bonus Rates</p>
          <h3 className="mt-2 text-xl font-bold text-gray-900">
            Not Configured
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Bonus amounts aur percentages Founder baad mein decide karega.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Payment System</p>
          <h3 className="mt-2 text-xl font-bold text-gray-900">
            Not Connected
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Abhi koi automatic payment ya money transfer nahi hoga.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">
          Referral Bonus Rules
        </h3>

        <div className="mt-4 space-y-3">
          {bonusRules.map((rule) => (
            <div
              key={rule.role}
              className="rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900">
                  {rule.role}
                </h4>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {rule.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {rule.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">
          Future Management Features
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "Founder bonus rates set karega",
            "Direct aur indirect referral calculations",
            "Bonus approval management",
            "Member-wise bonus records",
            "Team-wise commission reports",
            "Paid aur unpaid bonus history",
            "Payment reference records",
            "Bonus activation / deactivation",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
            >
              <span className="text-green-600">✓</span>
              <span className="text-sm text-gray-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <h3 className="font-bold text-orange-900">
          Activation Condition
        </h3>
        <p className="mt-2 text-sm text-orange-800">
          Bonus system tab activate hoga jab Founder company ki referral
          policies, bonus rates aur payment rules final approve karega.
          Is waqt koi bonus calculate ya pay nahi kiya jayega.
        </p>
      </div>
    </div>
  );
}
