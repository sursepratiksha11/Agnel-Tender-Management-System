import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { tenderService } from "../../../services/tenderService";
import PageHeader from "../../../components/shared/PageHeader";
import TenderStatusBadge from "../../../components/admin/TenderStatusBadge";
import { FileText, Calendar, Building, Tag, DollarSign, Lock } from "lucide-react";

export default function TenderView() {
  const { tenderId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTender() {
      setLoading(true);
      setError(null);
      try {
        const data = await tenderService.getTender(tenderId, token);
        setTender(data);
      } catch (err) {
        setError(err.message || "Failed to load tender");
      } finally {
        setLoading(false);
      }
    }
    if (token && tenderId) loadTender();
  }, [tenderId, token]);

  if (loading) {
    return (
      <div className="px-6 py-6 mx-auto max-w-5xl">
        <div className="text-center py-12 text-neutral-600">Loading tender...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-6 mx-auto max-w-5xl">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate("/admin/tenders")}
          className="px-4 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 font-medium hover:bg-neutral-50"
        >
          Back to Tenders
        </button>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="px-6 py-6 mx-auto max-w-5xl">
        <div className="text-center py-12 text-neutral-600">Tender not found</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 mx-auto max-w-5xl">
      <PageHeader
        title={tender.title}
        description="Tender Details (Read-Only)"
        actions={
          tender.status === "PUBLISHED" && (
            <Link
              to={`/admin/bid-evaluation/${tender.tender_id}`}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
            >
              View Bids
            </Link>
          )
        }
      />

      {/* Document Preview Card */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden mb-6">
        {/* Header */}
        <div className="bg-neutral-900 text-white px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wide text-neutral-400">
                  Tender Document
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-2">{tender.title}</h1>
              <p className="text-sm text-neutral-300">
                {tender.description}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TenderStatusBadge status={tender.status} />
            </div>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="px-8 py-6 bg-neutral-50 border-b border-neutral-200">
          <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-700 mb-4">
            Tender Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Issuing Authority</p>
                <p className="text-sm font-medium text-neutral-900 mt-0.5">
                  {tender.issuing_authority || "Not specified"}
                </p>
              </div>
            </div>

            {tender.category && (
              <div className="flex items-start gap-3">
                <Tag className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Category</p>
                  <p className="text-sm font-medium text-neutral-900 mt-0.5">
                    {tender.category}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Submission Deadline</p>
                <p className="text-sm font-medium text-neutral-900 mt-0.5">
                  {new Date(tender.submission_deadline).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {tender.estimated_value && (
              <div className="flex items-start gap-3">
                <DollarSign className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-neutral-500">Estimated Value</p>
                  <p className="text-sm font-medium text-neutral-900 mt-0.5">
                    ₹ {Number(tender.estimated_value).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-neutral-500">Published At</p>
                <p className="text-sm font-medium text-neutral-900 mt-0.5">
                  {new Date(tender.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sections Content */}
        {tender.sections && tender.sections.length > 0 && (
          <div className="px-8 py-6">
            <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-700 mb-4">
              Tender Sections
            </h3>
            <div className="space-y-6">
              {tender.sections.map((section, index) => (
                <div
                  key={section.section_id}
                  className="pb-6 border-b border-neutral-200 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-neutral-500">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h4 className="text-base font-semibold text-neutral-900">
                        {section.title}
                      </h4>
                      {section.is_mandatory && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-xs font-medium text-amber-700">
                          <Lock className="w-3 h-3" />
                          Mandatory
                        </span>
                      )}
                    </div>
                  </div>

                  {section.content ? (
                    <div className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed bg-neutral-50 p-3 rounded border border-neutral-200">
                      {section.content}
                    </div>
                  ) : (
                    <div className="bg-neutral-50 border border-neutral-200 rounded px-3 py-2">
                      <p className="text-sm text-neutral-500">
                        No content provided for this section
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 bg-neutral-50 border-t border-neutral-200">
          <p className="text-xs text-neutral-500 text-center">
            This is the official tender document for bidders
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate("/admin/tenders")}
          className="px-4 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
        >
          Back to Tenders
        </button>
        {tender.status === "PUBLISHED" && (
          <Link
            to={`/admin/bid-evaluation/${tender.tender_id}`}
            className="px-4 py-2 rounded-md bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Evaluate Bids
          </Link>
        )}
      </div>
    </div>
  );
}
