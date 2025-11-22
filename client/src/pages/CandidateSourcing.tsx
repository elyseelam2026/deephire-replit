import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Search, Users, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

const sourcingSchema = z.object({
  jobId: z.coerce.number().min(1, "Job is required"),
  napContext: z.string().min(20, "Please provide detailed job context"),
  hardSkills: z.string().min(5, "Please list hard skills"),
  softSkills: z.string().optional(),
  location: z.string().optional(),
  experience: z.coerce.number().optional(),
  urgency: z.enum(["low", "medium", "high", "urgent"]),
  searchDepth: z.enum(["elite_8", "elite_15", "standard_25", "deep_60", "market_scan"]),
});

type SourcingFormData = z.infer<typeof sourcingSchema>;

interface SourcingResult {
  jobId: number;
  candidatesFound: number;
  qualityCandidates: number;
  eliteCandidates: number;
  status: "pending" | "executing" | "completed";
  progress: {
    currentStep: string;
    percentage: number;
  };
  costEstimate: number;
}

export default function CandidateSourcing() {
  const { toast } = useToast();
  const [sourcingResult, setSourcingResult] = useState<SourcingResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch user's jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/company/:companyId/jobs"],
  });

  const form = useForm<SourcingFormData>({
    resolver: zodResolver(sourcingSchema),
    defaultValues: {
      jobId: 0,
      napContext: "",
      hardSkills: "",
      softSkills: "",
      location: "",
      experience: 0,
      urgency: "high",
      searchDepth: "standard_25",
    },
  });

  // Start sourcing mutation
  const sourcingMutation = useMutation({
    mutationFn: async (data: SourcingFormData) => {
      setIsSearching(true);
      const response = await fetch(`/api/jobs/${data.jobId}/start-sourcing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          napContext: data.napContext,
          hardSkills: data.hardSkills.split(",").map((s) => s.trim()),
          softSkills: data.softSkills?.split(",").map((s) => s.trim()),
          location: data.location,
          yearsExperience: data.experience,
          urgency: data.urgency,
          searchDepth: data.searchDepth,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start sourcing");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSourcingResult(data);
      setIsSearching(false);
      toast({
        title: "Sourcing Started",
        description: `Searching for ${data.qualityCandidates} quality candidates...`,
      });

      // Poll for updates
      const pollInterval = setInterval(async () => {
        const response = await fetch(`/api/jobs/${form.getValues("jobId")}/sourcing-status`);
        const status = await response.json();
        setSourcingResult(status);

        if (status.status === "completed") {
          clearInterval(pollInterval);
          toast({
            title: "Sourcing Complete",
            description: `Found ${status.candidatesFound} candidates`,
          });
        }
      }, 2000);
    },
    onError: (error) => {
      setIsSearching(false);
      toast({
        title: "Error",
        description: error.message || "Failed to start sourcing",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SourcingFormData) => {
    await sourcingMutation.mutateAsync(data);
  };

  const getPriceBadge = (depth: string) => {
    const prices: Record<string, string> = {
      elite_8: "$149",
      elite_15: "$199",
      standard_25: "$129",
      deep_60: "$149",
      market_scan: "$179",
    };
    return prices[depth] || "$0";
  };

  const getDepthDescription = (depth: string) => {
    const descriptions: Record<string, string> = {
      elite_8: "C-suite, PE CFO/COO - 8 elite candidates",
      elite_15: "VP/SVP, General Manager - 15 elite candidates",
      standard_25: "Director-level, Senior roles - 25 standard candidates",
      deep_60: "Specialists, niche roles - 60 candidates",
      market_scan: "Intelligence gathering - 150+ profiles",
    };
    return descriptions[depth] || "";
  };

  if (sourcingResult && sourcingResult.status !== "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-pulse" />
                AI Search in Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{sourcingResult.progress.currentStep}</span>
                  <span className="text-sm text-muted-foreground">{sourcingResult.progress.percentage}%</span>
                </div>
                <Progress value={sourcingResult.progress.percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{sourcingResult.candidatesFound}</div>
                  <p className="text-sm text-muted-foreground">Found</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{sourcingResult.qualityCandidates}</div>
                  <p className="text-sm text-muted-foreground">Quality Match</p>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{sourcingResult.eliteCandidates}</div>
                  <p className="text-sm text-muted-foreground">Elite</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Searching across LinkedIn profiles and company websites...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (sourcingResult && sourcingResult.status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Sourcing Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-3xl font-bold text-green-600">{sourcingResult.candidatesFound}</div>
                  <p className="text-sm text-muted-foreground">Total Found</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-3xl font-bold text-blue-600">{sourcingResult.qualityCandidates}</div>
                  <p className="text-sm text-muted-foreground">Quality Match</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-3xl font-bold text-purple-600">{sourcingResult.eliteCandidates}</div>
                  <p className="text-sm text-muted-foreground">Elite Tier</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium mb-1">Estimated Cost</p>
                <p className="text-2xl font-bold text-blue-600">${sourcingResult.costEstimate}</p>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setSourcingResult(null);
                  form.reset();
                }}
                data-testid="button-start-new-search"
              >
                Start New Search
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI-Powered Candidate Sourcing
            </CardTitle>
            <CardDescription>
              Use our AI to find the best candidates for your open positions
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Job Selection */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Job Selection
                  </h3>

                  <FormField
                    control={form.control}
                    name="jobId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Job to Fill</FormLabel>
                        <FormControl>
                          <select {...field} className="w-full px-3 py-2 border rounded-md" data-testid="select-job">
                            <option value="">Choose a job...</option>
                            {jobs.map((job: any) => (
                              <option key={job.id} value={job.id}>
                                {job.title} - {job.companyName}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* NAP Context */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Job Context (NAP)
                  </h3>

                  <FormField
                    control={form.control}
                    name="napContext"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Context & Requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="E.g., Looking for PE CFO with M&A experience, biotech industry knowledge, startup exit success..."
                            {...field}
                            data-testid="input-nap-context"
                            className="min-h-24"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Skills */}
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="hardSkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hard Skills (comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Python, Data Analysis, ML, SQL..."
                            {...field}
                            data-testid="input-hard-skills"
                            className="min-h-20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="softSkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soft Skills (optional, comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Leadership, Communication, Negotiation..."
                            {...field}
                            data-testid="input-soft-skills"
                            className="min-h-20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="San Francisco, CA" {...field} data-testid="input-location" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years Experience</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} data-testid="input-experience" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency</FormLabel>
                        <FormControl>
                          <select {...field} className="w-full px-3 py-2 border rounded-md" data-testid="select-urgency">
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Search Depth */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Search Depth & Cost
                  </h3>

                  <FormField
                    control={form.control}
                    name="searchDepth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Search Strategy</FormLabel>
                        <FormControl>
                          <div className="space-y-3" data-testid="search-depth-options">
                            {[
                              { value: "elite_8", label: "Elite 8" },
                              { value: "elite_15", label: "Elite 15" },
                              { value: "standard_25", label: "Standard 25" },
                              { value: "deep_60", label: "Deep 60" },
                              { value: "market_scan", label: "Market Scan" },
                            ].map((option) => (
                              <label
                                key={option.value}
                                className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                <input
                                  type="radio"
                                  name="searchDepth"
                                  value={option.value}
                                  checked={field.value === option.value}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  className="mr-3"
                                  data-testid={`radio-${option.value}`}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getDepthDescription(option.value)}
                                  </div>
                                </div>
                                <Badge variant="secondary">{getPriceBadge(option.value)}</Badge>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-lg"
                  disabled={isSearching || sourcingMutation.isPending}
                  data-testid="button-start-search"
                >
                  {isSearching || sourcingMutation.isPending ? (
                    <>
                      <span className="animate-spin mr-2">⚙️</span>
                      Searching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Start AI Search
                    </>
                  )}
                </Button>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-200">How it works</p>
                    <p className="text-blue-800 dark:text-blue-300 mt-1">
                      Our AI generates 8-15 Boolean search queries, searches LinkedIn via Google, scores candidates
                      against your requirements, and returns the top matches based on hard skills matching.
                    </p>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
