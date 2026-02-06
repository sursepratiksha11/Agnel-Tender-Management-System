const capabilities = [
  "Suggest standard tender sections",
  "Draft eligibility and technical clauses",
  "Explain complex requirements",
  "Assist proposal drafting",
  "Highlight compliance risks",
];

export default function AICapabilities() {
  return (
    <section className="w-full bg-white py-12" id="ai">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-8">
          AI Capabilities
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          {capabilities.map((c, i) => (
            <li
              key={i}
              className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-center gap-2 text-neutral-800 text-sm"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              {c}
            </li>
          ))}
        </ul>
        <div className="text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded p-3 max-w-xl">
          <strong className="text-neutral-800">Trust Note:</strong> AI assists
          decision-making. All outputs remain editable and traceable for full
          control and compliance.
        </div>
      </div>
    </section>
  );
}
