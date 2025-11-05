import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Briefcase, MapPin, Clock, DollarSign, Users, Target, 
  Zap, Building, CheckCircle2, Loader2, ArrowLeft 
} from "lucide-react";
import { Job } from "@shared/schema";
import { Link } from "wouter";
import CandidatePipeline from "@/components/CandidatePipeline";

export default function JobDetail() {
  const [, params] = useRoute("/recruiting/jobs/:id");
  const jobId = params?.id ? parseInt(params.id) : null;

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job');
      }
      return response.json();
    },
    enabled: !!jobId,
  });

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const parsedData = job.parsedData as any;
  const searchStrategy = job.searchStrategy as any;
  const searchProgress = job.searchProgress as any;

  return (
    <div className="h-full flex flex-col" data-testid="job-detail-page">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-2">
          <Link href="/jobs">
            <Button variant="ghost" size="sm" data-testid="button-back-to-jobs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
          <div className="flex gap-2">
            <Badge variant="secondary">
              {job.searchTier === 'internal' ? 'Internal Search' : 'External Search'}
            </Badge>
            <Badge variant="secondary">
              {job.feePercentage}% placement fee
            </Badge>
          </div>
        </div>
        <h1 className="text-2xl font-bold" data-testid="job-title">{job.title}</h1>
        <p className="text-muted-foreground">{job.department || 'General'}</p>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full p-4">
          {/* LEFT PANEL - Job Info & NAP */}
          <div className="col-span-3 overflow-y-auto space-y-4" data-testid="panel-job-info">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.urgency && (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Urgency</div>
                      <div className="font-medium capitalize">{job.urgency}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-medium">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {parsedData?.salary && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Salary Range</div>
                      <div className="font-medium">{parsedData.salary}</div>
                    </div>
                  </div>
                )}

                {job.estimatedPlacementFee && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Est. Placement Fee</div>
                      <div className="font-medium">
                        ${job.estimatedPlacementFee.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {parsedData?.companySize && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Company Size</div>
                      <div className="font-medium capitalize">{parsedData.companySize}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Required Skills */}
            {job.skills && job.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* NAP Data */}
            {parsedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Need Analysis Profile</CardTitle>
                  <CardDescription className="text-xs">
                    Collected during AI conversation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {parsedData.successCriteria && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Success Criteria</div>
                      <div>{parsedData.successCriteria}</div>
                    </div>
                  )}
                  {parsedData.teamDynamics && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Team Dynamics</div>
                      <div>{parsedData.teamDynamics}</div>
                    </div>
                  )}
                  {parsedData.location && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Location</div>
                      <div>{parsedData.location}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* CENTER PANEL - Candidate Pipeline */}
          <div className="col-span-6 overflow-y-auto p-2" data-testid="panel-pipeline">
            <CandidatePipeline jobId={jobId!} />
          </div>

          {/* RIGHT PANEL - Search Strategy & Progress */}
          <div className="col-span-3 overflow-y-auto space-y-4" data-testid="panel-search-strategy">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Search Strategy
                </CardTitle>
                <CardDescription className="text-xs">
                  AI-generated search plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {searchStrategy ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      {searchStrategy.summary || 'AI analyzing requirements...'}
                    </div>
                    {searchStrategy.steps && (
                      <div className="space-y-2">
                        {searchStrategy.steps.map((step: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <span>Analyzing job requirements</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-75" />
                      <span>Identifying key skills</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-150" />
                      <span>Building search criteria</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Search Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Status</span>
                    <Badge variant="secondary">
                      {job.searchExecutionStatus || 'pending'}
                    </Badge>
                  </div>
                  
                  {searchProgress && (
                    <>
                      <Separator />
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Candidates Searched</span>
                          <span className="font-medium">
                            {searchProgress.candidatesSearched || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Matches Found</span>
                          <span className="font-medium">
                            {searchProgress.matchesFound || 0}
                          </span>
                        </div>
                        {searchProgress.currentStep && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-muted-foreground mb-1">Current Step</div>
                            <div className="font-medium">{searchProgress.currentStep}</div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
