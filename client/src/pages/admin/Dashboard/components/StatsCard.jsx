export default function StatsCard({ title, value, tone = "neutral", loading = false }) {
  const toneClasses = {
    neutral: {
      value: "text-neutral-900",
      label: "text-neutral-600",
      bg: "bg-white",
      border: "border-neutral-200",
    },
    positive: {
      value: "text-emerald-600",
      label: "text-neutral-600",
      bg: "bg-white",
      border: "border-neutral-200",
    },
    warning: {
      value: "text-amber-600",
      label: "text-neutral-600",
      bg: "bg-white",
      border: "border-neutral-200",
    },
  };

  const c = toneClasses[tone] || toneClasses.neutral;

  return (
    <div className={`${c.bg} p-6 rounded-lg border ${c.border}`}>
      {loading ? (
        <>
          <div className="h-8 bg-neutral-200 rounded animate-pulse w-16 mb-2"></div>
          <div className="h-4 bg-neutral-100 rounded animate-pulse w-24"></div>
        </>
      ) : (
        <>
          <div className={`text-2xl font-bold ${c.value}`}>{value}</div>
          <div className={`text-sm mt-1 ${c.label}`}>{title}</div>
        </>
      )}
    </div>
  );
}
