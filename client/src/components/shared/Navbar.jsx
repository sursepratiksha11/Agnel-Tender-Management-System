import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#howitworks" },
  { label: "Security", href: "#security" },
];

export default function Navbar({ variant = "public" }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
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
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-semibold text-lg tracking-tight text-primary-600">
            TenderFlow AI
          </span>
        </Link>

        {/* Desktop Nav Links */}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="px-4 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:border-primary-500 hover:text-primary-700 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-semibold shadow hover:bg-primary-700 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
