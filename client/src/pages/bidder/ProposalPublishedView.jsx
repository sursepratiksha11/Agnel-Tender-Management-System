import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import ProposalStatusBadge from '../../components/proposal/ProposalStatusBadge';
import ExportButtons from '../../components/proposal/ExportButtons';
import ExportModal from '../../components/proposal/ExportModal';
import VersionHistory from '../../components/proposal/VersionHistory';
import { ProposalThemeProvider } from '../../context/ProposalThemeContext';
import ThemeToggle from '../../components/proposal/ThemeToggle';
import Loading from '../../components/bidder-common/Loading';
import { proposalService } from '../../services/bidder/proposalService';
import proposalExportService from '../../services/bidder/proposalExportService';
import { ArrowLeft, Lock, FileText, Calendar, Building, Download, Eye } from 'lucide-react';
import '../../styles/proposal-theme.css';

/**
 * ProposalPublishedView Page
 *
 * Read-only view of a published/submitted proposal.
 * Provides export functionality and version history.
 */
export default function ProposalPublishedView() {
  const { proposalId } = useParams();
  const navigate = useNavigate();

  // State
  const [proposal, setProposal] = useState(null);
  const [tender, setTender] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch proposal data
  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await proposalService.getProposalById(proposalId);
        const data = response.data?.data || response.data;

        setProposal(data.proposal);
        setTender(data.tender);
        setSections(data.sections || []);
      } catch (err) {
        console.error('Failed to fetch proposal:', err);
        setError(err.response?.data?.message || 'Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    if (proposalId) {
      fetchProposal();
    }
  }, [proposalId]);

  // Handle export
  const handleExport = async ({ format, template }) => {
    try {
      setIsExporting(true);

      const blob = await proposalExportService.exportProposal(proposalId, {
        format,
        template
      });

      const filename = proposalExportService.generateFilename(proposal, tender, format);
      proposalExportService.downloadBlob(blob, filename);

      setShowExportModal(false);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Quick export handlers
  const handleQuickExportPDF = () => handleExport({ format: 'pdf', template: 'formal' });
  const handleQuickExportDOCX = () => handleExport({ format: 'docx', template: 'formal' });

  if (loading) {
    return (
      <BidderLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Loading />
        </div>
      </BidderLayout>
    );
  }

  if (error) {
    return (
      <BidderLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
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

  return (
    <ProposalThemeProvider>
      <BidderLayout>
        <div className="min-h-screen bg-slate-50">
          {/* Header */}
          <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                {/* Back Button */}
                <button
                  onClick={() => navigate('/bidder/proposal-drafting')}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Proposals
                </button>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <ThemeToggle variant="icon" size="sm" />

                  <VersionHistory
                    versions={[
                      {
                        version: proposal?.version || 1,
                        status: proposal?.status || 'PUBLISHED',
                        createdAt: proposal?.createdAt,
                        updatedAt: proposal?.submittedAt || proposal?.updatedAt,
                        isCurrent: true
                      }
                    ]}
                    currentVersion={proposal?.version || 1}
                  />

                  <ExportButtons
                    onExportPDF={handleQuickExportPDF}
                    onExportDOCX={handleQuickExportDOCX}
                    onOpenExportModal={() => setShowExportModal(true)}
                    isExporting={isExporting}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Published Banner */}
          <div className="bg-emerald-50 border-b border-emerald-200">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
              <Lock className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-emerald-800 font-semibold text-sm">
                  Proposal Published & Locked
                </p>
                <p className="text-emerald-700 text-xs">
                  This proposal has been submitted and cannot be modified.
                  {proposal?.submittedAt && ` Submitted on ${new Date(proposal.submittedAt).toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Proposal Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 mb-1">
                        {tender?.title || 'Untitled Proposal'}
                      </h1>
                      <p className="text-slate-500">
                        {tender?.authority?.name || 'Authority'}
                      </p>
                    </div>
                    <ProposalStatusBadge
                      status={proposal?.status}
                      size="lg"
                      animated
                    />
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>
                        Submitted: {proposal?.submittedAt
                          ? new Date(proposal.submittedAt).toLocaleDateString()
                          : 'N/A'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building className="w-4 h-4 text-slate-400" />
                      <span>Version {proposal?.version || 1}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{sections.length} sections</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Eye className="w-5 h-5 text-slate-500" />
                Proposal Content
              </h2>

              {sections.map((section, index) => {
                const sectionResponse = proposal?.sections?.find(
                  s => (s.section_id || s.sectionId) === (section._id || section.id || section.section_id)
                );

                return (
                  <div
                    key={section._id || section.id || section.section_id || index}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-sm font-semibold text-slate-600">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {section.title || section.name || `Section ${index + 1}`}
                          </h3>
                          {section.is_mandatory && (
                            <span className="text-xs text-red-500">Required</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section Description */}
                    {(section.description || section.content) && (
                      <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                        <p className="text-sm text-slate-600 italic">
                          {section.description || section.content}
                        </p>
                      </div>
                    )}

                    {/* Section Response */}
                    <div className="px-6 py-4">
                      {sectionResponse?.content ? (
                        <div className="prose prose-slate max-w-none">
                          <p className="whitespace-pre-wrap text-slate-700">
                            {sectionResponse.content}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No response provided</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Export CTA */}
            <div className="mt-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Download Your Proposal
                  </h3>
                  <p className="text-indigo-100 text-sm">
                    Export as PDF or DOCX with professional formatting
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Export
                </button>
              </div>
            </div>
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
      </BidderLayout>
    </ProposalThemeProvider>
  );
}
