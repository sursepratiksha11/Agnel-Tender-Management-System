import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import ProposalHeader from '../../components/proposal/ProposalHeader';
import SectionList from '../../components/proposal/SectionList';
import ProposalEditor from '../../components/proposal/ProposalEditor';
import ProposalAIAdvisor from '../../components/proposal/ProposalAIAdvisor';
import Loading from '../../components/bidder-common/Loading';
import AssignAssisterModal from '../../components/bidder/AssignAssisterModal';

// New Components
import { ProposalThemeProvider } from '../../context/ProposalThemeContext';
import ExportButtons from '../../components/proposal/ExportButtons';
import ExportModal from '../../components/proposal/ExportModal';
// PublishWorkflow available for future use
// import PublishWorkflow from '../../components/proposal/PublishWorkflow';
import PublishConfirmModal from '../../components/proposal/PublishConfirmModal';
import VersionHistory from '../../components/proposal/VersionHistory';
import ThemeToggle from '../../components/proposal/ThemeToggle';
import ShortcutsHelpModal from '../../components/proposal/ShortcutsHelpModal';
import OfflineIndicator, { OfflineBanner } from '../../components/proposal/OfflineIndicator';
import A11yAnnouncer from '../../components/proposal/A11yAnnouncer';

// Hooks
import useProposalShortcuts from '../../hooks/useProposalShortcuts';
import useOfflineProposal from '../../hooks/useOfflineProposal';
import useA11yAnnounce from '../../hooks/useA11yAnnounce';

// Services
import { tenderService } from '../../services/bidder/tenderService';
import { proposalService } from '../../services/bidder/proposalService';
import proposalExportService from '../../services/bidder/proposalExportService';

// Icons

import { ArrowLeft, Menu, Maximize2, Minimize2, Keyboard, Shield, Clock,FileText } from 'lucide-react';

// Insight Components
import { RiskScoreCard, AuditTrail } from '../../components/insights';

// Styles
import '../../styles/proposal-theme.css';

