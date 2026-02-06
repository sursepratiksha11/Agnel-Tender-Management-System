import { useState, useEffect } from "react";

const TENDER_TYPES = [
  "Open Tender",
  "Limited Tender",
  "Single Source",
  "Two-Stage Tender",
  "Framework Agreement",
  "Request for Proposal (RFP)",
  "Request for Quotation (RFQ)",
];

const SECTORS = [
  "Construction & Infrastructure",
  "IT & Software Development",
  "Consulting Services",
  "Supply & Procurement",
  "Healthcare & Medical",
  "Education & Training",
  "Security Services",
  "Maintenance & Facilities",
  "Transportation",
  "Utilities",
  "Other",
];

const generateReferenceId = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TND-${year}${month}-${random}`;
};

export default function StepBasicInfo({ data, onUpdate, onValidationChange }) {
  const [formData, setFormData] = useState({
    title: data?.title || "",
    authorityName: data?.authorityName || "",
    referenceId: data?.referenceId || generateReferenceId(),
    tenderType: data?.tenderType || "",
    sector: data?.sector || "",
    estimatedValue: data?.estimatedValue || "",
    submissionStartDate: data?.submissionStartDate || "",
    submissionEndDate: data?.submissionEndDate || "",
    description: data?.description || "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation logic
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Tender title is required";
    } else if (formData.title.length < 10) {
      newErrors.title = "Title must be at least 10 characters";
    }

    if (!formData.authorityName.trim()) {
      newErrors.authorityName = "Authority/Department name is required";
    }

    if (!formData.referenceId.trim()) {
      newErrors.referenceId = "Reference ID is required";
    }

    if (!formData.tenderType) {
      newErrors.tenderType = "Tender type is required";
    }

    if (!formData.sector) {
      newErrors.sector = "Sector is required";
    }

    if (!formData.estimatedValue) {
      newErrors.estimatedValue = "Estimated value is required";
    } else if (isNaN(Number(formData.estimatedValue)) || Number(formData.estimatedValue) <= 0) {
      newErrors.estimatedValue = "Please enter a valid positive number";
    }

    if (!formData.submissionStartDate) {
      newErrors.submissionStartDate = "Submission start date is required";
    }

    if (!formData.submissionEndDate) {
      newErrors.submissionEndDate = "Submission end date is required";
    } else if (formData.submissionStartDate && formData.submissionEndDate) {
      const startDate = new Date(formData.submissionStartDate);
      const endDate = new Date(formData.submissionEndDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (endDate < today) {
        newErrors.submissionEndDate = "End date cannot be in the past";
      }
      
      if (endDate <= startDate) {
        newErrors.submissionEndDate = "End date must be after start date";
      }
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    setErrors(newErrors);
    
    // Notify parent of validation state
    const isValid = Object.keys(newErrors).length === 0;
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    
    return isValid;
  };

  // Run validation whenever form data changes
  useEffect(() => {
    validateForm();
    onUpdate(formData);
  }, [formData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
  };

  const showError = (field) => touched[field] && errors[field];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Basic Information
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Enter the fundamental details about your tender
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-neutral-200 rounded-lg">
        <div className="p-6 space-y-6">
          {/* Tender Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Tender Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              onBlur={() => handleBlur("title")}
              placeholder="e.g., Supply of Medical Equipment for District Hospital"
              className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                showError("title")
                  ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                  : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
              }`}
            />
            {showError("title") && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.title}
              </p>
            )}
          </div>

          {/* Authority Name & Reference ID - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Authority/Department Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Authority / Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.authorityName}
                onChange={(e) => handleChange("authorityName", e.target.value)}
                onBlur={() => handleBlur("authorityName")}
                placeholder="e.g., Public Works Department"
                className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  showError("authorityName")
                    ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                    : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                }`}
              />
              {showError("authorityName") && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.authorityName}
                </p>
              )}
            </div>

            {/* Tender Reference ID */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Tender Reference ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.referenceId}
                onChange={(e) => handleChange("referenceId", e.target.value)}
                onBlur={() => handleBlur("referenceId")}
                placeholder="Auto-generated (editable)"
                className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                  showError("referenceId")
                    ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                    : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                }`}
              />
              {showError("referenceId") ? (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.referenceId}
                </p>
              ) : (
                <p className="text-xs text-neutral-500 mt-1.5">
                  Auto-generated, editable until publish
                </p>
              )}
            </div>
          </div>

          {/* Tender Type & Sector - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tender Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Tender Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.tenderType}
                onChange={(e) => handleChange("tenderType", e.target.value)}
                onBlur={() => handleBlur("tenderType")}
                className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
                  showError("tenderType")
                    ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                    : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                }`}
              >
                <option value="">Select tender type</option>
                {TENDER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {showError("tenderType") && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.tenderType}
                </p>
              )}
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Sector <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sector}
                onChange={(e) => handleChange("sector", e.target.value)}
                onBlur={() => handleBlur("sector")}
                className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
                  showError("sector")
                    ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                    : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                }`}
              >
                <option value="">Select sector</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {showError("sector") && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.sector}
                </p>
              )}
            </div>
          </div>

          {/* Estimated Value - Single Column */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Estimated Value (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.estimatedValue}
              onChange={(e) => handleChange("estimatedValue", e.target.value)}
              onBlur={() => handleBlur("estimatedValue")}
              placeholder="e.g., 5000000"
              className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors ${
                showError("estimatedValue")
                  ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                  : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
              }`}
            />
            {showError("estimatedValue") && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.estimatedValue}
              </p>
            )}
          </div>

          {/* Submission Start & End Date - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submission Start Date */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Submission Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.submissionStartDate}
                onChange={(e) => handleChange("submissionStartDate", e.target.value)}
                onBlur={() => handleBlur("submissionStartDate")}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
                  showError("submissionStartDate")
                    ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                    : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                }`}
              />
              {showError("submissionStartDate") && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.submissionStartDate}
                </p>
              )}
            </div>

            {/* Submission End Date */}
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Submission End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.submissionEndDate}
                onChange={(e) => handleChange("submissionEndDate", e.target.value)}
                onBlur={() => handleBlur("submissionEndDate")}
                min={formData.submissionStartDate || new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
                  showError("submissionEndDate")
                    ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                    : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                }`}
              />
              {showError("submissionEndDate") && (
                <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.submissionEndDate}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-2">
              Brief Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              placeholder="Brief overview of the tender scope and objectives"
              rows={3}
              className={`w-full px-4 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors resize-none ${
                showError("description")
                  ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                  : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
              }`}
            />
            {showError("description") ? (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.description}
              </p>
            ) : (
              <p className="text-xs text-neutral-500 mt-1.5">
                Provide a clear, concise summary
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
