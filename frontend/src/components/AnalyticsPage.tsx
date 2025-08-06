import React, { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  BarChart3, 
  PhoneCall, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Mic,
  MessageSquare,
  Activity
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import * as auth from "../lib/auth";
import { api } from "../lib/api";

interface CallData {
  _id: string;
  moduleName?: string;
  customerName: string;
  phoneNumber: string;
  status: 'completed' | 'failed' | 'in-progress' | 'initiated' | 'ringing' | 'answered' | 'busy' | 'no-answer' | 'canceled';
  duration: number;
  questionsAnswered: number;
  totalQuestions: number;
  createdAt: string;
  completedAt?: string;
  responses?: Map<string, string>;
  transcription?: string;
  evaluation?: {
    result: 'YES' | 'NO' | 'INVESTIGATION_REQUIRED';
    comments: string[];
  };
  summary?: string;
}

interface AnalyticsData {
  totalCalls: number;
  completedCalls: number;
  failedCalls: number;
  averageDuration: number;
  totalQuestions: number;
  averageQuestionsAnswered: number;
  successRate: number;
  callsThisWeek: number;
  callsThisMonth: number;
  topModules: Array<{ name: string; calls: number }>;
  recentCalls: CallData[];
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [error, setError] = useState("");

  const fetchAnalyticsData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError("");
    
    try {
      const token = auth.getStoredToken();
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Fetch call history from backend
      const response = await fetch(`${process.env.NODE_ENV === 'production' 
        ? 'https://vok-ai.onrender.com/api'
        : 'http://localhost:5001/api'}/calls/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (!data.success) {
        setError("Failed to fetch analytics data");
        return;
      }

      // Process the call data to create analytics
      const calls = data.calls || [];
      
      // Calculate analytics from real data
      const totalCalls = calls.length;
      const completedCalls = calls.filter((call: CallData) => call.status === 'completed').length;
      const failedCalls = calls.filter((call: CallData) => ['failed', 'busy', 'no-answer', 'canceled'].includes(call.status)).length;
      
      const totalDuration = calls.reduce((sum: number, call: CallData) => sum + (call.duration || 0), 0);
      const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
      
      const totalQuestions = calls.reduce((sum: number, call: CallData) => {
        // Count questions based on transcription or responses
        if (call.transcription) {
          const questionMatches = call.transcription.match(/VokAI: Question \d+:/g);
          return sum + (questionMatches ? questionMatches.length : 0);
        }
        return sum + (call.responses ? call.responses.size : 0);
      }, 0);
      
      const averageQuestionsAnswered = totalCalls > 0 ? totalQuestions / totalCalls : 0;
      
      const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
      
      // Calculate time-based metrics
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const callsThisWeek = calls.filter((call: CallData) => 
        new Date(call.createdAt) >= weekAgo
      ).length;
      
      const callsThisMonth = calls.filter((call: CallData) => 
        new Date(call.createdAt) >= monthAgo
      ).length;
      
      // Calculate top modules
      const moduleStats: { [key: string]: number } = {};
      calls.forEach((call: CallData) => {
        const moduleName = call.moduleName || 'Unknown Module';
        moduleStats[moduleName] = (moduleStats[moduleName] || 0) + 1;
      });
      
      const topModules = Object.entries(moduleStats)
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);
      
      // Get recent calls (last 10)
      const recentCalls = calls
        .sort((a: CallData, b: CallData) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10)
        .map((call: CallData) => {
          // Calculate questions from transcription
          let totalQuestions = 5; // Default
          if (call.transcription) {
            const questionMatches = call.transcription.match(/VokAI: Question \d+:/g);
            totalQuestions = questionMatches ? questionMatches.length : 5;
          }
          
          return {
            ...call,
            questionsAnswered: call.responses ? call.responses.size : 0,
            totalQuestions: totalQuestions,
          };
        });

      const processedData: AnalyticsData = {
        totalCalls,
        completedCalls,
        failedCalls,
        averageDuration,
        totalQuestions,
        averageQuestionsAnswered,
        successRate,
        callsThisWeek,
        callsThisMonth,
        topModules,
        recentCalls,
      };

      setAnalyticsData(processedData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [user, timeRange, selectedModule]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'in-progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'initiated': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ringing': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'answered': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'busy': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'no-answer': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'canceled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'in-progress': return <Clock className="w-4 h-4" />;
      case 'initiated': return <Activity className="w-4 h-4" />;
      case 'ringing': return <PhoneCall className="w-4 h-4" />;
      case 'answered': return <CheckCircle className="w-4 h-4" />;
      case 'busy': return <XCircle className="w-4 h-4" />;
      case 'no-answer': return <XCircle className="w-4 h-4" />;
      case 'canceled': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-2 sm:px-4 py-8 sm:py-10 pt-24">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-white text-lg">Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-2 sm:px-4 py-8 sm:py-10 pt-24">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-red-400 mb-4">{error}</div>
            <Button onClick={fetchAnalyticsData} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-2 sm:px-4 py-8 sm:py-10 pt-24">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-zinc-400 mb-4">No analytics data available</div>
            <Button onClick={fetchAnalyticsData} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 pt-20 sm:pt-24 ">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 md:mb-10 mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-zinc-400 text-sm sm:text-base">Track your call performance and insights</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-0">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-3 py-2">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm px-3 py-2">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex flex-wrap gap-2">
            {(['week', 'month', 'year'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs sm:text-sm capitalize px-3 py-2"
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs sm:text-sm">Total Calls</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{analyticsData?.totalCalls}</p>
              </div>
              <div className="bg-blue-500/20 p-2 sm:p-3 rounded-full">
                <PhoneCall className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs sm:text-sm">Success Rate</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{analyticsData?.successRate.toFixed(1)}%</p>
              </div>
              <div className="bg-green-500/20 p-2 sm:p-3 rounded-full">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs sm:text-sm">Avg Duration</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{analyticsData?.averageDuration.toFixed(1)}m</p>
              </div>
              <div className="bg-yellow-500/20 p-2 sm:p-3 rounded-full">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs sm:text-sm">Questions Answered</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{analyticsData?.totalQuestions}</p>
              </div>
              <div className="bg-purple-500/20 p-2 sm:p-3 rounded-full">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts and Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Top Modules Chart */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">Top Modules</h3>
              <Badge variant="outline" className="text-xs">This {timeRange}</Badge>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {analyticsData?.topModules.length > 0 ? (
                analyticsData.topModules.map((module, index) => (
                  <div key={module.name} className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                        <span className="text-xs font-medium text-blue-400">{index + 1}</span>
                      </div>
                      <span className="text-xs sm:text-sm md:text-base text-white truncate">{module.name}</span>
                    </div>
                    <div className="flex items-center ml-2">
                      <div className="w-16 sm:w-20 md:w-24 bg-zinc-800 rounded-full h-2 mr-2 sm:mr-3">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(module.calls / (analyticsData?.topModules[0]?.calls || 1)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs sm:text-sm text-zinc-400 min-w-[2rem] text-right">{module.calls}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-400 text-sm">No modules found</p>
                </div>
              )}
            </div>
          </Card>

          {/* Call Status Distribution */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">Call Status</h3>
              <Badge variant="outline" className="text-xs">Distribution</Badge>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2 sm:mr-3"></div>
                  <span className="text-xs sm:text-sm md:text-base text-white">Completed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs sm:text-sm text-zinc-400 mr-2">{analyticsData?.completedCalls}</span>
                  <span className="text-xs text-zinc-500">({analyticsData?.successRate.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2 sm:mr-3"></div>
                  <span className="text-xs sm:text-sm md:text-base text-white">Failed</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs sm:text-sm text-zinc-400 mr-2">{analyticsData?.failedCalls}</span>
                  <span className="text-xs text-zinc-500">({(100 - (analyticsData?.successRate || 0)).toFixed(1)}%)</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Calls Table */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">Recent Calls</h3>
            <Button variant="outline" size="sm" className="text-xs sm:text-sm px-3 py-2">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </div>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                {analyticsData?.recentCalls.length > 0 ? (
                  <table className="min-w-full divide-y divide-zinc-800">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-2 text-xs sm:text-sm text-zinc-400 font-medium">Module</th>
                        <th className="text-left py-3 px-2 text-xs sm:text-sm text-zinc-400 font-medium">Customer</th>
                        <th className="text-left py-3 px-2 text-xs sm:text-sm text-zinc-400 font-medium">Status</th>
                        <th className="text-left py-3 px-2 text-xs sm:text-sm text-zinc-400 font-medium">Duration</th>
                        <th className="text-left py-3 px-2 text-xs sm:text-sm text-zinc-400 font-medium">Questions</th>
                        <th className="text-left py-3 px-2 text-xs sm:text-sm text-zinc-400 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {analyticsData.recentCalls.map((call) => (
                        <tr key={call._id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-2">
                            <span className="text-xs sm:text-sm text-white truncate block max-w-[100px] sm:max-w-[120px]">{call.moduleName || 'Unknown Module'}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <span className="text-xs sm:text-sm text-white block truncate max-w-[100px] sm:max-w-[120px]">{call.customerName}</span>
                              <span className="text-xs text-zinc-400 truncate block max-w-[100px] sm:max-w-[120px]">{call.phoneNumber}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={`text-xs ${getStatusColor(call.status)}`}>
                              <span className="mr-1">{getStatusIcon(call.status)}</span>
                              <span className="hidden sm:inline">{call.status}</span>
                              <span className="sm:hidden">{call.status.charAt(0)}</span>
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-xs sm:text-sm text-white">{formatDuration(call.duration)}</span>
                          </td>
                                                  <td className="py-3 px-2">
                          <span className="text-xs sm:text-sm text-white">{call.questionsAnswered}/{call.totalQuestions}</span>
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-xs text-zinc-400">{formatDate(call.createdAt)}</span>
                          {call.transcription && (
                            <div className="mt-1">
                              <details className="text-xs">
                                <summary className="cursor-pointer text-blue-400 hover:text-blue-300">View Conversation</summary>
                                <div className="mt-2 p-2 bg-zinc-800 rounded text-xs whitespace-pre-wrap max-h-32 overflow-y-auto max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
                                  <div className="text-green-400 font-medium mb-1">Conversation:</div>
                                  <div className="text-zinc-300 leading-relaxed">
                                    {call.transcription}
                                  </div>
                                </div>
                              </details>
                            </div>
                          )}
                        </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-zinc-400 text-sm">No calls found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage; 