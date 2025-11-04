import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, Mail, Phone, MapPin, Briefcase, Building, 
  Award, Loader2, ArrowLeft, Globe, Linkedin, Edit, Save, X
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
};

export default function CandidateDetail() {
  const [, params] = useRoute("/recruiting/candidates/:id");
  const candidateId = params?.id ? parseInt(params.id) : null;
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Candidate>>({});
  const { toast } = useToast();

  // Check for edit query parameter and auto-open edit mode
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
      // Remove the query parameter from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ['/api/candidates', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch candidate');
      }
      return response.json();
    },
    enabled: !!candidateId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Candidate>) => {
      const response = await apiRequest('PATCH', `/api/candidates/${candidateId}`, data);
      return response.json();
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

  if (isLoading || !candidate) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();

  return (
    <div className="h-full flex flex-col" data-testid="candidate-detail-page">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-2">
          <Link href="/recruiting/candidates">
            <Button variant="ghost" size="sm" data-testid="button-back-to-candidates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>
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
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEdit}
                  data-testid="button-edit-candidate"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-linkedin"
                  >
                    <Button variant="outline" size="sm">
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn Profile
                    </Button>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
        <h1 className="text-2xl font-bold" data-testid="candidate-name">{displayName}</h1>
        {candidate.currentTitle && (
          <p className="text-muted-foreground" data-testid="candidate-title">
            {candidate.currentTitle}
            {candidate.currentCompany && ` at ${candidate.currentCompany}`}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl space-y-4">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
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
                </>
              ) : (
                <>
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
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Professional Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Professional Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="currentTitle">Current Title</Label>
                    <Input
                      id="currentTitle"
                      value={editData.currentTitle || ''}
                      onChange={(e) => setEditData({...editData, currentTitle: e.target.value})}
                      placeholder="Senior Managing Director"
                      data-testid="input-current-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentCompany">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={editData.currentCompany || ''}
                      onChange={(e) => setEditData({...editData, currentCompany: e.target.value})}
                      placeholder="Company Name"
                      data-testid="input-current-company"
                    />
                  </div>
                </>
              ) : (
                <>
                  {candidate.currentTitle && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Current Role</div>
                        <div className="font-medium">{candidate.currentTitle}</div>
                      </div>
                    </div>
                  )}
                  {candidate.currentCompany && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Company</div>
                        <div className="font-medium">{candidate.currentCompany}</div>
                      </div>
                    </div>
                  )}
                  {candidate.yearsExperience !== undefined && (
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Experience</div>
                        <div className="font-medium">{candidate.yearsExperience} years</div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="candidate-skills">
                  {candidate.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bio */}
          {candidate.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Biography</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="candidate-bio">
                  {candidate.bio}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
