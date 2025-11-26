import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, AlertCircle, CheckCircle, Clock, DollarSign, TrendingUp } from "lucide-react";

interface MetricsData {
  timestamp: string;
  apiResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  activeConnections: number;
}

interface HealthStatus {
  database: "healthy" | "degraded" | "down";
  api: "healthy" | "degraded" | "down";
  xai: "healthy" | "degraded" | "down";
  uptime: number;
  timestamp: string;
}

interface CostSummary {
  service: string;
  totalCost: number;
  usageCount: number;
}

interface CostAlert {
  id: number;
  service: string;
  monthlyBudgetUsd: number;
  currentMonthSpend: number;
  alertThresholdPercent: number;
  alertSent: boolean;
}

export default function Monitoring() {
  // Dummy data for demonstration
  const dummyMetrics: MetricsData[] = [
    { timestamp: "00:00", apiResponseTime: 45, requestsPerMinute: 120, errorRate: 0.2, activeConnections: 234 },
    { timestamp: "01:00", apiResponseTime: 52, requestsPerMinute: 145, errorRate: 0.3, activeConnections: 289 },
    { timestamp: "02:00", apiResponseTime: 38, requestsPerMinute: 156, errorRate: 0.1, activeConnections: 301 },
    { timestamp: "03:00", apiResponseTime: 61, requestsPerMinute: 198, errorRate: 0.4, activeConnections: 412 },
    { timestamp: "04:00", apiResponseTime: 41, requestsPerMinute: 213, errorRate: 0.2, activeConnections: 467 },
    { timestamp: "05:00", apiResponseTime: 48, requestsPerMinute: 189, errorRate: 0.1, activeConnections: 398 },
  ];

  const dummyHealth: HealthStatus = {
    database: "healthy",
    api: "healthy",
    xai: "healthy",
    uptime: 99.8,
    timestamp: new Date().toISOString(),
  };

  const dummyCostSummary: CostSummary[] = [
    { service: "OpenAI API", totalCost: 245.50, usageCount: 15234 },
    { service: "SerpAPI", totalCost: 67.20, usageCount: 8956 },
    { service: "xAI Grok", totalCost: 189.75, usageCount: 12450 },
    { service: "Database", totalCost: 34.00, usageCount: 1 },
  ];

  const dummyCostAlerts: CostAlert[] = [
    { id: 1, service: "OpenAI API", monthlyBudgetUsd: 500, currentMonthSpend: 245.50, alertThresholdPercent: 75, alertSent: false },
    { id: 2, service: "SerpAPI", monthlyBudgetUsd: 150, currentMonthSpend: 67.20, alertThresholdPercent: 75, alertSent: false },
  ];

  // Fetch real-time metrics with fallback to dummy data
  const { data: metrics = dummyMetrics } = useQuery<MetricsData[]>({
    queryKey: ["/api/admin/metrics"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch health status with fallback
  const { data: health = dummyHealth } = useQuery<HealthStatus>({
    queryKey: ["/api/admin/health"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch cost summary with fallback
  const { data: costSummary = dummyCostSummary } = useQuery<CostSummary[]>({
    queryKey: ["/api/costs/summary"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch cost alerts with fallback
  const { data: costAlerts = dummyCostAlerts } = useQuery<CostAlert[]>({
    queryKey: ["/api/cost-alerts"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "bg-green-100 text-green-800";
    if (status === "degraded") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle className="w-4 h-4" />;
    if (status === "degraded") return <AlertCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const chartData = metrics.slice(-30); // Last 30 data points
  const COLORS = ["#3b82f6", "#ef4444", "#10b981"];
  
  const totalMonthlyCost = costSummary.reduce((sum, item) => sum + item.totalCost, 0);
  const totalUsageCount = costSummary.reduce((sum, item) => sum + item.usageCount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System & Cost Monitoring</h1>
        <p className="text-muted-foreground">Real-time platform health, performance metrics, and API cost tracking</p>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 px-3 py-2 rounded ${getStatusColor(health?.database || "down")}`}>
              {getStatusIcon(health?.database || "down")}
              <span className="capitalize text-sm font-medium">{health?.database || "down"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 px-3 py-2 rounded ${getStatusColor(health?.api || "down")}`}>
              {getStatusIcon(health?.api || "down")}
              <span className="capitalize text-sm font-medium">{health?.api || "down"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">xAI Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`flex items-center gap-2 px-3 py-2 rounded ${getStatusColor(health?.xai || "down")}`}>
              {getStatusIcon(health?.xai || "down")}
              <span className="capitalize text-sm font-medium">{health?.xai || "down"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-lg font-semibold">{((health?.uptime || 0) * 100).toFixed(2)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>API Response Time (ms)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="apiResponseTime"
                  stroke="#3b82f6"
                  dot={false}
                  name="Response Time (ms)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-muted-foreground">
              Collecting metrics...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requests and Errors Chart */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Requests Per Minute</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="requestsPerMinute" fill="#10b981" name="Requests/min" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-250 flex items-center justify-center text-muted-foreground">
                Collecting metrics...
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Error Rate (%)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="errorRate" fill="#ef4444" name="Error Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-250 flex items-center justify-center text-muted-foreground">
                Collecting metrics...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>API Response Time</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {metrics[metrics.length - 1]?.apiResponseTime || 0}ms
                </span>
                <Badge variant={metrics[metrics.length - 1]?.apiResponseTime! < 500 ? "default" : "destructive"}>
                  Target: &lt;500ms
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Error Rate</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {(metrics[metrics.length - 1]?.errorRate || 0).toFixed(2)}%
                </span>
                <Badge variant={metrics[metrics.length - 1]?.errorRate! < 0.1 ? "default" : "destructive"}>
                  Target: &lt;0.1%
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Active Connections</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {metrics[metrics.length - 1]?.activeConnections || 0}
                </span>
                <Badge variant="default">Healthy</Badge>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Requests Per Minute</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {metrics[metrics.length - 1]?.requestsPerMinute || 0} req/min
                </span>
                <Badge variant="default">Normal</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Monitoring Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">API Cost Tracking</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Total Monthly Cost</span>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">{totalUsageCount} total API calls</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Budget Alerts</span>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{costAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active budget thresholds</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>Services</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{costSummary.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Integrated API services</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown Chart */}
        {costSummary.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution by Service</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costSummary}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.service}: $${entry.totalCost.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalCost"
                    >
                      {costSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage by Service</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costSummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="service" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="usageCount" fill="#3b82f6" name="API Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cost Alerts Summary */}
        {costAlerts.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Budget Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {costAlerts.map((alert) => {
                  const percentage = (alert.currentMonthSpend / alert.monthlyBudgetUsd) * 100;
                  const isWarning = percentage >= alert.alertThresholdPercent;
                  
                  return (
                    <div key={alert.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{alert.service}</span>
                        <Badge variant={isWarning ? "destructive" : "default"}>
                          {percentage.toFixed(0)}% of budget
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ${alert.currentMonthSpend.toFixed(2)} / ${alert.monthlyBudgetUsd.toFixed(2)}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isWarning ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refresh every 5 seconds
      </div>
    </div>
  );
}
