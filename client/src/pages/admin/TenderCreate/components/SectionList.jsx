import { useState } from "react";
import { Plus, ChevronUp, ChevronDown, GripVertical, Edit2, Trash2, Lock } from "lucide-react";

export default function SectionList({
  sections,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartEdit = (section) => {
    setEditingId(section.id);
    setEditTitle(section.title);
  };

  const handleSaveEdit = (id) => {
    if (editTitle.trim()) {
      onUpdate(id, { title: editTitle });
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900">Sections</h3>
          <span className="text-xs text-neutral-500">{sections.length}</span>
        </div>
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      </div>

      {/* Section List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sections.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-neutral-500">No sections yet</p>
            <p className="text-xs text-neutral-400 mt-1">Click Add Section to start</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className={`group relative rounded-lg border transition-all ${
                  selectedId === section.id
                    ? "bg-blue-50 border-blue-300 shadow-sm"
                    : "bg-white border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {/* Section Item */}
                <div
                  className="p-3 cursor-pointer"
                  onClick={() => onSelect(section.id)}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                    
                    <div className="flex-1 min-w-0">
                      {editingId === section.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleSaveEdit(section.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(section.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium truncate ${
                                selectedId === section.id ? "text-blue-900" : "text-neutral-900"
                              }`}>
                                {section.title}
                              </span>
                              {section.mandatory && (
                                <Lock className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              )}
                            </div>
                            {section.content && (
                              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                                {section.content.substring(0, 50)}...
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {editingId !== section.id && (
                    <div className="flex items-center gap-1 mt-2 ml-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(section.id, "up");
                        }}
                        disabled={index === 0}
                        className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReorder(section.id, "down");
                        }}
                        disabled={index === sections.length - 1}
                        className="p-1 text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(section);
                        }}
                        className="p-1 text-neutral-400 hover:text-blue-600"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!section.mandatory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${section.title}"?`)) {
                              onDelete(section.id);
                            }
                          }}
                          className="p-1 text-neutral-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
