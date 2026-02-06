const features = [
  "Structured Tender Builder",
  "Context-Aware AI Chat",
  "Section-wise Proposal Drafting",
  "Role-Based Access Control",
  "Read-only Publish Mode",
  "Organization-level Data Isolation",
];

export default function KeyFeatures() {
  return (
    <section className="w-full bg-neutral-50 py-12" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-8">
          Key Features
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white border border-neutral-200 rounded-lg p-6 flex items-center text-neutral-800 text-sm font-medium shadow-sm"
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
