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
      icon: <Zap className="w-6 h-6 text-zinc-400" />,
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
      icon: <Rocket className="w-6 h-6 text-blue-400" />,
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
      icon: <Building2 className="w-6 h-6 text-purple-400" />,
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
      icon: <Building2 className="w-6 h-6 text-amber-400" />,
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
    <div className="min-h-screen bg-zinc-950 px-4 py-8 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            Choose Your Plan
          </h1>
          <p className="text-zinc-400 text-base max-w-2xl mx-auto">
            Simple, transparent pricing. Scale as you grow.
          </p>
          {user && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg">
              <span className="text-sm text-zinc-500">Current Plan:</span>
              <span className="text-sm font-medium text-white">{user.subscription?.tier || 'Starter'}</span>
            </div>
          )}
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {subscriptionPlans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-zinc-900 border rounded-xl p-6 transition-all flex flex-col hover:border-zinc-700 ${
                plan.popular
                  ? "border-blue-500/50 shadow-lg shadow-blue-500/10"
                  : "border-zinc-800"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-4">{plan.name}</h3>
                <div className="mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.tier !== "enterprise" && (
                      <span className="text-zinc-500 text-sm">/{plan.period}</span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-zinc-400">
                    {typeof plan.callsIncluded === 'number' 
                      ? `${plan.callsIncluded} calls included` 
                      : plan.callsIncluded}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {plan.costPerCall} per call
                  </div>
                </div>
              </div>

              <ul className="space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3 text-zinc-400">
                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              {user?.subscription?.tier === plan.tier ? (
                <Button
                  disabled
                  className="w-full py-3 text-sm font-medium rounded-lg bg-zinc-800 text-zinc-500 cursor-not-allowed"
                >
                  Current Plan
                </Button>
              ) : plan.tier === "enterprise" ? (
                <Button
                  onClick={handleContactSales}
                  className="w-full py-3 text-sm font-medium rounded-lg bg-white text-black hover:bg-zinc-100 transition-colors"
                >
                  Contact Sales
                </Button>
              ) : (
                <Button
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={loading}
                  className={`w-full py-3 text-sm font-medium rounded-lg transition-colors ${
                    plan.popular
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-zinc-800 text-white hover:bg-zinc-700"
                  }`}
                >
                  {loading ? "Processing..." : `Get Started`}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Credit Add-ons Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-3">Add-on Credits</h2>
            <p className="text-zinc-400 text-base">
              Need more calls? Purchase credits anytime. Never expires.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {creditAddons.map((addon, index) => (
              <div
                key={index}
                className={`relative bg-zinc-900 border rounded-xl p-5 transition-all hover:border-zinc-700 ${
                  addon.popular ? "border-blue-500/50" : "border-zinc-800"
                }`}
              >
                {addon.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-2.5 py-1 rounded-full text-xs font-medium">
                      Best Value
                    </span>
                  </div>
                )}
                {addon.savings !== "0%" && (
                  <div className="absolute -top-2 -right-2">
                    <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {addon.savings}
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-white mb-2">{addon.credits}</div>
                  <div className="text-sm text-zinc-500">calls</div>
                </div>

                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-white">₹{addon.price}</div>
                  <div className="text-xs text-zinc-500 mt-1">{addon.costPerCall}/call</div>
                </div>

                <Button
                  onClick={() => handleBuyCredits(addon.credits, addon.price)}
                  disabled={loading}
                  className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    addon.popular
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-zinc-800 text-white hover:bg-zinc-700"
                  }`}
                >
                  Purchase
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-16 space-y-8">
          {/* Value Proposition */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-white mb-2">₹3-6</div>
                <div className="text-sm text-zinc-400">Cost per call</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">1-2s</div>
                <div className="text-sm text-zinc-400">Response time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white mb-2">Hindi + English</div>
                <div className="text-sm text-zinc-400">Native support</div>
              </div>
            </div>
          </div>

          {/* FAQ / Contact */}
          <div className="text-center">
            <p className="text-zinc-400 text-base mb-4">
              Need a custom plan for high volume?
            </p>
            <button
              onClick={handleContactSales}
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white hover:border-zinc-700 transition-colors"
            >
              Contact Sales
            </button>
            <p className="text-zinc-600 text-sm mt-6">
              No setup fees · Cancel anytime · 7-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyToken; 