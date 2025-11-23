import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";

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

export default function Monitoring() {
  // Fetch real-time metrics
  const { data: metrics = [] } = useQuery<MetricsData[]>({
    queryKey: ["/api/admin/metrics"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch health status
  const { data: health } = useQuery<HealthStatus>({
    queryKey: ["/api/admin/health"],
    refetchInterval: 10000, // Refresh every 10 seconds
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <p className="text-muted-foreground">Real-time platform health and performance metrics</p>
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

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refresh every 5 seconds
      </div>
    </div>
  );
}
