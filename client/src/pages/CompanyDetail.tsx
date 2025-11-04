import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, MapPin, Globe, Users, Briefcase, TrendingUp,
  Calendar, ArrowLeft, ExternalLink, Mail, Phone, Edit, Save, X, DollarSign,
  Target, Heart
} from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Company = {
  id: number;
  name: string;
  legalName?: string;
  tradingName?: string;
  parentCompany?: string;
  companyType?: string;
  stockSymbol?: string;
  isPublic?: boolean;
  foundedYear?: number;
  website?: string;
  industry?: string;
  subIndustry?: string;
  businessModel?: string;
  targetMarket?: string[];
  companySize?: string;
  employeeSize?: number;
  employeeSizeRange?: string;
  companyStage?: string;
  annualRevenue?: number;
  revenueRange?: string;
  fundingStage?: string;
  totalFundingRaised?: number;
  valuation?: number;
  location?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  description?: string;
  missionStatement?: string;
  coreValues?: string[];
  remoteWorkPolicy?: string;
  typicalHiringTimeline?: string;
  visaSponsorshipAvailable?: boolean;
  salaryNegotiable?: boolean;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Company>>({});
  const { toast } = useToast();

  const { data: company, isLoading: loadingCompany } = useQuery<Company>({
    queryKey: ['/api/companies', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`);
      if (!response.ok) throw new Error('Failed to fetch company');
      return response.json();
    },
    enabled: !!companyId,
  });

  // Helper function to populate all edit fields from company data
  const populateEditData = (companyData: Company) => {
    setEditData({
      name: companyData.name,
      legalName: companyData.legalName,
      tradingName: companyData.tradingName,
      parentCompany: companyData.parentCompany,
      companyType: companyData.companyType,
      stockSymbol: companyData.stockSymbol,
      foundedYear: companyData.foundedYear,
      industry: companyData.industry,
      subIndustry: companyData.subIndustry,
      businessModel: companyData.businessModel,
      targetMarket: companyData.targetMarket,
      companyStage: companyData.companyStage,
      employeeSize: companyData.employeeSize,
      employeeSizeRange: companyData.employeeSizeRange,
      description: companyData.description,
      annualRevenue: companyData.annualRevenue,
      revenueRange: companyData.revenueRange,
      fundingStage: companyData.fundingStage,
      totalFundingRaised: companyData.totalFundingRaised,
      valuation: companyData.valuation,
      location: companyData.location,
      website: companyData.website,
      linkedinUrl: companyData.linkedinUrl,
      primaryEmail: companyData.primaryEmail,
      primaryPhone: companyData.primaryPhone,
      missionStatement: companyData.missionStatement,
      coreValues: companyData.coreValues,
      remoteWorkPolicy: companyData.remoteWorkPolicy,
      typicalHiringTimeline: companyData.typicalHiringTimeline,
      visaSponsorshipAvailable: companyData.visaSponsorshipAvailable,
      salaryNegotiable: companyData.salaryNegotiable,
    });
  };

  // Check for edit query parameter and auto-open edit mode
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('edit') === 'true' && company) {
      // Populate all editData when auto-opening
      populateEditData(company);
      setIsEditing(true);
      // Remove the query parameter from the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Company>) => {
      const response = await apiRequest('PATCH', `/api/companies/${companyId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId] });
      toast({
        title: "Company Updated",
        description: "The company has been updated successfully.",
      });
      setIsEditing(false);
      setEditData({});
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    },
  });

  const handleEditToggle = () => {
    if (!isEditing && company) {
      // Entering edit mode - populate all editData
      populateEditData(company);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

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
            <Button onClick={handleEditToggle} variant="outline" size="sm" data-testid="button-edit">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
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
                {company.location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Location</div>
                      <div className="font-medium" data-testid="company-location">{company.location}</div>
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

      {/* Comprehensive Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => {
        if (!open) handleCancel();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Company Information</DialogTitle>
            <DialogDescription>
              Update comprehensive company details for research and intelligence gathering
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="culture">Culture</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 px-1">
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input
                      id="legalName"
                      value={editData.legalName || ''}
                      onChange={(e) => setEditData({...editData, legalName: e.target.value})}
                      placeholder="Official registered name"
                      data-testid="input-legal-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradingName">Trading Name (DBA)</Label>
                    <Input
                      id="tradingName"
                      value={editData.tradingName || ''}
                      onChange={(e) => setEditData({...editData, tradingName: e.target.value})}
                      placeholder="Doing Business As"
                      data-testid="input-trading-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentCompany">Parent Company</Label>
                    <Input
                      id="parentCompany"
                      value={editData.parentCompany || ''}
                      onChange={(e) => setEditData({...editData, parentCompany: e.target.value})}
                      placeholder="Parent organization"
                      data-testid="input-parent-company"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyType">Company Type</Label>
                    <Select
                      value={editData.companyType || ''}
                      onValueChange={(value) => setEditData({...editData, companyType: value})}
                    >
                      <SelectTrigger data-testid="select-company-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="nonprofit">Non-Profit</SelectItem>
                        <SelectItem value="public">Public Company</SelectItem>
                        <SelectItem value="private">Private Company</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stockSymbol">Stock Symbol</Label>
                    <Input
                      id="stockSymbol"
                      value={editData.stockSymbol || ''}
                      onChange={(e) => setEditData({...editData, stockSymbol: e.target.value.toUpperCase()})}
                      placeholder="NASDAQ: AAPL"
                      data-testid="input-stock-symbol"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foundedYear">Founded Year</Label>
                    <Input
                      id="foundedYear"
                      type="number"
                      value={editData.foundedYear || ''}
                      onChange={(e) => setEditData({...editData, foundedYear: parseInt(e.target.value)})}
                      placeholder="2010"
                      data-testid="input-founded-year"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Business & Industry Tab */}
              <TabsContent value="business" className="space-y-4 mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={editData.industry || ''}
                      onChange={(e) => setEditData({...editData, industry: e.target.value})}
                      placeholder="Private Equity, Technology, Healthcare..."
                      data-testid="input-industry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subIndustry">Sub-Industry</Label>
                    <Input
                      id="subIndustry"
                      value={editData.subIndustry || ''}
                      onChange={(e) => setEditData({...editData, subIndustry: e.target.value})}
                      placeholder="Growth Equity, SaaS, Biotech..."
                      data-testid="input-sub-industry"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessModel">Business Model</Label>
                    <Select
                      value={editData.businessModel || ''}
                      onValueChange={(value) => setEditData({...editData, businessModel: value})}
                    >
                      <SelectTrigger data-testid="select-business-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="b2b">B2B</SelectItem>
                        <SelectItem value="b2c">B2C</SelectItem>
                        <SelectItem value="b2b2c">B2B2C</SelectItem>
                        <SelectItem value="marketplace">Marketplace</SelectItem>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="ecommerce">E-Commerce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyStage">Company Stage</Label>
                    <Select
                      value={editData.companyStage || ''}
                      onValueChange={(value) => setEditData({...editData, companyStage: value})}
                    >
                      <SelectTrigger data-testid="select-company-stage">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup</SelectItem>
                        <SelectItem value="growth">Growth</SelectItem>
                        <SelectItem value="mature">Mature</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeSizeRange">Employee Size Range</Label>
                    <Select
                      value={editData.employeeSizeRange || ''}
                      onValueChange={(value) => setEditData({...editData, employeeSizeRange: value})}
                    >
                      <SelectTrigger data-testid="select-employee-size">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10</SelectItem>
                        <SelectItem value="11-50">11-50</SelectItem>
                        <SelectItem value="51-200">51-200</SelectItem>
                        <SelectItem value="201-500">201-500</SelectItem>
                        <SelectItem value="501-1000">501-1000</SelectItem>
                        <SelectItem value="1001-5000">1001-5000</SelectItem>
                        <SelectItem value="5000+">5000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeSize">Exact Employee Count</Label>
                    <Input
                      id="employeeSize"
                      type="number"
                      value={editData.employeeSize || ''}
                      onChange={(e) => setEditData({...editData, employeeSize: parseInt(e.target.value)})}
                      placeholder="250"
                      data-testid="input-employee-size"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Company Description</Label>
                  <Textarea
                    id="description"
                    value={editData.description || ''}
                    onChange={(e) => setEditData({...editData, description: e.target.value})}
                    placeholder="Brief overview of the company's business..."
                    rows={4}
                    data-testid="input-description"
                  />
                </div>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="space-y-4 mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="annualRevenue">Annual Revenue ($)</Label>
                    <Input
                      id="annualRevenue"
                      type="number"
                      value={editData.annualRevenue || ''}
                      onChange={(e) => setEditData({...editData, annualRevenue: parseFloat(e.target.value)})}
                      placeholder="50000000"
                      data-testid="input-annual-revenue"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="revenueRange">Revenue Range</Label>
                    <Select
                      value={editData.revenueRange || ''}
                      onValueChange={(value) => setEditData({...editData, revenueRange: value})}
                    >
                      <SelectTrigger data-testid="select-revenue-range">
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1M">&lt;$1M</SelectItem>
                        <SelectItem value="1M-10M">$1M-$10M</SelectItem>
                        <SelectItem value="10M-50M">$10M-$50M</SelectItem>
                        <SelectItem value="50M-100M">$50M-$100M</SelectItem>
                        <SelectItem value="100M-500M">$100M-$500M</SelectItem>
                        <SelectItem value="500M-1B">$500M-$1B</SelectItem>
                        <SelectItem value="1B+">$1B+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fundingStage">Funding Stage</Label>
                    <Select
                      value={editData.fundingStage || ''}
                      onValueChange={(value) => setEditData({...editData, fundingStage: value})}
                    >
                      <SelectTrigger data-testid="select-funding-stage">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                        <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                        <SelectItem value="seed">Seed</SelectItem>
                        <SelectItem value="series_a">Series A</SelectItem>
                        <SelectItem value="series_b">Series B</SelectItem>
                        <SelectItem value="series_c">Series C</SelectItem>
                        <SelectItem value="series_d+">Series D+</SelectItem>
                        <SelectItem value="ipo">IPO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalFundingRaised">Total Funding Raised ($)</Label>
                    <Input
                      id="totalFundingRaised"
                      type="number"
                      value={editData.totalFundingRaised || ''}
                      onChange={(e) => setEditData({...editData, totalFundingRaised: parseFloat(e.target.value)})}
                      placeholder="25000000"
                      data-testid="input-funding-raised"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valuation">Valuation ($)</Label>
                    <Input
                      id="valuation"
                      type="number"
                      value={editData.valuation || ''}
                      onChange={(e) => setEditData({...editData, valuation: parseFloat(e.target.value)})}
                      placeholder="100000000"
                      data-testid="input-valuation"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contact & Location Tab */}
              <TabsContent value="contact" className="space-y-4 mt-0">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={editData.website || ''}
                      onChange={(e) => setEditData({...editData, website: e.target.value})}
                      placeholder="https://example.com"
                      data-testid="input-website"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                    <Input
                      id="linkedinUrl"
                      value={editData.linkedinUrl || ''}
                      onChange={(e) => setEditData({...editData, linkedinUrl: e.target.value})}
                      placeholder="https://linkedin.com/company/..."
                      data-testid="input-linkedin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryEmail">Primary Email</Label>
                    <Input
                      id="primaryEmail"
                      type="email"
                      value={editData.primaryEmail || ''}
                      onChange={(e) => setEditData({...editData, primaryEmail: e.target.value})}
                      placeholder="info@company.com"
                      data-testid="input-primary-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryPhone">Primary Phone</Label>
                    <Input
                      id="primaryPhone"
                      value={editData.primaryPhone || ''}
                      onChange={(e) => setEditData({...editData, primaryPhone: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                      data-testid="input-primary-phone"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Headquarters Location</Label>
                    <Input
                      id="location"
                      value={editData.location || ''}
                      onChange={(e) => setEditData({...editData, location: e.target.value})}
                      placeholder="New York, NY, USA"
                      data-testid="input-location"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Culture & Hiring Tab */}
              <TabsContent value="culture" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="missionStatement">Mission Statement</Label>
                    <Textarea
                      id="missionStatement"
                      value={editData.missionStatement || ''}
                      onChange={(e) => setEditData({...editData, missionStatement: e.target.value})}
                      placeholder="Company's mission and vision..."
                      rows={3}
                      data-testid="input-mission"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="remoteWorkPolicy">Remote Work Policy</Label>
                      <Select
                        value={editData.remoteWorkPolicy || ''}
                        onValueChange={(value) => setEditData({...editData, remoteWorkPolicy: value})}
                      >
                        <SelectTrigger data-testid="select-remote-policy">
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_remote">On-Site Only</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="fully_remote">Fully Remote</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="typicalHiringTimeline">Typical Hiring Timeline</Label>
                      <Select
                        value={editData.typicalHiringTimeline || ''}
                        onValueChange={(value) => setEditData({...editData, typicalHiringTimeline: value})}
                      >
                        <SelectTrigger data-testid="select-hiring-timeline">
                          <SelectValue placeholder="Select timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_week">1 Week</SelectItem>
                          <SelectItem value="2_weeks">2 Weeks</SelectItem>
                          <SelectItem value="1_month">1 Month</SelectItem>
                          <SelectItem value="2_months">2 Months</SelectItem>
                          <SelectItem value="3_months+">3+ Months</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
