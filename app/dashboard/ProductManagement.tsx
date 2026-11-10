
"use client";

export default function ProductManagement() {
  const plannedFeatures = [
    {
      title: "Add New Products",
      description: "Founder naye products aur unki details add kar sakega.",
    },
    {
      title: "Product Categories",
      description: "Products ko different categories mein organize kiya jayega.",
    },
    {
      title: "Product Pricing",
      description: "Company price, selling price aur product details manage hongi.",
    },
    {
      title: "Product Availability",
      description: "Available, out of stock aur inactive products ka status.",
    },
    {
      title: "Product Images",
      description: "Har product ki images aur description manage hongi.",
    },
    {
      title: "Product Activation",
      description: "Founder jab chahe product selling system activate kar sakega.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Product Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Company ke tamam products ka future management system.
          </p>
        </div>

        <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
          Currently Inactive
        </span>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <h3 className="text-lg font-bold text-orange-900">
          Product System Abhi Activate Nahi Hai
        </h3>

        <p className="mt-2 text-sm leading-6 text-orange-800">
          WIN GROUP ki pehli priority team building aur member growth hai.
          Product selling ka system filhal band rahega. Founder ki permission
          ke baad hi products aur sales system activate kiya jayega.
        </p>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-gray-900">
          Planned Product Features
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {plannedFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
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
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-bold text-gray-900">
          Activation Authority
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Product Management aur selling system ko activate karne ka
          ikhtiyar sirf Founder / Owner ke paas hoga.
        </p>
      </div>
    </div>
  );
}
