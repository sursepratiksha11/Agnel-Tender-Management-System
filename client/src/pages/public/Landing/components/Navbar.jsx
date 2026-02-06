import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#howitworks" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 z-30 h-16 w-full border-b transition-colors duration-300 ${
          scrolled
            ? "bg-white border-neutral-200 shadow-sm"
            : "bg-transparent border-neutral-100"
        }`}
        aria-label="Main Navigation"
      >
        <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-8 lg:px-16 max-w-7xl">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <span className="font-semibold text-lg tracking-tight text-primary-600">
              TenderFlow AI
            </span>
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-neutral-700 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:border-primary-500 hover:text-primary-700 transition-colors"
            >
              Login
            </a>
            <a
              href="/signup"
              className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
            >
              Get Started
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg transition-colors hover:bg-neutral-100"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="w-6 h-6 text-neutral-700" />
            ) : (
              <Menu className="w-6 h-6 text-neutral-700" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl md:hidden transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-neutral-100">
            <span className="font-semibold text-lg">Menu</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-600" />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-1">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-4 py-3 text-neutral-700 hover:text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="p-4 space-y-3 border-t border-neutral-100">
            <a
              href="/login"
              className="flex items-center justify-center w-full px-4 py-3 border border-neutral-200 rounded-lg text-neutral-700 font-medium hover:border-primary-300 hover:text-primary-600 transition-all"
            >
              Login
            </a>
            <a
              href="/signup"
              className="flex items-center justify-center w-full px-4 py-3 rounded-lg bg-primary-600 text-white font-semibold shadow hover:bg-primary-700 transition-all"
            >
              Get Started
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
