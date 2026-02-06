import React from 'react';
import { Check, Circle, Lock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * PublishWorkflow Component
 *
 * Visual stepper showing the proposal publishing workflow:
 * DRAFT → FINAL → PUBLISHED
 *
 * @param {Object} props
 * @param {string} props.currentStatus - Current proposal status ('DRAFT' | 'FINAL' | 'PUBLISHED' | 'SUBMITTED')
 * @param {Function} props.onFinalize - Callback when "Finalize" is clicked
 * @param {Function} props.onPublish - Callback when "Publish" is clicked
 * @param {boolean} props.canFinalize - Whether proposal can be finalized
 * @param {boolean} props.canPublish - Whether proposal can be published
 * @param {boolean} props.isProcessing - Whether an action is in progress
 * @param {string} props.className - Additional CSS classes
 */
export default function PublishWorkflow({
  currentStatus = 'DRAFT',
  onFinalize,
  onPublish,
  canFinalize = false,
  canPublish = false,
  isProcessing = false,
  className = ''
}) {
  // Map status to step index
  const statusToStep = {
    DRAFT: 0,
    FINAL: 1,
    PUBLISHED: 2,
    SUBMITTED: 2 // Treat SUBMITTED same as PUBLISHED for display
  };

  const currentStep = statusToStep[currentStatus] ?? 0;

  const steps = [
    {
      id: 'DRAFT',
      label: 'Draft',
      description: 'Work in progress',
      icon: Circle,
      color: 'gray'
    },
    {
      id: 'FINAL',
      label: 'Final',
      description: 'Ready for review',
      icon: Check,
      color: 'amber'
    },
    {
      id: 'PUBLISHED',
      label: 'Published',
      description: 'Submitted & locked',
      icon: Lock,
      color: 'emerald'
    }
  ];

  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  const getStepStyles = (stepIndex) => {
    const status = getStepStatus(stepIndex);
    const step = steps[stepIndex];

    const styles = {
      completed: {
        circle: 'bg-emerald-500 border-emerald-500 text-white',
        label: 'text-emerald-700 font-semibold',
        description: 'text-emerald-600',
        line: 'bg-emerald-500'
      },
      current: {
        circle: step.color === 'amber'
          ? 'bg-amber-500 border-amber-500 text-white'
          : step.color === 'emerald'
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'bg-slate-500 border-slate-500 text-white',
        label: step.color === 'amber'
          ? 'text-amber-700 font-semibold'
          : step.color === 'emerald'
            ? 'text-emerald-700 font-semibold'
            : 'text-slate-700 font-semibold',
        description: step.color === 'amber'
          ? 'text-amber-600'
          : step.color === 'emerald'
            ? 'text-emerald-600'
            : 'text-slate-600',
        line: 'bg-slate-300'
      },
      upcoming: {
        circle: 'bg-white border-slate-300 text-slate-400',
        label: 'text-slate-400',
        description: 'text-slate-400',
        line: 'bg-slate-200'
      }
    };

    return styles[status];
  };

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Publishing Workflow</h3>
          <p className="text-sm text-slate-500 mt-1">
            Track your proposal through the publishing process
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Progress Line Background */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-200" aria-hidden="true" />

        {/* Progress Line Fill */}
        <motion.div
          className="absolute top-6 left-6 h-0.5 bg-emerald-500"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ maxWidth: 'calc(100% - 3rem)' }}
          aria-hidden="true"
        />

        {/* Step Indicators */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const styles = getStepStyles(index);
            const status = getStepStatus(index);
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center"
                role="listitem"
                aria-current={status === 'current' ? 'step' : undefined}
              >
                {/* Circle */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: status === 'current' ? 1.1 : 1 }}
                  className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center
                    transition-colors duration-300 ${styles.circle}
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <StepIcon className="w-5 h-5" />
                  )}
                </motion.div>

                {/* Label */}
                <p className={`mt-3 text-sm font-medium ${styles.label}`}>
                  {step.label}
                </p>

                {/* Description */}
                <p className={`text-xs ${styles.description} mt-1`}>
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {currentStatus === 'DRAFT' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onFinalize}
            disabled={!canFinalize || isProcessing}
            className={`
              flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200
              ${canFinalize && !isProcessing
                ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
            aria-label="Finalize proposal for review"
          >
            {isProcessing ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                />
                Processing...
              </>
            ) : (
              <>
                Finalize for Review
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>
        )}

        {currentStatus === 'FINAL' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPublish}
            disabled={!canPublish || isProcessing}
            className={`
              flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200
              ${canPublish && !isProcessing
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
            aria-label="Publish and submit proposal"
          >
            {isProcessing ? (
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
                <Lock className="w-4 h-4" />
                Publish Proposal
              </>
            )}
          </motion.button>
        )}

        {(currentStatus === 'PUBLISHED' || currentStatus === 'SUBMITTED') && (
          <div className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-semibold text-sm">
              Proposal Published & Locked
            </span>
          </div>
        )}

        {!canFinalize && currentStatus === 'DRAFT' && (
          <p className="text-xs text-slate-500 text-center sm:text-left mt-2 sm:mt-0">
            Complete all sections to finalize
          </p>
        )}
      </div>
    </div>
  );
}
