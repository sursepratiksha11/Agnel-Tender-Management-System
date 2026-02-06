import { User, Sparkles } from "lucide-react";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? "bg-blue-100" : "bg-gradient-to-br from-purple-500 to-blue-500"
      }`}>
        {isUser ? (
          <User className="w-4 h-4 text-blue-600" />
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={`flex-1 ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-white border border-neutral-200 text-neutral-900"
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.timestamp && (
          <p className="text-xs text-neutral-400 mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}
