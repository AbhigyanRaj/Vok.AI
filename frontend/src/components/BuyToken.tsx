import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import * as auth from "../lib/auth";

const BuyToken: React.FC = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (tier: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const updatedUser = await auth.upgradePlan(tier);
      if (updatedUser && setUser) {
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSales = () => {
    window.location.href = 'mailto:sales@vok.ai?subject=Enterprise Plan Inquiry';
  };

  const handleBuyCredits = async (credits: number, price: number) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // TODO: Implement credit purchase
      console.log(`Purchasing ${credits} credits for ₹${price}`);
      alert(`Credit purchase coming soon! ${credits} calls for ₹${price}`);
    } catch (error) {
      console.error('Error purchasing credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscriptionPlans = [
    {
      name: "Starter",
      tier: "starter",
      price: "₹499",
      period: "month",
      popular: false,
      callsIncluded: 100,
      costPerCall: "₹4.99",
      features: [
        "100 calls/month included",
        "Buy more credits anytime",
        "5 voice modules",
        "10 questions per module",
        "Hindi + English support",
        "Google TTS premium voices",
        "Basic AI analytics",
        "30-day call history",
        "Email support",
        "CSV export"
      ]
    },
    {
      name: "Growth",
      tier: "growth",
      price: "₹1,999",
      period: "month",
      popular: true,
      callsIncluded: 500,
      costPerCall: "₹3.99",
      features: [
        "500 calls/month included",
        "Buy more credits anytime",
        "Unlimited voice modules",
        "Unlimited questions",
        "Hindi + English support",
        "Google TTS premium voices",
        "Advanced AI analytics",
        "90-day call history",
        "Priority email support",
        "Bulk upload (500 contacts)",
        "CSV/Excel export",
        "Real-time call monitoring"
      ]
    },
    {
      name: "Business",
      tier: "business",
      price: "₹4,999",
      period: "month",
      popular: false,
      callsIncluded: 1500,
      costPerCall: "₹3.33",
      features: [
        "1,500 calls/month included",
        "Buy more credits anytime",
        "Unlimited voice modules",
        "Unlimited questions",
        "Multi-language support",
        "Google TTS premium voices",
        "AI-powered insights & reports",
        "Unlimited call history",
        "Priority support (24/7)",
        "Bulk upload (unlimited)",
        "API access",
        "Webhook integrations",
        "Team collaboration (5 users)",
        "Custom voice training"
      ]
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price: "Custom",
      period: "pricing",
      popular: false,
      callsIncluded: "Custom",
      costPerCall: "From ₹2.50",
      features: [
        "Custom call volume (5K+ calls)",
        "Volume-based pricing (₹2.50-3/call)",
        "Unlimited everything",
        "Multi-language support (10+ languages)",
        "Custom voice cloning",
        "Dedicated infrastructure",
        "White-label solution",
        "Custom AI models",
        "Dedicated account manager",
        "24/7 phone support",
        "SLA guarantee (99.9% uptime)",
        "Custom integrations",
        "Unlimited team users",
        "On-premise deployment option"
      ]
    }
  ];

  const creditAddons = [
    {
      credits: 100,
      price: 599,
      costPerCall: "₹5.99",
      savings: "0%",
      popular: false
    },
    {
      credits: 250,
      price: 1399,
      costPerCall: "₹5.60",
      savings: "7%",
      popular: false
    },
    {
      credits: 500,
      price: 2499,
      costPerCall: "₹4.99",
      savings: "17%",
      popular: true
    },
    {
      credits: 1000,
      price: 4499,
      costPerCall: "₹4.50",
      savings: "25%",
      popular: false
    },
    {
      credits: 2500,
      price: 9999,
      costPerCall: "₹4.00",
      savings: "33%",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-black px-6 py-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            Pricing
          </h1>
          <p className="text-zinc-500 text-lg">
            Choose the plan that fits your needs
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {subscriptionPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-zinc-950 border transition-all flex flex-col ${
                plan.popular
                  ? "border-white"
                  : "border-zinc-900 hover:border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-white text-black px-3 py-1 text-xs font-medium">
                  Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="text-lg font-medium text-white mb-8">{plan.name}</h3>
                <div className="mb-8">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-white tracking-tight">{plan.price}</span>
                    {plan.tier !== "enterprise" && (
                      <span className="text-zinc-600 text-base">/{plan.period}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-zinc-600">
                    {typeof plan.callsIncluded === 'number' 
                      ? `${plan.callsIncluded} calls` 
                      : plan.callsIncluded}
                  </div>
                </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.slice(0, 6).map((feature, featureIndex) => (
                  <li key={featureIndex} className="text-sm text-zinc-500">
                    {feature}
                  </li>
                ))}
              </ul>

              {user?.subscription?.tier === plan.tier ? (
                <Button
                  disabled
                  className="w-full py-3 text-sm font-medium bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-900"
                >
                  Current Plan
                </Button>
              ) : plan.tier === "enterprise" ? (
                <Button
                  onClick={handleContactSales}
                  className="w-full py-3 text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors border-0"
                >
                  Contact Sales
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={loading}
                  className={`w-full py-3 text-sm font-medium transition-colors border-0 ${
                    plan.popular
                      ? "bg-white text-black hover:bg-zinc-200"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {loading ? "Processing..." : `Get Started`}
                </Button>
              )}
              </div>
            </div>
          ))}
        </div>

        {/* Add-on Credits - Minimal */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-medium text-white mb-2">Need more calls?</h2>
            <p className="text-zinc-600 text-sm">
              Purchase additional credits anytime
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {creditAddons.slice(1, 4).map((addon, index) => (
              <button
                key={index}
                onClick={() => handleBuyCredits(addon.credits, addon.price)}
                disabled={loading}
                className="bg-zinc-950 border border-zinc-900 hover:border-zinc-800 transition-colors p-6 text-left"
              >
                <div className="text-2xl font-bold text-white mb-1">{addon.credits}</div>
                <div className="text-sm text-zinc-600 mb-4">calls</div>
                <div className="text-lg font-medium text-white">₹{addon.price}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-32 text-center">
          <p className="text-zinc-600 text-sm mb-6">
            Need a custom plan?
          </p>
          <button
            onClick={handleContactSales}
            className="text-white hover:text-zinc-400 transition-colors text-sm underline underline-offset-4"
          >
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyToken; 