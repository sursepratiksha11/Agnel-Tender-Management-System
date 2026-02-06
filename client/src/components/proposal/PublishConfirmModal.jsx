import React, { useEffect, useRef } from 'react';
import { X, Lock, Check, AlertTriangle, FileText, Calendar, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PublishConfirmModal Component
 *
 * Confirmation modal before publishing a proposal.
 * Shows checklist of requirements and warnings.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onConfirm - Callback when publish is confirmed
 * @param {Object} props.proposal - Proposal data
 * @param {Object} props.tender - Tender data
 * @param {number} props.completedSections - Number of completed sections
 * @param {number} props.totalSections - Total number of sections
 * @param {boolean} props.isPublishing - Whether publish is in progress
 */
export default function PublishConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  proposal,
  tender,
  completedSections = 0,
  totalSections = 0,
  isPublishing = false
}) {
  const modalRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Focus management and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus confirm button after modal opens
    setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const allSectionsComplete = completedSections === totalSections && totalSections > 0;
  const deadlineDate = tender?.submission_deadline ? new Date(tender.submission_deadline) : null;
  const daysUntilDeadline = deadlineDate
    ? Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const checklist = [
    {
      id: 'sections',
      label: `All ${totalSections} sections completed`,
      checked: allSectionsComplete,
      icon: FileText
    },
    {
      id: 'deadline',
      label: deadlineDate
        ? `Deadline: ${deadlineDate.toLocaleDateString()} (${daysUntilDeadline} days)`
        : 'No deadline specified',
      checked: daysUntilDeadline === null || daysUntilDeadline > 0,
      icon: Calendar
    },
    {
      id: 'version',
      label: `Version: v${proposal?.version || 1}`,
      checked: true,
      icon: Building
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
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden mx-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="publish-modal-title"
          aria-describedby="publish-modal-description"
        >
          {/* Header with Icon */}
          <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-8 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Lock className="w-8 h-8 text-white" />
            </motion.div>

            <h2 id="publish-modal-title" className="text-xl font-bold text-white">
              Publish Proposal
            </h2>
            <p className="text-emerald-100 text-sm mt-2">
              This action cannot be undone
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Warning Message */}
            <div
              id="publish-modal-description"
              className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6"
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  You're about to publish this proposal
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Once published, your proposal will be locked and submitted for evaluation.
                  You will not be able to make any changes.
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3 mb-6">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    ${item.checked ? 'bg-emerald-50' : 'bg-red-50'}
                  `}
                >
                  <div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center
                      ${item.checked ? 'bg-emerald-500' : 'bg-red-400'}
                    `}
                  >
                    {item.checked ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <X className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-4 h-4 ${item.checked ? 'text-emerald-600' : 'text-red-500'}`} />
                    <span className={`text-sm font-medium ${item.checked ? 'text-emerald-700' : 'text-red-600'}`}>
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Proposal Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Proposal Summary</p>
              <p className="font-semibold text-slate-800 mb-1">{tender?.title || 'Untitled Tender'}</p>
              <p className="text-sm text-slate-600">
                {completedSections} of {totalSections} sections • v{proposal?.version || 1}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isPublishing}
                className="flex-1 px-4 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <motion.button
                ref={confirmButtonRef}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                disabled={!allSectionsComplete || isPublishing}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200
                  ${allSectionsComplete && !isPublishing
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }
                `}
              >
                {isPublishing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Publish
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
