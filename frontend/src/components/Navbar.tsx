import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Menu, User, X, Layers, BarChart3, Settings, Crown, PlayCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Modal from "./ui/modal";
import { Button } from "./ui/button";

const Navbar: React.FC = () => {
  const { user, signOut, signIn, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<null | 'signup' | 'login'>(null);
  const location = useLocation();

  // Get actual subscription tier from user profile
  const userPlan = user?.subscription?.tier ? 
    user.subscription.tier.charAt(0).toUpperCase() + user.subscription.tier.slice(1) : 
    "Free";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
      setAuthModal(null);
    } catch (error) {
      console.error('Sign in failed:', error);
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
          <div className="flex items-center justify-between w-full py-10">
            {/* Div 1: Logo */}
            <div className="flex">
              <Link to="/" className="flex">
                <img 
                  src="/logo.png" 
                  alt="Vok.ai" 
                  className="h-24 w-auto hover:opacity-80 transition-opacity "
                />
              </Link>
            </div>

            {/* Div 2: Navigation Options - Desktop Only */}
            {user && (
              <div className="hidden lg:flex items-center gap-6 ml-72">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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

            {/* Div 3: User Elements (Demo, Plan Badge, User Info) - Desktop Only */}
            <div className="hidden lg:flex items-center space-x-3">
              {user ? (
                <>
                  {/* Minimal Demo Button */}
                  <a
                    href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors"
                    title="Watch demo"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-zinc-400" />
                    Demo
                  </a>
                  {/* Plan Badge */}
                  <Link
                    to="/buy-token"
                    className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 rounded-md px-3 py-1.5 transition-colors group"
                  >
                    <Crown className={`w-3.5 h-3.5 group-hover:text-blue-300 ${
                      userPlan === 'Pro' ? 'text-blue-400' : 'text-zinc-500'
                    }`} />
                    <span className="text-xs font-medium text-zinc-300 group-hover:text-white">
                      {userPlan}
                    </span>
                  </Link>

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
                  <Button
                    onClick={() => setAuthModal('signup')}
                    className="text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    Sign Up
                  </Button>
                  <Button
                    onClick={() => setAuthModal('login')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  >
                    Log In
                  </Button>
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
                  {/* Mobile Demo Link */}
                  <a
                    href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-zinc-300 hover:text-white hover:bg-zinc-800"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <PlayCircle className="w-4 h-4 text-zinc-400" />
                    Demo
                  </a>
                </div>
                
                {/* Mobile Plan Badge */}
                <Link
                  to="/buy-token"
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors text-zinc-300 hover:text-white hover:bg-zinc-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Crown className="w-4 h-4 text-blue-400" />
                  Plan: {userPlan}
                </Link>

                {/* Mobile User Info */}
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 text-xs">{user.name}</span>
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
                <Button
                  onClick={() => {
                    setAuthModal('signup');
                    setIsMenuOpen(false);
                  }}
                  className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Up
                </Button>
                <Button
                  onClick={() => {
                    setAuthModal('login');
                    setIsMenuOpen(false);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Log In
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

        {/* Auth Modal */}
        <Modal open={!!authModal} onClose={() => setAuthModal(null)}>
          <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-4 text-center">{authModal === 'signup' ? 'Sign Up' : 'Log In'}</h2>
            <div className="space-y-4">
              <Button
                                  className="w-full justify-center bg-white text-black hover:bg-gray-100 border border-white/20 font-semibold py-3 sm:py-4 text-xs sm:text-xs md:text-sm"
                onClick={handleSignIn}
                disabled={loading}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 48 48">
                  <g>
                    <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.39 30.18 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.13 13.09 17.62 9.5 24 9.5z"/>
                    <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.03l7.19 5.6C43.98 37.13 46.1 31.34 46.1 24.55z"/>
                    <path fill="#FBBC05" d="M10.67 28.09c-1.01-2.99-1.01-6.19 0-9.18l-7.98-6.2C.99 16.36 0 20.05 0 24c0 3.95.99 7.64 2.69 11.29l7.98-6.2z"/>
                    <path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.15-5.59l-7.19-5.6c-2.01 1.35-4.59 2.15-7.96 2.15-6.38 0-11.87-3.59-14.33-8.79l-7.98 6.2C6.73 42.52 14.82 48 24 48z"/>
                  </g>
                </svg>
                {loading ? 'Signing in...' : 'Continue with Google'}
              </Button>
              <p className="text-xs text-zinc-400 text-center">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </Modal>
    </nav>
  );
};

export default Navbar; 