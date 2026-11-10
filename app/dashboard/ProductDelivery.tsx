
"use client";

export default function ProductDelivery() {
  const features = [
    {
      title: "Pending Deliveries",
      description: "Payment approve hone ke baad delivery ke liye pending orders.",
    },
    {
      title: "Delivery Assignment",
      description: "Orders ko delivery staff ya responsible person assign karna.",
    },
    {
      title: "Customer Details",
      description: "Customer ka naam, contact number aur delivery address.",
    },
    {
      title: "Dispatch Management",
      description: "Product dispatch hone ki date aur details.",
    },
    {
      title: "Delivery Status",
      description: "Pending, dispatched, delivered aur failed delivery status.",
    },
    {
      title: "Delivery History",
      description: "Tamam completed aur pending deliveries ka record.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Product Delivery Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Future product dispatch aur delivery management.
          </p>
        </div>

        <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
          Currently Inactive
        </span>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <h3 className="text-lg font-bold text-orange-900">
          Delivery System Disabled
        </h3>

        <p className="mt-2 text-sm leading-6 text-orange-800">
          Product delivery ka system abhi inactive rahega. Jab Founder
          product sales activate karega, tab approved orders ki delivery
          management bhi activate ki jayegi.
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
          Delivery Workflow
        </h3>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700">
          {["Payment Approved", "Order Confirmed", "Dispatched", "Delivered"].map(
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
          Yeh future delivery workflow hai. Abhi koi actual delivery process nahi chalega.
        </p>
      </div>
    </div>
  );
}
