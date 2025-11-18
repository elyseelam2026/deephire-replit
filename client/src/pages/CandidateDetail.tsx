import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, Mail, Phone, MapPin, Briefcase, Building, 
  Award, Loader2, ArrowLeft, Globe, Linkedin, Edit, Save, X,
  FileText, Calendar, Clock, CheckCircle2, XCircle, 
  FileIcon, Upload, Download, Trash2, ExternalLink,
  MessageSquare, PhoneCall, Video, Plus, Target
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  linkedinUrl?: string;
  skills?: string[];
  cvText?: string;
  bio?: string;
  biography?: string;
  yearsExperience?: number;
  careerHistory?: any;
  matches?: Array<{
    id: number;
    jobId: number;
    matchScore: number;
    status: string;
    job: {
      id: number;
      title: string;
      department?: string;
      companyId?: number;
      company?: {
        id: number;
        name: string;
        location?: string;
      };
    };
  }>;
};

type Activity = {
  id: number;
  candidateId: number;
  activityType: string;
  subject?: string;
  notes?: string;
  outcome?: string;
  occurredAt: string;
  createdBy?: string;
};

type CandidateFile = {
  id: number;
  candidateId: number;
  filename: string;
  originalFilename: string;
  category: string;
  description?: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy?: string;
};

type Interview = {
  id: number;
  candidateId: number;
  jobId?: number;
  interviewType: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  interviewers?: string;
  status: string;
  outcome?: string;
  feedback?: string;
  createdBy?: string;
};

type JobMatch = {
  id: number;
  jobId: number;
  candidateId: number;
  matchScore: number;
  status: string;
  appliedAt?: string;
  job?: {
    id: number;
    title: string;
    companyName?: string;
    location?: string;
  };
};

