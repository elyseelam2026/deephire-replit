import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  Palette,
  Key,
  Globe,
  Save
} from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState({
    // Profile settings
    companyName: "DeepHire Recruiting",
    companyEmail: "admin@deephire.com",
    companyPhone: "+1 (555) 123-4567",
    companyWebsite: "https://deephire.com",
    
    // Email settings
    emailSignature: "Best regards,\nThe DeepHire Team\n\nDeepHire - AI-Powered Talent Acquisition\nhttps://deephire.com",
    enableEmailNotifications: true,
    enableCandidateNotifications: true,
    
    // AI settings  
    aiModel: "grok-2-1212",
    enableAIMatching: true,
    matchThreshold: 75,
    
    // Security settings
    enableTwoFactor: false,
    sessionTimeout: 60,
    
    // Appearance
    theme: "system",
    language: "en"
  });

  const handleSave = () => {
    console.log('Saving settings:', settings);
    // TODO: Implement settings save functionality
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6 p-6" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences and configuration
          </p>
        </div>
        <Button onClick={handleSave} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" data-testid="tab-general">
            <SettingsIcon className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Database className="h-4 w-4 mr-2" />
            AI & Matching
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Update your company details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => updateSetting('companyName', e.target.value)}
                    data-testid="input-company-name"
                  />
                </div>
                <div>
                  <Label htmlFor="companyEmail">Email Address</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => updateSetting('companyEmail', e.target.value)}
                    data-testid="input-company-email"
                  />
                </div>
                <div>
                  <Label htmlFor="companyPhone">Phone Number</Label>
                  <Input
                    id="companyPhone"
                    value={settings.companyPhone}
                    onChange={(e) => updateSetting('companyPhone', e.target.value)}
                    data-testid="input-company-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="companyWebsite">Website</Label>
                  <Input
                    id="companyWebsite"
                    value={settings.companyWebsite}
                    onChange={(e) => updateSetting('companyWebsite', e.target.value)}
                    data-testid="input-company-website"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Customize your email signature and templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="emailSignature">Email Signature</Label>
                <Textarea
                  id="emailSignature"
                  value={settings.emailSignature}
                  onChange={(e) => updateSetting('emailSignature', e.target.value)}
                  rows={6}
                  data-testid="textarea-email-signature"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications for important events
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => updateSetting('enableEmailNotifications', checked)}
                  data-testid="switch-email-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="candidateNotifications">Candidate Activity</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when candidates respond or apply
                  </p>
                </div>
                <Switch
                  id="candidateNotifications"
                  checked={settings.enableCandidateNotifications}
                  onCheckedChange={(checked) => updateSetting('enableCandidateNotifications', checked)}
                  data-testid="switch-candidate-notifications"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                AI Configuration
              </CardTitle>
              <CardDescription>
                Configure AI model and matching parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="aiModel">AI Model</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="aiModel"
                    value={settings.aiModel}
                    readOnly
                    data-testid="input-ai-model"
                  />
                  <Badge variant="secondary">Current</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Using Grok 2 with 131k token context window
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="aiMatching">AI-Powered Matching</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic candidate-job matching
                  </p>
                </div>
                <Switch
                  id="aiMatching"
                  checked={settings.enableAIMatching}
                  onCheckedChange={(checked) => updateSetting('enableAIMatching', checked)}
                  data-testid="switch-ai-matching"
                />
              </div>
              <div>
                <Label htmlFor="matchThreshold">Match Threshold ({settings.matchThreshold}%)</Label>
                <Input
                  id="matchThreshold"
                  type="range"
                  min="50"
                  max="95"
                  value={settings.matchThreshold}
                  onChange={(e) => updateSetting('matchThreshold', parseInt(e.target.value))}
                  className="mt-2"
                  data-testid="slider-match-threshold"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Minimum match score required for candidate recommendations
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="twoFactor">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch
                  id="twoFactor"
                  checked={settings.enableTwoFactor}
                  onCheckedChange={(checked) => updateSetting('enableTwoFactor', checked)}
                  data-testid="switch-two-factor"
                />
              </div>
              <Separator />
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  min="15"
                  max="480"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                  className="mt-1 max-w-24"
                  data-testid="input-session-timeout"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically log out after period of inactivity
                </p>
              </div>
              <Separator />
              <div>
                <Button variant="outline" data-testid="button-change-password">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance & Language
              </CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <div className="flex gap-2 mt-2">
                  {['light', 'dark', 'system'].map((theme) => (
                    <Button
                      key={theme}
                      variant={settings.theme === theme ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateSetting('theme', theme)}
                      data-testid={`button-theme-${theme}`}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <Label htmlFor="language">Language</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="language"
                    value="English"
                    readOnly
                    className="max-w-32"
                    data-testid="input-language"
                  />
                  <Badge variant="secondary">Default</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Additional languages coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}