import PageHeader from "../../../components/shared/PageHeader";

export default function Profile() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const name = user.name || "Authority User";
  const email = user.email || "user@example.com";
  const organization = user.organization || "Your Organization";
  const orgId = "ORG-001234";

  return (
    <div className="px-6 py-6 mx-auto max-w-5xl">
      <PageHeader
        title="Profile & Settings"
        description="Manage your identity and organization details."
      />

      {/* Summary */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">
          Profile Summary
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-neutral-500">Full Name</div>
            <div className="font-medium text-neutral-900">{name}</div>
          </div>
          <div>
            <div className="text-neutral-500">Role</div>
            <div className="font-medium text-neutral-900">Authority</div>
          </div>
          <div>
            <div className="text-neutral-500">Email</div>
            <div className="font-medium text-neutral-900">{email}</div>
          </div>
          <div>
            <div className="text-neutral-500">Organization</div>
            <div className="font-medium text-neutral-900">{organization}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button className="px-3 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50">
            Edit Profile
          </button>
          <button
            className="px-3 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700"
            onClick={() => {
              localStorage.removeItem("user");
              localStorage.removeItem("role");
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </div>
      </section>

      {/* Personal Information */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Full Name
            </label>
            <input
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              defaultValue={name}
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Email</label>
            <input
              className="w-full px-3 py-2 border border-neutral-200 bg-neutral-100 rounded-md"
              value={email}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">Role</label>
            <input
              className="w-full px-3 py-2 border border-neutral-200 bg-neutral-100 rounded-md"
              value="Authority"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Change Password
            </label>
            <input
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              type="password"
              placeholder="New password (mock)"
            />
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700">
            Save Changes
          </button>
        </div>
      </section>

      {/* Organization Information */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6 mb-8">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">
          Organization Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Organization Name
            </label>
            <input
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              defaultValue={organization}
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Organization Type
            </label>
            <input
              className="w-full px-3 py-2 border border-neutral-200 bg-neutral-100 rounded-md"
              value="Authority"
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Industry / Domain
            </label>
            <input
              className="w-full px-3 py-2 border border-neutral-300 rounded-md"
              placeholder="e.g., Public Works"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Organization ID
            </label>
            <input
              className="w-full px-3 py-2 border border-neutral-200 bg-neutral-100 rounded-md"
              value={orgId}
              readOnly
            />
          </div>
        </div>
        <div className="mt-4">
          <button className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700">
            Save Organization
          </button>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">
          Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <input
              id="notify"
              type="checkbox"
              className="w-4 h-4"
              defaultChecked
            />
            <label htmlFor="notify" className="text-sm text-neutral-700">
              Email notifications
            </label>
          </div>
          <div>
            <label className="block text-sm text-neutral-600 mb-1">
              Language
            </label>
            <select className="w-full px-3 py-2 border border-neutral-300 rounded-md">
              <option>English</option>
              <option>French</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
