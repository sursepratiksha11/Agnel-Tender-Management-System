export default function HowItWorks() {
  return (
    <section className="w-full bg-neutral-50 py-12" id="howitworks">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16">
        <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-8">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Authority Flow */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-medium text-neutral-900 mb-4">
              For Authorities
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-neutral-800 text-sm">
              <li>Create tender and define requirements</li>
              <li>Build sections with AI suggestions</li>
              <li>Review and publish in locked mode</li>
            </ol>
          </div>
          {/* Bidder Flow */}
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <h3 className="font-medium text-neutral-900 mb-4">For Bidders</h3>
            <ol className="list-decimal list-inside space-y-2 text-neutral-800 text-sm">
              <li>Browse published tenders</li>
              <li>Analyze requirements with AI</li>
              <li>Draft and submit proposals</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
