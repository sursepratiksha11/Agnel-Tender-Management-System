import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import Card from '../../components/bidder-common/Card';
import Button from '../../components/bidder-common/Button';
import Loading from '../../components/bidder-common/Loading';
import { proposalService } from '../../services/bidder/proposalService';
import { ArrowLeft, Send } from 'lucide-react';

const ProposalEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProposal();
  }, [id]);

  const fetchProposal = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await proposalService.getProposalById(id);
      setProposal(result.data.proposal);
      setSections(result.data.sections || []);
    } catch (error) {
      console.error('Failed to fetch proposal:', error);
      setError(error.response?.data?.message || 'Failed to load proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async () => {
    if (!window.confirm('Are you sure you want to submit this proposal? You cannot edit it after submission.')) {
      return;
    }

    try {
      setSubmitting(true);
      await proposalService.submitProposal(id);
      alert('Proposal submitted successfully!');
      navigate('/bidder/proposal-drafting');
    } catch (error) {
      console.error('Failed to submit proposal:', error);
      alert(error.response?.data?.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <BidderLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loading />
        </div>
      </BidderLayout>
    );
  }

  if (error) {
    return (
      <BidderLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <p className="text-center text-red-600 py-12">{error}</p>
            <div className="text-center mt-4">
              <Button onClick={() => navigate('/bidder/tenders')}>
                Back to Tenders
              </Button>
            </div>
          </Card>
        </div>
      </BidderLayout>
    );
  }

  if (!proposal) {
    return (
      <BidderLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <p className="text-center text-gray-500 py-12">Proposal not found</p>
          </Card>
        </div>
      </BidderLayout>
    );
  }

  return (
    <BidderLayout>
      <div>
        {/* Back Button */}
        <Button
          variant="secondary"
          onClick={() => navigate('/bidder/proposal-drafting')}
          className="mb-6"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to My Proposals
        </Button>

        {/* Proposal Header */}
        <Card className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Proposal for: {proposal.tenderId?.title || 'Tender'}
              </h1>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  proposal.status === 'SUBMITTED' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {proposal.status}
                </span>
                <span className="text-sm text-gray-600">
                  Created: {new Date(proposal.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            {proposal.status === 'DRAFT' && (
              <Button onClick={handleSubmitProposal} disabled={submitting}>
                <Send className="h-5 w-5 mr-2" />
                {submitting ? 'Submitting...' : 'Submit Proposal'}
              </Button>
            )}
          </div>
        </Card>

        {/* Proposal Sections */}
        {sections.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Proposal Sections</h2>
            {sections.map((section, index) => (
              <Card key={section._id || index}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {section.sectionOrder}. {section.sectionName}
                  </h3>
                  {proposal.status === 'DRAFT' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // TODO: Add edit functionality
                        alert('Edit functionality coming soon!');
                      }}
                    >
                      Edit
                    </Button>
                  )}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {section.content || 'No content yet...'}
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-12">
              No sections yet. Start adding content to your proposal.
            </p>
          </Card>
        )}

        {/* Submit Button at Bottom */}
        {proposal.status === 'DRAFT' && (
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              onClick={handleSubmitProposal}
              disabled={submitting}
            >
              <Send className="h-5 w-5 mr-2" />
              {submitting ? 'Submitting Proposal...' : 'Submit This Proposal'}
            </Button>
          </div>
        )}
      </div>
    </BidderLayout>
  );
};

export default ProposalEdit;
