
"use client";

export default function PaymentVerification() {
  const features = [
    {
      title: "Payment Submissions",
      description: "Customers ki submitted payment details aur transaction IDs.",
    },
    {
      title: "EasyPaisa Verification",
      description: "EasyPaisa transactions ko verify karne ka system.",
    },
    {
      title: "JazzCash Verification",
      description: "JazzCash payments ki verification.",
    },
    {
      title: "Bank Transfer Verification",
      description: "Company bank account mein received payments ka record.",
    },
    {
      title: "Approve / Reject",
      description: "Founder payment ko approve ya reject kar sakega.",
    },
    {
      title: "Payment History",
      description: "Verified aur rejected payments ka complete record.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Payment Verification
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Future customer payment verification management.
          </p>
        </div>

        <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
          Currently Inactive
        </span>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <h3 className="text-lg font-bold text-orange-900">
          Payment Verification Disabled
        </h3>

        <p className="mt-2 text-sm leading-6 text-orange-800">
          WIN GROUP filhal team-building phase mein hai. Product payments
          aur customer transactions ka system Founder ki approval tak
          inactive rahega.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {features.map((feature, index) => (
          <div
            key={feature.title}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 font-bold text-gray-600">
                {index + 1}
              </div>

              <div>
                <h4 className="font-bold text-gray-900">
                  {feature.title}
                </h4>

                <p className="mt-1 text-sm leading-6 text-gray-500">
                  {feature.description}
                </p>

                <span className="mt-3 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  Planned
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-bold text-gray-900">
          Payment Verification Workflow
        </h3>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700">
          {["Customer Payment", "Transaction Details", "Founder Verification", "Approved / Rejected"].map(
            (step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-gray-100 px-3 py-2">
                  {step}
                </span>
                {index !== 3 && (
                  <span className="text-gray-400">→</span>
                )}
              </div>
            )
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Yeh future workflow hai. Abhi koi real payment verify ya transfer nahi hogi.
        </p>
      </div>
    </div>
  );
}
