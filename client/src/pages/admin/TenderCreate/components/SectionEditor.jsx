import { useState, useEffect } from "react";
import { FileText, Lock } from "lucide-react";

export default function SectionEditor({ section, onUpdate, tenderTitle }) {
  const [content, setContent] = useState("");

  useEffect(() => {
    setContent(section?.content || "");
  }, [section?.id]);

  const handleContentChange = (value) => {
    setContent(value);
    if (onUpdate) {
      onUpdate({ content: value });
    }
  };

  if (!section) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-neutral-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-base font-medium text-neutral-900 mb-2">
            No section selected
          </h3>
          <p className="text-sm text-neutral-500">
            Select a section from the left panel to start editing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="p-4 border-b border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-neutral-900 truncate">
                {section.title}
              </h3>
              {section.mandatory && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                  <Lock className="w-3 h-3" />
                  Mandatory
                </span>
              )}
            </div>
            {tenderTitle && (
              <p className="text-xs text-neutral-500 mt-1">
                Tender: {tenderTitle}
              </p>
            )}
          </div>
          <div className="text-xs text-neutral-500">
            {content.length} chars
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder={`Write the content for "${section.title}" section...\n\nUse the AI assistant on the right for suggestions and improvements.`}
          className="w-full h-full p-4 text-sm text-neutral-900 placeholder:text-neutral-400 resize-none focus:outline-none"
        />
      </div>

      {/* Editor Footer */}
      <div className="p-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-4">
            <span>Words: {content.split(/\s+/).filter(w => w).length}</span>
            <span>Characters: {content.length}</span>
          </div>
          {section.mandatory && content.trim().length === 0 && (
            <span className="text-amber-600 font-medium">
              Content required to proceed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
