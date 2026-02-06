import { useState, useEffect } from "react";
import { Lock, FileText, AlertCircle } from "lucide-react";
import AIAssistant from "../../../../components/admin/AIAssistant";

// Pre-defined mandatory sections with semantic clarity
const MANDATORY_SECTIONS = [
  {
    key: "scope_of_work",
    title: "Scope of Work",
    description: "Define the complete scope, deliverables, and work requirements",
    mandatory: true,
    placeholder: "Describe the work to be done, deliverables, timelines, quality standards, and performance expectations...",
  },
  {
    key: "eligibility_criteria",
    title: "Eligibility Criteria",
    description: "Specify who can participate in this tender",
    mandatory: true,
    placeholder: "List registration requirements, financial capacity, technical qualifications, experience criteria...",
  },
  {
    key: "technical_requirements",
    title: "Technical Requirements",
    description: "Technical specifications and standards to be met",
    mandatory: true,
    placeholder: "Detail technical specifications, standards, certifications, testing requirements...",
  },
  {
    key: "financial_conditions",
    title: "Financial Conditions",
    description: "Payment terms, EMD, security deposits, and pricing structure",
    mandatory: true,
    placeholder: "Specify EMD amount, security deposit, payment terms, price format, tax requirements...",
  },
  {
    key: "evaluation_criteria",
    title: "Evaluation Criteria",
    description: "How proposals will be evaluated and scored",
    mandatory: true,
    placeholder: "Define evaluation methodology, scoring criteria, weightages, qualification thresholds...",
  },
  {
    key: "terms_and_conditions",
    title: "Terms & Conditions",
    description: "Legal terms, compliance requirements, and contractual obligations",
    mandatory: true,
    placeholder: "List legal terms, compliance requirements, penalties, termination clauses, dispute resolution...",
  },
];

const OPTIONAL_SECTION = {
  key: "additional_clauses",
  title: "Additional Clauses",
  description: "Any other important information or special conditions",
  mandatory: false,
  placeholder: "Add any additional information, special conditions, or clarifications...",
};