export default function ProposalWorkspace() {
  const { tenderId } = useParams();
  const navigate = useNavigate();
  const announcerRef = useRef(null);

  // State Management
  const [tender, setTender] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing State
  const [sectionContents, setSectionContents] = useState({});
  const [savingStatus, setSavingStatus] = useState({});
  const [lastSaved, setLastSaved] = useState({});
  const autoSaveTimers = useRef({});

  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAIAdvisor, setShowAIAdvisor] = useState(true);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Feature States
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showAssignAssisterModal, setShowAssignAssisterModal] = useState(false);
  const [selectedSectionForAssignment, setSelectedSectionForAssignment] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false); // Risk & Audit panel

  const proposalId = proposal?._id || proposal?.proposal_id;

  // Accessibility announcements
  const { announce, announceSaved } = useA11yAnnounce();

  // Offline support
  const {
    isOnline,
    isSyncing,
    pendingChanges,
    lastSynced,
    saveOffline,
    forceSync
  } = useOfflineProposal({
    proposalId: proposal?._id || proposal?.proposal_id,
    onSync: async (data) => {
      // Sync to server when online
      if (data.sectionId && data.content) {
        await proposalService.updateProposalSection(
          data.proposalId,
          data.sectionId,
          data.content
        );
      }
    }
  });

  // Keyboard shortcuts
  const { shortcuts } = useProposalShortcuts({
    onExport: () => setShowExportModal(true),
    onPublish: () => {
      if (completionPercent === 100) {
        setShowPublishModal(true);
      }
    },
    onSave: () => {
      if (activeSection) {
        const sectionId = activeSection._id || activeSection.id || activeSection.section_id;
        const content = sectionContents[sectionId] || '';
        saveSection(sectionId, content);
      }
    },
    onToggleFullscreen: () => setFullscreenMode(prev => !prev),
    onShowHelp: () => setShowShortcutsHelp(true),
    onEscape: () => {
      if (showExportModal) setShowExportModal(false);
      else if (showPublishModal) setShowPublishModal(false);
      else if (showShortcutsHelp) setShowShortcutsHelp(false);
    },
    enabled: !loading
  });

  // Fetch tender and proposal on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const tenderRes = await tenderService.getTenderFullDetails(tenderId);
        const tenderData = tenderRes.data?.data?.tender || tenderRes.data?.tender;
        setTender(tenderData);

        let proposalData = null;
        try {
          const proposalRes = await proposalService.getProposalByTenderId(tenderId);
          proposalData = proposalRes.data?.data?.proposal || proposalRes.data?.proposal;
        } catch (err) {
          if (err.response?.status === 404) {
            try {
              const newProposalRes = await proposalService.createProposal(tenderId);
              proposalData = newProposalRes.data?.data?.proposal || newProposalRes.data?.proposal;
            } catch (createErr) {
              if (createErr.response?.status === 400 && createErr.response?.data?.error?.includes('already exists')) {
                const retryRes = await proposalService.getProposalByTenderId(tenderId);
                proposalData = retryRes.data?.data?.proposal || retryRes.data?.proposal;
              } else {
                throw createErr;
              }
            }
          } else {
            throw err;
          }
        }

        setProposal(proposalData);

        const tenderSections = tenderRes.data?.data?.sections || tenderRes.data?.sections || [];
        setSections(tenderSections);

        if (proposalData?.sections) {
          const contents = {};
          proposalData.sections.forEach(ps => {
            contents[ps.section_id || ps.sectionId] = ps.content || '';
          });
          setSectionContents(contents);
        }

        if (tenderSections.length > 0) {
          setActiveSection(tenderSections[0]);
        }

        announce('Proposal workspace loaded');
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.message || 'Failed to load proposal workspace');
      } finally {
        setLoading(false);
      }
    };

    if (tenderId) {
      fetchData();
    }
  }, [tenderId]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimers.current).forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Handle section selection
  const handleSelectSection = (section) => {
    setActiveSection(section);
    announce(`Selected section: ${section.title || section.name}`);
  };

  // Handle assign assister
  const handleOpenAssignAssisterModal = () => {
    if (activeSection) {
      setSelectedSectionForAssignment(activeSection);
      setShowAssignAssisterModal(true);
    }
  };

  const handleAssignAssisterSuccess = (data) => {
    announce(`Assister ${data.user.name} assigned with ${data.permission === 'EDIT' ? 'edit' : 'comment-only'} permission`);
    // Optionally refresh collaboration data or show confirmation
  };

  // Handle content change with auto-save debounce
  const handleContentChange = (value) => {
    if (!activeSection || proposal?.status !== 'DRAFT') return;

    const sectionId = activeSection._id || activeSection.id || activeSection.section_id;

    setSectionContents(prev => ({
      ...prev,
      [sectionId]: value
    }));

    if (autoSaveTimers.current[sectionId]) {
      clearTimeout(autoSaveTimers.current[sectionId]);
    }

    setSavingStatus(prev => ({
      ...prev,
      [sectionId]: 'saving'
    }));

    autoSaveTimers.current[sectionId] = setTimeout(async () => {
      await saveSection(sectionId, value);
    }, 2000);

    // Save to offline storage
    if (!isOnline) {
      saveOffline({
        tenderId,
        proposalId: proposal._id || proposal.proposal_id,
        sectionId,
        content: value
      });
    }
  };

  // Save section content
  const saveSection = async (sectionId, content) => {
    if (!proposal || proposal.status !== 'DRAFT') {
      setSavingStatus(prev => ({ ...prev, [sectionId]: null }));
      return;
    }

    try {
      setSavingStatus(prev => ({ ...prev, [sectionId]: 'saving' }));

      const proposalId = proposal._id || proposal.proposal_id;
      await proposalService.updateProposalSection(proposalId, sectionId, content);

      setLastSaved(prev => ({ ...prev, [sectionId]: new Date() }));
      setSavingStatus(prev => ({ ...prev, [sectionId]: 'saved' }));
      announceSaved();

      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [sectionId]: null }));
      }, 2000);
    } catch (err) {
      console.error('Failed to save section:', err);
      setSavingStatus(prev => ({ ...prev, [sectionId]: null }));
      announce('Failed to save changes', 'assertive');
    }
  };

  // Handle export
  const handleExport = async ({ format, template }) => {
    try {
      setIsExporting(true);
      announce(`Exporting proposal as ${format.toUpperCase()}`);

      const proposalId = proposal._id || proposal.proposal_id;
      const blob = await proposalExportService.exportProposal(proposalId, { format, template });
      const filename = proposalExportService.generateFilename(proposal, tender, format);
      proposalExportService.downloadBlob(blob, filename);

      setShowExportModal(false);
      announce('Export completed successfully');
    } catch (err) {
      console.error('Export failed:', err);
      announce('Export failed. Please try again.', 'assertive');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle proposal submission
  const handleSubmitProposal = async () => {
    const mandatorySections = sections.filter(s => s.is_mandatory || s.mandatory);

    const incompleteOnFrontend = mandatorySections.filter(s => {
      const content = sectionContents[s._id || s.id || s.section_id] || '';
      return content.trim().length < 50;
    });

    if (incompleteOnFrontend.length > 0) {
      alert(
        `⚠️ Incomplete sections detected:\n\n` +
        incompleteOnFrontend.map(s => `• ${s.title || s.name}`).join('\n') +
        `\n\nPlease complete all mandatory sections with at least 50 characters before submitting.`
      );
      return;
    }

    setShowPublishModal(true);
  };

  // Confirm and publish
  const handleConfirmPublish = async () => {
    try {
      setIsPublishing(true);
      const proposalId = proposal._id || proposal.proposal_id;

      await proposalService.submitProposal(proposalId);

      setProposal(prev => ({
        ...prev,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString()
      }));

      setShowPublishModal(false);
      announce('Proposal published successfully!');

      setTimeout(() => {
        navigate('/bidder/proposal-drafting');
      }, 1500);

    } catch (err) {
      console.error('Failed to submit proposal:', err);
      const errorData = err.response?.data;

      if (errorData?.error === 'Proposal incomplete' && errorData?.incompleteSections) {
        alert(`❌ Cannot Submit - Proposal Incomplete\n\n${errorData.details}`);
      } else {
        alert(`❌ Submission Failed\n\n${errorData?.details || err.message || 'An error occurred.'}`);
      }
      announce('Failed to publish proposal', 'assertive');
    } finally {
      setIsPublishing(false);
    }
  };

  // Calculate completion
  const completedCount = sections.filter(s => {
    const content = sectionContents[s._id || s.id || s.section_id] || '';
    return content.trim().length >= 50;
  }).length;
  const completionPercent = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  if (loading) {
    return (
      <BidderLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Loading />
        </div>
      </BidderLayout>
    );
  }

  if (error) {
    return (
      <BidderLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button
              onClick={() => navigate('/bidder/proposal-drafting')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Proposals
            </button>
          </div>
        </div>
      </BidderLayout>
    );
  }

  const activeSectionId = activeSection ? (activeSection._id || activeSection.id || activeSection.section_id) : null;
  const isProposalSubmitted = proposal?.status === 'SUBMITTED';

  return (
    <ProposalThemeProvider>
      <BidderLayout showNavbar={!fullscreenMode}>
        {/* Accessibility Announcer */}
        <A11yAnnouncer ref={announcerRef} />

        {/* Offline Banner */}
        <OfflineBanner isOnline={isOnline} pendingChanges={pendingChanges} />

        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
          {/* Submission Lock Banner */}
          {isProposalSubmitted && (
            <div className="flex-shrink-0 bg-amber-50 border-b-2 border-amber-300 px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-amber-900 font-semibold text-sm">
                  🔒 Proposal Submitted & Locked
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  This proposal has been submitted successfully. It is now locked for editing.
                  {proposal?.submittedAt && ` Submitted on ${new Date(proposal.submittedAt).toLocaleString()}`}
                </p>
              </div>
              <button
                onClick={() => navigate('/bidder/proposal-drafting')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition flex-shrink-0"
              >
                Back to List
              </button>
            </div>
          )}

          {/* Top Controls Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
            <button
              onClick={() => navigate('/bidder/proposal-drafting')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition px-3 py-2 rounded-lg hover:bg-slate-100"
              aria-label="Go back to proposals list"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Control Buttons */}
            <div className="flex items-center gap-2">
              {/* Offline Indicator */}
              <OfflineIndicator
                isOnline={isOnline}
                isSyncing={isSyncing}
                pendingChanges={pendingChanges}
                lastSynced={lastSynced}
                onSyncClick={forceSync}
                variant="compact"
              />

              {/* Version History */}
              <VersionHistory
                versions={[{
                  version: proposal?.version || 1,
                  status: proposal?.status || 'DRAFT',
                  createdAt: proposal?.createdAt,
                  updatedAt: proposal?.updatedAt,
                  isCurrent: true
                }]}
                currentVersion={proposal?.version || 1}
              />

              {/* Export Button */}
              <ExportButtons
                onExportPDF={() => handleExport({ format: 'pdf', template: 'formal' })}
                onExportDOCX={() => handleExport({ format: 'docx', template: 'formal' })}
                onOpenExportModal={() => setShowExportModal(true)}
                disabled={isProposalSubmitted}
                isExporting={isExporting}
              />

              {/* Assign Assister Button */}
              <button
                onClick={handleOpenAssignAssisterModal}
                disabled={isProposalSubmitted || !activeSection}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Assign an assister to this section"
              >
                👥 Assign
              </button>

              {/* PDF Analyze & Collaboration */}
              <button
                onClick={() => {
                  if (!proposalId) return;
                  navigate(`/bidder/pdf-analyze?tenderId=${tenderId}&proposalId=${proposalId}`);
                }}
                className="flex items-center gap-2 px-3 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition"
                title="Open PDF Analyze & Collaboration"
              >
                <FileText className="w-4 h-4" />
                PDF Analyze
              </button>

              {/* Theme Toggle */}
              <ThemeToggle variant="icon" size="sm" />

              {/* Keyboard Shortcuts */}
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                aria-label="Show keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              {/* Toggle Sidebar */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                title={showSidebar ? "Hide sections panel" : "Show sections panel"}
                aria-pressed={showSidebar}
              >
                <Menu className="w-4 h-4" />
              </button>

              {/* Toggle AI Advisor */}
              <button
                onClick={() => setShowAIAdvisor(!showAIAdvisor)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                title={showAIAdvisor ? "Hide AI advisor" : "Show AI advisor"}
                aria-pressed={showAIAdvisor}
              >
                <span className="text-xs">{showAIAdvisor ? 'AI ✓' : 'AI ✗'}</span>
              </button>

              {/* Toggle Risk & Audit Panel */}
              <button
                onClick={() => setShowInsightsPanel(!showInsightsPanel)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  showInsightsPanel
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={showInsightsPanel ? "Hide risk & audit panel" : "Show risk & audit panel"}
                aria-pressed={showInsightsPanel}
              >
                <Shield className="w-4 h-4" />
                <span className="text-xs">Risk</span>
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setFullscreenMode(!fullscreenMode)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-sm font-medium transition"
                title={fullscreenMode ? "Exit fullscreen" : "Enter fullscreen"}
                aria-pressed={fullscreenMode}
              >
                {fullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Header */}
          <ProposalHeader
            tender={tender}
            proposal={proposal}
            completionPercent={completionPercent}
            completedSections={completedCount}
            totalSections={sections.length}
            onSubmit={handleSubmitProposal}
            submitting={submitting}
          />

          {/* Three-Column Layout */}
          <div className="flex-1 flex overflow-hidden gap-0">
            {/* Left: Section List */}
            {showSidebar && (
              <div className="w-64 lg:w-72 flex-shrink-0 border-r border-slate-200 flex flex-col">
                <SectionList
                  sections={sections}
                  activeSection={activeSection}
                  onSelectSection={handleSelectSection}
                  sectionCompletion={sectionContents}
                />
              </div>
            )}

            {/* Center: Proposal Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeSection ? (
                <ProposalEditor
                  section={activeSection}
                  content={sectionContents[activeSectionId] || ''}
                  onContentChange={handleContentChange}
                  isReadOnly={proposal?.status !== 'DRAFT'}
                  savingStatus={savingStatus[activeSectionId]}
                  lastSaved={lastSaved[activeSectionId]}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <p>No section selected</p>
                </div>
              )}
            </div>

            {/* Right: AI Advisor */}
            {showAIAdvisor && (
              <div className="w-80 lg:w-96 flex-shrink-0 border-l border-slate-200 flex flex-col">
                {activeSection ? (
                  <ProposalAIAdvisor
                    proposal={proposal}
                    section={activeSection}
                    bidderDraft={sectionContents[activeSectionId] || ''}
                    tenderRequirement={activeSection?.description || activeSection?.content || ''}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-500">
                    <p>No section selected</p>
                  </div>
                )}
              </div>
            )}

            {/* Right: Risk & Audit Panel */}
            {showInsightsPanel && (
              <div className="w-80 lg:w-96 flex-shrink-0 border-l border-slate-200 flex flex-col bg-slate-50 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Panel Header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <h3 className="font-semibold text-slate-900">Risk & Compliance</h3>
                  </div>

                  {/* Risk Score Card */}
                  {proposal && (proposal._id || proposal.proposal_id) && (
                    <RiskScoreCard
                      proposalId={proposal._id || proposal.proposal_id}
                      compact={true}
                    />
                  )}

                  {/* Audit Trail */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-slate-900">Activity Log</h3>
                    </div>
                  </div>
                  {proposal && (proposal._id || proposal.proposal_id) && (
                    <AuditTrail
                      proposalId={proposal._id || proposal.proposal_id}
                      compact={true}
                      maxItems={8}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          proposal={proposal}
          tender={tender}
          isExporting={isExporting}
        />

        {/* Publish Confirmation Modal */}
        <PublishConfirmModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          onConfirm={handleConfirmPublish}
          proposal={proposal}
          tender={tender}
          completedSections={completedCount}
          totalSections={sections.length}
          isPublishing={isPublishing}
        />

        {/* Keyboard Shortcuts Help Modal */}
        <ShortcutsHelpModal
          isOpen={showShortcutsHelp}
          onClose={() => setShowShortcutsHelp(false)}
          shortcuts={shortcuts}
        />

        {/* Assign Assister Modal */}
        <AssignAssisterModal
          isOpen={showAssignAssisterModal}
          onClose={() => setShowAssignAssisterModal(false)}
          sectionId={selectedSectionForAssignment?._id || selectedSectionForAssignment?.id || selectedSectionForAssignment?.section_id}
          sectionTitle={selectedSectionForAssignment?.title || selectedSectionForAssignment?.name || 'Section'}
          proposalId={proposal?._id || proposal?.proposal_id}
          onAssignSuccess={handleAssignAssisterSuccess}
        />
      </BidderLayout>
    </ProposalThemeProvider>
  );
}
