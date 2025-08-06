import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Menu, User, X, Home, Layers, BarChart3, Settings, Coins, Plus } from "lucide-react";
import * as auth from "../lib/auth";
import { Link, useLocation } from "react-router-dom";

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const location = useLocation();

  React.useEffect(() => {
    const fetchTokens = async () => {
      if (user) {
        const profile = await auth.getUserProfile(user._id);
        setUserTokens(profile ? profile.tokens : user.tokens);
      }
    };
    fetchTokens();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const navItems = [
    { name: "My Voice Modules", path: "/modules", icon: <Layers className="w-4 h-4" /> },
    { name: "Analytics", path: "/analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { name: "Settings", path: "/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-sm">
      <div className="w-full mx-auto">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-10">
          {/* Parent Div containing all three sections */}
          <div className="flex items-center justify-between w-full">
            {/* Div 1: Logo */}
            <div className="flex">
              <Link to="/" className="flex">
                <h1 className="text-xl font-bold text-white hover:text-blue-400 transition-colors">Vok.ai</h1>
              </Link>
            </div>

            {/* Div 2: Navigation Options - Desktop Only */}
            {user && (
              <div className="hidden lg:flex items-center gap-6 ml-72">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === item.path
                        ? "text-blue-400 bg-blue-400/10"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/50"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Div 3: User Elements (Buy Tokens, Token Display, User Info) - Desktop Only */}
            <div className="hidden lg:flex items-center space-x-3">
              {user ? (
                <>
                  {/* Buy Tokens Button */}
                  <Link
                    to="/buy-token"
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buy Tokens
                  </Link>

                  {/* Token Display */}
                  <div className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/30 rounded-md px-2.5 py-1.5">
                    <Coins className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-medium text-white">
                      {userTokens !== null ? userTokens : user.tokens} tokens
                    </span>
                  </div>

                  {/* User Info & Logout */}
                  <div className="flex items-center space-x-1.5">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-zinc-400" />
                      <span className="text-zinc-300 text-xs">{user.name}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-zinc-400 hover:text-white transition-colors p-1"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                /* Login/Signup Buttons */
                <div className="flex items-center space-x-2">
                  <Link
                    to="/"
                    className="text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    Log In
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="px-4 py-3 space-y-3 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800">
            {user ? (
              <>
                {/* Mobile Navigation */}
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                        location.pathname === item.path
                          ? "text-blue-400 bg-blue-400/10"
                          : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </div>
                
                {/* Mobile Buy Tokens Button */}
                <Link
                  to="/buy-token"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium transition-colors text-zinc-300 hover:text-white hover:bg-zinc-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Plus className="w-4 h-4" />
                  Buy Tokens
                </Link>
                
                {/* Mobile Token Display */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <Coins className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">
                    {userTokens !== null ? userTokens : user.tokens} tokens
                  </span>
                </div>

                {/* Mobile User Info */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-sm">{user.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="text-zinc-400 hover:text-white transition-colors p-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              /* Mobile Auth Buttons */
              <div className="space-y-2">
                <Link
                  to="/"
                  className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
                <Link
                  to="/"
                  className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 