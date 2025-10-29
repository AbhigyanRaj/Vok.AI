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
      name: "Free",
      tier: "free",
      price: "₹0",
      period: "forever",
      icon: <Zap className="w-6 h-6 text-zinc-500" />,
      popular: false,
      callsPerDay: 10,
      maxModules: 3,
      features: [
        "10 calls per day",
        "3 voice modules",
        "5 questions per module",
        "Basic AI evaluation",
        "Twilio TTS voice",
        "7-day analytics retention",
        "Email support"
      ]
    },
    {
      name: "Pro",
      tier: "pro",
      price: "₹29",
      period: "month",
      icon: <Rocket className="w-6 h-6 text-blue-400" />,
      popular: true,
      callsPerDay: 100,
      maxModules: 20,
      features: [
        "100 calls per day",
        "20 voice modules",
        "15 questions per module",
        "Advanced AI evaluation",
        "Premium ElevenLabs voices",
        "Bulk calling (50 contacts)",
        "90-day analytics retention",
        "Priority email support",
        "Export data (CSV/Excel)"
      ]
    },
    {
      name: "Enterprise",
      tier: "enterprise",
      price: "Custom",
      period: "pricing",
      icon: <Building2 className="w-6 h-6 text-zinc-500" />,
      popular: false,
      callsPerDay: "Unlimited",
      maxModules: "Unlimited",
      features: [
        "Unlimited calls per day",
        "Unlimited voice modules",
        "Unlimited questions",
        "Custom AI evaluation criteria",
        "Custom voice cloning",
        "Unlimited bulk calling",
        "Forever analytics retention",
        "Dedicated account manager",
        "Phone support",
        "API access + Webhooks",
        "White-label option",
        "Custom integrations"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold text-white mb-2">
            Choose Your Plan
          </h1>
          <p className="text-zinc-500 text-xs">
            Select the perfect subscription plan for your voice calling needs
          </p>
          {user && (
            <div className="mt-4 inline-flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-1.5">
              <span className="text-xs text-zinc-400">
                Current: <span className="font-medium text-zinc-300">{user.subscription?.tier || 'Free'}</span>
              </span>
            </div>
          )}
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  {typeof plan.callsPerDay === 'number' 
                    ? `${plan.callsPerDay} calls/day` 
                    : plan.callsPerDay}
                  {" • "}
                  {typeof plan.maxModules === 'number'
                    ? `${plan.maxModules} modules`
                    : plan.maxModules}
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
        <div className="mt-8 text-center">
          <div className="text-zinc-500 text-xs">
            <p>Need a custom plan? <span className="text-zinc-400 hover:text-zinc-300 cursor-pointer">Contact sales</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyToken; 