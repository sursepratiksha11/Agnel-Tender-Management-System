export default function SolutionOverview() {
  return (
    <section className="w-full bg-white py-12" id="solution">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        {/* Left: Text */}
        <div className="flex-1 flex flex-col items-start justify-center">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-4">
            How TenderFlow AI Solves These Problems
          </h2>
          <ul className="space-y-3 mb-2">
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              Structured tender sections for clarity
            </li>
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              AI-assisted creation and analysis
            </li>
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              Role-based workflows for authorities and bidders
            </li>
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              Immutable publish model for auditability
            </li>
          </ul>
        </div>
        {/* Right: Placeholder Visual */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-xs md:max-w-md aspect-square bg-neutral-100 rounded-xl flex items-center justify-center">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="60" cy="60" r="50" fill="#e0f2fe" />
              <rect
                x="35"
                y="40"
                width="50"
                height="10"
                rx="3"
                fill="#bae6fd"
              />
              <rect
                x="35"
                y="55"
                width="50"
                height="10"
                rx="3"
                fill="#7dd3fc"
              />
              <rect
                x="35"
                y="70"
                width="30"
                height="10"
                rx="3"
                fill="#38bdf8"
              />
              <rect
                x="35"
                y="85"
                width="40"
                height="10"
                rx="3"
                fill="#0ea5e9"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
