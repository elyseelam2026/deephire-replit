import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
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
  Save,
  ListPlus,
  Plus,
  Trash2,
  Edit,
  MoveUp,
  MoveDown
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [companyId] = useState(() => parseInt(localStorage.getItem("companyId") || "0"));
  
  // Fetch company data
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['/api/companies', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch company');
      return response.json();
    },
    enabled: !!companyId,
  });

  const [settings, setSettings] = useState({
    // Profile settings
    companyName: company?.name || "",
    companyEmail: company?.primaryEmail || "",
    companyPhone: company?.primaryPhone || "",
    companyWebsite: company?.website || "",
    
    // Email settings
    emailSignature: `Best regards,\n${company?.name || 'Your Company'} Team`,
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
  
  // Update settings when company data loads
  useEffect(() => {
    if (company) {
      setSettings(prev => ({
        ...prev,
        companyName: company.name || "Loading...",
        companyEmail: company.primaryEmail || "",
        companyPhone: company.primaryPhone || "",
        companyWebsite: company.website || "",
        emailSignature: `Best regards,\n${company.name || 'Your Company'} Team`
      }));
    }
  }, [company]);
  
  // Custom Fields state
  const [selectedEntityType, setSelectedEntityType] = useState<string>("candidates");
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [editingField, setEditingField] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{type: 'section' | 'field', id: number} | null>(null);
  
  // Change Password states
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [sectionForm, setSectionForm] = useState({
    name: "",
    label: "",
    description: "",
    entityType: "candidates"
  });
  const [fieldForm, setFieldForm] = useState({
    fieldKey: "",
    label: "",
    description: "",
    fieldType: "text",
    entityType: "candidates",
    sectionId: null as number | null
  });
  
  // Fetch custom field sections
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/custom-field-sections", selectedEntityType],
    queryFn: () => fetch(`/api/custom-field-sections?entityType=${selectedEntityType}`).then(r => r.json())
  });
  
  // Fetch custom field definitions  
  const { data: definitions = [], isLoading: definitionsLoading } = useQuery({
    queryKey: ["/api/custom-field-definitions", selectedEntityType],
    queryFn: () => fetch(`/api/custom-field-definitions?entityType=${selectedEntityType}`).then(r => r.json())
  });
  
  // Mutations
  const createSectionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/custom-field-sections", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-sections"] });
      setShowSectionDialog(false);
      setEditingSection(null);
      setSectionForm({ name: "", label: "", description: "", entityType: selectedEntityType });
      toast({ title: "Section created successfully" });
    },
    onError: () => toast({ title: "Failed to create section", variant: "destructive" })
  });
  
  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/custom-field-sections/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-sections"] });
      setShowSectionDialog(false);
      setEditingSection(null);
      setSectionForm({ name: "", label: "", description: "", entityType: selectedEntityType });
      toast({ title: "Section updated successfully" });
    },
    onError: () => toast({ title: "Failed to update section", variant: "destructive" })
  });
  
  const createFieldMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/custom-field-definitions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-definitions"] });
      setShowFieldDialog(false);
      setEditingField(null);
      setFieldForm({ fieldKey: "", label: "", description: "", fieldType: "text", entityType: selectedEntityType, sectionId: null });
      toast({ title: "Field created successfully" });
    },
    onError: () => toast({ title: "Failed to create field", variant: "destructive" })
  });
  
  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/custom-field-definitions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-definitions"] });
      setShowFieldDialog(false);
      setEditingField(null);
      setFieldForm({ fieldKey: "", label: "", description: "", fieldType: "text", entityType: selectedEntityType, sectionId: null });
      toast({ title: "Field updated successfully" });
    },
    onError: () => toast({ title: "Failed to update field", variant: "destructive" })
  });
  
  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/custom-field-sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-definitions"] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast({ title: "Section deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete section", variant: "destructive" })
  });
  
  const deleteFieldMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/custom-field-definitions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-field-definitions"] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast({ title: "Field deleted successfully" });
    },
    onError: () => toast({ title: "Failed to delete field", variant: "destructive" })
  });
  
  const changePasswordMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/company/change-password", data),
    onSuccess: () => {
      setShowChangePasswordDialog(false);
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to change password", 
        description: error.message || "Invalid current password",
        variant: "destructive" 
      });
    }
  });
  
  const updateTwoFactorMutation = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("POST", "/api/company/update-2fa", { enabled }),
    onSuccess: () => {
      toast({ title: "Two-factor authentication updated" });
    },
    onError: () => {
      toast({ 
        title: "Failed to update 2FA", 
        variant: "destructive" 
      });
      setSettings(prev => ({ ...prev, enableTwoFactor: !prev.enableTwoFactor }));
    }
  });

  const [, setLocation] = useLocation();

  const handleSave = () => {
    console.log('Saving settings:', settings);
    // TODO: Implement settings save functionality
  };

  const handleLogout = () => {
    localStorage.removeItem("companyId");
    localStorage.removeItem("email");
    setLocation("/");
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  const openAddSectionDialog = () => {
    setEditingSection(null);
    setSectionForm({ name: "", label: "", description: "", entityType: selectedEntityType });
    setShowSectionDialog(true);
  };
  
  const openEditSectionDialog = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      name: section.name || "",
      label: section.label || "",
      description: section.description || "",
      entityType: section.entityType || selectedEntityType
    });
    setShowSectionDialog(true);
  };
  
  const openAddFieldDialog = (sectionId?: number) => {
    setEditingField(null);
    setFieldForm({ fieldKey: "", label: "", description: "", fieldType: "text", entityType: selectedEntityType, sectionId: sectionId || null });
    setShowFieldDialog(true);
  };
  
  const openEditFieldDialog = (field: any) => {
    setEditingField(field);
    setFieldForm({
      fieldKey: field.fieldKey || "",
      label: field.label || "",
      description: field.description || "",
      fieldType: field.fieldType || "text",
      entityType: field.entityType || selectedEntityType,
      sectionId: field.sectionId || null
    });
    setShowFieldDialog(true);
  };
  
  const confirmDelete = (type: 'section' | 'field', id: number) => {
    setDeleteTarget({ type, id });
    setDeleteConfirmOpen(true);
  };
  
  const executeDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'section') {
      deleteSectionMutation.mutate(deleteTarget.id);
    } else {
      deleteFieldMutation.mutate(deleteTarget.id);
    }
  };
  
  const saveSectionOrField = () => {
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data: sectionForm });
    } else if (showSectionDialog) {
      createSectionMutation.mutate(sectionForm);
    } else if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data: fieldForm });
    } else if (showFieldDialog) {
      createFieldMutation.mutate(fieldForm);
    }
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
        <div className="flex gap-2">
          <Button onClick={handleSave} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button onClick={handleLogout} variant="destructive" data-testid="button-logout-settings">
            Logout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="custom-fields" data-testid="tab-custom-fields">
            <ListPlus className="h-4 w-4 mr-2" />
            Custom Fields
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
                  onCheckedChange={(checked) => {
                    updateSetting('enableTwoFactor', checked);
                    updateTwoFactorMutation.mutate(checked);
                  }}
                  disabled={updateTwoFactorMutation.isPending}
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
                <Button 
                  variant="outline" 
                  onClick={() => setShowChangePasswordDialog(true)}
                  data-testid="button-change-password"
                >
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

        <TabsContent value="custom-fields" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListPlus className="h-5 w-5" />
                Custom Fields Management
              </CardTitle>
              <CardDescription>
                Define additional fields for Companies, Candidates, and Jobs to capture unique information specific to your workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Entity Type</Label>
                <div className="flex gap-2 mt-2">
                  {['companies', 'candidates', 'jobs'].map((entity) => (
                    <Button
                      key={entity}
                      variant={selectedEntityType === entity ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedEntityType(entity)}
                      data-testid={`button-entity-${entity}`}
                    >
                      {entity.charAt(0).toUpperCase() + entity.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium">Custom Field Sections</h4>
                  <Button size="sm" onClick={openAddSectionDialog} data-testid="button-add-section">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>
                {sectionsLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
                ) : sections.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No custom field sections defined yet. Click "Add Section" to create your first custom field section.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sections.map((section: any) => (
                      <Card key={section.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{section.label}</CardTitle>
                              <CardDescription>{section.description}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openAddFieldDialog(section.id)}
                                data-testid={`button-add-field-${section.id}`}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Field
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditSectionDialog(section)}
                                data-testid={`button-edit-section-${section.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => confirmDelete('section', section.id)}
                                data-testid={`button-delete-section-${section.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {definitions.filter((d: any) => d.sectionId === section.id).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No fields in this section yet.</p>
                          ) : (
                            <div className="space-y-2">
                              {definitions.filter((d: any) => d.sectionId === section.id).map((field: any) => (
                                <div key={field.id} className="flex items-center justify-between p-2 border rounded-md">
                                  <div>
                                    <p className="font-medium text-sm">{field.label}</p>
                                    <p className="text-xs text-muted-foreground">{field.fieldType} • {field.fieldKey}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEditFieldDialog(field)}
                                      data-testid={`button-edit-field-${field.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => confirmDelete('field', field.id)}
                                      data-testid={`button-delete-field-${field.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Section Dialog */}
      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit' : 'Add'} Custom Field Section</DialogTitle>
            <DialogDescription>
              {editingSection ? 'Update the' : 'Create a new'} section to organize related custom fields
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="section-label">Section Label *</Label>
              <Input
                id="section-label"
                value={sectionForm.label}
                onChange={(e) => setSectionForm({...sectionForm, label: e.target.value})}
                placeholder="Deal Experience"
                data-testid="input-section-label"
              />
            </div>
            <div>
              <Label htmlFor="section-name">Section Name (Internal) *</Label>
              <Input
                id="section-name"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({...sectionForm, name: e.target.value})}
                placeholder="deal_experience"
                data-testid="input-section-name"
              />
            </div>
            <div>
              <Label htmlFor="section-description">Description</Label>
              <Textarea
                id="section-description"
                value={sectionForm.description}
                onChange={(e) => setSectionForm({...sectionForm, description: e.target.value})}
                placeholder="Track candidate's private equity deal experience"
                data-testid="textarea-section-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)} data-testid="button-cancel-section">
              Cancel
            </Button>
            <Button 
              onClick={saveSectionOrField}
              disabled={!sectionForm.label || !sectionForm.name || createSectionMutation.isPending || updateSectionMutation.isPending}
              data-testid="button-save-section"
            >
              {editingSection ? 'Update' : 'Create'} Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add/Edit Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit' : 'Add'} Custom Field</DialogTitle>
            <DialogDescription>
              {editingField ? 'Update the' : 'Create a new'} custom field to capture specific information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="field-label">Field Label *</Label>
              <Input
                id="field-label"
                value={fieldForm.label}
                onChange={(e) => setFieldForm({...fieldForm, label: e.target.value})}
                placeholder="AUM Managed"
                data-testid="input-field-label"
              />
            </div>
            <div>
              <Label htmlFor="field-key">Field Key (Internal) *</Label>
              <Input
                id="field-key"
                value={fieldForm.fieldKey}
                onChange={(e) => setFieldForm({...fieldForm, fieldKey: e.target.value})}
                placeholder="aum_managed"
                data-testid="input-field-key"
              />
            </div>
            <div>
              <Label htmlFor="field-type">Field Type *</Label>
              <Select
                value={fieldForm.fieldType}
                onValueChange={(value) => setFieldForm({...fieldForm, fieldType: value})}
              >
                <SelectTrigger data-testid="select-field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Select (Dropdown)</SelectItem>
                  <SelectItem value="multi_select">Multi-Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="field-description">Description</Label>
              <Textarea
                id="field-description"
                value={fieldForm.description}
                onChange={(e) => setFieldForm({...fieldForm, description: e.target.value})}
                placeholder="Total assets under management in USD"
                data-testid="textarea-field-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFieldDialog(false)} data-testid="button-cancel-field">
              Cancel
            </Button>
            <Button 
              onClick={saveSectionOrField}
              disabled={!fieldForm.label || !fieldForm.fieldKey || createFieldMutation.isPending || updateFieldMutation.isPending}
              data-testid="button-save-field"
            >
              {editingField ? 'Update' : 'Create'} Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Change Password Dialog */}
      <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={changePasswordForm.currentPassword}
                onChange={(e) => setChangePasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={changePasswordForm.newPassword}
                onChange={(e) => setChangePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password"
                data-testid="input-new-password"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={changePasswordForm.confirmPassword}
                onChange={(e) => setChangePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePasswordDialog(false)} data-testid="button-cancel-password">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
                  toast({ title: "Passwords don't match", variant: "destructive" });
                  return;
                }
                changePasswordMutation.mutate({
                  currentPassword: changePasswordForm.currentPassword,
                  newPassword: changePasswordForm.newPassword
                });
              }}
              disabled={changePasswordMutation.isPending || !changePasswordForm.currentPassword || !changePasswordForm.newPassword}
              data-testid="button-change-password-submit"
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
              {deleteTarget?.type === 'section' && ' All fields in this section will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}