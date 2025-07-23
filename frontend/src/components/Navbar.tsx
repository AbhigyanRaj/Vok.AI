import React, { useEffect, useState } from "react";
import { Layers, BarChart3, Settings, Menu, LogOut, User } from "lucide-react";
import { Link } from 'react-router-dom';
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile } from "../lib/firebase";

const navLinks = [
  { label: "My Modules", icon: <Layers className="w-5 h-5 md:w-4 md:h-4 mr-0 md:mr-1" />, href: "/modules" },
  { label: "Analytics", icon: <BarChart3 className="w-5 h-5 md:w-4 md:h-4 mr-0 md:mr-1" />, href: "/analytics" },
  { label: "Settings", icon: <Settings className="w-5 h-5 md:w-4 md:h-4 mr-0 md:mr-1" />, href: "/settings" },
];

const Navbar: React.FC = () => {
  const [tokens, setTokens] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    let unsub = false;
    const fetchTokens = async () => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (!unsub) setTokens(profile ? profile.tokens : 0);
      } else {
        setTokens(null);
      }
    };
    fetchTokens();
    return () => { unsub = true; };
  }, [user]);

  return (
    <nav className="w-full flex items-center px-4 md:px-6 py-4 bg-transparent backdrop-blur-md fixed top-0 left-0 z-30 ">
      {/* Logo (left) */}
      <div className="flex items-center select-none z-10">
        <Link to="/" className="flex items-center gap-1">
          <span className="text-xl font-extrabold tracking-tight text-white font-[Sora]">Vok</span>
          <span className="text-xl font-medium tracking-tight text-white font-[Sora]">.ai</span>
        </Link>
      </div>
      {/* Absolutely centered nav links */}
      <div className="hidden md:flex gap-8 lg:gap-10 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {navLinks.map(link => (
          <Link
            key={link.label}
            to={link.href}
            className="flex items-center text-white/80 hover:text-white font-medium text-base transition-colors px-2 md:px-3 py-2 rounded-lg"
          >
            {link.icon}
            <span className="hidden md:inline ml-1">{link.label}</span>
          </Link>
        ))}
      </div>
      {/* Token display and buy button (right) */}
      <div className="flex items-center gap-2 md:gap-4 ml-auto z-10">
        {user && (
          <span className="bg-blue-900/60 text-blue-200 px-2 md:px-3 py-1 rounded-lg font-semibold text-xs md:text-sm select-none border border-blue-400/30">
            Tokens: {tokens !== null ? tokens : "..."}
          </span>
        )}
        <Link
          to="/buy-token"
          className="bg-blue-500 hover:bg-blue-600 text-white px-2 md:px-3 py-1 rounded-lg font-medium text-xs md:text-sm transition-colors border border-blue-400/30"
        >
          Buy Tokens
        </Link>
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <User className="w-3 h-3" />
              <span className="hidden md:inline">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg font-medium text-xs transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        )}
        {/* Hamburger for mobile */}
        <button className="md:hidden ml-2 p-2 rounded hover:bg-white/10" onClick={() => setMobileOpen(v => !v)} aria-label="Open menu">
          <Menu className="w-6 h-6 text-white" />
        </button>
      </div>
      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 flex flex-col items-center justify-start pt-24 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="flex flex-col gap-6 w-full max-w-xs mx-auto bg-zinc-900/95 rounded-xl p-6 shadow-lg border border-white/10">
            {navLinks.map(link => (
              <Link
                key={link.label}
                to={link.href}
                className="flex items-center gap-3 text-white text-lg font-semibold py-2 px-3 rounded-lg hover:bg-blue-900/30 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            <Link
              to="/buy-token"
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-base transition-colors border border-blue-400/30 justify-center"
              onClick={() => setMobileOpen(false)}
            >
              Buy Tokens
            </Link>
            {user && (
              <>
                <div className="flex items-center gap-2 text-white/80 text-sm py-2 px-3">
                  <User className="w-4 h-4" />
                  <span>{user.displayName || user.email}</span>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-base transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 