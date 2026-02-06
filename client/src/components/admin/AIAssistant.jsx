import { useState, useRef, useEffect } from "react";
import { Send, AlertCircle, CheckCircle2, XCircle, Sparkles, BookOpen, MessageSquare, Bot, Loader2 } from "lucide-react";
import { apiRequest } from "../../services/apiClient";

export default function AIAssistant({
  currentSectionKey,
  currentSectionTitle,
  currentContent,
  tenderMetadata,
  allSections,
  onApplySuggestion,
  token
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("section"); // "section" or "tender"
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Quick prompts for common actions
  const quickPrompts = [
    { label: "Improve content", prompt: "Review and suggest improvements for this section" },
    { label: "Check compliance", prompt: "Check if this section meets standard tender requirements" },
    { label: "Add details", prompt: "Suggest additional details that should be included" },
  ];

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Prepare context based on mode
      let contextContent = "";
      let contextData = {
        mode,
        userQuestion: input,
        tenderMetadata: tenderMetadata || {},
      };

      if (mode === "section") {
        contextContent = currentContent || "";
        contextData.sectionType = currentSectionKey;
        contextData.sectionTitle = currentSectionTitle;
        contextData.existingContent = contextContent;
      } else {
        // Entire tender mode - include all sections summary
        const sectionsInfo = allSections
          ?.map(s => `${s.title}: ${s.content || "(empty)"}`)
          .join("\n\n") || "";
        contextData.existingContent = sectionsInfo;
      }

      // Validate required fields
      if (!contextData.mode) {
        throw new Error("Mode is required");
      }
      if (contextData.existingContent === undefined) {
        throw new Error("Existing content must be provided");
      }
      if (!contextData.userQuestion) {
        throw new Error("Question cannot be empty");
      }

      const response = await apiRequest("/ai/assist", {
        method: "POST",
        body: contextData,
        token: token
      });

      // Add AI response with suggestions
      const aiMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: "Here are my suggestions:",
        suggestions: response.suggestions || [],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      let errorMsg = "Failed to get AI assistance. Please try again.";
      
      if (error.message) {
        // Client-side validation error
        errorMsg = error.message;
      } else if (error.response?.data?.error) {
        // Server error response
        errorMsg = error.response.data.error;
      } else if (error.status === 400) {
        errorMsg = "Bad request: Check your input and try again.";
      } else if (error.status === 503) {
        errorMsg = "AI service is temporarily unavailable. Please try again in a moment.";
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        content: errorMsg,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion, messageId) => {
    if (onApplySuggestion) {
      onApplySuggestion({
        suggestion: suggestion.suggestedText,
        sectionKey: mode === "section" ? currentSectionKey : null,
      });

      // Visual feedback
      setExpandedSuggestion(null);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                suggestions: msg.suggestions.map(s =>
                  s === suggestion ? { ...s, applied: true } : s
                ),
              }
            : msg
        )
      );
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div className="flex flex-col h-[600px] bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Drafting Assistant</h3>
            <p className="text-xs text-white/80">Powered by AI</p>
          </div>
        </div>

        {/* Context Info */}
        <div className="mt-3 p-2 bg-white/10 rounded-lg">
          {mode === "section" ? (
            <p className="text-xs font-medium flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Assisting: <span className="text-white">{currentSectionTitle}</span>
            </p>
          ) : (
            <p className="text-xs font-medium flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              Reviewing entire tender
            </p>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setMode("section")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === "section"
                ? "bg-white text-primary-700 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Section Mode
          </button>
          <button
            onClick={() => setMode("tender")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === "tender"
                ? "bg-white text-primary-700 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Full Tender
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-900 mb-1">How can I help?</p>
            <p className="text-xs text-neutral-500 mb-4">
              {mode === "section"
                ? "I'll review your section and suggest improvements"
                : "I'll review your entire tender and provide recommendations"}
            </p>

            {/* Quick Prompts */}
            <div className="w-full space-y-2">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Quick Actions</p>
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(qp.prompt)}
                  className="w-full text-left px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs text-neutral-700 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <div key={message.id} className="space-y-3">
                {/* User Message */}
                {message.type === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-primary-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-sm">
                      {message.content}
                    </div>
                  </div>
                )}

                {/* Assistant Message */}
                {message.type === "assistant" && (
                  <div className="flex justify-start gap-2">
                    <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="max-w-[90%]">
                      <div className="text-xs font-medium text-neutral-700 mb-2">
                        {message.content}
                      </div>

                      {/* Suggestions */}
                      {message.suggestions && message.suggestions.length > 0 && (
                        <div className="space-y-2">
                          {message.suggestions.map((suggestion, idx) => (
                            <div
                              key={idx}
                              className={`border rounded-lg overflow-hidden transition-all ${
                                suggestion.applied
                                  ? "border-green-300 bg-green-50"
                                  : "border-neutral-200 bg-white hover:border-blue-300"
                              }`}
                            >
                              {/* Suggestion Header */}
                              <button
                                onClick={() =>
                                  setExpandedSuggestion(
                                    expandedSuggestion === idx ? null : idx
                                  )
                                }
                                className="w-full px-3 py-2 flex items-start gap-2 hover:bg-neutral-50 transition-colors text-left"
                              >
                                <span className="mt-0.5">
                                  {suggestion.applied ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  )}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-neutral-900 line-clamp-1">
                                    {suggestion.observation}
                                  </p>
                                  {!suggestion.applied && (
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                      Click to review and apply
                                    </p>
                                  )}
                                </div>
                                {suggestion.applied && (
                                  <span className="text-xs font-medium text-green-700">Applied</span>
                                )}
                              </button>

                              {/* Expanded Details */}
                              {expandedSuggestion === idx && !suggestion.applied && (
                                <>
                                  <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 space-y-2">
                                    <div>
                                      <p className="text-xs font-medium text-neutral-700 mb-1">
                                        Suggested Addition:
                                      </p>
                                      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-neutral-800 font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                                        {suggestion.suggestedText}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-neutral-700 mb-1">
                                        Why:
                                      </p>
                                      <p className="text-xs text-neutral-600">
                                        {suggestion.reason}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="px-3 py-2 bg-neutral-50 border-t border-neutral-200 flex gap-2">
                                    <button
                                      onClick={() =>
                                        handleApplySuggestion(suggestion, message.id)
                                      }
                                      className="flex-1 py-1.5 px-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Apply
                                    </button>
                                    <button
                                      onClick={() => setExpandedSuggestion(null)}
                                      className="flex-1 py-1.5 px-2 bg-neutral-200 text-neutral-700 rounded text-xs font-medium hover:bg-neutral-300 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Ignore
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {message.type === "error" && (
                  <div className="flex justify-start gap-2">
                    <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="max-w-[85%] bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-red-700">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-neutral-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              mode === "section"
                ? "Ask about this section..."
                : "Ask about the entire tender..."
            }
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-neutral-300 rounded-lg text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          AI suggestions are applied only when you click "Apply"
        </p>
      </div>
    </div>
  );
}

