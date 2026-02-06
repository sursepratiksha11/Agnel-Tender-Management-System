import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  FileText,
  Calendar,
  Building,
  Tag,
  DollarSign,
  ArrowLeft
} from "lucide-react";

export default function StepReviewPublish({ data, onValidationChange, onPublish, onGoBack, isPublishing = false, published = false }) {
  const [validationChecks, setValidationChecks] = useState({});
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  // Validation logic
  useEffect(() => {
    const hasEligibilitySection = data?.sections?.some(s => 
      s.key?.toUpperCase().includes('ELIGIBILITY') || s.title?.toUpperCase().includes('ELIGIBILITY')
    );
    const hasEvaluationSection = data?.sections?.some(s => 
      s.key?.toUpperCase().includes('EVALUATION') || s.title?.toUpperCase().includes('EVALUATION')
    );
    const hasEligibilityContent = data?.sections?.find(s => 
      s.key?.toUpperCase().includes('ELIGIBILITY') || s.title?.toUpperCase().includes('ELIGIBILITY')
    )?.content?.trim();
    const hasEvaluationContent = data?.sections?.find(s => 
      s.key?.toUpperCase().includes('EVALUATION') || s.title?.toUpperCase().includes('EVALUATION')
    )?.content?.trim();

    const checks = {
      hasTitle: {
        passed: Boolean(data?.basicInfo?.title?.trim()),
        label: "Tender title is present",
      },
      hasAuthorityName: {
        passed: Boolean(data?.basicInfo?.authorityName?.trim()),
        label: "Authority/Department name provided",
      },
      hasReferenceId: {
        passed: Boolean(data?.basicInfo?.referenceId?.trim()),
        label: "Reference ID is set",
      },
      hasTenderType: {
        passed: Boolean(data?.basicInfo?.tenderType),
        label: "Tender type selected",
      },
      hasEstimatedValue: {
        passed: Boolean(data?.basicInfo?.estimatedValue) && Number(data.basicInfo.estimatedValue) > 0,
        label: "Valid estimated value provided",
      },
      validDates: {
        passed: Boolean(data?.basicInfo?.submissionStartDate && data?.basicInfo?.submissionEndDate) && 
                 new Date(data.basicInfo.submissionEndDate) > new Date(data.basicInfo.submissionStartDate) &&
                 new Date(data.basicInfo.submissionEndDate) > new Date(),
        label: "Valid submission dates set",
      },
      hasDescription: {
        passed: Boolean(data?.basicInfo?.description?.trim()),
        label: "Description provided",
      },
      hasSections: {
        passed: Array.isArray(data?.sections) && data.sections.length > 0,
        label: "Tender sections created",
      },
      mandatoryCompleted: {
        passed: Array.isArray(data?.sections) && 
                data.sections
                  .filter(s => s.mandatory)
                  .every(s => s.content && s.content.trim().length >= 50),
        label: "All mandatory sections completed (min 50 chars)",
      },
      hasEligibility: {
        passed: hasEligibilitySection && hasEligibilityContent,
        label: "Eligibility Criteria section with content",
      },
      hasEvaluation: {
        passed: hasEvaluationSection && hasEvaluationContent,
        label: "Evaluation Criteria section with content",
      },
    };

    setValidationChecks(checks);

    // Check if all validations pass
    const allPassed = Object.values(checks).every(check => check.passed);
    if (onValidationChange) {
      onValidationChange(allPassed);
    }
  }, [data, onValidationChange]);

  const allValid = Object.values(validationChecks).every(check => check.passed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Review & Publish
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Review all tender details before publishing
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3) */}
        <div className="col-span-2 space-y-6">
          {/* Tender Document Preview */}
          <div className="bg-white border-2 border-neutral-300 rounded-lg overflow-hidden">
            {/* Document Header */}
            <div className="bg-neutral-900 text-white px-8 py-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-5 h-5" />
                    <span className="text-xs uppercase tracking-wide text-neutral-400">
                      Official Tender Document
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold mb-2">
                    {data?.basicInfo?.title || "Untitled Tender"}
                  </h1>
                  <p className="text-sm text-neutral-300">
                    {data?.basicInfo?.description || "No description provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="px-8 py-6 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-700 mb-4">
                Tender Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500">Authority/Department</p>
                    <p className="text-sm font-medium text-neutral-900 mt-0.5">
                      {data?.basicInfo?.authorityName || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500">Reference ID</p>
                    <p className="text-sm font-medium text-neutral-900 mt-0.5">
                      {data?.basicInfo?.referenceId || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500">Tender Type</p>
                    <p className="text-sm font-medium text-neutral-900 mt-0.5">
                      {data?.basicInfo?.tenderType || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="w-4 h-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500">Estimated Value</p>
                    <p className="text-sm font-medium text-neutral-900 mt-0.5">
                      {data?.basicInfo?.estimatedValue 
                        ? `₹ ${Number(data.basicInfo.estimatedValue).toLocaleString('en-IN')}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500">Submission Start</p>
                    <p className="text-sm font-medium text-neutral-900 mt-0.5">
                      {data?.basicInfo?.submissionStartDate 
                        ? new Date(data.basicInfo.submissionStartDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-xs text-neutral-500">Submission End</p>
                    <p className="text-sm font-medium text-neutral-900 mt-0.5">
                      {data?.basicInfo?.submissionEndDate 
                        ? new Date(data.basicInfo.submissionEndDate).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections Content */}
            <div className="px-8 py-6">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-700 mb-4">
                Tender Document Sections
              </h3>
              
              {data?.sections && data.sections.length > 0 ? (
                <div className="space-y-6">
                  {data.sections.map((section, index) => (
                    <div key={section.key || section.id} className="pb-6 border-b border-neutral-200 last:border-b-0 last:pb-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-neutral-500">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <h4 className="text-base font-semibold text-neutral-900">
                            {section.title}
                          </h4>
                          {section.mandatory && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                              <Lock className="w-3 h-3" />
                              Mandatory
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {section.content ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                            {section.content}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-red-50 border border-red-200 rounded px-3 py-2">
                          <p className="text-sm text-red-700">
                            ⚠️ No content provided for this section
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-neutral-50 rounded-lg border border-neutral-200">
                  <p className="text-sm text-neutral-500">No sections created</p>
                </div>
              )}
            </div>

            {/* Document Footer */}
            <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-200">
              <p className="text-xs text-neutral-500 text-center">
                This is a preview of how the tender document will appear to bidders
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="col-span-1 space-y-6">
          {/* Validation Checklist */}
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Readiness Checklist
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                All items must be completed before publishing
              </p>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {Object.entries(validationChecks).map(([key, check]) => (
                  <div key={key} className="flex items-start gap-2">
                    {check.passed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={`text-sm ${
                      check.passed ? "text-neutral-700" : "text-red-700 font-medium"
                    }`}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>

              {allValid ? (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-semibold">All checks passed</span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-2">
                    Tender is ready for publication
                  </p>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-neutral-200">
                  <div className="flex items-start gap-2 text-red-700">
                    <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium block">
                        {Object.values(validationChecks).filter(c => !c.passed).length} issue(s) remaining
                      </span>
                      <span className="text-xs text-red-600 mt-1 block">
                        Fix all issues before publishing
                      </span>
                    </div>
                  </div>
                  {onGoBack && (
                    <button
                      onClick={onGoBack}
                      className="mt-3 w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Go back to fix issues
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confirmation Checkbox */}
          {allValid && !published && (
            <div className="bg-white border border-neutral-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={confirmationChecked}
                  onChange={(e) => setConfirmationChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-green-600 border-neutral-300 rounded focus:ring-green-500"
                  disabled={published || isPublishing}
                />
                <span className="text-sm text-neutral-700 leading-relaxed">
                  I confirm that the above tender details are accurate, complete, and ready for publication. 
                  I understand that this tender cannot be edited once published.
                </span>
              </label>
            </div>
          )}

          {/* Publish Button */}
          {!published && (
            <button
              onClick={onPublish}
              disabled={!allValid || !confirmationChecked || isPublishing}
              className={`w-full px-4 py-3 text-sm font-semibold rounded-lg transition-all ${
                allValid && confirmationChecked && !isPublishing
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                  : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {isPublishing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Publishing Tender...
                </span>
              ) : (
                'Publish Tender'
              )}
            </button>
          )}

          {published && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-semibold">
                  Tender Published Successfully
                </span>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Redirecting to dashboard...
              </p>
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-red-50 border-2 border-red-300 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-red-100 border-b border-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-700" />
                <h3 className="text-sm font-bold text-red-900">
                  IMPORTANT WARNING
                </h3>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-red-900 font-medium leading-relaxed">
                Once published, this tender cannot be edited or deleted. The document will be locked and made available to bidders immediately.
              </p>
              <p className="text-xs text-red-800 mt-3">
                Ensure all information is accurate and complete before proceeding.
              </p>
            </div>
          </div>

          {!allValid && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 font-medium">
                Complete all validation checks before publishing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
