import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Lightbulb, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import { proposalService } from '../../services/bidder/proposalService';

export default function ProposalAIAdvisor({
  proposal,
  section,
  bidderDraft,
  tenderRequirement
}) {
  const [messages, setMessages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuickAction = async (question) => {
    await handleAnalyze(question);
  };

  const handleAnalyze = async (question = userInput) => {
    if (!question.trim() || !proposal || !section) return;

    // Add user message to chat
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setUserInput('');
    setAnalyzing(true);

    try {
      // Call AI analysis API (always returns HTTP 200 with fallback on error)
      const result = await proposalService.analyzeSectionAsync(
        proposal._id || proposal.proposal_id,
        section._id || section.id || section.section_id,
        {
          draftContent: bidderDraft,
          tenderRequirement,
          sectionType: section.type || section.section_type || 'GENERAL',
          userQuestion: question
        }
      );

      // Extract analysis from result
      const analysis = result.analysis;
      const mode = analysis.mode || 'fallback';
      const suggestions = analysis.suggestions || [];

      // Format AI response
      let aiResponse = '';

      if (mode === 'fallback') {
        aiResponse += '**ℹ️ Rule-Based Guidance** (AI currently unavailable)\n\n';
      }

      // Format each suggestion
      if (suggestions.length > 0) {
        suggestions.forEach((suggestion, idx) => {
          if (suggestions.length > 1) {
            aiResponse += `**Suggestion ${idx + 1}:**\n\n`;
          }

          if (suggestion.observation) {
            aiResponse += `**📋 Observation:** ${suggestion.observation}\n\n`;
          }

          if (suggestion.suggestedImprovement) {
            aiResponse += `**✨ Improvement:** ${suggestion.suggestedImprovement}\n\n`;
          }

          if (suggestion.reason) {
            aiResponse += `**💡 Why:** ${suggestion.reason}\n\n`;
          }

          if (idx < suggestions.length - 1) {
            aiResponse += '---\n\n';
          }
        });
      } else {
        aiResponse = 'No specific improvements identified. Your draft appears well-structured.';
      }

      // Add AI message to chat
      const aiMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: aiResponse,
        isFallback: mode === 'fallback',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[AI Advisor] Analysis failed:', err);
      
      // Add error message (should rarely happen due to API fallback)
      const errorMsg = {
        id: Date.now() + 1,
        role: 'ai',
        content: '**⚠️ Connection Error**\n\nUnable to connect to analysis service. Please check your network connection and try again.',
        isFallback: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    await handleAnalyze(userInput);
  };

  // Determine if there are any potential issues
  const hasIssues = bidderDraft.length < 50 || !bidderDraft.trim();

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600 text-white border-b border-purple-200">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5" />
          <h3 className="font-bold text-lg">AI Advisor</h3>
        </div>
        <p className="text-xs text-purple-100 leading-relaxed">
          Advisory only. I analyze your draft and suggest improvements—you write the final content.
        </p>
      </div>

      {/* Section Context */}
      <div className="flex-shrink-0 p-4 bg-slate-50 border-b border-slate-200">
        <div className="text-xs text-slate-600 mb-2 font-semibold">Current Section</div>
        <div className="text-sm font-medium text-slate-900 mb-2">{section?.title || 'No section'}</div>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-slate-500">Words: </span>
            <span className="font-bold text-slate-900">
              {bidderDraft ? bidderDraft.trim().split(/\s+/).filter(w => w.length > 0).length : 0}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Chars: </span>
            <span className="font-bold text-slate-900">{bidderDraft?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="flex-shrink-0 p-4 space-y-2 border-b border-slate-200 bg-white">
          <div className="text-xs font-semibold text-slate-600 mb-2">Quick Analysis</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickAction('What key points should I address?')}
              disabled={analyzing}
              className="flex items-center gap-2 p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              <Lightbulb className="w-3 h-3" />
              Key Points
            </button>
            <button
              onClick={() => handleQuickAction('Are there any gaps in my draft?')}
              disabled={analyzing}
              className="flex items-center gap-2 p-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              <AlertCircle className="w-3 h-3" />
              Gaps Check
            </button>
            <button
              onClick={() => handleQuickAction('How can I improve my draft?')}
              disabled={analyzing}
              className="flex items-center gap-2 p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              <TrendingUp className="w-3 h-3" />
              Improve
            </button>
            <button
              onClick={() => handleQuickAction('What structure would work best?')}
              disabled={analyzing}
              className="flex items-center gap-2 p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              Structure
            </button>
          </div>
        </div>
      )}

      {/* Potential Issues Alert */}
      {hasIssues && messages.length === 0 && (
        <div className="flex-shrink-0 mx-4 mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-700">
              <p className="font-semibold mb-1">Content too short</p>
              <p>Draft needs at least 50 characters. Try one of the quick actions above for guidance.</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 && !hasIssues && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Bot className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Ask me for analysis or use quick actions above</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-sm p-3 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : `${msg.isFallback ? 'bg-orange-50 border border-orange-200' : 'bg-slate-100'} text-slate-900`
              }`}
            >
              {msg.role === 'ai' ? (
                // Render markdown-like content
                <div className="whitespace-pre-wrap text-xs">
                  {msg.content.split('\n\n').map((para, idx) => (
                    <div key={idx} className="mb-2 last:mb-0">
                      {para.split('\n').map((line, lineIdx) => {
                        if (line.startsWith('**')) {
                          const boldContent = line.replace(/\*\*/g, '');
                          return (
                            <div key={lineIdx} className="font-semibold text-slate-800 mb-1">
                              {boldContent}
                            </div>
                          );
                        }
                        return <div key={lineIdx}>{line}</div>;
                      })}
                    </div>
                  ))}
                  {msg.isFallback && (
                    <div className="mt-2 pt-2 border-t border-orange-200 text-orange-700 text-xs italic">
                      (Fallback guidance - AI unavailable)
                    </div>
                  )}
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-slate-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {analyzing && (
          <div className="flex justify-start">
            <div className="bg-slate-100 text-slate-900 p-3 rounded-lg flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></div>
              </div>
              <span className="text-xs text-slate-600">Analyzing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Advisory Reminder */}
      {messages.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-blue-50 border-t border-blue-200 text-xs text-blue-700">
          💡 <span className="font-medium">Advisory only:</span> Use insights to inform your draft, but you write the final content.
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className="flex-shrink-0 p-4 border-t border-slate-200 bg-white flex gap-2"
      >
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask for analysis..."
          disabled={analyzing || !proposal}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={analyzing || !userInput.trim() || !proposal}
          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-slate-300 flex items-center gap-1"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
