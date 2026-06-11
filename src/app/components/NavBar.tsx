import React, { useState } from "react";
import { NavLink } from "react-router";
import { Menu, X } from "lucide-react";
import imgLogo from "../../imports/Frame28/8db2f9ecea5ebe90a67ef819abf5dc64a0577460.png";
import {
  IconHome,
  IconHelpCircle,
  IconDownload,
  IconLifeBuoy,
  IconGitMerge,
  IconGithub,
} from "./icons";

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const navItems = [
    { to: "/", label: "Home", icon: (color: string) => <IconHome color={color} /> },
    { to: "/how-it-works", label: "How It Works", icon: (color: string) => <IconHelpCircle color={color} /> },
    { to: "/download", label: "Download", icon: (color: string) => <IconDownload color={color} /> },
    { to: "/manual", label: "Manual", icon: (color: string) => <IconLifeBuoy color={color} /> },
    { to: "/updates", label: "Updates", icon: (color: string) => <IconGitMerge color={color} /> },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-white/5 font-['Montserrat',sans-serif]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 group">
          <img
            alt="Folded Logo"
            src={imgLogo}
            className="w-10 h-10 object-contain transition-transform group-hover:scale-105 duration-200"
          />
          <span className="text-xl font-black text-white tracking-widest">FOLDED</span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-white text-[#09090b]"
                    : "text-white hover:bg-white/5"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.icon(isActive ? "#09090B" : "white")}
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* External GitHub Link */}
          <a
            href="https://github.com/IvanWithSuccess/folded-app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:bg-white/5 transition-all duration-200"
          >
            <IconGithub color="white" />
            <span>GitHub</span>
          </a>
        </nav>

        {/* Mobile menu toggle */}
        <button
          onClick={toggleMenu}
          className="lg:hidden text-white hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile Navigation Panel */}
      {isOpen && (
        <div className="lg:hidden bg-[#09090b] border-b border-white/5 animate-in slide-in-from-top-5 duration-200">
          <nav className="flex flex-col px-6 py-6 gap-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#09090b]"
                      : "text-white hover:bg-white/5"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon(isActive ? "#09090B" : "white")}
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <a
              href="https://github.com/IvanWithSuccess/folded-app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold text-white hover:bg-white/5 transition-all duration-200"
            >
              <IconGithub color="white" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
