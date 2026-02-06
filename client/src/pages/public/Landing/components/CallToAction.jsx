export default function CallToAction() {
  return (
    <section className="w-full bg-primary-50 py-12" id="cta">
      <div className="mx-auto max-w-3xl px-4 sm:px-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 mb-6">
          Start Managing Tenders the Right Way
        </h2>
        <div className="flex gap-4">
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
    </section>
  );
}
