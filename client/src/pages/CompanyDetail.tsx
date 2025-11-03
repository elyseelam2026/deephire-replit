import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, MapPin, Globe, Users, Briefcase, TrendingUp,
  Calendar, ArrowLeft, ExternalLink, Mail, Phone
} from "lucide-react";
import { Link } from "wouter";

type Company = {
  id: number;
  name: string;
  website?: string;
  industry?: string;
  companySize?: string;
  companyStage?: string;
  headquarters?: string;
  description?: string;
  fundingInfo?: string;
  linkedinUrl?: string;
  roles?: string[];
  createdAt: string;
};

type Job = {
  id: number;
  title: string;
  department?: string;
  status: string;
  urgency?: string;
  createdAt: string;
};

type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle?: string;
  email?: string;
  location?: string;
  yearsExperience?: number;
};

export default function CompanyDetail() {
  const [, params] = useRoute("/recruiting/companies/:id");
  const companyId = params?.id ? parseInt(params.id) : null;

  const { data: company, isLoading: loadingCompany } = useQuery<Company>({
    queryKey: ['/api/companies', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch company');
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/companies', companyId, 'jobs'],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/jobs`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!companyId,
  });

  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ['/api/companies', companyId, 'candidates'],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}/candidates`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!companyId,
  });

  if (loadingCompany || !company) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const displayRoles = company.roles || [];
  const isPEFirm = displayRoles.includes('client');
  const isPortfolio = displayRoles.includes('prospecting');

  return (
    <div className="h-full flex flex-col" data-testid="company-detail-page">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-2">
          <Link href="/recruiting/companies">
            <Button variant="ghost" size="sm" data-testid="button-back-to-companies">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Button>
          </Link>
          <div className="flex gap-2">
            {isPEFirm && (
              <Badge variant="default">PE Firm</Badge>
            )}
            {isPortfolio && (
              <Badge variant="secondary">Portfolio Company</Badge>
            )}
            {company.companyStage && (
              <Badge variant="outline">{company.companyStage}</Badge>
            )}
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="company-name">{company.name}</h1>
            {company.industry && (
              <p className="text-muted-foreground">{company.industry}</p>
            )}
          </div>
          {company.website && (
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-website"
            >
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Website
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - Company Info */}
          <div className="col-span-4 space-y-4">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Company Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.headquarters && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Headquarters</div>
                      <div className="font-medium" data-testid="company-hq">{company.headquarters}</div>
                    </div>
                  </div>
                )}

                {company.companySize && (
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Company Size</div>
                      <div className="font-medium capitalize">{company.companySize}</div>
                    </div>
                  </div>
                )}

                {company.fundingInfo && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Funding</div>
                      <div className="font-medium">{company.fundingInfo}</div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">Added to System</div>
                    <div className="font-medium">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {company.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {company.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Jobs</span>
                  <Badge variant="secondary" data-testid="stat-jobs">
                    {jobs.filter(j => j.status === 'active').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Candidates</span>
                  <Badge variant="secondary" data-testid="stat-candidates">
                    {candidates.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">All Jobs Posted</span>
                  <Badge variant="secondary">
                    {jobs.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Tabs */}
          <div className="col-span-8">
            <Tabs defaultValue="jobs" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="jobs" data-testid="tab-jobs">
                  Jobs ({jobs.length})
                </TabsTrigger>
                <TabsTrigger value="candidates" data-testid="tab-candidates">
                  Candidates ({candidates.length})
                </TabsTrigger>
              </TabsList>

              {/* Jobs Tab */}
              <TabsContent value="jobs" className="space-y-4 mt-4">
                {loadingJobs ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : jobs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No jobs posted yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <Link key={job.id} href={`/recruiting/jobs/${job.id}`}>
                        <Card className="hover-elevate cursor-pointer" data-testid={`job-card-${job.id}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">{job.title}</CardTitle>
                                <CardDescription>
                                  {job.department || 'General'} · Added {new Date(job.createdAt).toLocaleDateString()}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                                  {job.status}
                                </Badge>
                                {job.urgency && (
                                  <Badge variant="outline" className="capitalize">
                                    {job.urgency}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="space-y-4 mt-4">
                {loadingCandidates ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : candidates.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No candidates associated with this company</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {candidates.map((candidate) => {
                      const displayName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
                      return (
                        <Link key={candidate.id} href={`/recruiting/candidates/${candidate.id}`}>
                          <Card className="hover-elevate cursor-pointer" data-testid={`candidate-card-${candidate.id}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">{displayName}</CardTitle>
                                  <CardDescription>
                                    {candidate.currentTitle || 'No title'}
                                    {candidate.location && ` · ${candidate.location}`}
                                  </CardDescription>
                                </div>
                                {candidate.yearsExperience !== undefined && (
                                  <Badge variant="secondary">
                                    {candidate.yearsExperience} yrs exp
                                  </Badge>
                                )}
                              </div>
                              {candidate.email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                  <Mail className="h-3 w-3" />
                                  {candidate.email}
                                </div>
                              )}
                            </CardHeader>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
