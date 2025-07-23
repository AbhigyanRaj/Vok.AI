import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { FaStar, FaRocket, FaCrown } from "react-icons/fa";
import { incrementUserTokens, getUserProfile } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

const plans = [
  {
    name: "Starter",
    amount: 100,
    price: "₹199",
    features: [
      "100 tokens",
      "Basic support",
      "Access to all core features",
    ],
    recommended: false,
  },
  {
    name: "Pro",
    amount: 500,
    price: "₹599",
    features: [
      "500 tokens",
      "Priority support",
      "Advanced analytics",
      "Unlimited modules",
    ],
    recommended: true,
  },
  {
    name: "Enterprise",
    amount: 1000,
    price: "₹1199",
    features: [
      "1000 tokens",
      "Dedicated support",
      "Custom integrations",
      "Team management",
      "Early access to new features",
    ],
    recommended: false,
  },
];

const planIcons = {
  Starter: <span className="text-gray-400 text-3xl mb-2"><FaStar /></span>,
  Pro: <span className="text-gray-400 text-3xl mb-2"><FaRocket /></span>,
  Enterprise: <span className="text-gray-400 text-3xl mb-2"><FaCrown /></span>,
};

const BuyToken: React.FC = () => {
  const [purchased, setPurchased] = useState<number | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchTokens = async () => {
      const profile = user ? await getUserProfile(user.uid) : null;
      setTokens(profile ? profile.tokens : 0);
    };
    fetchTokens();
  }, [user]);

  const handleBuy = async () => {
    if (!selectedPlan || !user) return;
    const plan = plans.find((p) => p.name === selectedPlan);
    if (!plan) return;
    await incrementUserTokens(user.uid, plan.amount);
    const profile = await getUserProfile(user.uid);
    setTokens(profile ? profile.tokens : 0);
    setPurchased(plan.amount);
    setTimeout(() => setPurchased(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-2 sm:px-4 py-8 sm:py-10 pt-24">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center mt-16 sm:mt-20">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 text-center font-sans tracking-tight">Choose Your Plan</h1>
        <p className="text-zinc-400 text-center mb-8 sm:mb-10 max-w-lg text-base sm:text-lg">Select a token plan that fits your needs. Each plan comes with a set of features and tokens to help you get the most out of VokAI.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.name;
            return (
              <div
                key={plan.name}
                className={`flex flex-col items-center border rounded-2xl p-6 sm:p-8 shadow-sm transition-all duration-200 cursor-pointer relative w-full bg-zinc-900/80
                  ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-700 hover:border-blue-400'}
                `}
                style={{ minHeight: 0, minWidth: 0 }}
                onClick={() => setSelectedPlan(plan.name)}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-800 text-blue-400 text-xs font-medium px-3 py-0.5 rounded-full border border-blue-400/20">Recommended</span>
                )}
                <div className="flex flex-col items-center mb-2">
                  {planIcons[plan.name as keyof typeof planIcons]}
                  <div className="text-lg font-semibold text-white mb-1 tracking-wide">{plan.name}</div>
                </div>
                <div className="text-2xl font-bold text-blue-400 mb-2">{plan.price}</div>
                <div className="text-sm text-zinc-300 mb-4 font-medium">{plan.amount} tokens</div>
                <ul className="flex-1 w-full mb-6 space-y-2">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center text-zinc-200 text-sm">
                      <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBuy(); }}
                    className={`w-full py-2 rounded-lg font-semibold text-base transition-colors border mt-2
                      bg-blue-600 text-white border-blue-500 hover:bg-blue-700
                      ${purchased ? 'opacity-60 pointer-events-none' : ''}`}
                    disabled={!!purchased}
                  >
                    {purchased === plan.amount ? `+${plan.amount} tokens added!` : `Buy ${plan.name}`}
                  </button>
                )}
                {!isSelected && (
                  <button
                    className="w-full py-2 rounded-lg font-semibold text-base border border-zinc-700 bg-zinc-800 text-zinc-400 mt-2 opacity-70 cursor-pointer"
                    disabled
                  >
                    Click to select
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="w-full flex flex-col items-center gap-2 mt-10 sm:mt-12">
          <div className="text-sm sm:text-base text-blue-200 font-semibold">Current Balance: <span className="font-bold text-white text-lg">{tokens || 0}</span> tokens</div>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-5 sm:px-7 py-2 rounded-lg bg-zinc-800 text-white font-semibold border border-white/10 hover:bg-zinc-700 transition-colors text-base sm:text-lg shadow-sm"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyToken; 