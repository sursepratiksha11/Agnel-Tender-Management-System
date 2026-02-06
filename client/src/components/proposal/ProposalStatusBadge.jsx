import React from 'react';
import { Circle, CheckCircle, Lock, Clock, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * ProposalStatusBadge Component
 *
 * Displays the current status of a proposal with appropriate styling.
 * Supports: DRAFT, FINAL, PUBLISHED, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED
 *
 * @param {Object} props
 * @param {string} props.status - Proposal status
 * @param {string} props.size - Badge size ('sm' | 'md' | 'lg')
 * @param {boolean} props.showIcon - Whether to show status icon
 * @param {boolean} props.animated - Whether to animate the badge
 * @param {string} props.className - Additional CSS classes
 */
export default function ProposalStatusBadge({
  status = 'DRAFT',
  size = 'md',
  showIcon = true,
  animated = false,
  className = ''
}) {
  const statusConfig = {
    DRAFT: {
      label: 'Draft',
      icon: Circle,
      colors: 'bg-slate-100 text-slate-700 border-slate-200',
      iconColor: 'text-slate-500',
      description: 'Work in progress'
    },
    FINAL: {
      label: 'Final',
      icon: CheckCircle,
      colors: 'bg-amber-100 text-amber-700 border-amber-200',
      iconColor: 'text-amber-500',
      description: 'Ready for review'
    },
    PUBLISHED: {
      label: 'Published',
      icon: Lock,
      colors: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-500',
      description: 'Submitted & locked'
    },
    SUBMITTED: {
      label: 'Submitted',
      icon: Lock,
      colors: 'bg-blue-100 text-blue-700 border-blue-200',
      iconColor: 'text-blue-500',
      description: 'Awaiting evaluation'
    },
    UNDER_REVIEW: {
      label: 'Under Review',
      icon: Clock,
      colors: 'bg-purple-100 text-purple-700 border-purple-200',
      iconColor: 'text-purple-500',
      description: 'Being evaluated'
    },
    ACCEPTED: {
      label: 'Accepted',
      icon: CheckCircle,
      colors: 'bg-green-100 text-green-700 border-green-200',
      iconColor: 'text-green-500',
      description: 'Bid accepted'
    },
    REJECTED: {
      label: 'Rejected',
      icon: XCircle,
      colors: 'bg-red-100 text-red-700 border-red-200',
      iconColor: 'text-red-500',
      description: 'Bid not selected'
    },
    EXPIRED: {
      label: 'Expired',
      icon: AlertCircle,
      colors: 'bg-gray-100 text-gray-600 border-gray-200',
      iconColor: 'text-gray-400',
      description: 'Deadline passed'
    }
  };

  const config = statusConfig[status] || statusConfig.DRAFT;
  const Icon = config.icon;

  const sizeClasses = {
    sm: {
      badge: 'px-2 py-0.5 text-xs',
      icon: 'w-3 h-3',
      gap: 'gap-1'
    },
    md: {
      badge: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
      gap: 'gap-1.5'
    },
    lg: {
      badge: 'px-4 py-2 text-base',
      icon: 'w-5 h-5',
      gap: 'gap-2'
    }
  };

  const sizeStyle = sizeClasses[size] || sizeClasses.md;

  const BadgeContent = (
    <>
      {showIcon && (
        <Icon className={`${sizeStyle.icon} ${config.iconColor}`} aria-hidden="true" />
      )}
      <span className="font-semibold">{config.label}</span>
    </>
  );

  if (animated) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`
          inline-flex items-center ${sizeStyle.gap} ${sizeStyle.badge}
          ${config.colors} border rounded-full
          ${className}
        `}
        role="status"
        aria-label={`Status: ${config.label} - ${config.description}`}
      >
        {BadgeContent}
      </motion.span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center ${sizeStyle.gap} ${sizeStyle.badge}
        ${config.colors} border rounded-full
        ${className}
      `}
      role="status"
      aria-label={`Status: ${config.label} - ${config.description}`}
    >
      {BadgeContent}
    </span>
  );
}

/**
 * ProposalStatusDot Component
 *
 * Simple colored dot indicator for compact displays
 */
export function ProposalStatusDot({ status = 'DRAFT', className = '' }) {
  const dotColors = {
    DRAFT: 'bg-slate-400',
    FINAL: 'bg-amber-500',
    PUBLISHED: 'bg-emerald-500',
    SUBMITTED: 'bg-blue-500',
    UNDER_REVIEW: 'bg-purple-500',
    ACCEPTED: 'bg-green-500',
    REJECTED: 'bg-red-500',
    EXPIRED: 'bg-gray-400'
  };

  const color = dotColors[status] || dotColors.DRAFT;

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} ${className}`}
      role="status"
      aria-label={`Status: ${status}`}
    />
  );
}
