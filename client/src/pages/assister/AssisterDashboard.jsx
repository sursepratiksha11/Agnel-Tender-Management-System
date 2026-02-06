/**
 * Assister Dashboard
 * Shows assigned sections from bidders with ability to view/comment/edit based on permissions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  MessageSquare,
  Edit3,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Building2,
  ChevronRight,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { assisterService } from '../../services/assister/assisterService';

export default function AssisterDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    canEdit: 0,
    canComment: 0,
    completed: 0,
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assisterService.getMyAssignments();
      setAssignments(data.assignments || []);
      setStats(data.stats || { total: 0, canEdit: 0, canComment: 0, completed: 0 });
    } catch (err) {
      console.error('Failed to load assignments:', err);
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSection = (assignment) => {
    if (assignment.tender_type === 'platform') {
      navigate(`/assister/proposal/${assignment.proposal_id}/section/${assignment.section_id}`);
    } else {
      navigate(`/assister/uploaded/${assignment.uploaded_tender_id}/section/${assignment.section_key}`);
    }
  };

  const getPermissionBadge = (permission) => {
    if (permission === 'EDIT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <Edit3 className="w-3 h-3" />
          Can Edit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
        <MessageSquare className="w-3 h-3" />
        Can Comment
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.name || 'Assister'}
        </h1>
        <p className="text-slate-600 mt-1">
          {user?.specialty && (
            <span className="inline-flex items-center gap-1">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-sm font-medium rounded">
                {user.specialty}
              </span>
              <span className="mx-2">•</span>
            </span>
          )}
          Here are your assigned sections to assist with
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              <p className="text-sm text-slate-500">Total Assignments</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.canEdit}</p>
              <p className="text-sm text-slate-500">Can Edit</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.canComment}</p>
              <p className="text-sm text-slate-500">Can Comment</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.completed}</p>
              <p className="text-sm text-slate-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Your Assignments</h2>
          <p className="text-sm text-slate-500 mt-1">
            Sections assigned to you by bidders
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No Sections Assigned
            </h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You haven't been assigned to any proposal sections yet.
              When a bidder assigns you to assist with a section, it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {assignments.map((assignment, idx) => (
              <div
                key={`${assignment.tender_type}-${assignment.section_id || assignment.section_key}-${idx}`}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleOpenSection(assignment)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {/* Tender Title */}
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <h3 className="font-medium text-slate-900 truncate">
                        {assignment.tender_title || 'Untitled Tender'}
                      </h3>
                      {assignment.tender_type === 'uploaded' && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                          Uploaded
                        </span>
                      )}
                    </div>

                    {/* Section Info */}
                    <div className="flex items-center gap-3 text-sm text-slate-600 mb-2">
                      <span className="font-medium">
                        Section: {assignment.section_title || assignment.section_key}
                      </span>
                      {assignment.section_word_count && (
                        <>
                          <span>•</span>
                          <span>{assignment.section_word_count} words</span>
                        </>
                      )}
                    </div>

                    {/* Assigned By */}
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <User className="w-3.5 h-3.5" />
                      <span>
                        Assigned by {assignment.assigned_by_name || 'Bidder'}
                      </span>
                      {assignment.organization_name && (
                        <>
                          <span>•</span>
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{assignment.organization_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Permission Badge & Action */}
                  <div className="flex items-center gap-3 ml-4">
                    {getPermissionBadge(assignment.permission)}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
