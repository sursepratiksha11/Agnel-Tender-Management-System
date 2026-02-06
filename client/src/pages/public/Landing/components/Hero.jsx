export default function Hero() {
  return (
    <section className="w-full bg-white pt-8 pb-12 md:pt-16 md:pb-20" id="hero">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        {/* Left Column */}
        <div className="flex-1 flex flex-col items-start justify-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-950 mb-4 leading-tight">
            AI-Powered Tender Creation, Analysis & Proposal Drafting
          </h1>
          <p className="text-sm md:text-base text-neutral-700 max-w-xl mb-6">
            Manage complex government and enterprise tenders with structured
            workflows, AI assistance, and full auditability. TenderFlow AI
            streamlines every step for authorities and bidders, ensuring
            clarity, compliance, and speed.
          </p>
          <ul className="mb-6 space-y-2">
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              Create tenders faster with AI
            </li>
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              Understand large documents instantly
            </li>
            <li className="flex items-center gap-2 text-neutral-800 text-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-600"></span>
              Draft compliant proposals with AI
            </li>
          </ul>
          <div className="flex gap-3">
            <a
              href="/signup"
              className="px-6 py-2 rounded-md bg-primary-600 text-white text-base font-semibold shadow hover:bg-primary-700 transition-colors"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="px-6 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-base font-medium hover:border-primary-500 hover:text-primary-700 transition-colors"
            >
              Login
            </a>
          </div>
        </div>
        {/* Right Column */}
        <div className="flex-1 flex items-center justify-center w-full">
          {/* Placeholder SVG illustration */}
          <div className="w-full max-w-xs md:max-w-md aspect-square bg-neutral-100 rounded-xl flex items-center justify-center">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="10"
                y="20"
                width="100"
                height="80"
                rx="12"
                fill="#e0f2fe"
              />
              <rect
                x="25"
                y="35"
                width="70"
                height="10"
                rx="3"
                fill="#bae6fd"
              />
              <rect
                x="25"
                y="50"
                width="70"
                height="10"
                rx="3"
                fill="#7dd3fc"
              />
              <rect
                x="25"
                y="65"
                width="40"
                height="10"
                rx="3"
                fill="#38bdf8"
              />
              <rect
                x="25"
                y="80"
                width="55"
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
