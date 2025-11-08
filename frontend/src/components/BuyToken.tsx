import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Check, Zap, Rocket, Building2 } from "lucide-react";
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

  const subscriptionPlans = [
    {
      name: "Starter",
      tier: "starter",
      price: "₹999",
      period: "month",
      icon: <Zap className="w-6 h-6 text-zinc-400" />,
      popular: false,
      callsIncluded: 100,
      costPerCall: "₹10",
      additionalCallRate: "₹12",
      features: [
        "100 calls/month included",
        "₹12 per additional call",
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
      price: "₹3,999",
      period: "month",
      icon: <Rocket className="w-6 h-6 text-blue-400" />,
      popular: true,
      callsIncluded: 500,
      costPerCall: "₹8",
      additionalCallRate: "₹10",
      features: [
        "500 calls/month included",
        "₹10 per additional call",
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
      price: "₹9,999",
      period: "month",
      icon: <Building2 className="w-6 h-6 text-purple-400" />,
      popular: false,
      callsIncluded: 1500,
      costPerCall: "₹6.66",
      additionalCallRate: "₹8",
      features: [
        "1,500 calls/month included",
        "₹8 per additional call",
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
      icon: <Building2 className="w-6 h-6 text-amber-400" />,
      popular: false,
      callsIncluded: "Custom",
      costPerCall: "Negotiable",
      additionalCallRate: "Volume discount",
      features: [
        "Custom call volume (5K+ calls)",
        "Volume-based pricing (₹5-7/call)",
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

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">
            Scale Your Voice Calling Operations
          </h1>
          <p className="text-zinc-400 text-sm max-w-2xl mx-auto mb-2">
            Transparent, volume-based pricing designed for businesses. Pay only for what you use with no hidden fees.
          </p>
          <p className="text-zinc-500 text-xs">
            💰 Cost per call: ₹8-12 • 🚀 No setup fees • 📞 Unlimited modules • 🌐 Hindi + English support
          </p>
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-md px-4 py-2">
              <span className="text-sm text-zinc-400">
                Current Plan: <span className="font-semibold text-blue-400">{user.subscription?.tier || 'Starter'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {subscriptionPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-zinc-900/30 border rounded-lg p-5 transition-all flex flex-col ${
                plan.popular
                  ? "border-zinc-700"
                  : "border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2.5 py-0.5 rounded-md text-xs">
                    Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-5">
                <div className="flex justify-center mb-2">
                  {plan.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1.5">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-1.5">
                  <span className="text-2xl font-semibold text-white">{plan.price}</span>
                  {plan.tier !== "free" && plan.tier !== "enterprise" && (
                    <span className="text-zinc-500 text-xs">/{plan.period}</span>
                  )}
                  {plan.tier === "free" && (
                    <span className="text-zinc-500 text-xs">{plan.period}</span>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  {typeof plan.callsIncluded === 'number' 
                    ? `${plan.callsIncluded} calls included` 
                    : plan.callsIncluded}
                  {" • "}
                  {plan.costPerCall} per call
                </div>
              </div>

              <ul className="space-y-2 mb-5 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-2 text-zinc-400">
                    <Check className="w-3 h-3 text-zinc-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              {user?.subscription?.tier === plan.tier ? (
                <Button
                  disabled
                  className="w-full py-2 text-xs font-medium rounded-md bg-zinc-800/50 text-zinc-500 cursor-not-allowed border border-zinc-800"
                >
                  Current Plan
                </Button>
              ) : plan.tier === "enterprise" ? (
                <Button
                  onClick={handleContactSales}
                  className="w-full py-2 text-xs font-medium rounded-md bg-white text-black hover:bg-zinc-100 transition-all"
                >
                  Contact Sales
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={loading}
                  className={`w-full py-2 text-xs font-medium rounded-md transition-all ${
                    plan.popular
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-white text-black hover:bg-zinc-100"
                  }`}
                >
                  {loading ? "Processing..." : `Upgrade to ${plan.name}`}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-10 space-y-6">
          {/* Value Proposition */}
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">Why Choose Vok.AI?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-1">₹8-12</div>
                <div className="text-xs text-zinc-400">Per call (vs ₹20-30 competitors)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-1">0.9-1.8s</div>
                <div className="text-xs text-zinc-400">Response latency (industry-leading)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400 mb-1">Hindi+EN</div>
                <div className="text-xs text-zinc-400">Native bilingual support</div>
              </div>
            </div>
          </div>

          {/* FAQ / Contact */}
          <div className="text-center">
            <p className="text-zinc-400 text-sm mb-2">
              Need a custom plan for 5,000+ calls/month?
            </p>
            <button
              onClick={handleContactSales}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium underline"
            >
              Contact Sales for Volume Discounts
            </button>
            <p className="text-zinc-600 text-xs mt-3">
              All plans include: No setup fees • Cancel anytime • 7-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyToken; 