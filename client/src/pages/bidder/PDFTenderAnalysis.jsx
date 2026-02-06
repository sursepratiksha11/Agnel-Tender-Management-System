import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  RefreshCw,
  Download,
  Copy,
  Star,
  Target,
  Clock,
  DollarSign,
  Shield,
  Zap,
  BarChart3,
  FileCheck,
  ArrowLeft,
  Sparkles,
  Loader2,
  Check,
  X,
  FileDown,
  Building2,
  Landmark,
  Minimize2,
  Users,
} from 'lucide-react';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import { pdfAnalysisService } from '../../services/bidder/pdfAnalysisService';

// Collaboration imports
import { CollaborationProvider, useCollaboration } from '../../context/CollaborationContext';
import CollaborativeProposalEditor from '../../components/proposal/CollaborativeProposalEditor';
import ValidationResultsPanel from '../../components/proposal/ValidationResultsPanel';

// Tab components
const TabButton = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
      active
        ? 'text-blue-600 border-blue-600 bg-blue-50'
        : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {Icon && <Icon className="w-4 h-4" />}
    {children}
  </button>
);

// Score badge with proper Tailwind color mapping
const ScoreBadge = ({ score, size = 'md' }) => {
  const sizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  };

  const colorClasses = score >= 80
    ? 'bg-green-100 text-green-700 border-green-300'
    : score >= 60
    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
    : score >= 40
    ? 'bg-orange-100 text-orange-700 border-orange-300'
    : 'bg-red-100 text-red-700 border-red-300';

  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold border-2 ${colorClasses}`}>
      {score}
    </div>
  );
};

// Color mapping for Tailwind (dynamic classes don't work with purge)
const iconColorMap = {
  blue: 'text-blue-500',
  red: 'text-red-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  purple: 'text-purple-500',
};

// Bullet list component with proper color mapping
const BulletList = ({ items, icon: Icon = CheckCircle, color = 'blue' }) => (
  <ul className="space-y-2">
    {items.map((item, idx) => (
      <li key={idx} className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-1 flex-shrink-0 ${iconColorMap[color] || 'text-blue-500'}`} />
        <span className="text-slate-700">{item}</span>
      </li>
    ))}
  </ul>
);

/**
 * Collaborative Proposal Tab Component
 * Displays section list with collaborative editing features
 */
