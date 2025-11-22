import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, Zap, Loader2, Link as LinkIcon, Building2, Database } from "lucide-react";
import { CompanyResearch } from "@/components/admin/CompanyResearch";
import { PromiseStatus } from "@/components/admin/PromiseStatus";

export default function ResearchManagement() {
  const { toast } = useToast();
  
  // Research state
  const [researchQuery, setResearchQuery] = useState("");
  const [researchMaxResults, setResearchMaxResults] = useState(50);
  const [researchSaveCampaign, setResearchSaveCampaign] = useState("no");
  const [researchResults, setResearchResults] = useState<any>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);

  // Research mutation
  const researchMutation = useMutation({
    mutationFn: async (data: { query: string; maxResults: number; saveAsCampaign: boolean }) => {
      const response = await apiRequest('POST', '/api/admin/research-companies', {
        query: data.query,
        maxResults: data.maxResults,
        saveAsCampaign: data.saveAsCampaign,
        campaignName: data.saveAsCampaign ? `Research: ${data.query}` : undefined,
        campaignIndustry: 'Unknown'
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResearchResults(data);
      toast({
        title: "Research Complete",
        description: `Found ${data.companies?.length || 0} companies${data.fromCache ? ' (from cache)' : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Research Failed",
        description: error.message || "Failed to research companies. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartResearch = () => {
    if (!researchQuery.trim()) {
      toast({
        title: "Missing Query",
        description: "Please enter a research query.",
        variant: "destructive",
      });
      return;
    }
    
    researchMutation.mutate({
      query: researchQuery.trim(),
      maxResults: researchMaxResults,
      saveAsCampaign: researchSaveCampaign === "yes"
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research Management</h1>
        <p className="text-muted-foreground mt-2">AI-powered research and team discovery</p>
      </div>

      <Tabs defaultValue="ai-research" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-research" data-testid="tab-ai-research">
            <Search className="h-4 w-4 mr-2" />
            AI Research
          </TabsTrigger>
          <TabsTrigger value="ai-promises" data-testid="tab-ai-promises">
            <Zap className="h-4 w-4 mr-2" />
            AI Promises
          </TabsTrigger>
        </TabsList>

        {/* AI Research Tab */}
        <TabsContent value="ai-research" className="space-y-6">
          {/* Company Employee Research - Website Upload & Team Discovery */}
          <CompanyResearch />
          
          {/* Broad Company Discovery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                AI Company Research Engine
              </CardTitle>
              <CardDescription>
                Use natural language to discover companies systematically. Example: "Find top 100 private equity firms globally" or "List major venture capital funds in US healthcare"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-2xl space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="research-query">
                    Research Query
                  </Label>
                  <Textarea
                    id="research-query"
                    placeholder="E.g., Find top 50 investment banks in Asia&#10;E.g., List major private equity firms focused on infrastructure&#10;E.g., Top 100 venture capital funds globally"
                    className="min-h-[100px] resize-none"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    disabled={researchMutation.isPending}
                    data-testid="input-research-query"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-results">
                      Maximum Results
                    </Label>
                    <Input
                      id="max-results"
                      type="number"
                      value={researchMaxResults}
                      onChange={(e) => setResearchMaxResults(parseInt(e.target.value) || 50)}
                      min={10}
                      max={200}
                      disabled={researchMutation.isPending}
                      data-testid="input-max-results"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="save-campaign">
                      Save as Campaign
                    </Label>
                    <Select 
                      value={researchSaveCampaign} 
                      onValueChange={setResearchSaveCampaign}
                      disabled={researchMutation.isPending}
                    >
                      <SelectTrigger id="save-campaign" data-testid="select-save-campaign">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No, just research</SelectItem>
                        <SelectItem value="yes">Yes, track progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleStartResearch}
                  disabled={researchMutation.isPending}
                  className="w-full"
                  data-testid="button-start-research"
                >
                  {researchMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Researching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Start AI Research
                    </>
                  )}
                </Button>
              </div>

              {/* Results Section */}
              {researchResults && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Research Results</h3>
                    {researchResults.fromCache && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Database className="h-3 w-3 mr-1" />
                        Cached
                      </Badge>
                    )}
                  </div>

                  {researchResults.companies && researchResults.companies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {researchResults.companies.map((company: any, idx: number) => (
                        <Card key={idx} className="hover-elevate">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                              <input
                                type="checkbox"
                                checked={selectedCompanies.includes(idx)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCompanies([...selectedCompanies, idx]);
                                  } else {
                                    setSelectedCompanies(selectedCompanies.filter(i => i !== idx));
                                  }
                                }}
                                data-testid={`checkbox-company-${idx}`}
                              />
                              <span className="truncate flex-1">{company.companyName}</span>
                              <Badge variant="outline" className="ml-2">
                                {(company.confidence * 100).toFixed(0)}%
                              </Badge>
                            </CardTitle>
                            {company.description && (
                              <CardDescription className="line-clamp-2">
                                {company.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {company.website && (
                              <div className="flex items-center gap-2 text-sm">
                                <LinkIcon className="h-3 w-3 text-muted-foreground" />
                                <a 
                                  href={company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate"
                                >
                                  {company.website}
                                </a>
                              </div>
                            )}
                            {company.linkedinUrl && (
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <a 
                                  href={company.linkedinUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate"
                                >
                                  LinkedIn
                                </a>
                              </div>
                            )}
                            {company.sources && company.sources.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Found in {company.sources.length} source{company.sources.length > 1 ? 's' : ''}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No companies found for this research query.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Promises Tab */}
        <TabsContent value="ai-promises" className="space-y-6">
          <PromiseStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
}
