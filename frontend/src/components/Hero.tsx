import React, { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import Modal from "./ui/modal";
import { UserPlus, Layers, PhoneCall, Mic, BarChart3, Zap, Shield, ArrowRight, LogIn } from "lucide-react";
import CreateModule from "./CreateModule";
import Navbar from "./Navbar";
import ContactUploader from "./ContactUploader";
import { useAuth } from "../contexts/AuthContext";

const ArrowRightIcon = () => (
  <ArrowRight className="w-4 h-4 ml-2 inline-block" />
);

const featureData = [
  {
    icon: <Layers className="w-6 h-6 text-green-500" />, bg: "bg-green-50", title: "Voice Modules", desc: "Custom questions and flows."
  },
  {
    icon: <PhoneCall className="w-6 h-6 text-yellow-500" />, bg: "bg-yellow-50", title: "Outbound Calls", desc: "Call single or many."
  },
  {
    icon: <Mic className="w-6 h-6 text-purple-500" />, bg: "bg-purple-50", title: "Transcription", desc: "AI records answers."
  },
  {
    icon: <BarChart3 className="w-6 h-6 text-pink-500" />, bg: "bg-pink-50", title: "Analytics", desc: "See results & insights."
  },
];

const Hero: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [authModal, setAuthModal] = useState<null | 'signup' | 'login'>(null);
  const [createModuleOpen, setCreateModuleOpen] = useState(false);
  const { user, signIn, loading } = useAuth();
  
  const handleSignIn = async () => {
    try {
      await signIn();
      setAuthModal(null);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <>
      <section className="flex flex-col items-center justify-center min-h-screen w-full text-center px-2 sm:px-4 bg-gradient-to-br from-black via-gray-900 to-black text-white relative overflow-hidden pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_70%)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto w-full">
          <Badge 
            variant="outline" 
            className="mb-6 border-white/10 text-white/70 bg-white/5 backdrop-blur-sm"
          >
            <Zap className="w-3 h-3 mr-1" />
            AI Voice Automation Platform
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 tracking-tight md:tracking-tighter text-white font-[Sora] select-none">
            <span className="font-extrabold tracking-[-0.04em] drop-shadow-sm" style={{fontFamily: 'Sora, sans-serif'}}>Vok</span>
            <span className="font-medium tracking-[-0.04em] drop-shadow-sm" style={{fontFamily: 'Sora, sans-serif'}}>.ai</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg mb-10 max-w-2xl mx-auto font-light text-white/70 leading-relaxed">
            Automate voice calls, collect answers, and get instant insights.
          </p>
          {/* Auth or Create Module Button */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {!user ? (
              <>
                <Button variant="outline" className="text-black border-white/20 bg-white hover:bg-gray-100 font-semibold" onClick={() => setAuthModal('signup')}>
                  <UserPlus className="w-4 h-4 mr-2" /> Sign Up
                </Button>
                <Button variant="outline" className="text-black border-white/20 bg-white hover:bg-gray-100 font-semibold" onClick={() => setAuthModal('login')}>
                  <LogIn className="w-4 h-4 mr-2" /> Log In
                </Button>
              </>
            ) : (
              <Button variant="outline" className="text-black border-white/20 bg-white hover:bg-gray-100 font-semibold" onClick={() => setCreateModuleOpen(true)}>
                <Layers className="w-4 h-4 mr-2" /> Create Module
              </Button>
            )}
          </div>
          {/* Feature cards */}
          <div className="w-full flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-14 max-w-5xl w-full px-1 sm:px-2">
              {featureData.map((f) => (
                <div
                  key={f.title}
                  className="flex flex-col items-center justify-center rounded-3xl bg-white/5 px-4 sm:px-6 py-8 sm:py-10 transition-transform duration-200 hover:scale-[1.03] group min-h-[160px] sm:min-h-[200px] w-full"
                >
                  <div className={`flex items-center justify-center w-14 h-14 rounded-full ${f.bg} mb-5 group-hover:scale-105 transition-transform`}>
                    {f.icon}
                  </div>
                  <div className="text-base font-medium text-white mb-2 text-center tracking-tight">
                    {f.title}
                  </div>
                  <div className="text-xs text-white/60 text-center font-light max-w-[220px]">
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* CTA Button */}
          <Button
            size="lg"
            className="rounded-xl px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base font-semibold border border-white/10 bg-white text-black hover:bg-gray-100 hover:scale-105 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-white shadow-none"
            onClick={() => setModalOpen(true)}
          >
            Get Started <ArrowRightIcon />
          </Button>
          {/* Modal for Get Started */}
          <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
            <h2 className="text-lg font-semibold text-white mb-2 text-center">Get Started</h2>
            <p className="text-xs text-zinc-300 mb-6 text-center">Enter your details and we'll reach out soon.</p>
            <ContactUploader
              onSubmit={contacts => {
                console.log("Submitted contacts:", contacts);
                setModalOpen(false);
              }}
              onClose={() => setModalOpen(false)}
            />
          </Modal>
          {/* Auth Modal */}
          <Modal open={!!authModal} onClose={() => setAuthModal(null)}>
            <h2 className="text-lg font-semibold text-white mb-4 text-center">{authModal === 'signup' ? 'Sign Up' : 'Log In'}</h2>
            <Button
              className="w-full justify-center bg-white text-black hover:bg-gray-100 border border-white/20"
              onClick={handleSignIn}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.39 30.18 0 24 0 14.82 0 6.73 5.48 2.69 13.44l7.98 6.2C12.13 13.09 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.03l7.19 5.6C43.98 37.13 46.1 31.34 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.09c-1.01-2.99-1.01-6.19 0-9.18l-7.98-6.2C.99 16.36 0 20.05 0 24c0 3.95.99 7.64 2.69 11.29l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.18 0 11.36-2.05 15.15-5.59l-7.19-5.6c-2.01 1.35-4.59 2.15-7.96 2.15-6.38 0-11.87-3.59-14.33-8.79l-7.98 6.2C6.73 42.52 14.82 48 24 48z"/></g></svg>
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>
          </Modal>
          {/* Create Module Modal */}
          <CreateModule open={createModuleOpen} onClose={() => setCreateModuleOpen(false)} />
          
          {/* Development Status */}
          <div className="mt-8 flex items-center justify-center">
            <div className="text-xs text-white/40 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
              <span className="mr-2">Under Development</span>
              <span className="text-white/30">•</span>
              <span className="ml-2">Built by Abhigyan | IIIT Delhi</span>
            </div>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex items-center justify-center space-x-6 text-xs text-white/50">
            <span className="flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              Enterprise-Grade Security
            </span>
            <span className="flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              99.9% Uptime
            </span>
            <span className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-1" />
              Actionable Analytics
            </span>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero; 