import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, MapPin, DollarSign, Search, ExternalLink, ArrowLeft, CheckCircle2 } from "lucide-react";

interface Job {
  id: number;
  title: string;
  companyName: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  skills: string[];
  status: string;
  jdText: string;
  createdAt: string;
}

export default function CandidateJobsSearch() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);

  // Fetch all available jobs
  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  // Apply to job mutation
  const applyMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await fetch(`/api/candidate/${candidateId}/apply-to-job/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!response.ok) throw new Error("Failed to apply to job");
      return response.json();
    },
    onSuccess: (_, jobId) => {
      setAppliedJobs([...appliedJobs, jobId]);
      toast({
        title: "Applied Successfully",
        description: "You have applied to this job",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply to job",
        variant: "destructive",
      });
    },
  });

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/candidate/dashboard/${candidateId}`)}
          className="mb-6"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid gap-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <CardTitle>Find Jobs</CardTitle>
              <CardDescription>Search and apply for available positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Search by title, company, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                  data-testid="input-job-search"
                />
                <Button variant="outline" data-testid="button-search-jobs">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Jobs List */}
          <div>
            {isLoading ? (
              <Card>
                <CardContent className="pt-6 pb-6 text-center text-muted-foreground">
                  Loading jobs...
                </CardContent>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No jobs found</p>
                  <p className="text-muted-foreground">Try adjusting your search criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map((job) => {
                  const isApplied = appliedJobs.includes(job.id);
                  return (
                    <Card key={job.id} className="hover-elevate" data-testid={`card-job-${job.id}`}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{job.title}</h3>
                            <p className="text-muted-foreground mb-3">{job.companyName}</p>

                            <div className="flex flex-wrap gap-4 mb-4 text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {job.location}
                              </div>
                              {job.salaryMin && job.salaryMax && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                                </div>
                              )}
                            </div>

                            {job.skills && job.skills.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {job.skills.slice(0, 5).map((skill, idx) => (
                                  <Badge key={idx} variant="secondary" data-testid={`badge-skill-${idx}`}>
                                    {skill}
                                  </Badge>
                                ))}
                                {job.skills.length > 5 && (
                                  <Badge variant="outline">+{job.skills.length - 5} more</Badge>
                                )}
                              </div>
                            )}

                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {job.jdText}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            {isApplied ? (
                              <Button disabled className="bg-green-600" data-testid={`button-applied-${job.id}`}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Applied
                              </Button>
                            ) : (
                              <Button
                                onClick={() => applyMutation.mutate(job.id)}
                                disabled={applyMutation.isPending}
                                data-testid={`button-apply-${job.id}`}
                              >
                                {applyMutation.isPending ? "Applying..." : "Apply Now"}
                              </Button>
                            )}
                            <Button variant="outline" size="sm" data-testid={`button-view-${job.id}`}>
                              View <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
