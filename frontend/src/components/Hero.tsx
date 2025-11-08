import React, { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import Modal from "./ui/modal";
import { UserPlus, Layers, PhoneCall, Mic, BarChart3, Zap, Shield, ArrowRight, LogIn, Check } from "lucide-react";
import CreateModule from "./CreateModule";
import ContactUploader from "./ContactUploader";
import { useAuth } from "../contexts/AuthContext";
import * as auth from "../lib/auth";

const ArrowRightIcon = () => (
  <ArrowRight className="w-4 h-4 ml-2 inline-block" />
);

const featureData = [
  {
    icon: <Layers className="w-6 h-6 text-blue-500" />, bg: "bg-blue-50", title: "Create Questions", desc: "Build custom lead qualification questions."
  },
  {
    icon: <PhoneCall className="w-6 h-6 text-green-500" />, bg: "bg-green-50", title: "Bulk Calling", desc: "Call 100s of customers automatically."
  },
  {
    icon: <Mic className="w-6 h-6 text-purple-500" />, bg: "bg-purple-50", title: "AI Evaluation", desc: "Extract Yes/No/Maybe from conversations."
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-pink-500" />, bg: "bg-pink-50", title: "Smart Analytics", desc: "Track conversion rates per module."
  },
];

const Hero: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [authModal, setAuthModal] = useState<null | 'signup' | 'login'>(null);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [userModules, setUserModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [modalStep, setModalStep] = useState<'module-selection' | 'contact-upload'>('module-selection');
  const { user, signIn, loading } = useAuth();
  
  const loadUserModules = useCallback(async () => {
    if (!user) return;
    
    setLoadingModules(true);
    try {
      const modules = await auth.getUserModules(user._id);
      setUserModules(modules);
    } catch (error) {
      console.error('Failed to load modules:', error);
    } finally {
      setLoadingModules(false);
    }
  }, [user]);

  // Load user modules when modal opens
  useEffect(() => {
    if (modalOpen && user) {
      loadUserModules();
      setSelectedModule(null);
    }
  }, [modalOpen, user, loadUserModules]);

  const handleSignIn = async () => {
    try {
      await signIn();
      setAuthModal(null);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedModule(null);
  };

  return (
    <>
      <section className="flex flex-col items-center justify-center min-h-screen w-full text-center px-3 sm:px-4 md:px-6 bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden pt-16 sm:pt-20 md:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_70%)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <Badge 
            variant="outline" 
            className="mb-4 sm:mb-6 border-white/10 text-white/70 bg-white/5 backdrop-blur-sm text-xs px-3 py-1"
          >
            <Zap className="w-3 h-3 mr-1" />
            AI Voice Automation Platform
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-3 sm:mb-4 tracking-tight md:tracking-tighter text-white font-[Sora] select-none px-2">
            <span className="font-extrabold tracking-[-0.04em] drop-shadow-sm" style={{fontFamily: 'Sora, sans-serif'}}>Vok</span>
            <span className="font-medium tracking-[-0.04em] drop-shadow-sm" style={{fontFamily: 'Sora, sans-serif'}}>.ai</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto font-light text-white/70 leading-relaxed px-4">
            Create questions, call customers, and let AI extract Yes/No/Maybe from conversations.
          </p>
          
          {/* Demo Video */}
          <div className="mb-8 sm:mb-10 md:mb-12 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/20 backdrop-blur-sm border border-white/10">
                <iframe
                  src="https://www.youtube.com/embed/mM4SGf_Mhm0"
                  title="Vok.AI Demo - AI-Powered Voice Calling Platform"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              </div>
              <p className="text-xs text-white/50 text-center mt-3">
                Watch Vok.AI in action - Complete platform demo
              </p>
            </div>
          </div>
          {/* Auth or Create Module Button */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-6 sm:mb-8 md:mb-10 px-4">
            {!user ? (
              <>
                <Button variant="outline" className="text-black border-white/20 bg-white hover:bg-gray-100 font-semibold text-xs sm:text-sm py-2.5 sm:py-3" onClick={() => setAuthModal('signup')}>
                  <UserPlus className="w-4 h-4 mr-2" /> Sign Up
                </Button>
                <Button variant="outline" className="text-black border-white/20 bg-white hover:bg-gray-100 font-semibold text-xs sm:text-sm py-2.5 sm:py-3" onClick={() => setAuthModal('login')}>
                  <LogIn className="w-4 h-4 mr-2" /> Log In
                </Button>
              </>
            ) : (
              <Button variant="outline" className="text-black border-white/20 bg-white hover:bg-gray-100 font-semibold text-xs sm:text-sm py-2.5 sm:py-3" onClick={() => setCreateModuleOpen(true)}>
                <Layers className="w-4 h-4 mr-2" /> Create Module
              </Button>
            )}
          </div>
          {/* Feature cards */}
          <div className="w-full flex justify-center px-3 sm:px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8 sm:mb-10 md:mb-14 max-w-5xl w-full">
              {featureData.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl bg-white/5 px-4 sm:px-5 lg:px-6 py-6 sm:py-7 lg:py-8 transition-transform duration-200 hover:scale-[1.02] sm:hover:scale-[1.03] group min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] w-full"
                >
                  <div className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full ${f.bg} mb-4 sm:mb-5 group-hover:scale-105 transition-transform`}>
                    {f.icon}
                  </div>
                  <div className="text-xs sm:text-sm lg:text-base font-medium text-white mb-2 text-center tracking-tight">
                    {f.title}
                  </div>
                  <div className="text-xs text-white/60 text-center font-light max-w-[180px] sm:max-w-[200px] lg:max-w-[220px]">
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* CTA Button */}
                      <Button
              size="lg"
              className="rounded-xl px-6 sm:px-8 lg:px-10 py-3 sm:py-4 lg:py-5 text-xs sm:text-xs lg:text-sm font-semibold border border-white/10 bg-white text-black hover:bg-gray-100 hover:scale-105 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-white shadow-none"
              onClick={() => setModalOpen(true)}
            >
              Get Started <ArrowRightIcon />
            </Button>
          {/* Modal for Get Started */}
          <Modal open={modalOpen} onClose={handleModalClose}>
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto">
              {!user ? (
                <>
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 text-center">Get Started</h2>
                  <p className="text-xs text-zinc-300 mb-4 sm:mb-6 text-center">Upload your contacts to begin</p>
                  <ContactUploader
                    userModules={userModules}
                    onSubmit={contacts => {
                      console.log("Submitted contacts:", contacts);
                      setModalOpen(false);
                    }}
                    onClose={() => setModalOpen(false)}
                  />
                </>
              ) : (
                <>
                  <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 text-center">Upload Contacts</h2>
                  <p className="text-xs text-zinc-300 mb-4 sm:mb-6 text-center">Select a module and upload contacts to start calling</p>
                  <ContactUploader
                    userModules={userModules}
                    selectedModule={selectedModule}
                    onSubmit={contacts => {
                      console.log("Submitted contacts:", contacts);
                      console.log("Selected module:", selectedModule);
                      setModalOpen(false);
                      setSelectedModule(null);
                    }}
                    onClose={handleModalClose}
                  />
                </>
              )}
            </div>
          </Modal>
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
          {/* Create Module Modal */}
          <CreateModule open={createModuleOpen} onClose={() => setCreateModuleOpen(false)} />
          
          {/* Development Status */}
          <div className="mt-6 sm:mt-8 md:mt-10 mb-6 sm:mb-8 md:mb-10 flex items-center justify-center px-4">
            <div className="text-xs text-white/40 bg-white/5 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full border border-white/10 text-center">
              <span className="mr-2">Under Development</span>
              <span className="text-white/30">•</span>
              <span className="ml-2">Built by Abhigyan | IIIT Delhi</span>
            </div>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-6 sm:mt-8 md:mt-12 mb-8 sm:mb-12 md:mb-16 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6 text-xs sm:text-sm md:text-base text-white/50 px-4">
            <span className="flex items-center">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Enterprise-Grade Security
            </span>
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="flex items-center">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              99.9% Uptime
            </span>
            <span className="hidden sm:inline text-white/30">•</span>
            <span className="flex items-center">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Actionable Analytics
            </span>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero; 