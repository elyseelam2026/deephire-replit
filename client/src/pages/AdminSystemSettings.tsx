import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, AlertCircle, Mail, Lock, Database, Zap, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSystemSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-muted-foreground mt-2">Configure system-wide settings, integrations, and security</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* GENERAL SETTINGS */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Configuration
              </CardTitle>
              <CardDescription>Basic application settings</CardDescription>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-upload">Max Upload Size (MB)</Label>
                <Input id="max-upload" type="number" defaultValue="100" />
                <p className="text-xs text-muted-foreground">Maximum file size for bulk uploads</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                <Input id="session-timeout" type="number" defaultValue="30" />
                <p className="text-xs text-muted-foreground">Auto-logout inactive users after this period</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable features system-wide</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Email Verification</p>
                  <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Bulk Upload</p>
                  <p className="text-sm text-muted-foreground">Allow bulk data uploads</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Enable 2FA for admin accounts</p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">API Access</p>
                  <p className="text-sm text-muted-foreground">Enable external API access</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">Put system in maintenance mode</p>
                </div>
                <Switch />
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
                Security Configuration
              </CardTitle>
              <CardDescription>Protect your system and user data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                <p className="text-xs text-muted-foreground">Force password change every N days (0 = disabled)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                <Input id="max-login-attempts" type="number" defaultValue="5" />
                <p className="text-xs text-muted-foreground">Lock account after N failed attempts</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockout-duration">Account Lockout Duration (minutes)</Label>
                <Input id="lockout-duration" type="number" defaultValue="15" />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Security Features</p>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">SSL/TLS Encryption</p>
                    <p className="text-xs text-muted-foreground">All data encrypted in transit</p>
                  </div>
                  <Switch defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">CSRF Protection</p>
                    <p className="text-xs text-muted-foreground">Prevent cross-site attacks</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Rate Limiting</p>
                    <p className="text-xs text-muted-foreground">Limit API requests per user</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">IP Whitelisting</p>
                    <p className="text-xs text-muted-foreground">Restrict admin access by IP</p>
                  </div>
                  <Switch />
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
              <CardDescription>Configure email delivery and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input id="smtp-host" placeholder="smtp.sendgrid.net" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input id="smtp-port" type="number" defaultValue="587" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-user">SMTP Username</Label>
                  <Input id="smtp-user" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-email">Default From Email</Label>
                <Input id="from-email" type="email" defaultValue="noreply@deephire.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="from-name">Default From Name</Label>
                <Input id="from-name" defaultValue="DeepHire" />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Email Templates</p>
                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="text-sm font-medium">Verification Email</p>
                  <p className="text-xs text-muted-foreground">Sent when users register</p>
                  <Button variant="outline" size="sm">Edit Template</Button>
                </div>

                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="text-sm font-medium">Password Reset Email</p>
                  <p className="text-xs text-muted-foreground">Sent when users reset password</p>
                  <Button variant="outline" size="sm">Edit Template</Button>
                </div>

                <div className="space-y-2 p-3 border rounded-lg">
                  <p className="text-sm font-medium">Weekly Summary Email</p>
                  <p className="text-xs text-muted-foreground">Sent to users weekly</p>
                  <Button variant="outline" size="sm">Edit Template</Button>
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
                Performance & Database
              </CardTitle>
              <CardDescription>Optimize system performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
                <Input id="cache-ttl" type="number" defaultValue="3600" />
                <p className="text-xs text-muted-foreground">How long to cache query results</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-pool">Database Connection Pool Size</Label>
                <Input id="db-pool" type="number" defaultValue="10" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="query-timeout">Query Timeout (seconds)</Label>
                <Input id="query-timeout" type="number" defaultValue="30" />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Logging Configuration</p>
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
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="font-medium">Monitoring & Backups</p>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Automated Backups</p>
                    <p className="text-xs text-muted-foreground">Daily at 2:00 AM UTC</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Performance Monitoring</p>
                    <p className="text-xs text-muted-foreground">Track system metrics</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Error Alerting</p>
                    <p className="text-xs text-muted-foreground">Email on critical errors</p>
                  </div>
                  <Switch defaultChecked />
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
              <CardDescription>Manage external service connections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">SendGrid Email Service</p>
                      <p className="text-xs text-muted-foreground">Transactional email delivery</p>
                    </div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Connected</span>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">Twilio SMS Service</p>
                      <p className="text-xs text-muted-foreground">SMS notifications and verification</p>
                    </div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Connected</span>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">xAI Grok API</p>
                      <p className="text-xs text-muted-foreground">AI-powered candidate analysis</p>
                    </div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">Connected</span>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">Slack Workspace</p>
                      <p className="text-xs text-muted-foreground">Recruiting notifications and alerts</p>
                    </div>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not Connected</span>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>

                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">Google Analytics</p>
                      <p className="text-xs text-muted-foreground">Track user behavior and metrics</p>
                    </div>
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not Connected</span>
                  </div>
                  <Button variant="outline" size="sm">Connect</Button>
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
                Note: System settings changes take effect immediately for new sessions
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                Existing user sessions will apply settings on next page refresh
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
