import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, AlertCircle, Mail, Lock, Database, Zap, BarChart3, Copy, Trash2, Plus, Eye, EyeOff, Server, Activity, TrendingUp, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminSystemSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [configDialog, setConfigDialog] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, string>>({});
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: "Production API Key", created: "2024-01-15", lastUsed: "2024-11-22", active: true }
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generateApiKey = () => {
    const newKey = {
      id: apiKeys.length + 1,
      name: "New API Key",
      created: new Date().toLocaleDateString(),
      lastUsed: "Never",
      active: true
    };
    setApiKeys([...apiKeys, newKey]);
    toast({
      title: "API Key Generated",
      description: "New API key has been created",
    });
  };

  const deleteApiKey = (id: number) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
    toast({
      title: "API Key Deleted",
      description: "API key has been removed",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  // System metrics data
  const metrics = {
    uptime: 99.98,
    activeUsers: 2847,
    totalRecords: 154890,
    avgResponseTime: 245,
    errorRate: 0.02,
    dbSize: 2.34
  };

  const integrations = [
    { name: "SendGrid", desc: "Transactional email", status: "connected", icon: "📧" },
    { name: "Twilio", desc: "SMS notifications", status: "connected", icon: "📱" },
    { name: "xAI Grok", desc: "AI-powered analysis", status: "connected", icon: "🤖" },
    { name: "SerpAPI", desc: "LinkedIn search & data", status: "connected", icon: "🔍" },
    { name: "Bright Data", desc: "Web scraping & proxies", status: "connected", icon: "🌐" },
    { name: "Voyage AI", desc: "Semantic embeddings", status: "connected", icon: "🧠" },
    { name: "Slack", desc: "Team notifications", status: "disconnected", icon: "💬" },
    { name: "Google Analytics", desc: "User behavior tracking", status: "disconnected", icon: "📊" },
    { name: "Stripe", desc: "Payment processing", status: "disconnected", icon: "💳" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-2">Advanced system configuration, monitoring, and administration</p>
      </div>

      {/* SYSTEM HEALTH DASHBOARD */}
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.uptime}%</div>
              <div className="text-xs text-muted-foreground mt-1">Uptime</div>
              <Activity className="h-4 w-4 mx-auto mt-2 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.activeUsers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Active Users</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalRecords.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Records</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.avgResponseTime}ms</div>
              <div className="text-xs text-muted-foreground mt-1">Avg Response</div>
              <TrendingUp className="h-4 w-4 mx-auto mt-2 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.errorRate}%</div>
              <div className="text-xs text-muted-foreground mt-1">Error Rate</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">{metrics.dbSize}GB</div>
              <div className="text-xs text-muted-foreground mt-1">DB Size</div>
              <Database className="h-4 w-4 mx-auto mt-2 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api">API & Webhooks</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* GENERAL SETTINGS */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Configuration
              </CardTitle>
              <CardDescription>Basic application settings and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input id="app-name" defaultValue="DeepHire" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="app-version">Current Version</Label>
                  <Input id="app-version" defaultValue="1.0.0" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" type="email" defaultValue="support@deephire.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC</SelectItem>
                      <SelectItem value="est">Eastern Time</SelectItem>
                      <SelectItem value="cst">Central Time</SelectItem>
                      <SelectItem value="mst">Mountain Time</SelectItem>
                      <SelectItem value="pst">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-upload">Max Upload Size (MB)</Label>
                  <Input id="max-upload" type="number" defaultValue="100" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Input id="session-timeout" type="number" defaultValue="30" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Feature Flags</p>
                <div className="space-y-3">
                  {[
                    { label: "Email Verification", desc: "Require email verification for new accounts", default: true },
                    { label: "Bulk Upload", desc: "Allow bulk data uploads", default: true },
                    { label: "Two-Factor Authentication", desc: "Enable 2FA for admin accounts", default: false },
                    { label: "API Access", desc: "Enable external API access", default: true },
                    { label: "Maintenance Mode", desc: "Put system in maintenance mode", default: false },
                  ].map((flag, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{flag.label}</p>
                        <p className="text-xs text-muted-foreground">{flag.desc}</p>
                      </div>
                      <Switch defaultChecked={flag.default} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY SETTINGS */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Security & Access Control
              </CardTitle>
              <CardDescription>Protect your system and user data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="password-policy">Password Policy</Label>
                  <Select defaultValue="strong">
                    <SelectTrigger id="password-policy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weak">Weak (6+ characters)</SelectItem>
                      <SelectItem value="medium">Medium (8+ chars, mixed case)</SelectItem>
                      <SelectItem value="strong">Strong (12+ chars, numbers, symbols)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                  <Input id="password-expiry" type="number" defaultValue="90" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                  <Input id="max-login-attempts" type="number" defaultValue="5" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lockout-duration">Account Lockout (minutes)</Label>
                  <Input id="lockout-duration" type="number" defaultValue="15" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-duration">Max Session Duration (hours)</Label>
                  <Input id="session-duration" type="number" defaultValue="24" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ip-whitelist">IP Whitelist (comma-separated)</Label>
                  <Input id="ip-whitelist" placeholder="192.168.1.1, 10.0.0.1" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Security Features</p>
                <div className="space-y-3">
                  {[
                    { label: "SSL/TLS Encryption", desc: "All data encrypted in transit", enabled: true, locked: true },
                    { label: "CSRF Protection", desc: "Prevent cross-site attacks", enabled: true, locked: false },
                    { label: "Rate Limiting", desc: "Limit API requests per user", enabled: true, locked: false },
                    { label: "IP Whitelisting", desc: "Restrict admin access by IP", enabled: false, locked: false },
                    { label: "Two-Factor Auth", desc: "Enforce 2FA for admins", enabled: false, locked: false },
                    { label: "Request Signing", desc: "Sign all API requests", enabled: true, locked: false },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                      <Switch defaultChecked={feature.enabled} disabled={feature.locked} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMAIL SETTINGS */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>Configure email delivery and templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input id="smtp-host" placeholder="smtp.sendgrid.net" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input id="smtp-port" type="number" defaultValue="587" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-email">Default From Email</Label>
                  <Input id="from-email" type="email" defaultValue="noreply@deephire.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-name">Default From Name</Label>
                  <Input id="from-name" defaultValue="DeepHire" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input id="smtp-user" placeholder="apikey" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bounce-email">Bounce Notification Email</Label>
                  <Input id="bounce-email" type="email" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Email Templates</p>
                <div className="space-y-3">
                  {[
                    { name: "Verification Email", desc: "Sent when users register" },
                    { name: "Password Reset Email", desc: "Sent when users reset password" },
                    { name: "Weekly Summary", desc: "Sent to users weekly" },
                    { name: "Offer Notification", desc: "Sent when offers are made" },
                    { name: "Interview Scheduled", desc: "Calendar invitation emails" },
                  ].map((template, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground">{template.desc}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setConfigDialog(`email-${i}`)}
                      >
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERFORMANCE SETTINGS */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance & Database Optimization
              </CardTitle>
              <CardDescription>Optimize system performance and resource usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
                  <Input id="cache-ttl" type="number" defaultValue="3600" />
                  <p className="text-xs text-muted-foreground">How long to cache query results</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="db-pool">Database Connection Pool</Label>
                  <Input id="db-pool" type="number" defaultValue="10" />
                  <p className="text-xs text-muted-foreground">Max concurrent connections</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="query-timeout">Query Timeout (seconds)</Label>
                  <Input id="query-timeout" type="number" defaultValue="30" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulk-batch-size">Bulk Import Batch Size</Label>
                  <Input id="bulk-batch-size" type="number" defaultValue="1000" />
                  <p className="text-xs text-muted-foreground">Records per batch during imports</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-level">Log Level</Label>
                  <Select defaultValue="info">
                    <SelectTrigger id="log-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug (Verbose)</SelectItem>
                      <SelectItem value="info">Info (Normal)</SelectItem>
                      <SelectItem value="warn">Warning (Important only)</SelectItem>
                      <SelectItem value="error">Error (Critical only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-retention">Log Retention (days)</Label>
                  <Input id="log-retention" type="number" defaultValue="90" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Monitoring & Maintenance</p>
                <div className="space-y-3">
                  {[
                    { label: "Automated Backups", desc: "Daily at 2:00 AM UTC", enabled: true },
                    { label: "Performance Monitoring", desc: "Track system metrics", enabled: true },
                    { label: "Error Alerting", desc: "Email on critical errors", enabled: true },
                    { label: "Database Optimization", desc: "Auto-vacuum and analyze", enabled: true },
                    { label: "Index Monitoring", desc: "Detect unused indexes", enabled: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked={item.enabled} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Third-Party Integrations
              </CardTitle>
              <CardDescription>Manage external service connections and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.map((service, i) => (
                <div key={i} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{service.icon}</span>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.desc}</p>
                      </div>
                    </div>
                    <Badge variant={service.status === "connected" ? "default" : "outline"}>
                      {service.status}
                    </Badge>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setSelectedIntegration(service.name);
                      setConfigDialog(`integration-${i}`);
                    }}
                  >
                    {service.status === "connected" ? "Reconfigure" : "Connect"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API & WEBHOOKS */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys Management</CardTitle>
              <CardDescription>Create and manage API keys for external integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={generateApiKey} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Generate New API Key
              </Button>

              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{key.name}</p>
                        <p className="text-xs text-muted-foreground">Created: {key.created}</p>
                        <p className="text-xs text-muted-foreground">Last Used: {key.lastUsed}</p>
                      </div>
                      <Badge variant={key.active ? "default" : "secondary"}>
                        {key.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input 
                          type={showApiKey ? "text" : "password"} 
                          value={`sk_live_${Math.random().toString(36).slice(2)}`}
                          disabled
                          className="pr-10"
                        />
                        <button 
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => copyToClipboard(`sk_live_${Math.random().toString(36).slice(2)}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => deleteApiKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks Configuration</CardTitle>
              <CardDescription>Configure webhook endpoints for real-time events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook Endpoint
              </Button>

              <div className="space-y-3">
                {[
                  { event: "candidate.created", url: "https://api.example.com/webhooks/candidates", active: true },
                  { event: "application.received", url: "https://api.example.com/webhooks/applications", active: true },
                  { event: "offer.sent", url: "https://api.example.com/webhooks/offers", active: false },
                ].map((webhook, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{webhook.event}</p>
                      <Badge variant={webhook.active ? "default" : "secondary"}>
                        {webhook.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{webhook.url}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast({ title: "Edit", description: "Webhook editor opened" })}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast({ title: "Test Sent", description: "Test webhook triggered" })}
                      >
                        Test
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast({ title: "Logs", description: "Opening webhook logs..." })}
                      >
                        Logs
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="ml-auto"
                        onClick={() => toast({ title: "Deleted", description: "Webhook deleted" })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED SETTINGS */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>Expert-level system settings for power users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="data-retention">Data Retention Policy (days)</Label>
                <Input id="data-retention" type="number" defaultValue="365" />
                <p className="text-xs text-muted-foreground">Automatically delete data older than this period</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-headers">Custom HTTP Headers (JSON)</Label>
                <Textarea 
                  id="custom-headers" 
                  placeholder='{"X-Custom-Header": "value"}'
                  className="font-mono text-xs"
                  rows={4}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Advanced Features</p>
                <div className="space-y-3">
                  {[
                    { label: "Custom Domain Support", desc: "Enable white-label domains", enabled: true },
                    { label: "API Rate Limiting", desc: "Enforce rate limits per API key", enabled: true },
                    { label: "Multi-Tenancy", desc: "Separate data by tenant", enabled: true },
                    { label: "Audit Trail", desc: "Log all administrative actions", enabled: true },
                    { label: "Custom OAuth Provider", desc: "Use custom OAuth for SSO", enabled: false },
                    { label: "GraphQL API", desc: "Enable GraphQL endpoint", enabled: false },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.desc}</p>
                      </div>
                      <Switch defaultChecked={feature.enabled} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Database Utilities</p>
                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => toast({ title: "Running", description: "Database maintenance started..." })}
                  >
                    Run Database Maintenance
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => toast({ title: "Analyzing", description: "Query performance analysis in progress..." })}
                  >
                    Analyze Query Performance
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => toast({ title: "Exporting", description: "Database snapshot export started..." })}
                  >
                    Export Database Snapshot
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => toast({ title: "Purging", description: "Old logs purge initiated..." })}
                  >
                    Purge Old Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      {/* INFO BOX */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                System settings changes take effect immediately
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                Most settings apply to new sessions. Critical changes (security, database) may require service restart
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Email Template Configuration Dialog */}
      <Dialog open={configDialog?.startsWith('email-')} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Template Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input disabled value="Verification Email" />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input placeholder="Verify your email address" />
            </div>
            <div className="space-y-2">
              <Label>HTML Content</Label>
              <Textarea placeholder="<html>...</html>" rows={6} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setConfigDialog(null)}>Cancel</Button>
              <Button onClick={() => {
                setConfigDialog(null);
                toast({ title: "Saved", description: "Template saved successfully" });
              }}>
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Integration Configuration Dialog */}
      <Dialog open={configDialog?.startsWith('integration-')} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedIntegration} Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIntegration === "SendGrid" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sendgrid-key">SendGrid API Key</Label>
                  <Input 
                    id="sendgrid-key"
                    type="password"
                    placeholder="SG.xxxxxxxxxxxxx"
                    value={integrationConfig['sendgrid'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, sendgrid: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sendgrid-from">Default From Email</Label>
                  <Input 
                    id="sendgrid-from"
                    placeholder="noreply@deephire.com"
                    value={integrationConfig['sendgrid-from'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'sendgrid-from': e.target.value})}
                  />
                </div>
              </>
            )}
            {selectedIntegration === "Twilio" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="twilio-account">Account SID</Label>
                  <Input 
                    id="twilio-account"
                    placeholder="ACxxxxxxxxxxxxx"
                    value={integrationConfig['twilio-account'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'twilio-account': e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilio-token">Auth Token</Label>
                  <Input 
                    id="twilio-token"
                    type="password"
                    placeholder="Your auth token"
                    value={integrationConfig['twilio-token'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'twilio-token': e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twilio-phone">From Phone Number</Label>
                  <Input 
                    id="twilio-phone"
                    placeholder="+1234567890"
                    value={integrationConfig['twilio-phone'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'twilio-phone': e.target.value})}
                  />
                </div>
              </>
            )}
            {selectedIntegration === "xAI Grok" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="xai-key">xAI API Key</Label>
                  <Input 
                    id="xai-key"
                    type="password"
                    placeholder="xai-xxxxxxxxxxxxx"
                    value={integrationConfig['xai'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, xai: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="xai-model">Model</Label>
                  <Select defaultValue="grok-beta">
                    <SelectTrigger id="xai-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grok-beta">Grok Beta</SelectItem>
                      <SelectItem value="grok-1">Grok 1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selectedIntegration === "SerpAPI" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="serpapi-key">SerpAPI Key</Label>
                  <Input 
                    id="serpapi-key"
                    type="password"
                    placeholder="Your SerpAPI key"
                    value={integrationConfig['serpapi'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, serpapi: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serpapi-search">Search Engine</Label>
                  <Select defaultValue="google">
                    <SelectTrigger id="serpapi-search">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="bing">Bing</SelectItem>
                      <SelectItem value="baidu">Baidu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selectedIntegration === "Bright Data" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="brightdata-key">Bright Data API Key</Label>
                  <Input 
                    id="brightdata-key"
                    type="password"
                    placeholder="Your Bright Data key"
                    value={integrationConfig['brightdata'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, brightdata: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brightdata-zone">Zone Name</Label>
                  <Input 
                    id="brightdata-zone"
                    placeholder="residential"
                    value={integrationConfig['brightdata-zone'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'brightdata-zone': e.target.value})}
                  />
                </div>
              </>
            )}
            {selectedIntegration === "Voyage AI" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="voyage-key">Voyage API Key</Label>
                  <Input 
                    id="voyage-key"
                    type="password"
                    placeholder="pa-xxxxxxxxxxxxx"
                    value={integrationConfig['voyage'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, voyage: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voyage-model">Embedding Model</Label>
                  <Select defaultValue="voyage-large-2">
                    <SelectTrigger id="voyage-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="voyage-large-2">Voyage Large 2</SelectItem>
                      <SelectItem value="voyage-large-2-instruct">Voyage Large 2 Instruct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {selectedIntegration === "Slack" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="slack-token">Bot Token</Label>
                  <Input 
                    id="slack-token"
                    type="password"
                    placeholder="xoxb-xxxxxxxxxxxxx"
                    value={integrationConfig['slack'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, slack: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slack-channel">Default Channel</Label>
                  <Input 
                    id="slack-channel"
                    placeholder="#recruiting"
                    value={integrationConfig['slack-channel'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'slack-channel': e.target.value})}
                  />
                </div>
              </>
            )}
            {selectedIntegration === "Google Analytics" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ga-tracking">Tracking ID</Label>
                  <Input 
                    id="ga-tracking"
                    placeholder="G-XXXXXXXXXXXXX"
                    value={integrationConfig['ga'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, ga: e.target.value})}
                  />
                </div>
              </>
            )}
            {selectedIntegration === "Stripe" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stripe-key">Publishable Key</Label>
                  <Input 
                    id="stripe-key"
                    placeholder="pk_live_xxxxxxxxxxxxx"
                    value={integrationConfig['stripe-pub'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'stripe-pub': e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stripe-secret">Secret Key</Label>
                  <Input 
                    id="stripe-secret"
                    type="password"
                    placeholder="sk_live_xxxxxxxxxxxxx"
                    value={integrationConfig['stripe-secret'] || ''}
                    onChange={(e) => setIntegrationConfig({...integrationConfig, 'stripe-secret': e.target.value})}
                  />
                </div>
              </>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setConfigDialog(null)}>Cancel</Button>
              <Button onClick={() => {
                setConfigDialog(null);
                toast({ 
                  title: "Success", 
                  description: `${selectedIntegration} configuration saved successfully` 
                });
              }}>
                Save Configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
