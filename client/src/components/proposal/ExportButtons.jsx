import React, { useState } from 'react';
import { FileText, FileDown, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ExportButtons Component
 *
 * Provides PDF and DOCX export functionality for proposals.
 * Accessible, keyboard-navigable dropdown menu.
 *
 * @param {Object} props
 * @param {Function} props.onExportPDF - Callback when PDF export is clicked
 * @param {Function} props.onExportDOCX - Callback when DOCX export is clicked
 * @param {Function} props.onOpenExportModal - Callback to open full export modal with templates
 * @param {boolean} props.disabled - Whether export is disabled
 * @param {boolean} props.isExporting - Whether export is in progress
 */
export default function ExportButtons({
  onExportPDF,
  onExportDOCX,
  onOpenExportModal,
  disabled = false,
  isExporting = false
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      setIsOpen(!isOpen);
    }
  };

  const handleExportPDF = () => {
    setIsOpen(false);
    onExportPDF?.();
  };

  const handleExportDOCX = () => {
    setIsOpen(false);
    onExportDOCX?.();
  };

  const handleOpenModal = () => {
    setIsOpen(false);
    onOpenExportModal?.();
  };

  return (
    <div className="relative inline-block">
      {/* Main Export Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isExporting}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Export proposal options"
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
          ${disabled || isExporting
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
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
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <FileDown className="w-4 h-4" />
            <span>Export</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && !disabled && !isExporting && (
          <>
            {/* Backdrop to close on outside click */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden"
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="export-button"
            >
              {/* Quick Export Section */}
              <div className="p-2 border-b border-slate-100">
                <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Quick Export
                </p>

                <button
                  onClick={handleExportPDF}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:bg-slate-100"
                >
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Export as PDF</p>
                    <p className="text-xs text-slate-500">Formal template</p>
                  </div>
                </button>

                <button
                  onClick={handleExportDOCX}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:bg-slate-100"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Export as DOCX</p>
                    <p className="text-xs text-slate-500">Editable Word format</p>
                  </div>
                </button>
              </div>

              {/* Advanced Export */}
              <div className="p-2">
                <button
                  onClick={handleOpenModal}
                  role="menuitem"
                  className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 rounded-lg transition-colors focus:outline-none focus:bg-indigo-100"
                >
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <FileDown className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-indigo-700">Choose Template...</p>
                    <p className="text-xs text-slate-500">Formal, Modern, Minimal</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
