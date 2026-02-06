import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import { FileCheck, Eye, Send, AlertCircle, ChevronRight, Loader, Upload, FileText, Calendar } from 'lucide-react';
import { tenderService } from '../../services/bidder/tenderService';
import { proposalService } from '../../services/bidder/proposalService';
import { pdfAnalysisService } from '../../services/bidder/pdfAnalysisService';

export default function ProposalDrafting() {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [uploadedDrafts, setUploadedDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'platform', 'uploaded'

  // Fetch tenders, proposals, and uploaded drafts on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [tendersRes, proposalsRes, uploadedDraftsRes] = await Promise.all([
          tenderService.discoverTenders({ limit: 100 }),
          proposalService.getMyProposals(),
          pdfAnalysisService.getProposalDrafts({ limit: 100 }),
        ]);

        const tendersData = tendersRes.data?.tenders || tendersRes.data?.data?.tenders || [];
        // Filter out uploaded tenders - only show platform tenders in the platform section
        const platformTenders = tendersData.filter(t => !t.isUploaded);
        setTenders(platformTenders);

        const proposalsData = proposalsRes.data?.proposals || proposalsRes.data?.data?.proposals || [];
        setProposals(proposalsData);

        const draftsData = uploadedDraftsRes.data || [];
        setUploadedDrafts(draftsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.response?.data?.message || 'Failed to load proposals');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get proposal status for a tender
  const getProposalStatus = (tenderId) => {
    const proposal = proposals.find(p => p.tenderId === tenderId);
    if (!proposal) return { status: 'NOT_STARTED', content: 'Not Started', color: 'bg-slate-100 text-slate-700' };

    switch (proposal.status) {
      case 'DRAFT':
        return {
          status: 'DRAFT',
          content: 'In Progress',
          color: 'bg-orange-100 text-orange-700',
          completedSections: proposal.completedSections,
          totalSections: proposal.totalSections
        };
      case 'SUBMITTED':
        return { status: 'SUBMITTED', content: 'Submitted', color: 'bg-blue-100 text-blue-700' };
      case 'UNDER_REVIEW':
        return { status: 'UNDER_REVIEW', content: 'Under Review', color: 'bg-purple-100 text-purple-700' };
      case 'ACCEPTED':
        return { status: 'ACCEPTED', content: 'Accepted', color: 'bg-green-100 text-green-700' };
      case 'REJECTED':
        return { status: 'REJECTED', content: 'Rejected', color: 'bg-red-100 text-red-700' };
      default:
        return { status: proposal.status, content: proposal.status, color: 'bg-slate-100 text-slate-700' };
    }
  };

  // Handle continue editing
  const handleContinue = (tenderId) => {
    navigate(`/bidder/proposal/${tenderId}`);
  };

  // Handle start new proposal
  const handleStartProposal = (tenderId) => {
    navigate(`/bidder/proposal/${tenderId}`);
  };

  // Handle uploaded draft navigation
  const handleViewUploadedDraft = (draft) => {
    navigate(`/bidder/uploaded-tenders/${draft.uploadedTenderId}/analyze`);
  };

  // Group tenders by proposal status
  const inProgressTenders = tenders.filter(t => {
    const status = getProposalStatus(t._id || t.id);
    return status.status === 'DRAFT';
  });

  const submittedTenders = tenders.filter(t => {
    const status = getProposalStatus(t._id || t.id);
    return ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'].includes(status.status);
  });

  const notStartedTenders = tenders.filter(t => {
    const status = getProposalStatus(t._id || t.id);
    return status.status === 'NOT_STARTED';
  });

  // Uploaded drafts in progress (DRAFT status)
  const inProgressUploadedDrafts = uploadedDrafts.filter(d => d.status === 'DRAFT');
  const finalizedUploadedDrafts = uploadedDrafts.filter(d => ['FINAL', 'EXPORTED'].includes(d.status));

  const stats = {
    totalPlatform: tenders.length,
    totalUploaded: uploadedDrafts.length,
    inProgressPlatform: inProgressTenders.length,
    inProgressUploaded: inProgressUploadedDrafts.length,
    submitted: submittedTenders.length,
    avgCompletion: inProgressTenders.length > 0
      ? Math.round(
          inProgressTenders.reduce((sum, t) => {
            const proposal = proposals.find(p => p.tenderId === (t._id || t.id));
            return sum + (proposal?.completionPercent || 0);
          }, 0) / inProgressTenders.length
        )
      : 0
  };

  if (loading) {
    return (
      <BidderLayout>
        <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-slate-600">Loading proposals...</p>
          </div>
        </div>
      </BidderLayout>
    );
  }

  return (
    <BidderLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Proposal Drafting</h1>
          <p className="text-slate-600">Respond to tenders with AI-assisted guidance</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Platform Proposals</p>
                <p className="text-2xl font-bold text-slate-900">{stats.inProgressPlatform}</p>
              </div>
              <FileCheck className="w-10 h-10 text-blue-100" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Uploaded Drafts</p>
                <p className="text-2xl font-bold text-purple-700">{stats.totalUploaded}</p>
              </div>
              <Upload className="w-10 h-10 text-purple-100" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Total In Progress</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inProgressPlatform + stats.inProgressUploaded}</p>
              </div>
              <Send className="w-10 h-10 text-orange-100" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">Submitted</p>
                <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
              </div>
              <Eye className="w-10 h-10 text-green-100" />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            All Proposals
          </button>
          <button
            onClick={() => setActiveTab('platform')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'platform'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Platform Tenders
          </button>
          <button
            onClick={() => setActiveTab('uploaded')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'uploaded'
                ? 'text-purple-600 border-purple-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Uploaded PDFs
            {uploadedDrafts.length > 0 && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                {uploadedDrafts.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Uploaded PDF Drafts Section */}
        {(activeTab === 'all' || activeTab === 'uploaded') && uploadedDrafts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Uploaded PDF Drafts</h2>
              <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-semibold text-sm">
                {uploadedDrafts.length}
              </span>
            </div>
            <div className="space-y-4">
              {uploadedDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="bg-white rounded-xl border border-purple-200 p-6 hover:shadow-lg transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                          <Upload className="w-3 h-3" />
                          PDF Upload
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          draft.status === 'DRAFT' ? 'bg-orange-100 text-orange-700' :
                          draft.status === 'FINAL' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {draft.status === 'DRAFT' ? 'In Progress' : draft.status === 'FINAL' ? 'Finalized' : 'Exported'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {draft.title || draft.tenderTitle || 'Untitled Draft'}
                      </h3>
                      {draft.authorityName && (
                        <p className="text-sm text-slate-600 mb-3">{draft.authorityName}</p>
                      )}

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">
                            {draft.totalSections} sections • {draft.totalWords?.toLocaleString()} words
                          </span>
                          <span className="text-sm font-medium text-slate-900">{draft.completionPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${draft.completionPercent || 0}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {draft.updatedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Updated {new Date(draft.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                          {draft.exportCount > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              Exported {draft.exportCount}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleViewUploadedDraft(draft)}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition flex-shrink-0"
                    >
                      Continue Editing
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Tenders - In Progress Section */}
        {(activeTab === 'all' || activeTab === 'platform') && inProgressTenders.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Send className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">In Progress</h2>
              <span className="ml-auto px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-semibold text-sm">
                {inProgressTenders.length}
              </span>
            </div>
            <div className="space-y-4">
              {inProgressTenders.map((tender) => {
                const proposalStatus = getProposalStatus(tender._id || tender.id);
                const proposal = proposals.find(p => p.tenderId === (tender._id || tender.id));

                return (
                  <div key={tender._id || tender.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">{tender.title}</h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${proposalStatus.color}`}>
                            {proposalStatus.content}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">{tender.authority?.name || tender.organizationId?.organizationName}</p>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">
                              {proposal?.completedSections || 0}/{proposal?.totalSections || '?'} sections
                            </span>
                            <span className="text-sm font-medium text-slate-900">{proposal?.completionPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${proposal?.completionPercent || 0}%` }}
                            />
                          </div>
                          {proposal?.lastEdited && (
                            <p className="text-xs text-slate-500">
                              Last edited {new Date(proposal.lastEdited).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleContinue(tender._id || tender.id)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition flex-shrink-0"
                      >
                        Continue
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Tenders Section */}
        {(activeTab === 'all' || activeTab === 'platform') && notStartedTenders.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Available Tenders</h2>
              <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                {notStartedTenders.length}
              </span>
            </div>
            <div className="space-y-4">
              {notStartedTenders.map((tender) => (
                <div key={tender._id || tender.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{tender.title}</h3>
                      <p className="text-sm text-slate-600 mb-3">{tender.authority?.name || tender.organizationId?.organizationName}</p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {tender.sections && (
                          <span>📋 {tender.sections.length} sections</span>
                        )}
                        {tender.deadline && (
                          <span>📅 Due {new Date(tender.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartProposal(tender._id || tender.id)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition flex-shrink-0"
                    >
                      Start Proposal
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submitted Section */}
        {(activeTab === 'all' || activeTab === 'platform') && submittedTenders.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Submitted Proposals</h2>
              <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
                {submittedTenders.length}
              </span>
            </div>
            <div className="space-y-4">
              {submittedTenders.map((tender) => {
                const proposalStatus = getProposalStatus(tender._id || tender.id);

                return (
                  <div key={tender._id || tender.id} className="bg-white rounded-xl border border-slate-200 p-6 opacity-75">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">{tender.title}</h3>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${proposalStatus.color}`}>
                            {proposalStatus.content}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{tender.authority?.name || tender.organizationId?.organizationName}</p>
                      </div>

                      <button
                        onClick={() => navigate(`/bidder/proposal/${tender._id || tender.id}`)}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm transition flex-shrink-0"
                      >
                        View
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {tenders.length === 0 && uploadedDrafts.length === 0 && !loading && (
          <div className="text-center py-16">
            <FileCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Proposals Yet</h3>
            <p className="text-slate-600 mb-6">Start by discovering tenders or uploading a PDF</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/bidder/tenders')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Discover Tenders
              </button>
              <button
                onClick={() => navigate('/bidder/pdf-analyze')}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload PDF
              </button>
            </div>
          </div>
        )}

        {/* Empty state for uploaded tab */}
        {activeTab === 'uploaded' && uploadedDrafts.length === 0 && (
          <div className="text-center py-16">
            <Upload className="w-16 h-16 text-purple-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Uploaded PDF Drafts</h3>
            <p className="text-slate-600 mb-6">Upload a tender PDF to create a proposal draft</p>
            <button
              onClick={() => navigate('/bidder/pdf-analyze')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 mx-auto"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
          </div>
        )}
      </div>
    </BidderLayout>
  );
}
