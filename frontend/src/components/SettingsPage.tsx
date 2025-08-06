import React, { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  User,
  Bell,
  Shield,
  CreditCard,
  Settings,
  Key,
  Globe,
  Palette,
  Volume2,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Download,
  Upload,
  Trash2,
  LogOut,
  HelpCircle,
  Info,
  CheckCircle,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import * as auth from "../lib/auth";

interface UserSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    callReminders: boolean;
    weeklyReports: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    allowTracking: boolean;
    publicProfile: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    dateFormat: string;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordChangeRequired: boolean;
  };
  voice: {
    defaultVoice: string;
    speechRate: number;
    volume: number;
  };
}

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'preferences' | 'security' | 'voice' | 'billing'>('account');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      callReminders: true,
      weeklyReports: true,
    },
    privacy: {
      shareAnalytics: true,
      allowTracking: false,
      publicProfile: false,
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordChangeRequired: false,
    },
    voice: {
      defaultVoice: 'en-US-Neural2-F',
      speechRate: 1.0,
      volume: 0.8,
    },
  });

  const handleSaveSettings = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    // Show success message
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'voice', label: 'Voice Settings', icon: Volume2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const renderAccountTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg mr-4">
            <User className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Profile Information</h3>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">Full Name</label>
              <div className="w-full px-4 py-3 bg-zinc-800/30 border border-zinc-700 rounded-xl text-zinc-200">
                {user?.name || 'Not provided'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-3">Email</label>
              <div className="w-full px-4 py-3 bg-zinc-800/30 border border-zinc-700 rounded-xl text-zinc-200">
                {user?.email || 'Not provided'}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Phone Number</label>
            <input
              type="tel"
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Company</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="Enter your company name"
            />
          </div>
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg mr-4">
            <BarChart3 className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Account Statistics</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-6 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-200">
            <div className="text-3xl font-bold text-zinc-100 mb-2">{user?.totalCallsMade || 0}</div>
            <div className="text-sm text-zinc-400">Total Calls</div>
          </div>
          <div className="text-center p-6 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-200">
            <div className="text-3xl font-bold text-zinc-100 mb-2">{user?.tokens || 0}</div>
            <div className="text-sm text-zinc-400">Tokens Remaining</div>
          </div>
          <div className="text-center p-6 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-200">
            <div className="text-3xl font-bold text-zinc-100 mb-2 capitalize">{user?.subscription || 'Free'}</div>
            <div className="text-sm text-zinc-400">Plan</div>
          </div>
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg mr-4">
            <Download className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Data Export</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 flex flex-col items-center justify-center">
            <Download className="w-4 h-4 mb-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Call History</span>
          </button>
          <button className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 flex flex-col items-center justify-center">
            <Download className="w-4 h-4 mb-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Analytics Data</span>
          </button>
          <button className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 flex flex-col items-center justify-center">
            <Download className="w-4 h-4 mb-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Voice Modules</span>
          </button>
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-red-500/20 rounded-lg mr-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Danger Zone</h3>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-zinc-100 font-medium mb-1">Delete Account</div>
                <div className="text-sm text-red-300">This action cannot be undone</div>
              </div>
              <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-200 px-3 py-1">
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-zinc-100 font-medium mb-1">Sign Out</div>
                <div className="text-sm text-orange-300">End your current session</div>
              </div>
              <Button 
                onClick={handleSignOut}
                variant="outline" 
                size="sm"
                className="text-orange-400 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all duration-200 px-3 py-1"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-yellow-500/20 rounded-lg mr-4">
            <Bell className="w-5 h-5 text-yellow-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Notification Preferences</h3>
        </div>
        <div className="space-y-6">
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all duration-200">
              <div className="flex-1">
                <div className="text-zinc-100 font-medium capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-sm text-zinc-400">
                  {key === 'email' && 'Receive notifications via email'}
                  {key === 'sms' && 'Receive notifications via SMS'}
                  {key === 'push' && 'Receive push notifications'}
                  {key === 'callReminders' && 'Get reminded about scheduled calls'}
                  {key === 'weeklyReports' && 'Receive weekly analytics reports'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, [key]: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderPrivacyTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg mr-4">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Privacy Settings</h3>
        </div>
        <div className="space-y-6">
          {Object.entries(settings.privacy).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all duration-200">
              <div className="flex-1">
                <div className="text-zinc-100 font-medium capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="text-sm text-zinc-400">
                  {key === 'shareAnalytics' && 'Share anonymous usage data to improve our service'}
                  {key === 'allowTracking' && 'Allow tracking for personalized experience'}
                  {key === 'publicProfile' && 'Make your profile visible to other users'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    privacy: { ...prev.privacy, [key]: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderPreferencesTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg mr-4">
            <Palette className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Display & Language</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Theme</label>
            <select
              value={settings.preferences.theme}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                preferences: { ...prev.preferences, theme: e.target.value as 'light' | 'dark' | 'auto' }
              }))}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Language</label>
            <select
              value={settings.preferences.language}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                preferences: { ...prev.preferences, language: e.target.value }
              }))}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Timezone</label>
            <select
              value={settings.preferences.timezone}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                preferences: { ...prev.preferences, timezone: e.target.value }
              }))}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="UTC">UTC</option>
              <option value="EST">Eastern Time</option>
              <option value="PST">Pacific Time</option>
              <option value="GMT">GMT</option>
            </select>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-orange-500/20 rounded-lg mr-4">
            <Key className="w-5 h-5 text-orange-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Security Settings</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-xl hover:bg-zinc-800/50 transition-all duration-200">
            <div className="flex-1">
              <div className="text-zinc-100 font-medium mb-1">Two-Factor Authentication</div>
              <div className="text-sm text-zinc-400">Add an extra layer of security to your account</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.security.twoFactorAuth}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  security: { ...prev.security, twoFactorAuth: e.target.checked }
                }))}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Session Timeout (minutes)</label>
            <input
              type="number"
              value={settings.security.sessionTimeout}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
              }))}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              min="5"
              max="480"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Change Password</label>
            <div className="space-y-4">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Current password"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pr-12"
                  placeholder="New password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="password"
                className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Confirm new password"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderVoiceTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-pink-500/20 rounded-lg mr-4">
            <Volume2 className="w-5 h-5 text-pink-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Voice Settings</h3>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Default Voice</label>
            <select
              value={settings.voice.defaultVoice}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                voice: { ...prev.voice, defaultVoice: e.target.value }
              }))}
              className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="en-US-Neural2-F">Emma (Female, US)</option>
              <option value="en-US-Neural2-M">John (Male, US)</option>
              <option value="en-GB-Neural2-F">Sophie (Female, UK)</option>
              <option value="en-GB-Neural2-M">James (Male, UK)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Speech Rate</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.voice.speechRate}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                voice: { ...prev.voice, speechRate: parseFloat(e.target.value) }
              }))}
              className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-sm text-zinc-400 mt-2">{settings.voice.speechRate}x</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.voice.volume}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                voice: { ...prev.voice, volume: parseFloat(e.target.value) }
              }))}
              className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="text-sm text-zinc-400 mt-2">{Math.round(settings.voice.volume * 100)}%</div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg mr-4">
            <CreditCard className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Current Plan</h3>
        </div>
        <div className="flex items-center justify-between p-6 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-200">
          <div>
            <div className="text-zinc-100 font-medium capitalize text-lg mb-1">{user?.subscription || 'Free'} Plan</div>
            <div className="text-sm text-zinc-400">
              {user?.subscription === 'free' && 'Basic features, limited calls'}
              {user?.subscription === 'basic' && 'Standard features, 1000 calls/month'}
              {user?.subscription === 'premium' && 'Advanced features, unlimited calls'}
            </div>
          </div>
          <Badge variant="outline" className="text-xs px-3 py-1">
            {user?.subscription === 'free' ? 'Free' : 'Active'}
          </Badge>
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-blue-500/20 rounded-lg mr-4">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Token Balance</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl">
            <span className="text-zinc-100 font-medium">Available Tokens</span>
            <span className="text-3xl font-bold text-zinc-100">{user?.tokens || 0}</span>
          </div>
          <Button className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-zinc-100 font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30">
            <CreditCard className="w-4 h-4 mr-2" />
            Buy More Tokens
          </Button>
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-6 sm:p-8 hover:bg-zinc-900/70 transition-all duration-200">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-purple-500/20 rounded-lg mr-4">
            <CreditCard className="w-5 h-5 text-purple-400" />
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Payment Methods</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800/70 transition-all duration-200">
            <div className="flex items-center">
              <CreditCard className="w-6 h-6 text-blue-400 mr-4" />
              <div>
                <div className="text-zinc-100 font-medium">•••• •••• •••• 4242</div>
                <div className="text-sm text-zinc-400">Expires 12/25</div>
              </div>
            </div>
            <Badge variant="outline" className="text-xs px-3 py-1">Default</Badge>
          </div>
          <Button variant="outline" className="w-full sm:w-auto px-6 py-3 rounded-xl hover:bg-purple-500/10 hover:border-purple-500/50 transition-all duration-200">
            <CreditCard className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </Card>
  </div>
);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account': return renderAccountTab();
      case 'notifications': return renderNotificationsTab();
      case 'privacy': return renderPrivacyTab();
      case 'preferences': return renderPreferencesTab();
      case 'security': return renderSecurityTab();
      case 'voice': return renderVoiceTab();
      case 'billing': return renderBillingTab();
      default: return renderAccountTab();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 pt-20 sm:pt-24">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center mb-4 mt-10">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-4">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-100 mb-1">Settings</h1>
              <p className="text-zinc-400 text-sm sm:text-base">Manage your account, preferences, and security settings</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <Card className="bg-zinc-900/50 border-zinc-800 p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Settings</h3>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mr-3 transition-colors ${
                        activeTab === tab.id ? 'text-blue-400' : 'text-zinc-500'
                      }`} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="animate-in slide-in-from-left-2 duration-300">
              {renderTabContent()}
            </div>
            
            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <Button 
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-zinc-100 font-medium rounded-lg shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-100 mr-2"></div>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 