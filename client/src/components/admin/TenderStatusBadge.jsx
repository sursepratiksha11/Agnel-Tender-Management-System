export default function TenderStatusBadge({ status }) {
  const statusConfig = {
    DRAFT: { bg: "bg-neutral-100", text: "text-neutral-700", border: "border-neutral-200", label: "Draft" },
    PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Published" },
    CLOSED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Closed" },
  };

  const config = statusConfig[status] || statusConfig.DRAFT;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}
