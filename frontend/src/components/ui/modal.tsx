import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm min-h-screen">
      <div className="relative bg-zinc-900 rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 animate-fade-in border border-white/10">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-400 hover:text-white focus:outline-none p-3 rounded-full hover:bg-zinc-800/70 transition-colors"
          aria-label="Close"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;