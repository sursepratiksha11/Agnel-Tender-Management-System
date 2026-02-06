import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { tenderService } from "../../../services/tenderService";
import Stepper from "./components/Stepper";
import StepBasicInfo from "./components/StepBasicInfo";
import StepContentBuilder from "./components/StepContentBuilder";
import StepReviewPublish from "./components/StepReviewPublish";

const STEPS = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "Tender Content & Eligibility" },
  { id: 3, label: "Review & Publish" },
];

export default function TenderCreate() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { tenderId: editTenderId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [tenderDraft, setTenderDraft] = useState({
    basicInfo: {},
    sections: [],
    metadata: {},
  });
  const [tenderId, setTenderId] = useState(null);
  const [isStepValid, setIsStepValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(!!editTenderId);

  useEffect(() => {
    async function loadTender() {
      if (!editTenderId) return;
      try {
        const tender = await tenderService.getTender(editTenderId, token);
        if (tender.status !== 'DRAFT') {
          setError('Only draft tenders can be edited');
          setTimeout(() => navigate('/admin/dashboard'), 2000);
          return;
        }
        setTenderId(tender.tender_id);
        setTenderDraft({
          basicInfo: {
            title: tender.title || "",
            authorityName: tender.authority_name || "",
            referenceId: tender.reference_id || "",
            tenderType: tender.tender_type || "",
            estimatedValue: tender.estimated_value || "",
            submissionStartDate: tender.submission_start_date?.split('T')[0] || "",
            submissionEndDate: tender.submission_deadline?.split('T')[0] || "",
            description: tender.description || "",
          },
          sections: (tender.sections || []).map(s => ({
            key: s.section_key || `section_${s.section_id}`,
            section_id: s.section_id,
            title: s.title,
            description: s.description || "",
            content: s.content || "",
            mandatory: s.is_mandatory,
            order: s.order_index,
          })),
          metadata: {},
        });
      } catch (err) {
        setError(err.message || 'Failed to load tender');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadTender();
  }, [editTenderId, token, navigate]);

  const handleNext = async () => {
    if (currentStep < STEPS.length && isStepValid) {
      setError(null);
      setIsSaving(true);
      try {
        if (currentStep === 1) {
          const payload = {
            title: tenderDraft.basicInfo.title,
            description: tenderDraft.basicInfo.description,
            submission_deadline: tenderDraft.basicInfo.submissionEndDate,
            // Note: These additional fields may need backend schema updates
            authority_name: tenderDraft.basicInfo.authorityName,
            reference_id: tenderDraft.basicInfo.referenceId,
            tender_type: tenderDraft.basicInfo.tenderType,
            estimated_value: tenderDraft.basicInfo.estimatedValue,
            submission_start_date: tenderDraft.basicInfo.submissionStartDate,
          };

          if (tenderId) {
            // Edit mode: update existing tender
            await tenderService.updateTender(tenderId, payload, token);
          } else {
            // Create mode: create new tender draft
            const created = await tenderService.createTender(payload, token);
            setTenderId(created.tender_id);
          }
        } else if (currentStep === 2 && tenderId) {
          // Step 2: Save all sections with content
          for (const section of tenderDraft.sections) {
            if (!section.section_id) {
              // Create new section
              const created = await tenderService.addSection(
                tenderId,
                { 
                  title: section.title,
                  is_mandatory: section.mandatory,
                  content: section.content || "",
                  section_key: section.key,
                  description: section.description || "",
                },
                token
              );
              section.section_id = created.section_id;
            } else {
              // Update existing section
              await tenderService.updateSection(
                section.section_id,
                { 
                  title: section.title,
                  is_mandatory: section.mandatory,
                  content: section.content || "",
                  description: section.description || "",
                },
                token
              );
            }
          }
        }
        setCurrentStep(currentStep + 1);
        setIsStepValid(false);
      } catch (err) {
        setError(err.message || "Failed to save");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1 && !published) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    if (!tenderId) {
      setError("Tender ID not found. Please try again.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      // Ensure all sections are saved before publishing
      for (const section of tenderDraft.sections) {
        if (!section.section_id) {
          const created = await tenderService.addSection(
            tenderId,
            { 
              title: section.title,
              is_mandatory: section.mandatory,
              content: section.content || "",
              section_key: section.key,
              description: section.description || "",
            },
            token
          );
          section.section_id = created.section_id;
        }
      }

      // Single publish call - this is the ONLY publish path
      await tenderService.publishTender(tenderId, token);
      
      setPublished(true);
      
      // Wait a bit for database to sync, then redirect with refresh signal
      setTimeout(() => {
        // Use sessionStorage to signal dashboard to force refresh
        sessionStorage.setItem('tendersNeedRefresh', 'true');
        navigate('/admin/dashboard?refresh=true');
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to publish tender");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoBackToFix = () => {
    // Navigate back to Step 2 or Step 1 depending on which has issues
    setCurrentStep(2); // Default to content builder
  };

  const updateTenderDraft = (field, value) => {
    setTenderDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepBasicInfo
            data={tenderDraft.basicInfo}
            onUpdate={(data) => updateTenderDraft("basicInfo", data)}
            onValidationChange={setIsStepValid}
          />
        );
      case 2:
        return (
          <StepContentBuilder
            data={tenderDraft.sections}
            onUpdate={(data) => updateTenderDraft("sections", data)}
            onValidationChange={setIsStepValid}
            tenderMetadata={tenderDraft.basicInfo}
            token={token}
          />
        );
      case 3:
        return (
          <StepReviewPublish
            data={tenderDraft}
            onValidationChange={setIsStepValid}
            onPublish={handlePublish}
            onGoBack={handleGoBackToFix}
            isPublishing={isSaving}
            published={published}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white sticky top-0 z-10">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold text-neutral-900">
            {editTenderId ? 'Edit Tender' : 'Create New Tender'}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {loading ? 'Loading tender...' : 'Follow the steps to create and publish your tender'}
          </p>
        </div>

        {/* Stepper */}
        {!loading && (
          <div className="px-8 pb-6">
            <Stepper steps={STEPS} currentStep={currentStep} />
          </div>
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {published && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Tender published successfully!
            </div>
          )}
          {loading ? (
            <div className="text-sm text-neutral-600">Loading tender data...</div>
          ) : (
            renderStepContent()
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="border-t border-neutral-200 bg-white sticky bottom-0">
        <div className="max-w-5xl mx-auto px-8 py-4 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || published || isSaving}
            className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500">
              Step {currentStep} of {STEPS.length}
            </span>
            {currentStep < STEPS.length && (
              <button
                onClick={handleNext}
                disabled={!isStepValid || isSaving}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? "Saving..." : "Next"}
              </button>
            )}
            {currentStep === STEPS.length && (
              <span className="text-sm text-neutral-600 italic">
                Review and publish using the panel on the right →
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
