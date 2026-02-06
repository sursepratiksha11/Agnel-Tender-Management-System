export default function Security() {
  return (
    <section className="w-full bg-white py-12" id="security">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-8">
          Security & Compliance
        </h2>
        <ul className="space-y-4 text-neutral-800 text-sm">
          <li>
            <strong>Role-based access:</strong> Only authorized users can view
            or edit tenders and proposals.
          </li>
          <li>
            <strong>Immutable published tenders:</strong> Once published,
            tenders cannot be altered, ensuring auditability.
          </li>
          <li>
            <strong>Organization-level data isolation:</strong> Data is strictly
            separated between organizations for privacy and compliance.
          </li>
          <li>
            <strong>Future audit readiness:</strong> All actions are logged for
            future audits and regulatory requirements.
          </li>
        </ul>
      </div>
    </section>
  );
}