export default function CandidateDetail() {
  const [, params] = useRoute("/recruiting/candidates/:id");
  const candidateId = params?.id ? parseInt(params.id) : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Candidate>>({});
  const [activeTab, setActiveTab] = useState("overview");
  const [newActivity, setNewActivity] = useState({ type: "note", subject: "", notes: "" });
  const { toast } = useToast();

  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ['/api/candidates', candidateId],
    enabled: !!candidateId,
  });

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['/api/candidates', candidateId, 'activities'],
    enabled: !!candidateId,
  });

  const { data: files = [] } = useQuery<CandidateFile[]>({
    queryKey: ['/api/candidates', candidateId, 'files'],
    enabled: !!candidateId,
  });

  const { data: interviews = [] } = useQuery<Interview[]>({
    queryKey: ['/api/candidates', candidateId, 'interviews'],
    enabled: !!candidateId,
  });

  // Matches are included in the candidate response
  const jobMatches = candidate?.matches || [];

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Candidate>) => {
      return await apiRequest('PATCH', `/api/candidates/${candidateId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId] });
      toast({
        title: "Candidate Updated",
        description: "The candidate has been updated successfully.",
      });
      setIsEditing(false);
      setEditData({});
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update candidate",
        variant: "destructive",
      });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async (activity: any) => {
      return await apiRequest('POST', `/api/candidates/${candidateId}/activities`, activity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId, 'activities'] });
      toast({
        title: "Activity Added",
        description: "The activity has been logged successfully.",
      });
      setNewActivity({ type: "note", subject: "", notes: "" });
    },
  });

  const handleEdit = () => {
    if (candidate) {
      setEditData({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phoneNumber: candidate.phoneNumber || candidate.phone,
        linkedinUrl: candidate.linkedinUrl,
        currentCompany: candidate.currentCompany,
        currentTitle: candidate.currentTitle,
        location: candidate.location,
        biography: candidate.biography || candidate.bio,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleAddActivity = () => {
    if (newActivity.subject.trim() || newActivity.notes.trim()) {
      addActivityMutation.mutate({
        activityType: newActivity.type,
        subject: newActivity.subject,
        notes: newActivity.notes,
        occurredAt: new Date().toISOString(),
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'call': return <PhoneCall className="h-4 w-4" />;
      case 'meeting': return <Video className="h-4 w-4" />;
      case 'note': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading || !candidate) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  const initials = `${candidate.firstName?.[0] || ''}${candidate.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="h-full flex flex-col" data-testid="candidate-detail-page">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="p-4">
          <Link href="/recruiting/candidates">
            <Button variant="ghost" size="sm" data-testid="button-back-to-candidates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>
        </div>

        {/* Candidate Header Section */}
        <div className="px-6 pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1" data-testid="candidate-name">{displayName}</h1>
                  {candidate.currentTitle && (
                    <p className="text-lg text-muted-foreground mb-2" data-testid="candidate-title">
                      {candidate.currentTitle}
                      {candidate.currentCompany && ` at ${candidate.currentCompany}`}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {candidate.location && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        {candidate.location}
                      </Badge>
                    )}
                    {candidate.yearsExperience && (
                      <Badge variant="outline" className="gap-1">
                        <Briefcase className="h-3 w-3" />
                        {candidate.yearsExperience} years exp
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancel}
                        data-testid="button-cancel-edit"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        data-testid="button-save-candidate"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updateMutation.isPending ? 'Saving...' : 'Save'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {candidate.linkedinUrl && (
                        <a
                          href={candidate.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="link-linkedin"
                        >
                          <Button variant="outline" size="sm">
                            <Linkedin className="h-4 w-4 mr-2" />
                            LinkedIn
                          </Button>
                        </a>
                      )}
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleEdit}
                        data-testid="button-edit-candidate"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b px-6">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-overview"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-activity"
              >
                Activity Log
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-files"
              >
                Files
              </TabsTrigger>
              <TabsTrigger 
                value="assignments" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-assignments"
              >
                Job Assignments
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-history"
              >
                Career History
              </TabsTrigger>
              <TabsTrigger 
                value="biography" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                data-testid="tab-biography"
              >
                Executive Biography
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            <TabsContent value="overview" className="m-0 p-6">
              <div className="max-w-5xl space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={editData.email || ''}
                            onChange={(e) => setEditData({...editData, email: e.target.value})}
                            placeholder="email@example.com"
                            data-testid="input-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={editData.phoneNumber || ''}
                            onChange={(e) => setEditData({...editData, phoneNumber: e.target.value})}
                            placeholder="+1 (555) 123-4567"
                            data-testid="input-phone"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={editData.location || ''}
                            onChange={(e) => setEditData({...editData, location: e.target.value})}
                            placeholder="City, Country"
                            data-testid="input-location"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="linkedin">LinkedIn URL</Label>
                          <Input
                            id="linkedin"
                            value={editData.linkedinUrl || ''}
                            onChange={(e) => setEditData({...editData, linkedinUrl: e.target.value})}
                            placeholder="https://linkedin.com/in/..."
                            data-testid="input-linkedin"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {candidate.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={`mailto:${candidate.email}`}
                              className="text-primary hover:underline"
                              data-testid="candidate-email"
                            >
                              {candidate.email}
                            </a>
                          </div>
                        )}
                        {(candidate.phoneNumber || candidate.phone) && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="candidate-phone">{candidate.phoneNumber || candidate.phone}</span>
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span data-testid="candidate-location">{candidate.location}</span>
                          </div>
                        )}
                        {candidate.linkedinUrl && (
                          <div className="flex items-center gap-2">
                            <Linkedin className="h-4 w-4 text-muted-foreground" />
                            <a 
                              href={candidate.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                              data-testid="candidate-linkedin-url"
                            >
                              View Profile
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Professional Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Professional Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentTitle">Current Title</Label>
                          <Input
                            id="currentTitle"
                            value={editData.currentTitle || ''}
                            onChange={(e) => setEditData({...editData, currentTitle: e.target.value})}
                            placeholder="e.g., Chief Technology Officer"
                            data-testid="input-current-title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currentCompany">Current Company</Label>
                          <Input
                            id="currentCompany"
                            value={editData.currentCompany || ''}
                            onChange={(e) => setEditData({...editData, currentCompany: e.target.value})}
                            placeholder="e.g., Tech Innovations Inc."
                            data-testid="input-current-company"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{candidate.currentTitle || 'Not specified'}</span>
                        </div>
                        {candidate.currentCompany && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span>{candidate.currentCompany}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills & Expertise</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="activity" className="m-0 p-6">
              <div className="max-w-5xl space-y-6">
                {/* Add Activity Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Log New Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="activity-type">Type</Label>
                        <select
                          id="activity-type"
                          value={newActivity.type}
                          onChange={(e) => setNewActivity({...newActivity, type: e.target.value})}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                          data-testid="select-activity-type"
                        >
                          <option value="note">Note</option>
                          <option value="email">Email</option>
                          <option value="call">Phone Call</option>
                          <option value="meeting">Meeting</option>
                        </select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="activity-subject">Subject</Label>
                        <Input
                          id="activity-subject"
                          value={newActivity.subject}
                          onChange={(e) => setNewActivity({...newActivity, subject: e.target.value})}
                          placeholder="Brief description of the activity"
                          data-testid="input-activity-subject"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="activity-notes">Notes</Label>
                      <Textarea
                        id="activity-notes"
                        value={newActivity.notes}
                        onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                        placeholder="Detailed notes about the interaction"
                        rows={3}
                        data-testid="textarea-activity-notes"
                      />
                    </div>
                    <Button 
                      onClick={handleAddActivity}
                      disabled={addActivityMutation.isPending}
                      data-testid="button-add-activity"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {addActivityMutation.isPending ? 'Adding...' : 'Add Activity'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No activities logged yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex gap-3 border-b pb-4 last:border-0">
                            <div className="mt-1">
                              {getActivityIcon(activity.activityType)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <p className="font-medium">{activity.subject || 'No subject'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(activity.occurredAt), 'MMM dd, yyyy - h:mm a')}
                                  </p>
                                </div>
                                <Badge variant="outline">{activity.activityType}</Badge>
                              </div>
                              {activity.notes && (
                                <p className="text-sm mt-2">{activity.notes}</p>
                              )}
                              {activity.createdBy && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Logged by {activity.createdBy}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="m-0 p-6">
              <div className="max-w-5xl space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Documents & Files</CardTitle>
                      <Button size="sm" data-testid="button-upload-file">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {files.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No files uploaded yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file) => (
                          <div 
                            key={file.id} 
                            className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                            data-testid={`file-item-${file.id}`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{file.originalFilename}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(file.fileSize)} • {format(new Date(file.uploadedAt), 'MMM dd, yyyy')}
                                  {file.uploadedBy && ` • Uploaded by ${file.uploadedBy}`}
                                </p>
                              </div>
                              <Badge variant="outline">{file.category}</Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" data-testid={`button-download-file-${file.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" data-testid={`button-delete-file-${file.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Job Assignments Tab */}
            <TabsContent value="assignments" className="m-0 p-6">
              <div className="max-w-5xl">
                <Card>
                  <CardHeader>
                    <CardTitle>Active Job Assignments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobMatches.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        This candidate has not been assigned to any jobs yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {jobMatches.map((match) => (
                          <div key={match.id} className="border rounded-md p-4 hover-elevate">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-1">
                                  {match.job?.title || 'Untitled Position'}
                                </h3>
                                {match.job?.company?.name && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {match.job.company.name}
                                    {match.job.company.location && ` • ${match.job.company.location}`}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="secondary">
                                  Match Score: {match.matchScore}%
                                </Badge>
                                <Badge 
                                  variant={
                                    match.status === 'hired' ? 'default' :
                                    match.status === 'rejected' ? 'destructive' :
                                    'outline'
                                  }
                                >
                                  {match.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/recruiting/jobs/${match.jobId}`}>
                                <Button variant="outline" size="sm">
                                  <Target className="h-4 w-4 mr-2" />
                                  View Job Details
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Career History Tab */}
            <TabsContent value="history" className="m-0 p-6">
              <div className="max-w-5xl">
                <Card>
                  <CardHeader>
                    <CardTitle>Career History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.careerHistory ? (
                      <div className="space-y-4">
                        <pre className="whitespace-pre-wrap text-sm">
                          {JSON.stringify(candidate.careerHistory, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Career history information not available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Executive Biography Tab */}
            <TabsContent value="biography" className="m-0 p-6">
              <div className="max-w-5xl">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Biography</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea
                        value={editData.biography || ''}
                        onChange={(e) => setEditData({...editData, biography: e.target.value})}
                        placeholder="Enter executive biography..."
                        rows={12}
                        data-testid="textarea-biography"
                      />
                    ) : (
                      candidate.biography || candidate.bio ? (
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap">{candidate.biography || candidate.bio}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No biography available
                        </p>
                      )
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
