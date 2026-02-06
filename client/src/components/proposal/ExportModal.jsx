import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Download, Check, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ExportModal Component
 *
 * Full-screen modal for selecting export template and format.
 * Shows live preview of each template style.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onExport - Callback with { format, template } when export is confirmed
 * @param {Object} props.proposal - Proposal data for preview
 * @param {Object} props.tender - Tender data for preview
 * @param {boolean} props.isExporting - Whether export is in progress
 */
export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  proposal,
  tender,
  isExporting = false
}) {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedTemplate, setSelectedTemplate] = useState('formal');
  const [showPreview, setShowPreview] = useState(false);
  const modalRef = useRef(null);

  // Focus trap and escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus the modal
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleExport = () => {
    onExport?.({
      format: selectedFormat,
      template: selectedTemplate
    });
  };

  const templates = [
    {
      id: 'formal',
      name: 'Formal',
      description: 'Traditional, professional layout with serif fonts. Best for government tenders.',
      preview: {
        headerColor: 'bg-slate-800',
        accentColor: 'border-slate-600',
        fontStyle: 'font-serif'
      }
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Clean, contemporary design with bold accents. Great for corporate bids.',
      preview: {
        headerColor: 'bg-gradient-to-r from-indigo-600 to-purple-600',
        accentColor: 'border-indigo-500',
        fontStyle: 'font-sans'
      }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple, content-focused layout. Ideal for quick exports.',
      preview: {
        headerColor: 'bg-white border-b-2 border-slate-200',
        accentColor: 'border-slate-300',
        fontStyle: 'font-sans'
      }
    }
  ];

  const formats = [
    {
      id: 'pdf',
      name: 'PDF',
      icon: FileText,
      color: 'text-red-600 bg-red-100',
      description: 'Non-editable, print-ready'
    },
    {
      id: 'docx',
      name: 'DOCX',
      icon: FileText,
      color: 'text-blue-600 bg-blue-100',
      description: 'Editable Word document'
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div>
              <h2 id="export-modal-title" className="text-xl font-bold text-slate-900">
                Export Proposal
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose a template and format for your export
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Template Selection */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
                  Select Template
                </h3>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                        ${selectedTemplate === template.id
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }
                      `}
                      aria-pressed={selectedTemplate === template.id}
                    >
                      <div className="flex items-start gap-4">
                        {/* Mini Preview */}
                        <div className={`w-16 h-20 rounded-lg border ${template.preview.accentColor} overflow-hidden flex-shrink-0 shadow-sm`}>
                          <div className={`h-4 ${template.preview.headerColor}`} />
                          <div className="p-1.5 space-y-1">
                            <div className="h-1 bg-slate-300 rounded w-full" />
                            <div className="h-1 bg-slate-200 rounded w-3/4" />
                            <div className="h-1 bg-slate-200 rounded w-1/2" />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-semibold ${selectedTemplate === template.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                              {template.name}
                            </span>
                            {selectedTemplate === template.id && (
                              <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Format Selection */}
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 mt-8">
                  Select Format
                </h3>
                <div className="flex gap-3">
                  {formats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`
                        flex-1 p-4 rounded-xl border-2 text-center transition-all duration-200
                        ${selectedFormat === format.id
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }
                      `}
                      aria-pressed={selectedFormat === format.id}
                    >
                      <div className={`w-10 h-10 rounded-lg ${format.color} flex items-center justify-center mx-auto mb-2`}>
                        <format.icon className="w-5 h-5" />
                      </div>
                      <p className={`font-semibold ${selectedFormat === format.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                        {format.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Live Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Preview
                  </h3>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {/* Preview Card */}
                <div className="bg-slate-100 rounded-xl p-4 h-80 overflow-hidden">
                  <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden transform scale-[0.6] origin-top-left w-[166%]">
                    {/* Document Preview */}
                    <TemplatePreview
                      template={selectedTemplate}
                      tender={tender}
                      proposal={proposal}
                      showDetails={showPreview}
                    />
                  </div>
                </div>

                {/* Export Info */}
                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                  <h4 className="font-medium text-slate-800 mb-2">Export Details</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Cover page with proposal details
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Table of contents
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      All sections with headers
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      Page numbers and footer
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-all duration-200
                ${isExporting
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                }
              `}
            >
              {isExporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {selectedFormat.toUpperCase()}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * TemplatePreview Component
 * Renders a preview of the selected template
 */
function TemplatePreview({ template, tender, proposal, showDetails }) {
  const templates = {
    formal: {
      headerBg: 'bg-slate-800',
      headerText: 'text-white',
      titleFont: 'font-serif',
      bodyFont: 'font-serif',
      accentColor: 'border-slate-600'
    },
    modern: {
      headerBg: 'bg-gradient-to-r from-indigo-600 to-purple-600',
      headerText: 'text-white',
      titleFont: 'font-sans',
      bodyFont: 'font-sans',
      accentColor: 'border-indigo-500'
    },
    minimal: {
      headerBg: 'bg-white',
      headerText: 'text-slate-800',
      titleFont: 'font-sans',
      bodyFont: 'font-sans',
      accentColor: 'border-slate-300'
    }
  };

  const style = templates[template] || templates.formal;

  return (
    <div className={`h-full ${style.bodyFont}`}>
      {/* Cover Page Header */}
      <div className={`${style.headerBg} ${style.headerText} p-8 text-center`}>
        <p className="text-xs uppercase tracking-widest opacity-75 mb-2">
          Tender Proposal
        </p>
        <h1 className={`text-2xl font-bold ${style.titleFont} mb-4`}>
          {tender?.title || 'Proposal Title'}
        </h1>
        <div className={`w-16 h-0.5 ${template === 'minimal' ? 'bg-slate-300' : 'bg-white/50'} mx-auto`} />
      </div>

      {/* Content Preview */}
      <div className="p-8">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Submitted By</p>
            <p className="font-semibold text-slate-800">Organization Name</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Date</p>
            <p className="text-slate-600">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Version</p>
            <p className="text-slate-600">v{proposal?.version || 1}</p>
          </div>

          {showDetails && (
            <>
              <div className={`border-t ${style.accentColor} pt-4 mt-6`}>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Sections</p>
                <div className="space-y-2">
                  <div className="h-2 bg-slate-200 rounded w-3/4" />
                  <div className="h-2 bg-slate-200 rounded w-1/2" />
                  <div className="h-2 bg-slate-200 rounded w-2/3" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 px-8 py-3 border-t border-slate-200 flex justify-between text-xs text-slate-400">
        <span>TenderFlow AI</span>
        <span>Page 1</span>
      </div>
    </div>
  );
}
