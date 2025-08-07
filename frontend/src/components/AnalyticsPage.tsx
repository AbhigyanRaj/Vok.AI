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
  RefreshCw,
  Eye,
  Trash2,
  AlertTriangle,
  X,
  Activity,
  PieChart,
  BarChart,
  LineChart
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
  successRate: number;
  callsThisWeek: number;
  callsThisMonth: number;
  topModules: Array<{ name: string; calls: number }>;
  recentCalls: CallData[];
  statusDistribution: Array<{ status: string; count: number; percentage: number }>;
  dailyCalls: Array<{ date: string; count: number }>;
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [error, setError] = useState("");
  const [selectedCalls, setSelectedCalls] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCall, setDeletingCall] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

      // Fetch call history from backend using the API service
      const data = await api.getCallHistory(token);
      
      if (!data.success) {
        setError("Failed to fetch analytics data");
        return;
      }

      // Process the call data to create analytics
      const calls = data.calls || [];
      
      // Filter calls based on time range
      const now = new Date();
      let filteredCalls = calls;
      
      if (timeRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredCalls = calls.filter((call: CallData) => new Date(call.createdAt) >= weekAgo);
      } else if (timeRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredCalls = calls.filter((call: CallData) => new Date(call.createdAt) >= monthAgo);
      } else if (timeRange === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filteredCalls = calls.filter((call: CallData) => new Date(call.createdAt) >= yearAgo);
      }
      
      // Calculate analytics from filtered data
      const totalCalls = filteredCalls.length;
      const completedCalls = filteredCalls.filter((call: CallData) => call.status === 'completed').length;
      const failedCalls = filteredCalls.filter((call: CallData) => ['failed', 'busy', 'no-answer', 'canceled'].includes(call.status)).length;
      
      // Fix duration calculation - duration is in seconds, convert to minutes
      const totalDuration = filteredCalls.reduce((sum: number, call: CallData) => sum + (call.duration || 0), 0);
      const averageDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;
      
      const successRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
      
      // Calculate time-based metrics
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
      filteredCalls.forEach((call: CallData) => {
        const moduleName = call.moduleName || 'Unknown Module';
        moduleStats[moduleName] = (moduleStats[moduleName] || 0) + 1;
      });
      
      const topModules = Object.entries(moduleStats)
        .map(([name, calls]) => ({ name, calls }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 5);
      
      // Calculate status distribution
      const statusCounts: { [key: string]: number } = {};
      filteredCalls.forEach((call: CallData) => {
        statusCounts[call.status] = (statusCounts[call.status] || 0) + 1;
      });
      
      const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: totalCalls > 0 ? (count / totalCalls) * 100 : 0
      }));
      
      // Calculate daily calls for the last 7 days
      const dailyCalls = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayCalls = filteredCalls.filter((call: CallData) => 
          call.createdAt.startsWith(dateStr)
        ).length;
        dailyCalls.push({ date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), count: dayCalls });
      }
      
      // Get recent calls (last 10)
      const recentCalls = filteredCalls
        .sort((a: CallData, b: CallData) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      const processedData: AnalyticsData = {
        totalCalls,
        completedCalls,
        failedCalls,
        averageDuration,
        successRate,
        callsThisWeek,
        callsThisMonth,
        topModules,
        recentCalls,
        statusDistribution,
        dailyCalls,
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
  }, [user, timeRange]);

  const deleteCall = async (callId: string) => {
    try {
      setDeletingCall(callId);
      const token = auth.getStoredToken();
      
      const response = await fetch(`${process.env.NODE_ENV === 'production' 
        ? 'https://vok-ai.onrender.com/api'
        : 'http://localhost:5001/api'}/calls/${callId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAnalyticsData();
        setSelectedCalls(prev => prev.filter(id => id !== callId));
      } else {
        setError(data.error || 'Failed to delete call');
      }
    } catch (error) {
      console.error('Error deleting call:', error);
      setError('Failed to delete call');
    } finally {
      setDeletingCall(null);
    }
  };

  const deleteSelectedCalls = async () => {
    if (selectedCalls.length === 0) return;
    
    try {
      setDeleting(true);
      const token = auth.getStoredToken();
      
      const response = await fetch(`${process.env.NODE_ENV === 'production' 
        ? 'https://vok-ai.onrender.com/api'
        : 'http://localhost:5001/api'}/calls/batch/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callIds: selectedCalls }),
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAnalyticsData();
        setSelectedCalls([]);
        setShowDeleteConfirm(false);
      } else {
        setError(data.error || 'Failed to delete calls');
      }
    } catch (error) {
      console.error('Error deleting calls:', error);
      setError('Failed to delete calls');
    } finally {
      setDeleting(false);
    }
  };

  const toggleCallSelection = (callId: string) => {
    setSelectedCalls(prev => 
      prev.includes(callId) 
        ? prev.filter(id => id !== callId)
        : [...prev, callId]
    );
  };

  const selectAllCalls = () => {
    if (analyticsData?.recentCalls) {
      setSelectedCalls(analyticsData.recentCalls.map(call => call._id));
    }
  };

  const deselectAllCalls = () => {
    setSelectedCalls([]);
  };

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

  // Fix duration formatting - duration is in seconds
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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
    <div className="min-h-screen bg-zinc-950 px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 pt-20 sm:pt-24">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8 md:mb-10 mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-zinc-400 text-sm sm:text-base">Track your call performance and insights</p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAnalyticsData}
                className="text-xs sm:text-sm px-3 py-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Time Range Selector with Data Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {(['week', 'month', 'year'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={`text-xs sm:text-sm capitalize px-3 py-2 ${
                    timeRange === range 
                      ? "bg-white text-black hover:bg-gray-100" 
                      : "bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  {range}
                </Button>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-400">
                Showing {analyticsData?.totalCalls || 0} calls from the last {timeRange}
              </p>
              <p className="text-xs text-zinc-500">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs sm:text-sm">Total Calls</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{analyticsData?.totalCalls}</p>
                <p className="text-xs text-zinc-500 mt-1">Last {timeRange}</p>
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
                <p className="text-xs text-zinc-500 mt-1">{analyticsData?.completedCalls} completed</p>
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
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{formatDuration(analyticsData?.averageDuration || 0)}</p>
                <p className="text-xs text-zinc-500 mt-1">per call</p>
              </div>
              <div className="bg-yellow-500/20 p-2 sm:p-3 rounded-full">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
              </div>
            </div>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs sm:text-sm">Failed Calls</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{analyticsData?.failedCalls}</p>
                <p className="text-xs text-zinc-500 mt-1">{analyticsData?.failedCalls > 0 ? `${((analyticsData.failedCalls / analyticsData.totalCalls) * 100).toFixed(1)}%` : '0%'} rate</p>
              </div>
              <div className="bg-red-500/20 p-2 sm:p-3 rounded-full">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts and Visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Daily Calls Chart */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">Daily Calls (Last 7 Days)</h3>
              <Badge variant="outline" className="text-xs text-white">This {timeRange}</Badge>
            </div>
            <div className="space-y-3">
              {analyticsData?.dailyCalls.length > 0 ? (
                analyticsData.dailyCalls.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-white">{day.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 sm:w-32 bg-zinc-800 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.max((day.count / Math.max(...analyticsData.dailyCalls.map(d => d.count), 1)) * 100, 5)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs sm:text-sm text-zinc-400 min-w-[2rem] text-right">{day.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-400 text-sm">No data for the last 7 days</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                Total calls this week: {analyticsData?.dailyCalls.reduce((sum, day) => sum + day.count, 0) || 0}
              </p>
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">Call Status</h3>
              <Badge variant="outline" className="text-xs text-white">Distribution</Badge>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {analyticsData?.statusDistribution.length > 0 ? (
                analyticsData.statusDistribution.map((status) => (
                  <div key={status.status} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 sm:mr-3 ${getStatusColor(status.status).split(' ')[0]}`}></div>
                      <span className="text-xs sm:text-sm md:text-base text-white capitalize">{status.status}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs sm:text-sm text-zinc-400 mr-2">{status.count}</span>
                      <span className="text-xs text-zinc-500">({status.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-zinc-400 text-sm">No status data available</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                Success rate: {analyticsData?.successRate.toFixed(1)}%
              </p>
            </div>
          </Card>
        </div>

        {/* Recent Calls Table */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-white">Recent Calls</h3>
            <div className="flex items-center gap-2">
              {selectedCalls.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs sm:text-sm px-3 py-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected ({selectedCalls.length})
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={deselectAllCalls}
                    className="text-xs sm:text-sm px-3 py-2"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {/* Selection Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllCalls}
                className="text-xs sm:text-sm px-3 py-2"
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={deselectAllCalls}
                className="text-xs sm:text-sm px-3 py-2"
              >
                Deselect All
              </Button>
            </div>
            {selectedCalls.length > 0 && (
              <span className="text-xs text-zinc-400">
                {selectedCalls.length} call{selectedCalls.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden border border-zinc-800 rounded-lg">
                {analyticsData?.recentCalls.length > 0 ? (
                  <table className="min-w-full divide-y divide-zinc-800">
                    <thead className="bg-zinc-900/50">
                      <tr>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">
                          <input
                            type="checkbox"
                            checked={selectedCalls.length === analyticsData.recentCalls.length}
                            onChange={(e) => e.target.checked ? selectAllCalls() : deselectAllCalls()}
                            className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </th>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">Module</th>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">Customer</th>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">Status</th>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">Duration</th>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">Date</th>
                        <th className="text-left py-4 px-4 text-xs sm:text-sm text-zinc-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 bg-zinc-900/30">
                      {analyticsData.recentCalls.map((call) => (
                        <tr key={call._id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-4 px-4">
                            <input
                              type="checkbox"
                              checked={selectedCalls.includes(call._id)}
                              onChange={() => toggleCallSelection(call._id)}
                              className="w-4 h-4 text-blue-600 bg-zinc-800 border-zinc-600 rounded focus:ring-blue-500 focus:ring-2"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs sm:text-sm text-white truncate block max-w-[120px] sm:max-w-[150px]">{call.moduleName || 'Unknown Module'}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <span className="text-xs sm:text-sm text-white block truncate max-w-[120px] sm:max-w-[150px] font-medium">{call.customerName}</span>
                              <span className="text-xs text-zinc-400 truncate block max-w-[120px] sm:max-w-[150px]">{call.phoneNumber}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={`text-xs ${getStatusColor(call.status)}`}>
                              <span className="mr-1">{getStatusIcon(call.status)}</span>
                              <span className="hidden sm:inline">{call.status}</span>
                              <span className="sm:hidden">{call.status.charAt(0)}</span>
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs sm:text-sm text-white font-medium">{formatDuration(call.duration)}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs text-zinc-400">{formatDate(call.createdAt)}</span>
                            {call.transcription && (
                              <div className="mt-2">
                                <details className="group">
                                  <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium text-sm flex items-center gap-1 transition-all duration-200">
                                    <span className="group-open:hidden">View Conversation</span>
                                    <span className="hidden group-open:inline">Hide Conversation</span>
                                    <svg className="w-4 h-4 transition-transform duration-200 ease-out group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </summary>
                                  <div className="mt-3 overflow-hidden transition-all duration-300 ease-out max-h-0 group-open:max-h-96">
                                    <div className="p-4 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
                                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-700/50">
                                        <h4 className="text-sm font-medium text-white">Call Transcript</h4>
                                        <span className="text-xs text-zinc-400 bg-zinc-700/50 px-2 py-1 rounded">
                                          {formatDuration(call.duration)}
                                        </span>
                                      </div>
                                      <div className="space-y-3 max-h-32 overflow-y-auto">
                                        {call.transcription.split('\n').map((line, index) => {
                                          if (!line.trim()) return null;
                                          
                                          if (line.startsWith('VokAI:')) {
                                            return (
                                              <div key={index} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="flex-1">
                                                  <span className="text-xs text-blue-400 font-medium">VokAI</span>
                                                  <div className="text-sm text-zinc-200 mt-1">{line.replace('VokAI:', '').trim()}</div>
                                                </div>
                                              </div>
                                            );
                                          } else if (line.startsWith('User:')) {
                                            return (
                                              <div key={index} className="flex items-start gap-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                                                <div className="flex-1">
                                                  <span className="text-xs text-green-400 font-medium">Customer</span>
                                                  <div className="text-sm text-zinc-200 mt-1">{line.replace('User:', '').trim()}</div>
                                                </div>
                                              </div>
                                            );
                                          } else {
                                            return (
                                              <div key={index} className="text-xs text-zinc-500 italic pl-4">
                                                {line}
                                              </div>
                                            );
                                          }
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                </details>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteCall(call._id)}
                              disabled={deletingCall === call._id}
                              className="text-xs sm:text-sm px-3 py-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                            >
                              {deletingCall === call._id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-zinc-400 mb-2">No calls found</div>
                    <p className="text-xs text-zinc-500">Try adjusting your time range or filters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-400 mr-3" />
              <h3 className="text-lg font-semibold text-white">Delete Calls</h3>
            </div>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete {selectedCalls.length} call{selectedCalls.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={deleteSelectedCalls}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 flex-1"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage; 