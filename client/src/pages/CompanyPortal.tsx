import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Briefcase, Users, BarChart3, Settings, ExternalLink, Trash2 } from "lucide-react";

const jobPostSchema = z.object({
  title: z.string().min(1, "Job title required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location required"),
  salary: z.string().min(1, "Salary required"),
  level: z.string().min(1, "Level required"),
  skills: z.string(),
});

type JobPostData = z.infer<typeof jobPostSchema>;

interface Job {
  id: number;
  title: string;
  description: string;
  location: string;
  salary: string;
  requirements: string[];
  experienceLevel: string;
  companyId: number;
  createdAt: string;
}

interface Applicant {
  candidateId: number;
  candidateName: string;
  candidateTitle: string;
  candidateCompany: string;
  jobId: number;
  jobTitle: string;
  matchScore: number;
  status: string;
  appliedAt: string;
}

export default function CompanyPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("companyId");
    if (storedCompanyId) {
      setCompanyId(parseInt(storedCompanyId));
    }
  }, []);

  const form = useForm<JobPostData>({
    resolver: zodResolver(jobPostSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      salary: "",
      level: "mid-level",
      skills: "",
    },
  });

  // Fetch company's posted jobs
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: companyId ? [`/api/company/${companyId}/jobs`] : [],
    enabled: !!companyId,
  });

  // Fetch applicants for company's jobs
  const { data: applicants = [], isLoading: applicantsLoading } = useQuery<Applicant[]>({
    queryKey: companyId ? [`/api/company/${companyId}/applicants`] : [],
    enabled: !!companyId,
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem("companyId");
      localStorage.removeItem("email");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/company/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    logoutMutation.mutate();
  };

  const onSubmit = async (data: JobPostData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/company/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          skills: data.skills.split(",").map(s => s.trim()),
        }),
      });

      if (!response.ok) throw new Error("Failed to post job");

      toast({
        title: "Success!",
        description: "Job posted successfully",
      });

      form.reset();
      refetchJobs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Briefcase className="h-8 w-8" />
                Company Portal
              </h1>
              <p className="text-muted-foreground mt-2">Post jobs, find candidates, and manage your hiring</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-home">
                Home
              </Button>
              <Button onClick={() => setLocation("/company/portal#settings")} variant="outline" data-testid="button-settings">
                Settings
              </Button>
              <Button onClick={handleLogout} variant="default" data-testid="button-logout">
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{jobs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Job postings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applicants.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Applications received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applicants.filter(a => a.status === 'new' || a.status === 'applied').length}</div>
              <p className="text-xs text-muted-foreground mt-1">In review</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="post-job" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="post-job" data-testid="tab-post-job">Post Job</TabsTrigger>
            <TabsTrigger value="jobs" data-testid="tab-jobs">My Jobs</TabsTrigger>
            <TabsTrigger value="search" data-testid="tab-search-candidates">Search Candidates</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          {/* Post Job Tab */}
          <TabsContent value="post-job" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Post a New Job
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Senior Software Engineer" {...field} data-testid="input-job-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Describe the role, responsibilities, and requirements..." {...field} data-testid="input-job-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input placeholder="San Francisco, CA" {...field} data-testid="input-job-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salary Range</FormLabel>
                            <FormControl>
                              <Input placeholder="$120k - $180k" {...field} data-testid="input-salary" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Experience Level</FormLabel>
                            <FormControl>
                              <select {...field} className="w-full px-3 py-2 border rounded-md" data-testid="select-level">
                                <option value="entry-level">Entry Level</option>
                                <option value="mid-level">Mid Level</option>
                                <option value="senior">Senior</option>
                                <option value="executive">Executive</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Required Skills (comma-separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="React, TypeScript, Node.js" {...field} data-testid="input-skills" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="button-post-job-submit">
                      {isSubmitting ? "Posting..." : "Post Job"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Active Job Postings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No active jobs yet. Post your first job to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base" data-testid={`text-job-title-${job.id}`}>{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.location}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {job.requirements?.map((skill, idx) => (
                                <span key={idx} className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{job.salary}</p>
                            <p className="text-xs text-muted-foreground capitalize">{job.experienceLevel}</p>
                            <Button size="sm" variant="ghost" className="mt-2" data-testid={`button-view-job-${job.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Candidates Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Applications & Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applicantsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading candidates...</div>
                ) : applicants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No applications yet. Your posted jobs will appear here once candidates apply.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applicants.map((applicant, idx) => (
                      <div key={idx} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base" data-testid={`text-candidate-name-${applicant.candidateId}`}>{applicant.candidateName}</h3>
                            <p className="text-sm text-muted-foreground">{applicant.candidateTitle} at {applicant.candidateCompany}</p>
                            <p className="text-xs text-muted-foreground mt-1">Applied for: {applicant.jobTitle}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl font-bold text-green-600" data-testid={`text-match-score-${applicant.candidateId}`}>{applicant.matchScore}</span>
                              <span className="text-xs text-muted-foreground">% match</span>
                            </div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              applicant.status === 'applied' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' :
                              applicant.status === 'new' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-100'
                            }`} data-testid={`text-status-${applicant.candidateId}`}>
                              {applicant.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Company Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Company Name</label>
                    <Input placeholder="Your Company" disabled data-testid="input-company-name-display" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <Input placeholder="Technology" disabled data-testid="input-industry-display" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Location</label>
                    <Input placeholder="San Francisco, CA" disabled data-testid="input-location-display" />
                  </div>
                  <Button variant="outline" className="w-full" data-testid="button-edit-settings">
                    Edit Company Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
