import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";

// Specialty options for assisters
const ASSISTER_SPECIALTIES = [
  "Finance",
  "Civil Engineering",
  "Legal",
  "IT & Technology",
  "Healthcare",
  "Construction",
  "Procurement",
  "Quality Assurance",
  "Environmental",
  "Other",
];

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "",
    organizationName: "",
    organizationType: "",
    industry: "",
    specialty: "",
    customSpecialty: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-fill organization type based on role
    if (name === "role") {
      setFormData({
        ...formData,
        role: value,
        organizationType:
          value === "authority"
            ? "Government/Authority"
            : value === "bidder"
            ? "Business/Bidder"
            : "Assister/Consultant",
        specialty: "",
        customSpecialty: "",
      });
    }
    setError("");
  };

  const handleNext = () => {
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.role
    ) {
      setError("Please fill in all required fields");
      return;
    }

    // For assister, validate specialty selection
    if (formData.role === "assister" && !formData.specialty) {
      setError("Please select your specialty");
      return;
    }

    // If specialty is "Other", require custom specialty
    if (formData.role === "assister" && formData.specialty === "Other" && !formData.customSpecialty) {
      setError("Please enter your specialty");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // For assister, organization name is optional
    if (formData.role !== "assister" && !formData.organizationName) {
      setError("Organization name is required");
      setIsLoading(false);
      return;
    }

    try {
      // Determine final specialty value
      const finalSpecialty = formData.specialty === "Other"
        ? formData.customSpecialty
        : formData.specialty;

      const user = await signup({
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role.toUpperCase(),
        organizationName: formData.organizationName || undefined,
        specialty: formData.role === "assister" ? finalSpecialty : undefined,
      });

      // Redirect based on role
      if (user.role === "authority") {
        navigate("/admin/dashboard");
      } else if (user.role === "assister") {
        navigate("/assister/dashboard");
      } else {
        navigate("/bidder/dashboard");
      }
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-primary-600 mb-2">
                TenderFlow AI
              </h1>
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Create your account
              </h2>
              <p className="text-sm text-neutral-600">Step {step} of 2</p>
            </div>

            {step === 1 ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Full Name
                  </label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    I am a <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleChange({
                          target: { name: "role", value: "authority" },
                        })
                      }
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        formData.role === "authority"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-neutral-300 bg-white/50 text-neutral-700 hover:border-primary-300"
                      }`}
                    >
                      Authority
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange({
                          target: { name: "role", value: "bidder" },
                        })
                      }
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        formData.role === "bidder"
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-neutral-300 bg-white/50 text-neutral-700 hover:border-primary-300"
                      }`}
                    >
                      Bidder
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleChange({
                          target: { name: "role", value: "assister" },
                        })
                      }
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                        formData.role === "assister"
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-neutral-300 bg-white/50 text-neutral-700 hover:border-purple-300"
                      }`}
                    >
                      Assister
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    This cannot be changed later
                  </p>
                </div>

                {/* Specialty selection for Assister */}
                {formData.role === "assister" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-neutral-700">
                      Your Specialty <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select your specialty</option>
                      {ASSISTER_SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>

                    {/* Custom specialty input if "Other" selected */}
                    {formData.specialty === "Other" && (
                      <input
                        name="customSpecialty"
                        type="text"
                        value={formData.customSpecialty}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter your specialty"
                      />
                    )}

                    <p className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                      As an assister, you'll be assigned to proposal sections by bidders with either edit or comment-only permissions.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full px-6 py-3 rounded-lg bg-primary-600 text-white text-base font-semibold shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all"
                >
                  Next
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    {formData.role === "assister" ? "Organization Name (Optional)" : "Organization Name"}
                  </label>
                  <input
                    name="organizationName"
                    type="text"
                    required={formData.role !== "assister"}
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder={formData.role === "assister" ? "Your company (optional)" : "Your organization"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Account Type
                  </label>
                  <input
                    name="organizationType"
                    type="text"
                    value={formData.organizationType}
                    readOnly
                    className="w-full px-4 py-3 bg-neutral-100/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-600 cursor-not-allowed"
                  />
                </div>

                {formData.role !== "assister" && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Industry / Domain
                    </label>
                    <input
                      name="industry"
                      type="text"
                      value={formData.industry}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      placeholder="e.g., Construction, IT, Healthcare"
                    />
                  </div>
                )}

                {formData.role === "assister" && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800 font-medium mb-1">
                      Specialty: {formData.specialty === "Other" ? formData.customSpecialty : formData.specialty}
                    </p>
                    <p className="text-xs text-purple-600">
                      Bidders will be able to find and assign you to review proposal sections based on your specialty.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 rounded-lg border border-neutral-300 bg-white/50 text-neutral-700 text-base font-semibold hover:bg-neutral-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-6 py-3 rounded-lg bg-primary-600 text-white text-base font-semibold shadow-lg hover:bg-primary-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
              >
                Login
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-sm text-neutral-600 hover:text-primary-600 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
