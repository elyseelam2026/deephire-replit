import { useState } from "react";
import { useLocation } from "wouter";
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
import { Plus, Search, Briefcase, Users, BarChart3, Settings } from "lucide-react";

const jobPostSchema = z.object({
  title: z.string().min(1, "Job title required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(1, "Location required"),
  salary: z.string().min(1, "Salary required"),
  level: z.string().min(1, "Level required"),
  skills: z.string(),
});

type JobPostData = z.infer<typeof jobPostSchema>;

export default function CompanyPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
            <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">Job postings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">Applications received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
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
                <div className="text-center py-8 text-muted-foreground">
                  <p>No active jobs yet. Post your first job to get started!</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Candidates Tab */}
          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search Candidates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Search by skills, title, or location..." data-testid="input-search-candidates" />
                <Button className="w-full" data-testid="button-search-candidates">
                  <Search className="h-4 w-4 mr-2" />
                  Search Candidate Database
                </Button>
                <div className="mt-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Premium feature: Search our database of pre-qualified candidates</p>
                </div>
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