function CollaborativeProposalTab({
  savedTenderId,
  analysis,
  proposalSections,
  setProposalSections,
  onEvaluate,
  evaluating,
  onSaveDraft,
  savingDraft,
  draftSaved,
}) {
  const {
    isOwner,
    assignments,
    loading: collaborationLoading,
  } = useCollaboration();

  const [activeSection, setActiveSection] = useState(null);
  const [sectionContents, setSectionContents] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState({});

  // Initialize sections from normalizedSections or proposalSections
  const sections = React.useMemo(() => {
    if (analysis?.normalizedSections?.length > 0) {
      return analysis.normalizedSections.map((section, idx) => ({
        ...section,
        section_id: section.key || `section-${idx}`,
        title: section.name || section.title || `Section ${idx + 1}`,
        content: section.aiSummary || '',
      }));
    }
    return proposalSections.map((section) => ({
      ...section,
      section_id: section.id || section.key,
      title: section.title,
    }));
  }, [analysis?.normalizedSections, proposalSections]);

  // Initialize content from sections - run once on mount and when proposalSections changes
  useEffect(() => {
    const contents = {};
    proposalSections.forEach((section) => {
      const sectionId = section.id || section.key;
      contents[sectionId] = section.content || '';
    });
    setSectionContents(contents);
  }, [proposalSections]);

  // Set first section as active on mount
  useEffect(() => {
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections.length]); // Only depend on length, not the array itself

  // Handle content change
  const handleContentChange = (newContent) => {
    if (!activeSection) return;
    const sectionId = activeSection.section_id || activeSection.id || activeSection.key;
    setSectionContents((prev) => ({
      ...prev,
      [sectionId]: newContent,
    }));

    // Also update proposalSections for evaluation
    setProposalSections((prev) =>
      prev.map((s) =>
        (s.id === sectionId || s.key === sectionId)
          ? { ...s, content: newContent, wordCount: newContent.split(/\s+/).filter((w) => w).length }
          : s
      )
    );
  };

  // Handle save
  const handleSave = async () => {
    if (!activeSection) return;
    const sectionId = activeSection.section_id || activeSection.id || activeSection.key;
    setSaving(true);

    try {
      // Call the parent's save function
      await onSaveDraft();
      setLastSaved((prev) => ({
        ...prev,
        [sectionId]: new Date(),
      }));
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Get section status
  const getSectionStatus = (section) => {
    const sectionId = section.section_id || section.id || section.key;
    const content = sectionContents[sectionId] || '';
    const wordCount = content.trim().split(/\s+/).filter((w) => w).length;

    if (wordCount >= 50) return 'complete';
    if (wordCount > 0) return 'partial';
    return 'empty';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-300" />;
    }
  };

  const activeSectionId = activeSection
    ? activeSection.section_id || activeSection.id || activeSection.key
    : null;

  if (collaborationLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Section List - Left Sidebar */}
      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Sections</h3>
              <span className="text-xs text-slate-500">
                {sections.filter((s) => getSectionStatus(s) === 'complete').length}/{sections.length}
              </span>
            </div>
          </div>

          {/* Section List */}
          <div className="max-h-[600px] overflow-y-auto">
            {sections.map((section) => {
              const sectionId = section.section_id || section.id || section.key;
              const isActive = activeSectionId === sectionId;
              const status = getSectionStatus(section);
              const assignees = assignments[sectionId] || [];

              return (
                <button
                  key={sectionId}
                  onClick={() => setActiveSection(section)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 ${
                    isActive
                      ? 'bg-blue-50 border-l-2 border-l-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="mt-0.5">{getStatusIcon(status)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isActive ? 'text-blue-900' : 'text-slate-900'}`}>
                      {section.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {section.category && (
                        <span className={`px-1.5 py-0.5 text-xs rounded ${
                          section.category === 'ELIGIBILITY' ? 'bg-green-100 text-green-700' :
                          section.category === 'TECHNICAL' || section.category === 'SCOPE' ? 'bg-purple-100 text-purple-700' :
                          section.category === 'COMMERCIAL' || section.category === 'FINANCIAL' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {section.category}
                        </span>
                      )}
                      {assignees.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users className="w-3 h-3" />
                          {assignees.length}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            onClick={onSaveDraft}
            disabled={savingDraft}
            className={`w-full px-4 py-2.5 font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
              draftSaved
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {savingDraft ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : draftSaved ? (
              <Check className="w-4 h-4" />
            ) : (
              <FileCheck className="w-4 h-4" />
            )}
            {draftSaved ? 'Saved!' : 'Save Draft'}
          </button>

          <button
            onClick={onEvaluate}
            disabled={evaluating}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          >
            {evaluating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            Evaluate Proposal
          </button>

          {isOwner && (
            <button
              onClick={() => setShowValidation(!showValidation)}
              className={`w-full px-4 py-2.5 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
                showValidation
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Shield className="w-4 h-4" />
              {showValidation ? 'Hide Validation' : 'Validate Proposal'}
            </button>
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 min-w-0">
        {activeSection ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <CollaborativeProposalEditor
              section={activeSection}
              content={sectionContents[activeSectionId] || ''}
              onContentChange={handleContentChange}
              onSave={handleSave}
              proposalId={savedTenderId}
              uploadedTenderId={savedTenderId}
              saving={saving}
              lastSaved={lastSaved[activeSectionId]}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Select a section to start editing</p>
            <p className="text-slate-500 text-sm mt-1">
              Choose a section from the list to begin drafting your proposal
            </p>
          </div>
        )}

        {/* Validation Panel */}
        {showValidation && isOwner && (
          <div className="mt-6">
            <ValidationResultsPanel
              onSectionClick={(sectionId) => {
                const section = sections.find(
                  (s) => (s.section_id || s.id || s.key) === sectionId
                );
                if (section) setActiveSection(section);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PDFTenderAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();

  // States
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [proposalSections, setProposalSections] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [editingSection, setEditingSection] = useState(null);
  const [regeneratingSection, setRegeneratingSection] = useState(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStage, setUploadStage] = useState('idle'); // idle, uploading, parsing, analyzing, complete

  // Saved to discovery state
  const [savedTenderId, setSavedTenderId] = useState(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('government');
  const [exporting, setExporting] = useState(false);

  // Proposal draft save state
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState(null);

  const [companyInfo, setCompanyInfo] = useState({
    name: '',
    registrationNumber: '',
    address: '',
    contactPerson: '',
    email: '',
    phone: '',
    gstNumber: '',
    panNumber: '',
  });

  // Handle file from navigation state or new upload
  useEffect(() => {
    if (location.state?.file) {
      handleFileAnalysis(location.state.file);
    }
  }, [location.state]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('File size must be less than 15MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleFileAnalysis = async (file) => {
    const fileToAnalyze = file || selectedFile;
    if (!fileToAnalyze) return;

    setLoading(true);
    setError(null);
    setUploadStage('uploading');
    setUploadProgress(0);

    try {
      // Simulate stages
      setUploadStage('uploading');

      const result = await pdfAnalysisService.analyzePDF(fileToAnalyze, (progress) => {
        setUploadProgress(progress);
        if (progress >= 100) {
          setUploadStage('parsing');
        }
      });

      setUploadStage('analyzing');

      if (result.success) {
        console.log('[PDFTenderAnalysis] Received analysis data:', result.data);
        console.log('[PDFTenderAnalysis] normalizedSections:', result.data.normalizedSections);
        console.log('[PDFTenderAnalysis] normalizedSections count:', result.data.normalizedSections?.length || 0);
        setAnalysis(result.data);
        setProposalSections(result.data.proposalDraft?.sections || []);
        setUploadStage('complete');
        setActiveTab('summary');

        // Track if saved to discovery
        if (result.data.savedToDiscovery && result.data.savedTenderId) {
          setSavedTenderId(result.data.savedTenderId);
          setShowSavedNotification(true);
          // Auto-hide notification after 5 seconds
          setTimeout(() => setShowSavedNotification(false), 5000);
        } else {
          // Auto-create uploaded tender so assignments don't depend on manual save
          try {
            // Build a minimal payload to stay well under body-size limits
            const minimalSections = (result.data?.proposalDraft?.sections || []).map(s => ({
              id: s.id,
              title: s.title,
              content: s.content,
              wordCount: s.wordCount,
            }));

            const createResp = await pdfAnalysisService.createUploadedTender({
              title: result.data?.parsed?.title || 'Uploaded Tender',
              description: result.data?.summary?.executiveSummary?.substring(0, 500) || '',
              originalFilename: null,
              fileSize: null,
              // Avoid sending full parsed/summary blobs to keep request small
              parsedData: {},
              analysisData: {
                proposalDraft: { sections: minimalSections },
              },
              metadata: result.data?.parsed?.metadata || {},
            });

            if (createResp?.success && createResp?.data?.id) {
              setSavedTenderId(createResp.data.id);
              setShowSavedNotification(true);
              setTimeout(() => setShowSavedNotification(false), 5000);
            }
          } catch (autoCreateErr) {
            console.error('[PDFTenderAnalysis] Auto-create uploaded tender failed:', autoCreateErr?.message || autoCreateErr);
          }
        }
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('PDF analysis error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to analyze PDF');
      setUploadStage('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!analysis || proposalSections.length === 0) return;

    setEvaluating(true);
    setError(null);

    try {
      // Generate sessionId from analysis timestamp
      const sessionId = analysis.analysisId || `session-${Date.now()}`;

      // Send ONLY minimal data - no large payloads
      const result = await pdfAnalysisService.evaluateProposal(
        sessionId,
        { sections: proposalSections },
        null // tenderId optional
      );

      if (result.success) {
        setEvaluation(result.data);
        setActiveTab('evaluation');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to evaluate proposal');
    } finally {
      setEvaluating(false);
    }
  };

  const handleSectionEdit = (sectionId, newContent) => {
    setProposalSections(prev =>
      prev.map(s =>
        s.id === sectionId
          ? { ...s, content: newContent, wordCount: newContent.split(/\s+/).filter(w => w).length }
          : s
      )
    );
    setEditingSection(null);
  };

  const handleRegenerateSection = async (section) => {
    setRegeneratingSection(section.id);

    try {
      const result = await pdfAnalysisService.regenerateSection({
        sectionId: section.id,
        sectionTitle: section.title,
        tenderContext: analysis?.parsed?.title || '',
        currentContent: section.content,
        instructions: 'Improve and make more detailed and professional',
      });

      if (result.success) {
        handleSectionEdit(section.id, result.data.content);
      }
    } catch (err) {
      console.error('Regenerate error:', err);
      setError('Failed to regenerate section');
    } finally {
      setRegeneratingSection(null);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleSaveProposalDraft = async () => {
    if (!savedTenderId || proposalSections.length === 0) {
      setError('No tender or proposal sections to save');
      return;
    }

    setSavingDraft(true);
    setError(null);

    try {
      const result = await pdfAnalysisService.saveProposalDraft({
        uploadedTenderId: savedTenderId,
        sections: proposalSections,
        title: analysis?.parsed?.title || 'Untitled Proposal',
      });

      if (result.success) {
        setDraftSaved(true);
        setSavedDraftId(result.data.id);
        // Show success briefly
        setTimeout(() => setDraftSaved(false), 3000);
      }
    } catch (err) {
      console.error('Save draft error:', err);
      setError(err.response?.data?.error || 'Failed to save proposal draft');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleExportPDF = async () => {
    if (!proposalSections || proposalSections.length === 0) {
      setError('No proposal sections to export');
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const tenderInfo = {
        title: analysis?.parsed?.title || 'Tender Proposal',
        referenceNumber: analysis?.parsed?.metadata?.referenceNumber || '',
        authority: analysis?.parsed?.metadata?.authority || '',
        organizationName: analysis?.parsed?.metadata?.organizationName || '',
        deadline: analysis?.parsed?.metadata?.deadline || '',
        estimatedValue: analysis?.parsed?.metadata?.estimatedValue || '',
        executiveSummary: analysis?.summary?.executiveSummary || '',
        keyHighlights: analysis?.summary?.actionItems || [],
      };

      const blob = await pdfAnalysisService.exportProposalPDF({
        proposalSections,
        tenderInfo,
        companyInfo: companyInfo.name ? companyInfo : null,
        template: selectedTemplate,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposal_${(tenderInfo.title || 'Tender').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const templates = [
    { id: 'government', name: 'Government Standard', icon: Landmark, description: 'Full formal structure with compliance declaration, affidavit & seal area' },
    { id: 'corporate', name: 'Corporate Professional', icon: Building2, description: 'Modern business style with value proposition & why choose us sections' },
    { id: 'minimal', name: 'Minimal Clean', icon: Minimize2, description: 'No cover page - straight to content, compact & efficient' },
  ];

  // Upload UI
  if (!analysis) {
    return (
      <BidderLayout>
        <div className="min-h-screen bg-slate-50 py-8">
          <div className="max-w-3xl mx-auto px-4">
            <button
              onClick={() => navigate('/bidder/tenders')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Discover
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              <div className="text-center mb-8">
              
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Analyze Tender PDF</h1>
                <p className="text-slate-600">
                  Upload a tender document to get AI-powered summary, proposal draft, and evaluation
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-700 font-medium mb-2">
                    {uploadStage === 'uploading' && 'Uploading PDF...'}
                    {uploadStage === 'parsing' && 'Extracting content...'}
                    {uploadStage === 'analyzing' && 'AI analyzing tender...'}
                  </p>
                  {uploadStage === 'uploading' && (
                    <div className="w-full max-w-xs mx-auto bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-slate-500 text-sm mt-2">This may take a minute...</p>
                </div>
              ) : (
                <div>
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('pdf-upload').click()}
                  >
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-700 font-medium mb-1">
                      {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-slate-500 text-sm">PDF files up to 15MB</p>
                  </div>

                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {selectedFile && (
                    <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-red-500" />
                        <div>
                          <p className="font-medium text-slate-900">{selectedFile.name}</p>
                          <p className="text-sm text-slate-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-2 hover:bg-slate-200 rounded-lg"
                      >
                        <X className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleFileAnalysis()}
                    disabled={!selectedFile}
                    className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-5 h-5" />
                    Analyze Tender
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </BidderLayout>
    );
  }

  // Main analysis view
  return (
    <BidderLayout>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-start justify-between">
              <div>
                <button
                  onClick={() => navigate('/bidder/tenders')}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Discover
                </button>
                <h1 className="text-xl font-bold text-slate-900 line-clamp-1">
                  {analysis.parsed?.title || 'Tender Analysis'}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {analysis.parsed?.stats?.totalWords?.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    ~{analysis.parsed?.stats?.estimatedReadTime} min read
                  </span>
                  {analysis.parsed?.metadata?.estimatedValue && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ₹{(analysis.parsed.metadata.estimatedValue / 100000).toFixed(1)}L
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-1">Opportunity Score</p>
                  <ScoreBadge score={analysis.summary?.opportunityScore || 70} size="sm" />
                </div>
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={proposalSections.length === 0}
                  className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 border-b border-slate-200 -mb-px">
              <TabButton
                active={activeTab === 'summary'}
                onClick={() => setActiveTab('summary')}
                icon={FileCheck}
              >
                Summary
              </TabButton>
              <TabButton
                active={activeTab === 'proposal'}
                onClick={() => setActiveTab('proposal')}
                icon={Edit3}
              >
                Proposal Draft
              </TabButton>
              <TabButton
                active={activeTab === 'evaluation'}
                onClick={() => setActiveTab('evaluation')}
                icon={BarChart3}
              >
                Evaluation
              </TabButton>
            </div>
          </div>
        </div>

        {/* Saved to Discovery Notification */}
        {showSavedNotification && savedTenderId && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-green-800 font-medium">Saved to Discovery</p>
                    <p className="text-green-700 text-sm">This tender is now available in your Discover Tenders page</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/bidder/tenders')}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    View in Discovery
                  </button>
                  <button
                    onClick={() => setShowSavedNotification(false)}
                    className="p-1.5 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-green-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}

          {/* Summary Tab */}
          {activeTab === 'summary' && analysis.summary && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  Executive Summary
                </h2>
                <p className="text-slate-700 leading-relaxed">
                  {analysis.summary.executiveSummary}
                </p>
              </div>

              {/* Key Points Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Critical Requirements */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-500" />
                    Critical Requirements
                  </h3>
                  <BulletList
                    items={analysis.summary.bulletPoints?.criticalRequirements || []}
                    icon={AlertCircle}
                    color="red"
                  />
                </div>

                {/* Eligibility */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-500" />
                    Eligibility Criteria
                  </h3>
                  <BulletList
                    items={analysis.summary.bulletPoints?.eligibilityCriteria || []}
                    icon={CheckCircle}
                    color="green"
                  />
                </div>

                {/* Technical */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-500" />
                    Technical Specifications
                  </h3>
                  <BulletList
                    items={analysis.summary.bulletPoints?.technicalSpecifications || []}
                    icon={CheckCircle}
                    color="purple"
                  />
                </div>

                {/* Financial */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                    Financial Terms
                  </h3>
                  <BulletList
                    items={analysis.summary.bulletPoints?.financialTerms || []}
                    icon={CheckCircle}
                    color="yellow"
                  />
                </div>

                {/* Deadlines */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Deadlines & Timelines
                  </h3>
                  <BulletList
                    items={analysis.summary.bulletPoints?.deadlinesAndTimelines || []}
                    icon={Clock}
                    color="orange"
                  />
                </div>

                {/* Risk Factors */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Risk Factors
                  </h3>
                  <BulletList
                    items={analysis.summary.bulletPoints?.riskFactors || []}
                    icon={AlertCircle}
                    color="red"
                  />
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-blue-600" />
                  Recommended Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(analysis.summary.actionItems || []).map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-blue-100">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Normalized Sections (AI-summarized, bidder-friendly) */}
              {analysis.normalizedSections && analysis.normalizedSections.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Document Sections</h3>
                  <div className="space-y-4">
                    {analysis.normalizedSections.map((section, idx) => (
                      <div
                        key={section.category || idx}
                        className="p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              section.category === 'ELIGIBILITY' ? 'bg-green-100 text-green-700' :
                              section.category === 'TECHNICAL' || section.category === 'SCOPE' ? 'bg-purple-100 text-purple-700' :
                              section.category === 'COMMERCIAL' || section.category === 'FINANCIAL' ? 'bg-yellow-100 text-yellow-700' :
                              section.category === 'EVALUATION' ? 'bg-blue-100 text-blue-700' :
                              section.category === 'TIMELINE' ? 'bg-orange-100 text-orange-700' :
                              section.category === 'PENALTIES' ? 'bg-red-100 text-red-700' :
                              section.category === 'LEGAL' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {section.category}
                            </span>
                            <span className="font-medium text-slate-900">{section.name}</span>
                          </div>
                          <span className="text-sm text-slate-500">{section.rawSectionCount} subsection{section.rawSectionCount !== 1 ? 's' : ''}</span>
                        </div>
                        {section.aiSummary && (
                          <p className="text-sm text-slate-600 mb-2">{section.aiSummary}</p>
                        )}
                        {section.keyPoints && section.keyPoints.length > 0 && (
                          <ul className="text-sm text-slate-700 space-y-1">
                            {section.keyPoints.slice(0, 3).map((point, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="w-3 h-3 mt-1 text-green-500 flex-shrink-0" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {section.importantNumbers && section.importantNumbers.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {section.importantNumbers.slice(0, 3).map((num, i) => (
                              <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                {typeof num === 'object' ? `${num.label}: ${num.value}` : num}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Proposal Draft Tab - Collaborative Editor */}
          {activeTab === 'proposal' && proposalSections.length > 0 && (
            <CollaborationProvider
              uploadedTenderId={savedTenderId}
              tenderType="uploaded"
            >
              <CollaborativeProposalTab
                savedTenderId={savedTenderId}
                analysis={analysis}
                proposalSections={proposalSections}
                setProposalSections={setProposalSections}
                onEvaluate={handleEvaluate}
                evaluating={evaluating}
                onSaveDraft={handleSaveProposalDraft}
                savingDraft={savingDraft}
                draftSaved={draftSaved}
              />
            </CollaborationProvider>
          )}

          {/* Proposal Draft Tab - No sections yet */}
          {activeTab === 'proposal' && proposalSections.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Proposal Sections Generated</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                The AI analysis didn't generate proposal sections. This may happen if the tender document
                couldn't be fully processed. Try re-uploading the PDF or check the Summary tab for available information.
              </p>
            </div>
          )}

          {/* Evaluation Tab */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              {!evaluation ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Evaluation Yet</h3>
                  <p className="text-slate-600 mb-6">
                    Edit your proposal draft, then run an evaluation to see how it scores against the tender requirements.
                  </p>
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center gap-2 mx-auto"
                  >
                    {evaluating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <BarChart3 className="w-5 h-5" />
                    )}
                    Evaluate My Proposal
                  </button>
                </div>
              ) : (
                <>
                  {/* Overall Score */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-6">
                      <ScoreBadge score={evaluation.overallScore} size="lg" />
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">Overall Assessment</h2>
                        <p className="text-slate-700">{evaluation.overallAssessment}</p>
                        <div className="mt-3 flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            evaluation.winProbability === 'High' ? 'bg-green-100 text-green-700' :
                            evaluation.winProbability === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            Win Probability: {evaluation.winProbability}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {Object.entries(evaluation.scores || {}).map(([key, value]) => (
                      <div key={key} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                        <ScoreBadge score={value.score} size="sm" />
                        <h4 className="font-medium text-slate-900 mt-2 capitalize">{key}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{value.feedback}</p>
                      </div>
                    ))}
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Strengths
                      </h3>
                      <BulletList items={evaluation.strengths || []} icon={Check} color="green" />
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Areas for Improvement
                      </h3>
                      <BulletList items={evaluation.weaknesses || []} icon={X} color="red" />
                    </div>
                  </div>

                  {/* Improvements */}
                  {evaluation.improvements && evaluation.improvements.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h3 className="font-semibold text-slate-900 mb-4">Specific Improvements</h3>
                      <div className="space-y-3">
                        {evaluation.improvements.map((imp, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="font-medium text-blue-900">{imp.section}</p>
                            <p className="text-blue-700 text-sm mt-1">{imp.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Actions */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-green-600" />
                      Recommended Next Steps
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(evaluation.recommendedActions || []).map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-green-100">
                          <span className="w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-700">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Re-evaluate button */}
                  <div className="text-center">
                    <button
                      onClick={handleEvaluate}
                      disabled={evaluating}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg inline-flex items-center gap-2"
                    >
                      {evaluating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5" />
                      )}
                      Re-evaluate After Edits
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Export Proposal PDF</h2>
                  <p className="text-slate-600 text-sm mt-1">Generate a professional tender proposal document</p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Select Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template.id)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          selectedTemplate === template.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${selectedTemplate === template.id ? 'text-green-600' : 'text-slate-500'}`} />
                        <h4 className="font-semibold text-slate-900 text-sm">{template.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Company Information (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-slate-900">Company Information (Optional)</label>
                  <span className="text-xs text-slate-500">Fill in to personalize the proposal</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Company Name"
                    value={companyInfo.name}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Registration Number"
                    value={companyInfo.registrationNumber}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, registrationNumber: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Contact Person"
                    value={companyInfo.contactPerson}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, contactPerson: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={companyInfo.email}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Phone"
                    value={companyInfo.phone}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="GST Number"
                    value={companyInfo.gstNumber}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, gstNumber: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="PAN Number"
                    value={companyInfo.panNumber}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, panNumber: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <textarea
                    placeholder="Company Address"
                    value={companyInfo.address}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Export Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Sections:</span>
                    <span className="ml-2 font-medium text-slate-900">{proposalSections.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Template:</span>
                    <span className="ml-2 font-medium text-slate-900">{templates.find(t => t.id === selectedTemplate)?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Words:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {proposalSections.reduce((acc, s) => acc + (s.wordCount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Format:</span>
                    <span className="ml-2 font-medium text-slate-900">PDF (A4)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                {exporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </BidderLayout>
  );
}