export default function StepContentBuilder({ data, onUpdate, onValidationChange, tenderMetadata, token }) {
  
  const [sections, setSections] = useState(() => {
    // Initialize sections from data or create default structure
    if (data && Array.isArray(data) && data.length > 0) {
      return data;
    }
    
    // Create initial sections structure
    return [
      ...MANDATORY_SECTIONS.map((s, idx) => ({
        ...s,
        content: "",
        order: idx + 1,
      })),
      {
        ...OPTIONAL_SECTION,
        content: "",
        order: MANDATORY_SECTIONS.length + 1,
      }
    ];
  });

  const [selectedSectionKey, setSelectedSectionKey] = useState(MANDATORY_SECTIONS[0].key);
  const [errors, setErrors] = useState({});

  // Validate sections
  useEffect(() => {
    const newErrors = {};
    
    sections.forEach(section => {
      if (section.mandatory && (!section.content || section.content.trim().length === 0)) {
        newErrors[section.key] = `${section.title} is mandatory and must have content`;
      } else if (section.mandatory && section.content.trim().length < 50) {
        newErrors[section.key] = `${section.title} must have at least 50 characters`;
      }
    });
    
    setErrors(newErrors);
    
    const isValid = Object.keys(newErrors).length === 0;
    if (onValidationChange) {
      onValidationChange(isValid);
    }
    
    onUpdate(sections);
  }, [sections]);

  const handleContentChange = (key, newContent) => {
    setSections(prev => prev.map(s => 
      s.key === key ? { ...s, content: newContent } : s
    ));
  };

  const handleApplyAISuggestion = (suggestion) => {
    if (suggestion.sectionKey) {
      // Apply to specific section
      setSections(prev => prev.map(s => {
        if (s.key === suggestion.sectionKey) {
          const newContent = s.content + "\n\n" + suggestion.suggestion;
          return { ...s, content: newContent.trim() };
        }
        return s;
      }));
    }
  };

  const selectedSection = sections.find(s => s.key === selectedSectionKey);
  const mandatorySectionsCompleted = sections
    .filter(s => s.mandatory)
    .filter(s => s.content && s.content.trim().length >= 50).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Tender Content & Eligibility
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Complete all mandatory sections to define your tender requirements
        </p>
      </div>

      {/* Progress Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Content Completion Progress
            </p>
            <div className="mt-2 flex items-center gap-4 text-xs text-blue-800">
              <span>Mandatory sections: {mandatorySectionsCompleted} / {MANDATORY_SECTIONS.length}</span>
              <span>•</span>
              <span>
                {mandatorySectionsCompleted === MANDATORY_SECTIONS.length 
                  ? "✓ All mandatory sections completed" 
                  : `${MANDATORY_SECTIONS.length - mandatorySectionsCompleted} remaining`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Section Navigation */}
        <div className="col-span-3">
          <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden sticky top-6">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">Tender Sections</h3>
            </div>
            
            <div className="divide-y divide-neutral-200">
              {sections.map((section, idx) => {
                const isSelected = section.key === selectedSectionKey;
                const hasError = errors[section.key];
                const isCompleted = section.content && section.content.trim().length >= 50;
                
                return (
                  <button
                    key={section.key}
                    onClick={() => setSelectedSectionKey(section.key)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected 
                        ? "bg-blue-50 border-l-4 border-blue-600" 
                        : "hover:bg-neutral-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono text-neutral-500 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm font-medium truncate ${
                            isSelected ? "text-blue-900" : "text-neutral-900"
                          }`}>
                            {section.title}
                          </h4>
                          {section.mandatory && (
                            <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {section.description}
                        </p>
                        
                        {/* Status indicator */}
                        <div className="mt-2">
                          {hasError ? (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                              Incomplete
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                              Not started
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Panel - Section Editor */}
        <div className="col-span-5">
          {selectedSection && (
            <div className="bg-white border border-neutral-200 rounded-lg">
              {/* Section Header */}
              <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-5 h-5 text-neutral-600" />
                      <h3 className="text-base font-semibold text-neutral-900">
                        {selectedSection.title}
                      </h3>
                      {selectedSection.mandatory && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                          <Lock className="w-3 h-3" />
                          Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-600">
                      {selectedSection.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content Editor */}
              <div className="p-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Section Content {selectedSection.mandatory && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={selectedSection.content}
                    onChange={(e) => handleContentChange(selectedSection.key, e.target.value)}
                    placeholder={selectedSection.placeholder}
                    rows={16}
                    className={`w-full px-4 py-3 border rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors resize-none font-mono text-sm leading-relaxed ${
                      errors[selectedSection.key]
                        ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                        : "border-neutral-300 focus:ring-blue-100 focus:border-blue-500"
                    }`}
                  />
                  
                  {/* Character count and error */}
                  <div className="flex items-center justify-between mt-2">
                    {errors[selectedSection.key] ? (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors[selectedSection.key]}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        {selectedSection.mandatory ? "Minimum 50 characters required" : "Optional section"}
                      </p>
                    )}
                    <p className={`text-xs ${
                      selectedSection.mandatory && selectedSection.content.length < 50 
                        ? "text-red-600 font-medium" 
                        : "text-neutral-500"
                    }`}>
                      {selectedSection.content.length} characters
                    </p>
                  </div>
                </div>

                {/* Helper text */}
                {selectedSection.mandatory && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      <strong>Note:</strong> This is a mandatory section and must contain detailed information 
                      before you can proceed to publish. Ensure all relevant details are included.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - AI Assistant */}
        <div className="col-span-4">
          <div className="sticky top-6">
            <AIAssistant
              currentSectionKey={selectedSectionKey}
              currentSectionTitle={selectedSection?.title}
              currentContent={selectedSection?.content}
              tenderMetadata={tenderMetadata}
              allSections={sections}
              onApplySuggestion={handleApplyAISuggestion}
              token={token}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
