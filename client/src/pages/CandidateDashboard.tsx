import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, DollarSign, Zap, ExternalLink, ChevronRight, LogOut } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface JobRecommendation {
  id: number;
  matchScore: number;
  status: string;
  jobTitle: string;
  companyName: string;
  location: string;
  salaryMin: number;
  salaryMax: number;
  remote: string;
  requiredSkills: string[];
  jobUrl: string;
  reasoning: any;
}

export default function CandidateDashboard() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [appliedJobs, setAppliedJobs] = useState<number[]>([]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/candidate/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      setLocation("/candidate/login");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to logout",
        variant: "destructive",
      });
    },
  });

  // Check if email is verified - if not, redirect back
  const { data: candidateData } = useQuery({
    queryKey: [`/api/candidate/${candidateId}`],
  });

  if (candidateData && !candidateData.isEmailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold mb-2">Email Verification Required</h2>
            <p className="text-muted-foreground mb-4">Please verify your email before accessing job recommendations</p>
            <button onClick={() => setLocation("/candidate/register")} className="text-blue-600 hover:underline">
              Back to Registration
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch job recommendations
  const { data: recommendations, isLoading, error } = useQuery<JobRecommendation[]>({
    queryKey: [`/api/candidate/${candidateId}/job-recommendations`],
  });

  const handleApply = async (recommendationId: number, jobUrl: string) => {
    try {
      await fetch(`/api/candidate/${candidateId}/apply-job/${recommendationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setAppliedJobs([...appliedJobs, recommendationId]);
      // Open job in new tab
      window.open(jobUrl, "_blank");
    } catch (error) {
      console.error("Error applying to job:", error);
    }
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 60) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-8 text-center">
              <p className="text-muted-foreground">Loading your job recommendations...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-8 text-center">
              <p className="text-destructive">Error loading recommendations</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const recommendationsByScore = (recommendations || []).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Your Job Recommendations</h1>
            <p className="text-lg text-muted-foreground">
              AI found {recommendationsByScore.length} opportunities matched to your profile
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Jobs Grid */}
        <div className="space-y-4">
          {recommendationsByScore.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-8 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">No job recommendations yet</p>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            recommendationsByScore.map((job) => {
              const isApplied = appliedJobs.includes(job.id);
              return (
                <Card
                  key={job.id}
                  className="hover:shadow-lg transition-shadow"
                  data-testid={`job-card-${job.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                      {/* Header with Title and Score */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1" data-testid={`job-title-${job.id}`}>
                            {job.jobTitle}
                          </h3>
                          <p className="text-muted-foreground font-medium" data-testid={`company-name-${job.id}`}>
                            {job.companyName}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getScoreBadgeColor(job.matchScore || 0)}`} data-testid={`match-score-${job.id}`}>
                            {job.matchScore || 0}% Match
                          </div>
                          {isApplied && (
                            <Badge variant="secondary" data-testid={`applied-badge-${job.id}`}>
                              Applied
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Job Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-sm" data-testid={`location-${job.id}`}>
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{job.location || "Remote"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm" data-testid={`remote-${job.id}`}>
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{job.remote || "Unknown"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm" data-testid={`salary-${job.id}`}>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {job.salaryMin && job.salaryMax
                              ? `$${(job.salaryMin / 1000).toFixed(0)}k-${(job.salaryMax / 1000).toFixed(0)}k`
                              : "Competitive"}
                          </span>
                        </div>
                      </div>

                      {/* Skills */}
                      {job.requiredSkills && job.requiredSkills.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Required Skills:</p>
                          <div className="flex flex-wrap gap-2">
                            {job.requiredSkills.map((skill, idx) => (
                              <Badge key={idx} variant="outline" data-testid={`skill-${job.id}-${idx}`}>
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => handleApply(job.id, job.jobUrl || "#")}
                          disabled={isApplied}
                          data-testid={`apply-button-${job.id}`}
                        >
                          {isApplied ? (
                            <>Applied</>
                          ) : (
                            <>
                              Apply Now
                              <ChevronRight className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                        {job.jobUrl && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => window.open(job.jobUrl, "_blank")}
                            data-testid={`view-job-${job.id}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
