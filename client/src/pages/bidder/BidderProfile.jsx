import BidderLayout from "../../components/bidder-layout/BidderLayout";
import useAuth from "../../hooks/useAuth";

export default function BidderProfile() {
  const { user, logout } = useAuth();
  const name = user?.name || "Bidder User";
  const email = user?.email || "user@example.com";
  const company = user?.company || "Your Company";

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <BidderLayout>
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Profile & Settings</h1>
          <p className="text-neutral-600 mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Summary */}
        <section className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
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
              <div className="font-medium text-neutral-900">Bidder</div>
            </div>
            <div>
              <div className="text-neutral-500">Email</div>
              <div className="font-medium text-neutral-900">{email}</div>
            </div>
            <div>
              <div className="text-neutral-500">Company</div>
              <div className="font-medium text-neutral-900">{company}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button className="px-3 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50">
              Edit Profile
            </button>
            <button
              className="px-3 py-2 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </section>

        {/* Personal Information */}
        <section className="bg-white border border-neutral-200 rounded-lg p-6 mb-6">
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
              <label className="block text-sm text-neutral-600 mb-1">Company</label>
              <input
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                defaultValue={company}
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-600 mb-1">
                Change Password
              </label>
              <input
                className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                type="password"
                placeholder="New password"
              />
            </div>
          </div>
          <div className="mt-4">
            <button className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700">
              Save Changes
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
                Email notifications for new tenders
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
    </BidderLayout>
  );
}
