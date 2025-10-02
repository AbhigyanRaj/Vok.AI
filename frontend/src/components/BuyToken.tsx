import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { CreditCard, Package, Zap, Check } from "lucide-react";
import * as auth from "../lib/auth";

const BuyToken: React.FC = () => {
  const { user } = useAuth();
  const [userTokens, setUserTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchTokens = async () => {
      if (user) {
        const profile = await auth.getUserProfile(user._id);
        setUserTokens(profile ? profile.tokens : 0);
      }
    };
    fetchTokens();
  }, [user]);

  const handleBuyTokens = async (amount: number) => {
    if (!user) return;
    
    setLoading(true);
    try {
      await auth.incrementUserTokens(user._id, amount);
      setSuccess(`Successfully added ${amount} tokens!`);
      
      // Refresh token count
      const profile = await auth.getUserProfile(user._id);
      setUserTokens(profile ? profile.tokens : 0);
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error buying tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const tokenPackages = [
    {
      name: "Starter",
      tokens: 200,
      price: "₹99",
      popular: false,
      features: ["40 Voice Calls", "Basic Analytics", "Email Support", "Standard Voice Quality"]
    },
    {
      name: "Professional",
      tokens: 1000,
      price: "₹399",
      popular: true,
      features: ["200 Voice Calls", "Advanced Analytics", "Priority Support", "Custom Modules", "HD Voice Quality"]
    },
    {
      name: "Business",
      tokens: 3000,
      price: "₹999",
      popular: false,
      features: ["600 Voice Calls", "Full Analytics", "24/7 Support", "Custom Integration", "API Access", "Premium Voice Quality"]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-zinc-950 px-2 sm:px-4 py-8 sm:py-10 pt-24">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center mt-12 sm:mt-20">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-sans mb-4">
            Buy Tokens
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Choose a package to get started with voice-powered complaint logging
          </p>
          {userTokens !== null && (
            <div className="mt-4 text-blue-400 font-semibold">
              Current Balance: {userTokens} tokens
            </div>
          )}
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-center">
            {success}
          </div>
        )}

        {/* Token Packages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {tokenPackages.map((pkg, index) => (
            <div
              key={index}
              className={`relative bg-zinc-900 border rounded-2xl p-6 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl ${
                pkg.popular
                  ? "border-blue-500 bg-blue-950/20"
                  : "border-zinc-700 hover:border-zinc-600"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-3xl font-bold text-white">{pkg.price}</span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold">
                  <Zap className="w-5 h-5" />
                  <span>{pkg.tokens} tokens</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {pkg.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3 text-zinc-300">
                    <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleBuyTokens(pkg.tokens)}
                disabled={loading || !user}
                className={`w-full ${
                  pkg.popular
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-zinc-700 hover:bg-zinc-600"
                } text-white font-semibold transition-colors`}
              >
                {loading ? "Processing..." : `Buy ${pkg.tokens} Tokens`}
              </Button>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center text-zinc-400 text-sm max-w-2xl">
          <p className="mb-4">
            <strong className="text-zinc-200">Cost per call: 5 tokens</strong> - Each voice call consumes 5 tokens. 
            Unused tokens roll over to the next month.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-blue-400 font-semibold mb-1">Starter Plan</div>
              <div className="text-xs text-zinc-400">₹99/month = 40 calls</div>
              <div className="text-xs text-zinc-500">₹2.48 per call</div>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-blue-400 font-semibold mb-1">Professional Plan</div>
              <div className="text-xs text-zinc-400">₹399/month = 200 calls</div>
              <div className="text-xs text-zinc-500">₹1.99 per call</div>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="text-blue-400 font-semibold mb-1">Business Plan</div>
              <div className="text-xs text-zinc-400">₹999/month = 600 calls</div>
              <div className="text-xs text-zinc-500">₹1.67 per call</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyToken; 