const links = {
  Product: ["Features", "How it Works", "Security"],
  Company: ["About", "Careers", "Blog"],
  Legal: ["Terms", "Privacy"],
  Contact: ["Support", "Email"],
};

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-neutral-100 py-8 mt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16 flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="font-semibold text-lg text-neutral-900 mb-4 md:mb-0">
          TenderFlow AI
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full md:w-auto">
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <div className="text-xs font-medium text-neutral-500 mb-2">
                {group}
              </div>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-neutral-700 hover:text-primary-600 transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16 mt-8 text-xs text-neutral-400 text-center">
        &copy; {new Date().getFullYear()} TenderFlow AI. All rights reserved.
      </div>
    </footer>
  );
}
