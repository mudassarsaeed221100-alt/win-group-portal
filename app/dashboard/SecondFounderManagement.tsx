
"use client";

export default function SecondFounderManagement() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          Second Founder Account Management
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Company ke Founder accounts aur unki access management.
        </p>

        <div className="mt-5 rounded-lg bg-gray-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                Founder Account 1
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Existing Founder / Owner
              </p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              PRIMARY ACCOUNT
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Current Founder account company ka complete control rakhta hai.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-dashed p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">
                Founder Account 2
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Second Founder / Owner
              </p>
            </div>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
              PENDING
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Doosra Founder account abhi create nahi kiya jayega. Zaroorat
            par Founder is account ko activate kar sakega.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">
          Founder Permissions
        </h3>

        <div className="mt-4 space-y-3">
          {[
            "Dono Founders ko equal full access",
            "Tamam Super Admin teams ka access",
            "Tamam Admin aur Staff records ka access",
            "Company-wide reports aur financial records",
            "User aur account management",
            "System settings aur security control",
            "Company ke tamam modules ka access",
          ].map((permission) => (
            <div
              key={permission}
              className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
            >
              <span className="font-bold text-green-600">✓</span>
              <span className="text-sm text-gray-700">{permission}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900">
          Future Account Controls
        </h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            "Second Founder account creation",
            "Account activation and deactivation",
            "Founder profile management",
            "Secure login credentials",
            "Account activity records",
            "Equal permission verification",
          ].map((item) => (
            <div
              key={item}
              className="rounded-lg border p-3 text-sm text-gray-700"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
        <h3 className="font-bold text-orange-900">
          Important Security Rule
        </h3>
        <p className="mt-2 text-sm text-orange-800">
          Second Founder account sirf authorized Founder ke decision par
          create hoga. Dono Founder accounts ko equal permissions milengi.
          Kisi bhi account ka password doosre account ke saath share nahi
          kiya jayega.
        </p>
      </div>
    </div>
  );
}
