"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Filter, Download, RefreshCw, AlertCircle, Info, AlertTriangle, X, Eye, ChevronDown, ChevronRight, Zap, Bell, BellOff } from 'lucide-react';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface AccessLog {
  id: string;
  request_id: string;
  method: string;
  path: string;
  status_code: number;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  duration_ms?: number;
  timestamp: string;
}

interface AppLog {
  id: string;
  request_id?: string;
  level: LogLevel;
  category: string;
  message: string;
  metadata?: string;
  user_email?: string;
  timestamp: string;
}

interface AuditLog {
  id: string;
  request_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: string;
  new_values?: string;
  user_email: string;
  ip_address?: string;
  timestamp: string;
}

interface LogStats {
  accessLogs: {
    total_requests?: number;
    error_requests?: number;
    server_errors?: number;
    avg_duration_ms?: number;
    unique_users?: number;
  };
  appLogs: Array<{ level: string; count: number }>;
  auditTrails: Array<{ action: string; count: number }>;
  period: string;
}

type LogType = 'access' | 'app' | 'audit';

interface AlertMessage {
  id: string;
  type: 'alert' | 'errors' | 'failed_requests' | 'audit_activity' | 'connected' | 'heartbeat' | 'stream_error';
  level?: string;
  message: string;
  data?: any[];
  timestamp: string;
}

