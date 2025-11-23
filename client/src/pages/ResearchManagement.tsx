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
import { Search, Zap, Loader2, Link as LinkIcon, Building2, Database, Users, CheckSquare as CheckboxIcon, Sliders } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CompanyResearch } from "@/components/admin/CompanyResearch";
import { PromiseStatus } from "@/components/admin/PromiseStatus";
import { SearchBuilder } from "@/components/admin/SearchBuilder";

export default function ResearchManagement() {
  const { toast } = useToast();
  
  // Research state
  const [researchQuery, setResearchQuery] = useState("");
  const [researchMaxResults, setResearchMaxResults] = useState(50);
  const [researchSaveCampaign, setResearchSaveCampaign] = useState("no");
  const [researchResults, setResearchResults] = useState<any>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);

  // Boolean Search state
  const [booleanSearch, setBooleanSearch] = useState("");
  const [booleanSearchResults, setBooleanSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [useBrightData, setUseBrightData] = useState(false);
  const [searchMode, setSearchMode] = useState<"builder" | "raw">("builder");

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

  const handleBooleanSearch = async () => {
    if (!booleanSearch.trim()) {
      toast({
        title: "Empty Search",
        description: "Please enter a boolean search query.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setBooleanSearchResults([]);

    try {
      const response = await apiRequest('POST', '/api/admin/boolean-search', {
        query: booleanSearch.trim(),
        useBrightData
      });
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setBooleanSearchResults(data.results);
        toast({
          title: "Search Complete",
          description: `Found ${data.results.length} candidates${useBrightData ? ' (with enhanced profile data)' : ''}. Select one to add.`,
        });
      } else {
        toast({
          title: "No Results",
          description: "No candidates found for this search query. Try different terms.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message || "Failed to search LinkedIn. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research Management</h1>
        <p className="text-muted-foreground mt-2">AI-powered research and team discovery</p>
      </div>

      <Tabs defaultValue="ai-research" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai-research" data-testid="tab-ai-research">
            <Search className="h-4 w-4 mr-2" />
            AI Research
          </TabsTrigger>
          <TabsTrigger value="boolean-search" data-testid="tab-boolean-search">
            <Users className="h-4 w-4 mr-2" />
            Boolean Search
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

        {/* Boolean Search Tab */}
        <TabsContent value="boolean-search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                LinkedIn Candidate Search
              </CardTitle>
              <CardDescription>
                Use the visual builder or boolean operators to find candidates with specific skills, experience, or backgrounds.
              </CardDescription>
              <div className="flex gap-2 mt-4">
                <Button
                  variant={searchMode === "builder" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchMode("builder")}
                  data-testid="button-mode-builder"
                >
                  <Sliders className="h-4 w-4 mr-2" />
                  Visual Builder
                </Button>
                <Button
                  variant={searchMode === "raw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchMode("raw")}
                  data-testid="button-mode-raw"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Raw Query
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {searchMode === "builder" ? (
                <SearchBuilder 
                  onQueryGenerated={(query) => {
                    setBooleanSearch(query);
                    handleBooleanSearch();
                  }}
                />
              ) : (
                <div className="max-w-2xl space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="boolean-query">
                      Boolean Search Query
                    </Label>
                    <Textarea
                      id="boolean-query"
                      placeholder='E.g., (CEO OR "Chief Executive Officer") AND (tech OR software) AND (Series A OR Series B)&#10;E.g., "Product Manager" AND (fintech OR blockchain) AND -crypto&#10;E.g., CTO AND AWS AND (Python OR Go) AND NOT freelance'
                      className="min-h-[100px] resize-none"
                      value={booleanSearch}
                      onChange={(e) => setBooleanSearch(e.target.value)}
                      disabled={isSearching}
                      data-testid="input-boolean-query"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Use AND, OR, NOT operators. Enclose phrases in quotes. Use parentheses for grouping.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Checkbox 
                      id="brightdata-toggle"
                      checked={useBrightData}
                      onCheckedChange={(checked) => setUseBrightData(checked as boolean)}
                      disabled={isSearching}
                      data-testid="checkbox-bright-data"
                    />
                    <div className="flex-1">
                      <Label htmlFor="brightdata-toggle" className="font-semibold text-sm cursor-pointer">
                        Enhanced Profile Scraping
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {useBrightData ? "Bright Data will scrape full LinkedIn profile data for richer candidate information" : "Use Bright Data to extract complete profile information (recommended)"}
                      </p>
                    </div>
                    <Badge variant={useBrightData ? "default" : "outline"} className="text-xs whitespace-nowrap">
                      {useBrightData ? "Enhanced" : "Basic"}
                    </Badge>
                  </div>

                  <Button
                    onClick={handleBooleanSearch}
                    disabled={isSearching}
                    className="w-full"
                    data-testid="button-start-boolean-search"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching LinkedIn{useBrightData ? " & Scraping..." : "..."}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Candidates
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Results Section */}
              {booleanSearchResults.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Search Results ({booleanSearchResults.length})</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {booleanSearchResults.map((result: any, idx: number) => (
                      <Card key={idx} className="p-4 hover-elevate">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <p className="font-semibold">{result.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{result.title || 'Unknown Title'}</p>
                            <p className="text-sm text-muted-foreground">{result.company || 'Unknown Company'}</p>
                            {result.linkedinUrl && (
                              <a 
                                href={result.linkedinUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <LinkIcon className="h-3 w-3" />
                                View Profile
                              </a>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const nameParts = result.name?.split(' ') || ['', ''];
                              const firstName = nameParts[0] || '';
                              const lastName = nameParts.slice(1).join(' ') || '';
                              const company = result.company || result.title || 'Unknown Company';
                              
                              if (!firstName) {
                                toast({
                                  title: "Missing Name",
                                  description: "Unable to extract name from search result.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              toast({
                                title: "Added",
                                description: `${firstName} ${lastName} added to candidates`,
                              });
                              
                              setBooleanSearchResults([]);
                              setBooleanSearch("");
                            }}
                            data-testid={`button-add-candidate-${idx}`}
                          >
                            Add
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
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
