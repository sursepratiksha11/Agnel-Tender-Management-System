import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import TenderHeader from '../../components/tender-analysis/TenderHeader';
import TabNavigation from '../../components/tender-analysis/TabNavigation';
import OverviewTab from '../../components/tender-analysis/OverviewTab';
import SectionsTab from '../../components/tender-analysis/SectionsTab';
import InsightsTab from '../../components/tender-analysis/InsightsTab';
import AIAssistant from '../../components/tender-analysis/AIAssistant';
import { tenderService } from '../../services/bidder/tenderService';
import { aiService } from '../../services/bidder/aiService';
import { proposalService } from '../../services/bidder/proposalService';

function TenderAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState([0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tender, setTender] = useState(null);
  const [sections, setSections] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [tenderSummary, setTenderSummary] = useState(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your private AI assistant. I can help you understand this tender, analyze requirements, assess your chances, and suggest strategies. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const quickQuestions = [
    'What are the critical requirements?',
    'Assess my chances of winning',
    'What makes this project complex?',
    'What should I emphasize in my proposal?',
    'Are there any deal-breakers?',
    'Timeline and milestones overview'
  ];

  // Fetch tender details on mount
  useEffect(() => {
    fetchTenderDetails();
  }, [id]);

  const fetchTenderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await tenderService.getTenderFullDetails(id);
      
      console.log('Full API response:', response);
      
      if (!response.data || !response.data.data) {
        setError('No data received from server');
        return;
      }

      const { tender: tenderData, sections: sectionsData } = response.data.data;
      
      if (!tenderData) {
        console.error('No tender data in response:', response.data);
        setError('Tender data not found');
        return;
      }

      console.log('Tender data:', tenderData);
      console.log('Sections data:', sectionsData);

      // Use real statistics from backend
      const stats = tenderData.statistics || {};

      setTender({
        title: tenderData.title,
        organization: tenderData.organizationId?.organizationName || 'Organization',
        publishedAt: tenderData.createdAt,
        closedAt: tenderData.deadline,
        daysRemaining: tenderData.deadline
          ? Math.max(0, Math.ceil((new Date(tenderData.deadline) - new Date()) / (1000 * 60 * 60 * 24)))
          : 0,
        estimatedValue: tenderData.value
          ? (tenderData.value >= 10000000 ? `₹${(tenderData.value / 10000000).toFixed(1)}Cr` :
             tenderData.value >= 100000 ? `₹${(tenderData.value / 100000).toFixed(1)}L` :
             `₹${tenderData.value.toLocaleString()}`)
          : 'N/A',
        proposalCount: stats.proposalCount || 0, // Real proposal count from DB
        description: tenderData.description,
        // Additional statistics for display
        statistics: {
          wordCount: stats.wordCount || 0,
          sectionCount: stats.sectionCount || 0,
          estimatedReadTime: stats.estimatedReadTime || 0,
          mandatorySections: stats.mandatorySections || 0
        }
      });

      // Transform sections with real complexity scores from backend
      const transformedSections = (sectionsData || []).map(section => ({
        name: section.title || section.sectionTitle || section.sectionName,
        content: section.content || section.description || 'No content available',
        keyPoints: section.keyPoints || [],
        complexity: section.complexity || 'Medium',
        complexityScore: section.complexityScore || 0,
        wordCount: section.wordCount || 0,
        isMandatory: section.isMandatory || false
      }));
      
      setSections(transformedSections);
      setExpandedSections([0]);

      // Generate AI insights and fetch tender summary in parallel
      if (tenderData && transformedSections.length > 0) {
        generateAIInsights(tenderData, transformedSections);
        fetchTenderSummary();
      }
    } catch (err) {
      console.error('Error fetching tender:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load tender details');
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async (tenderData, sectionsData) => {
    try {
      // Call AI to analyze tender
      const analysisResponse = await aiService.explain({
        text: `Analyze this tender for a proposal response:\n\nTitle: ${tenderData.title}\n\nDescription: ${tenderData.description}\n\nProvide JSON response with: matchScore (0-100), strengths (array), concerns (array), recommendations (array)`,
        context: {
          tenderId: id,
          tenderTitle: tenderData.title,
          sections: sectionsData.length
        }
      });

      if (analysisResponse.data && analysisResponse.data.explanation) {
        try {
          const insights = JSON.parse(analysisResponse.data.explanation);
          setAiInsights(insights);
        } catch {
          // If parsing fails, set default insights
          setAiInsights({
            matchScore: 75,
            strengths: ['Tender analysis available', 'Document sections analyzed'],
            concerns: ['Detailed assessment pending'],
            recommendations: ['Review all sections carefully', 'Prepare proposal early']
          });
        }
      }
    } catch (err) {
      console.error('Error generating insights:', err);
      setAiInsights({
        matchScore: 75,
        strengths: ['Tender loaded successfully'],
        concerns: ['AI analysis pending'],
        recommendations: ['Review tender details']
      });
    }
  };

  // Fetch AI-powered tender summary for Insights tab
  const fetchTenderSummary = async () => {
    try {
      const response = await aiService.getTenderSummary(id);
      if (response.data && response.data.data) {
        setTenderSummary(response.data);
      }
    } catch (err) {
      console.error('Error fetching tender summary:', err);
      // Summary is optional - InsightsTab will fallback to aiInsights
    }
  };

  // Helper Functions
  const toggleSection = (index) => {
    if (expandedSections.includes(index)) {
      setExpandedSections(expandedSections.filter(i => i !== index));
    } else {
      setExpandedSections([...expandedSections, index]);
    }
  };

  const handleAIQuestion = async (question) => {
    if (!question.trim()) return;

    const newUserMessage = { role: 'user', content: question, timestamp: new Date() };
    setChatMessages([...chatMessages, newUserMessage]);
    setUserInput('');
    setAiLoading(true);

    try {
      // Use RAG-based tender chat with vector similarity search
      const response = await aiService.tenderChat(id, question);

      let aiResponse = 'Could not process your question at this time.';

      if (response.data && response.data.answer) {
        aiResponse = response.data.answer;
      }

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Error getting AI response:', err);

      // Fallback response based on question keywords
      let fallbackResponse = generateFallbackResponse(question);

      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const generateFallbackResponse = (question) => {
    if (!aiInsights) return 'Please wait for AI analysis to complete.';
    
    if (question.toLowerCase().includes('critical requirements')) {
      return `Based on the tender analysis:\n\n**Critical Requirements:**\n${sections.slice(0, 2).map(s => `• ${s.name}`).join('\n')}\n\n**Match Score**: ${aiInsights.matchScore}%\n\n**Key Insights**:\n${aiInsights.strengths.map(s => `✓ ${s}`).join('\n')}`;
    } else if (question.toLowerCase().includes('chances') || question.toLowerCase().includes('assess')) {
      return `**Your Match Score**: ${aiInsights.matchScore}%\n\n**Strengths**:\n${aiInsights.strengths.map(s => `✓ ${s}`).join('\n')}\n\n**Concerns**:\n${aiInsights.concerns.map(c => `⚠ ${c}`).join('\n')}`;
    } else if (question.toLowerCase().includes('recomm')) {
      return `**Recommendations**:\n${aiInsights.recommendations.map(r => `→ ${r}`).join('\n')}`;
    } else {
      return `Based on this tender analysis, I can help you with:\n- Critical requirements analysis\n- Win probability assessment\n- Strengths and concerns\n- Strategic recommendations\n\nWhat specific aspect would you like to explore?`;
    }
  };

  const handleSearch = () => {
    setAiLoading(true);
    setTimeout(() => {
      if (searchQuery.trim()) {
        const results = sections
          .filter(s => s.content.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(s => ({
            section: s.name,
            excerpt: s.content.substring(0, 200) + '...',
            relevance: 'High'
          }));
        
        const resultMessage = results.length > 0
          ? `Found ${results.length} result(s):\n\n${results.map(r => `**${r.section}**: ${r.excerpt}`).join('\n\n')}`
          : `No results found for "${searchQuery}" in this tender.`;
        
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: resultMessage,
          timestamp: new Date()
        }]);
      }
      setAiLoading(false);
    }, 800);
  };

  const handleStartProposal = async () => {
    try {
      const response = await proposalService.createProposal(id);
      if (response.data && response.data.proposal) {
        // Navigate to ProposalWorkspace with tenderId
        navigate(`/bidder/proposal/${id}`);
      }
    } catch (err) {
      console.error('Error creating proposal:', err);
      alert('Failed to create proposal. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <BidderLayout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading tender details...</p>
          </div>
        </div>
      </BidderLayout>
    );
  }

  // Error state
  if (error || !tender) {
    return (
      <BidderLayout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="max-w-md w-full mx-4 p-6 bg-white rounded-lg border border-red-200">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-red-900 mb-2">Error Loading Tender</h2>
                <p className="text-red-700 text-sm mb-4">{error || 'Tender not found'}</p>
                <button
                  onClick={() => navigate('/bidder/tenders')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  Back to Discovery
                </button>
              </div>
            </div>
          </div>
        </div>
      </BidderLayout>
    );
  }

  return (
    <BidderLayout>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <TenderHeader tender={tender} onStartProposal={handleStartProposal} />

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left: Document View */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            <div className="max-w-4xl mx-auto">
              <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

              {activeTab === 'overview' && (
                <OverviewTab tender={tender} sections={sections} />
              )}

              {activeTab === 'sections' && (
                <SectionsTab
                  sections={sections}
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                />
              )}

              {activeTab === 'insights' && (
                <InsightsTab aiInsights={aiInsights} tenderSummary={tenderSummary} />
              )}
            </div>
          </div>

          {/* Right: AI Assistant */}
          <AIAssistant
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
            quickQuestions={quickQuestions}
            handleAIQuestion={handleAIQuestion}
            chatMessages={chatMessages}
            aiLoading={aiLoading}
            userInput={userInput}
            setUserInput={setUserInput}
          />
        </div>
      </div>
    </BidderLayout>
  );
}

export default TenderAnalysis;