export default function LogsPage() {
  const [activeTab, setActiveTab] = useState<LogType>('access');
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [appLogs, setAppLogs] = useState<AppLog[]>([]);
  const [auditLogs, setAuditLog] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    userEmail: '',
    requestId: '',
    method: '',
    path: '',
    statusCode: '',
    level: '',
    category: '',
    action: '',
    resourceType: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Real-time monitoring
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Pagination
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    hasMore: false
  });

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [activeTab, dateRange, filters, pagination.offset]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectLiveMonitoring = () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    setConnectionStatus('connecting');
    const eventSource = new EventSource(`/api/admin/logs/stream?token=${token}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data: AlertMessage = JSON.parse(event.data);
        const alertWithId = { ...data, id: Date.now() + Math.random().toString() };
        
        setAlerts(prev => [alertWithId, ...prev.slice(0, 49)]); // Keep last 50 alerts
        
        // Play sound for critical alerts
        if (soundEnabled && (data.type === 'alert' && data.level === 'critical')) {
          playAlertSound();
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('disconnected');
      eventSource.close();
    };
  };

  const disconnectLiveMonitoring = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionStatus('disconnected');
    setAlerts([]);
  };

  const toggleLiveMode = () => {
    if (isLiveMode) {
      disconnectLiveMonitoring();
    } else {
      connectLiveMonitoring();
    }
    setIsLiveMode(!isLiveMode);
  };

  const playAlertSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing alert sound:', error);
    }
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const getAlertIcon = (type: string, level?: string) => {
    if (type === 'alert' && level === 'critical') return '🚨';
    if (type === 'errors') return '❌';
    if (type === 'failed_requests') return '⚠️';
    if (type === 'audit_activity') return '👤';
    if (type === 'connected') return '✅';
    return '📊';
  };

  const getAlertColor = (type: string, level?: string) => {
    if (type === 'alert' && level === 'critical') return 'bg-red-900/50 border-red-600/50 text-red-200';
    if (type === 'errors') return 'bg-orange-900/50 border-orange-600/50 text-orange-200';
    if (type === 'failed_requests') return 'bg-yellow-900/50 border-yellow-600/50 text-yellow-200';
    if (type === 'audit_activity') return 'bg-blue-900/50 border-blue-600/50 text-blue-200';
    if (type === 'connected') return 'bg-green-900/50 border-green-600/50 text-green-200';
    return 'bg-gray-900/50 border-gray-600/50 text-gray-200';
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/admin/logs/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data.statistics);
    } catch (err) {
      console.error('Failed to fetch log statistics:', err);
    }
  };

  const fetchLogs = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        startDate: dateRange.startDate + 'T00:00:00.000Z',
        endDate: dateRange.endDate + 'T23:59:59.999Z',
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });

      // Add active filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`/api/admin/logs/${activeTab}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();

      if (activeTab === 'access') {
        setAccessLogs(data.logs);
      } else if (activeTab === 'app') {
        setAppLogs(data.logs);
      } else {
        setAuditLog(data.logs);
      }

      setPagination(prev => ({
        ...prev,
        hasMore: data.pagination.hasMore
      }));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = () => {
    setPagination(prev => ({ ...prev, offset: 0 }));
    fetchLogs();
    fetchStats();
  };

  const exportLogs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const params = new URLSearchParams({
        startDate: dateRange.startDate + 'T00:00:00.000Z',
        endDate: dateRange.endDate + 'T23:59:59.999Z',
        limit: '10000'
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`/api/admin/logs/${activeTab}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to export logs');
      const data = await response.json();

      const csvContent = convertToCSV(data.logs, activeTab);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-logs-${dateRange.startDate}-${dateRange.endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export logs');
    }
  };

  const convertToCSV = (logs: any[], type: LogType): string => {
    if (!logs.length) return '';

    const headers = Object.keys(logs[0]).join(',');
    const rows = logs.map(log => 
      Object.values(log).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\\n');
  };

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: number) => {
    if (status < 300) return 'bg-green-100 text-green-800';
    if (status < 400) return 'bg-blue-100 text-blue-800';
    if (status < 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getLevelBadge = (level: LogLevel) => {
    const badges = {
      debug: 'bg-gray-100 text-gray-800',
      info: 'bg-blue-100 text-blue-800',
      warn: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900'
    };
    return badges[level] || badges.info;
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">System Logs & Monitoring</h1>
        <p className="text-gray-400">Monitor system access, application events, and audit trails</p>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium opacity-90">Total Requests</h3>
            <p className="text-2xl font-bold">{stats.accessLogs.total_requests || 0}</p>
            <p className="text-xs opacity-75">{stats.period}</p>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium opacity-90">Error Rate</h3>
            <p className="text-2xl font-bold">
              {stats.accessLogs.total_requests 
                ? ((stats.accessLogs.error_requests || 0) / stats.accessLogs.total_requests * 100).toFixed(1) + '%'
                : '0%'}
            </p>
            <p className="text-xs opacity-75">{stats.accessLogs.error_requests || 0} errors</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium opacity-90">Avg Response</h3>
            <p className="text-2xl font-bold">{formatDuration(stats.accessLogs.avg_duration_ms)}</p>
            <p className="text-xs opacity-75">response time</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 text-white">
            <h3 className="text-sm font-medium opacity-90">Active Users</h3>
            <p className="text-2xl font-bold">{stats.accessLogs.unique_users || 0}</p>
            <p className="text-xs opacity-75">{stats.period}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-zinc-900 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm text-white"
            />
            <span className="text-gray-400 py-1">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-sm text-white"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-white"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <button
            onClick={refreshLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-sm text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportLogs}
            className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            onClick={toggleLiveMode}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm text-white ${
              isLiveMode 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <Zap className={`h-4 w-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
            {isLiveMode ? 'Stop Live' : 'Start Live'}
          </button>

          {isLiveMode && (
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded text-sm ${
                soundEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
              }`}
              title={soundEnabled ? 'Disable alert sounds' : 'Enable alert sounds'}
            >
              {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-zinc-800 rounded border border-zinc-700">
            <input
              type="text"
              placeholder="User email"
              value={filters.userEmail}
              onChange={(e) => setFilters(prev => ({ ...prev, userEmail: e.target.value }))}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
            />
            
            <input
              type="text"
              placeholder="Request ID"
              value={filters.requestId}
              onChange={(e) => setFilters(prev => ({ ...prev, requestId: e.target.value }))}
              className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
            />

            {activeTab === 'access' && (
              <>
                <select
                  value={filters.method}
                  onChange={(e) => setFilters(prev => ({ ...prev, method: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="">All Methods</option>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Path filter"
                  value={filters.path}
                  onChange={(e) => setFilters(prev => ({ ...prev, path: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
                />
              </>
            )}

            {activeTab === 'app' && (
              <>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white"
                >
                  <option value="">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
                
                <input
                  type="text"
                  placeholder="Category"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
                />
                
                <input
                  type="text"
                  placeholder="Search message"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
                />
              </>
            )}

            {activeTab === 'audit' && (
              <>
                <input
                  type="text"
                  placeholder="Action"
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
                />
                
                <input
                  type="text"
                  placeholder="Resource Type"
                  value={filters.resourceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, resourceType: e.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Live Monitoring Panel */}
      {isLiveMode && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">🔴 Live Monitoring</h2>
              <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                connectionStatus === 'connected' ? 'bg-green-900 text-green-300' :
                connectionStatus === 'connecting' ? 'bg-yellow-900 text-yellow-300' :
                'bg-red-900 text-red-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                  connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                  'bg-red-400'
                }`}></div>
                {connectionStatus}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={clearAlerts}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-white"
              >
                Clear Alerts
              </button>
              <span className="text-sm text-gray-400">
                {alerts.length} alerts
              </span>
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">No alerts yet... monitoring system logs</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`p-3 rounded border text-sm ${getAlertColor(alert.type, alert.level)}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getAlertIcon(alert.type, alert.level)}</span>
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                      {alert.data && alert.data.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                            Show details ({alert.data.length} items)
                          </summary>
                          <div className="mt-1 pl-4 border-l-2 border-current opacity-75">
                            {alert.data.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-xs mt-1">
                                {alert.type === 'audit_activity' ? (
                                  `${item.action} on ${item.resource_type} by ${item.user_email}`
                                ) : alert.type === 'failed_requests' ? (
                                  `${item.method} ${item.path} - ${item.status_code}`
                                ) : (
                                  item.message || JSON.stringify(item).slice(0, 100)
                                )}
                              </div>
                            ))}
                            {alert.data.length > 3 && (
                              <div className="text-xs mt-1 opacity-50">
                                ... and {alert.data.length - 3} more
                              </div>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-700 mb-4">
        {[
          { key: 'access', label: 'Access Logs', count: accessLogs.length },
          { key: 'app', label: 'Application Logs', count: appLogs.length },
          { key: 'audit', label: 'Audit Trails', count: auditLogs.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as LogType)}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-2 px-2 py-1 bg-zinc-700 rounded-full text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-600/20 rounded-lg p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-red-300 font-medium">Error loading logs</p>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-800/20 rounded"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Access Logs Table */}
      {activeTab === 'access' && (
        <div className="bg-zinc-900 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Method</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Path</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Duration</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {accessLogs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                        log.method === 'POST' ? 'bg-green-100 text-green-800' :
                        log.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                        log.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-mono text-xs">{log.path}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(log.status_code)}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{log.user_email || '-'}</td>
                    <td className="py-3 px-4 text-gray-300">{formatDuration(log.duration_ms)}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatTimestamp(log.timestamp)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleRowExpansion(log.id)}
                        className="p-1 hover:bg-zinc-700 rounded text-gray-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && (
            <div className="text-center py-8 text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading logs...
            </div>
          )}
        </div>
      )}

      {/* Application Logs Table */}
      {activeTab === 'app' && (
        <div className="bg-zinc-900 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Level</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Message</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {appLogs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelBadge(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">{log.category}</td>
                    <td className="py-3 px-4 text-white max-w-md truncate">{log.message}</td>
                    <td className="py-3 px-4 text-gray-300">{log.user_email || '-'}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatTimestamp(log.timestamp)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleRowExpansion(log.id)}
                        className="p-1 hover:bg-zinc-700 rounded text-gray-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && (
            <div className="text-center py-8 text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading logs...
            </div>
          )}
        </div>
      )}

      {/* Audit Trails Table */}
      {activeTab === 'audit' && (
        <div className="bg-zinc-900 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Resource</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">IP Address</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-300">
                      {log.resource_type}
                      {log.resource_id && <span className="text-gray-500">#{log.resource_id}</span>}
                    </td>
                    <td className="py-3 px-4 text-white">{log.user_email}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{log.ip_address || '-'}</td>
                    <td className="py-3 px-4 text-gray-400 text-xs">{formatTimestamp(log.timestamp)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleRowExpansion(log.id)}
                        className="p-1 hover:bg-zinc-700 rounded text-gray-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {loading && (
            <div className="text-center py-8 text-gray-400">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading logs...
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-400">
          Showing {pagination.offset + 1} - {pagination.offset + (
            activeTab === 'access' ? accessLogs.length :
            activeTab === 'app' ? appLogs.length :
            auditLogs.length
          )} results
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
            disabled={pagination.offset === 0}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white"
          >
            Previous
          </button>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
            disabled={!pagination.hasMore}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm text-white"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}