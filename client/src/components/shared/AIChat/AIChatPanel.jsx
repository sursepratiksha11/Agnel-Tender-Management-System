import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";

const MOCK_RESPONSES = {
  "suggest sections": "I recommend these standard tender sections:\n\n1. Introduction & Background\n2. Scope of Work\n3. Eligibility Criteria\n4. Technical Specifications\n5. Submission Guidelines\n6. Evaluation Criteria\n7. Terms & Conditions\n\nWould you like me to draft any specific section?",
  "eligibility": "Here's a draft for Eligibility Criteria:\n\n**Eligibility Criteria**\n\nBidders must meet the following requirements:\n\n1. Legal Status: Must be a registered entity\n2. Financial Capacity: Minimum annual turnover of ₹X\n3. Experience: At least Y years in similar projects\n4. Technical Capability: Qualified personnel and equipment\n5. Compliance: Valid tax registrations and certifications\n\nPlease review and modify as needed.",
  "improve": "I've analyzed the content. Here are suggestions:\n\n1. Add more specific details\n2. Use bullet points for clarity\n3. Include measurable criteria\n4. Add deadlines and milestones\n5. Clarify submission format\n\nWould you like me to rewrite any part?",
  "draft": "I can help draft content for the selected section. Please specify:\n\n- What key points to include?\n- Desired level of detail?\n- Any specific requirements or constraints?\n\nI'll create a professional draft for you to review.",
};

export default function AIChatPanel({ context }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: `👋 Hi! I'm your AI tender assistant.\n\nI can help you:\n• Suggest standard sections\n• Draft section content\n• Improve clarity and structure\n• Ensure completeness\n\nTry: "Suggest sections" or "Draft eligibility criteria"`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Generate mock AI response
    setTimeout(() => {
      const lowerInput = input.toLowerCase();
      let responseContent = "I understand you'd like help with that. Could you provide more details?";

      // Simple keyword matching for mock responses
      if (lowerInput.includes("suggest") || lowerInput.includes("section")) {
        responseContent = MOCK_RESPONSES["suggest sections"];
      } else if (lowerInput.includes("eligib")) {
        responseContent = MOCK_RESPONSES["eligibility"];
      } else if (lowerInput.includes("improve") || lowerInput.includes("better")) {
        responseContent = MOCK_RESPONSES["improve"];
      } else if (lowerInput.includes("draft") || lowerInput.includes("write")) {
        responseContent = MOCK_RESPONSES["draft"];
      }

      // Add context awareness
      if (context?.selectedSection) {
        responseContent += `\n\n📝 Current section: **${context.selectedSection.title}**`;
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 500);

    setInput("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">AI Assistant</h3>
            <p className="text-xs text-neutral-500">Mock responses</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          placeholder="Ask AI for help..."
        />
      </div>

      {/* Context Info */}
      {context?.selectedSection && (
        <div className="px-4 pb-3 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-blue-700">
            💡 Editing: <span className="font-medium">{context.selectedSection.title}</span>
          </p>
        </div>
      )}
    </div>
  );
}
