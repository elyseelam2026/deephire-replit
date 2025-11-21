import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/FileUpload";
import { 
  User, Briefcase, Star, Upload, Building2, 
  MapPin, DollarSign, Clock, CheckCircle, Loader2
} from "lucide-react";

export default function CandidatePortal() {
  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ['/api/jobs/published'],
    queryFn: async () => {
      const response = await fetch('/api/jobs?status=open');
      if (!response.ok) return [];
      return response.json();
    }
  });

  const [profile, setProfile] = useState({
    firstName: "Sarah",
    lastName: "Chen",
    email: "sarah.chen@email.com",
    currentTitle: "Senior Software Engineer",
    currentCompany: "Google",
    location: "Mountain View, CA",
    yearsExperience: 6,
    salaryExpectations: 180000,
    skills: ["React", "TypeScript", "Node.js", "Python", "AWS", "Docker"],
    bio: "Passionate full-stack developer with 6+ years of experience building scalable web applications. Strong background in React, Node.js, and cloud technologies.",
  });

  const handleProfileUpdate = () => {
    console.log('Profile updated:', profile);
    // todo: remove mock functionality - implement actual profile update
  };

  const handleFileUpload = (file: File) => {
    console.log('CV uploaded:', file.name);
    // todo: remove mock functionality - implement CV upload and parsing
  };

  const handleApplyToJob = (jobId: number) => {
    console.log(`Apply to job ${jobId}`);
    // todo: remove mock functionality - implement job application
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "applied":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "interviewing":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    if (score >= 75) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    if (score >= 60) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
  };

  return (
    <div className="space-y-6 p-6" data-testid="candidate-portal">
      <div>
        <h1 className="text-3xl font-bold">Candidate Portal</h1>
        <p className="text-muted-foreground">
          Manage your profile and discover your next career opportunity.
        </p>
      </div>

      <Tabs defaultValue="matches" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="matches" data-testid="tab-matches">
            <Briefcase className="h-4 w-4 mr-2" />
            Available Jobs ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="applications" data-testid="tab-applications">
            <Star className="h-4 w-4 mr-2" />
            Applications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Summary */}
            <Card className="lg:col-span-1">
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto mb-4">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-medium">
                    {profile.firstName[0]}{profile.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{profile.firstName} {profile.lastName}</CardTitle>
                <p className="text-muted-foreground">{profile.currentTitle}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.currentCompany}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${profile.salaryExpectations.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-4">
                  {profile.skills.slice(0, 6).map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Edit Profile</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Keep your profile updated to get better job matches.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                      data-testid="input-last-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentTitle">Current Title</Label>
                    <Input
                      id="currentTitle"
                      value={profile.currentTitle}
                      onChange={(e) => setProfile({...profile, currentTitle: e.target.value})}
                      data-testid="input-current-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currentCompany">Current Company</Label>
                    <Input
                      id="currentCompany"
                      value={profile.currentCompany}
                      onChange={(e) => setProfile({...profile, currentCompany: e.target.value})}
                      data-testid="input-current-company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile({...profile, location: e.target.value})}
                      data-testid="input-location"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryExpectations">Salary Expectations</Label>
                    <Input
                      id="salaryExpectations"
                      type="number"
                      value={profile.salaryExpectations}
                      onChange={(e) => setProfile({...profile, salaryExpectations: parseInt(e.target.value)})}
                      data-testid="input-salary"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                    rows={4}
                    data-testid="textarea-bio"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload Updated CV</Label>
                  <FileUpload
                    onFileSelect={handleFileUpload}
                    placeholder="Upload your latest CV or resume"
                    acceptedTypes=".pdf,.doc,.docx"
                  />
                </div>

                <Button onClick={handleProfileUpdate} data-testid="button-update-profile">
                  Update Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Job Matches Tab */}
        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Jobs</CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-powered job recommendations based on your profile and preferences.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobMatches.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`job-match-${job.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{job.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {job.company}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {job.salary}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {job.postedDays}d ago
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getMatchScoreColor(job.matchScore)}>
                        <Star className="h-3 w-3 mr-1" />
                        {job.matchScore}%
                      </Badge>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      {job.status === "new" && (
                        <Button
                          size="sm"
                          onClick={() => handleApplyToJob(job.id)}
                          data-testid={`button-apply-${job.id}`}
                        >
                          Apply Now
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-job-${job.id}`}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track the progress of your job applications.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobMatches.filter(job => job.status !== "new").map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                    data-testid={`application-${job.id}`}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status === "interviewing" && <CheckCircle className="h-3 w-3 mr-1" />}
                        {job.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}