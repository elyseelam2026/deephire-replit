import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, TrendingUp, Phone, Globe, DollarSign, ArrowRight, Search, Pencil, Trash2, X, Save, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Company } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SearchResult = {
  parent: Company;
  matchedOffices: Company[];
  matchType: 'parent' | 'office' | 'both';
};

type TeamMember = {
  name: string;
  title?: string;
  bioUrl?: string;
};

export default function Companies() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [discoveredTeam, setDiscoveredTeam] = useState<TeamMember[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<Set<number>>(new Set());
  const [showTeamPreview, setShowTeamPreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Company>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();
  
  const { data: companies, isLoading, error } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  // Smart search query
  const { data: searchResults, isLoading: isSearching } = useQuery<SearchResult[]>({
    queryKey: ['/api/companies/search', searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/companies/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchQuery.length > 0,
  });

  // Fetch child companies when a company is selected
  const { data: childCompanies, refetch: refetchChildren } = useQuery<Company[]>({
    queryKey: ['/api/companies', selectedCompany?.id, 'children'],
    enabled: !!selectedCompany,
  });

  // Fetch parent company when a company is selected
  const { data: parentCompany } = useQuery<Company | null>({
    queryKey: ['/api/companies', selectedCompany?.id, 'parent'],
    enabled: !!selectedCompany && !!selectedCompany.parentCompanyId,
  });

  // Fetch organization chart when a company is selected
  type OrgChartMember = {
    id: number;
    candidateId: number | null;
    firstName: string;
    lastName: string;
    title: string;
    level: string | null;
    department: string | null;
    isCLevel: boolean;
    isExecutive: boolean;
    linkedinUrl: string | null;
  };
  const { data: orgChart } = useQuery<OrgChartMember[]>({
    queryKey: ['/api/companies', selectedCompany?.id, 'org-chart'],
    enabled: !!selectedCompany,
  });

  // Convert company to hierarchy mutation
  const convertToHierarchy = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await fetch(`/api/companies/${companyId}/convert-to-hierarchy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to convert company');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Created ${data.childrenCreated} office locations as clickable companies`,
      });
      refetchChildren();
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to convert company to hierarchy",
        variant: "destructive",
      });
    },
  });

  // Update company information from website
  const updateCompanyInfo = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest('POST', `/api/companies/${companyId}/refresh-info`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Company Information Updated!",
        description: data.message || "Successfully refreshed company data from website",
      });
      setSelectedCompany(data.company);
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', selectedCompany?.id, 'children'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update company information. Make sure the company has a website.",
        variant: "destructive",
      });
    },
  });

  // Discover team members mutation
  const discoverTeam = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest('POST', `/api/companies/${companyId}/discover-team`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setDiscoveredTeam(data.teamMembers || []);
      setSelectedTeamMembers(new Set());
      setShowTeamPreview(true);
      toast({
        title: "Team Members Discovered!",
        description: `Found ${data.teamMembers?.length || 0} team members`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to discover team members. Make sure the company has a website.",
        variant: "destructive",
      });
    },
  });

  // Import team members mutation
  const importTeamMembers = useMutation({
    mutationFn: async ({ companyId, teamMembers }: { companyId: number; teamMembers: TeamMember[] }) => {
      const response = await apiRequest('POST', `/api/companies/${companyId}/import-team-members`, { teamMembers });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: `Imported ${data.imported} team members as candidates`,
      });
      setShowTeamPreview(false);
      setDiscoveredTeam([]);
      setSelectedTeamMembers(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to import team members",
        variant: "destructive",
      });
    },
  });

  // Update company mutation
  const updateCompany = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Company> }) => {
      const response = await apiRequest('PATCH', `/api/companies/${id}`, updates);
      return await response.json();
    },
    onSuccess: (updatedCompany) => {
      toast({
        title: "Success!",
        description: "Company updated successfully",
      });
      setIsEditing(false);
      // Update the selected company with the returned data
      setSelectedCompany(updatedCompany);
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies', selectedCompany?.id, 'children'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update company",
        variant: "destructive",
      });
    },
  });

  // Delete company mutation
  const deleteCompany = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/companies/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Company deleted successfully",
      });
      setSelectedCompany(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
    },
    onError: (error: any) => {
      // Extract error message from the API response
      let errorMessage = "Failed to delete company";
      
      if (error.message) {
        // The error message format from apiRequest is "statusCode: {json}"
        // Try to parse the JSON part
        try {
          const jsonStart = error.message.indexOf('{');
          if (jsonStart !== -1) {
            const jsonStr = error.message.substring(jsonStart);
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) {
              errorMessage = parsed.error;
            }
          }
        } catch (e) {
          // If JSON parsing fails, just use the original error message
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setShowDeleteConfirm(false);
    },
  });

  const handleImportSelected = () => {
    if (selectedCompany && selectedTeamMembers.size > 0) {
      const membersToImport = discoveredTeam.filter((_, index) => selectedTeamMembers.has(index));
      importTeamMembers.mutate({ companyId: selectedCompany.id, teamMembers: membersToImport });
    }
  };

  const startEditing = () => {
    if (selectedCompany) {
      setEditFormData({
        name: selectedCompany.name,
        legalName: selectedCompany.legalName,
        tradingName: selectedCompany.tradingName,
        parentCompany: selectedCompany.parentCompany,
        companyType: selectedCompany.companyType,
        stockSymbol: selectedCompany.stockSymbol,
        foundedYear: selectedCompany.foundedYear,
        industry: selectedCompany.industry,
        subIndustry: selectedCompany.subIndustry,
        businessModel: selectedCompany.businessModel,
        targetMarket: selectedCompany.targetMarket,
        companyStage: selectedCompany.companyStage,
        employeeSize: selectedCompany.employeeSize,
        employeeSizeRange: selectedCompany.employeeSizeRange,
        description: selectedCompany.description,
        annualRevenue: selectedCompany.annualRevenue,
        revenueRange: selectedCompany.revenueRange,
        fundingStage: selectedCompany.fundingStage,
        totalFundingRaised: selectedCompany.totalFundingRaised,
        valuation: selectedCompany.valuation,
        location: selectedCompany.location,
        website: selectedCompany.website,
        linkedinUrl: selectedCompany.linkedinUrl,
        primaryEmail: selectedCompany.primaryEmail,
        primaryPhone: selectedCompany.primaryPhone,
        missionStatement: selectedCompany.missionStatement,
        coreValues: selectedCompany.coreValues,
        remoteWorkPolicy: selectedCompany.remoteWorkPolicy,
        typicalHiringTimeline: selectedCompany.typicalHiringTimeline,
        visaSponsorshipAvailable: selectedCompany.visaSponsorshipAvailable,
        salaryNegotiable: selectedCompany.salaryNegotiable,
      });
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const handleSaveEdit = () => {
    if (selectedCompany) {
      updateCompany.mutate({ id: selectedCompany.id, updates: editFormData });
    }
  };

  const handleDelete = () => {
    if (selectedCompany) {
      deleteCompany.mutate(selectedCompany.id);
    }
  };

  const toggleTeamMember = (index: number) => {
    const newSelected = new Set(selectedTeamMembers);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTeamMembers(newSelected);
  };

  const selectAllTeamMembers = () => {
    if (selectedTeamMembers.size === discoveredTeam.length) {
      setSelectedTeamMembers(new Set());
    } else {
      setSelectedTeamMembers(new Set(discoveredTeam.map((_, i) => i)));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="companies-page">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage your client companies</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6" data-testid="companies-page">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage your client companies</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load companies. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "startup":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "growth":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "enterprise":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  // Determine which companies to display
  const displayCompanies = searchQuery && searchResults ? searchResults : 
    companies?.map(c => ({ parent: c, matchedOffices: [], matchType: 'parent' as const })) || [];

  return (
    <div className="space-y-6 p-6" data-testid="companies-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            {searchQuery ? `Search results for "${searchQuery}"` : `Manage your client companies (${companies?.length || 0} headquarters)`}
          </p>
        </div>
        <Button data-testid="button-add-company">
          <Building2 className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Search input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search companies or cities (e.g., 'KKR London')..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-search-companies"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCompanies.map((result) => {
          const company = result.parent;
          return (
            <Card key={company.id} className="hover-elevate" data-testid={`company-card-${company.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg" data-testid={`company-name-${company.id}`}>
                        {company.name}
                      </CardTitle>
                      {company.stage && (
                        <Badge variant="secondary" className={getStageColor(company.stage)}>
                          {company.stage}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Show office count and matched offices if searching */}
                {result.matchedOffices.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {result.matchedOffices.map((office) => (
                      <Badge 
                        key={office.id} 
                        variant="outline" 
                        className="text-xs cursor-pointer hover-elevate"
                        onClick={() => setSelectedCompany(office)}
                        data-testid={`badge-office-${office.id}`}
                      >
                        📍 {office.location}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {company.industry && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span data-testid={`company-industry-${company.id}`}>{company.industry}</span>
                  </div>
                )}
                
                {company.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span data-testid={`company-location-${company.id}`}>{company.location}</span>
                  </div>
                )}
                
                {company.employeeSize && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span data-testid={`company-employees-${company.id}`}>{company.employeeSize} employees</span>
                  </div>
                )}

                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => setSelectedCompany(company)}
                    data-testid={`button-view-company-${company.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {companies?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No companies yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first company to start posting jobs and finding candidates.
            </p>
            <Button data-testid="button-add-first-company">
              <Building2 className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Company Detail Modal */}
      <Dialog open={!!selectedCompany} onOpenChange={(open) => {
        if (!open) {
          setSelectedCompany(null);
          setIsEditing(false);
          setEditFormData({});
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid={`company-profile-${selectedCompany?.id}`}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <Building2 className="h-6 w-6" />
                {selectedCompany?.name}
              </DialogTitle>
              <div className="flex gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEditing}
                      data-testid="button-edit-company"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      data-testid="button-delete-company"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cancelEditing}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateCompany.isPending}
                      data-testid="button-save-company"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateCompany.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <DialogDescription>
              {isEditing ? 'Edit company information' : 'Company details and information'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <div className="space-y-6">
              {/* Edit Form */}
              {isEditing ? (
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="business">Business</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="culture">Culture</TabsTrigger>
                  </TabsList>

                  {/* Basic Tab */}
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-legal-name">Legal Name</Label>
                        <Input
                          id="edit-legal-name"
                          value={editFormData.legalName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, legalName: e.target.value })}
                          placeholder="Official registered name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-trading-name">Trading Name (DBA)</Label>
                        <Input
                          id="edit-trading-name"
                          value={editFormData.tradingName || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, tradingName: e.target.value })}
                          placeholder="Doing Business As"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-company-type">Company Type</Label>
                        <Select
                          value={editFormData.companyType || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, companyType: value })}
                        >
                          <SelectTrigger>
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
                        <Label htmlFor="edit-founded-year">Founded Year</Label>
                        <Input
                          id="edit-founded-year"
                          type="number"
                          value={editFormData.foundedYear || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, foundedYear: parseInt(e.target.value) })}
                          placeholder="2010"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Business Tab */}
                  <TabsContent value="business" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-industry">Industry</Label>
                        <Input
                          id="edit-industry"
                          value={editFormData.industry || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                          placeholder="Private Equity, Technology..."
                          data-testid="input-edit-industry"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-sub-industry">Sub-Industry</Label>
                        <Input
                          id="edit-sub-industry"
                          value={editFormData.subIndustry || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, subIndustry: e.target.value })}
                          placeholder="Growth Equity, SaaS..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-business-model">Business Model</Label>
                        <Select
                          value={editFormData.businessModel || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, businessModel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="b2b">B2B</SelectItem>
                            <SelectItem value="b2c">B2C</SelectItem>
                            <SelectItem value="b2b2c">B2B2C</SelectItem>
                            <SelectItem value="marketplace">Marketplace</SelectItem>
                            <SelectItem value="saas">SaaS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-employee-size-range">Employee Size Range</Label>
                        <Select
                          value={editFormData.employeeSizeRange || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, employeeSizeRange: value })}
                        >
                          <SelectTrigger>
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
                        <Label htmlFor="edit-employees">Exact Employee Count</Label>
                        <Input
                          id="edit-employees"
                          type="number"
                          value={editFormData.employeeSize ?? ''}
                          onChange={(e) => setEditFormData({ ...editFormData, employeeSize: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder="250"
                          data-testid="input-edit-employees"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Company Description</Label>
                      <Textarea
                        id="edit-description"
                        value={editFormData.description || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        placeholder="Brief overview of the company's business..."
                        rows={4}
                      />
                    </div>
                  </TabsContent>

                  {/* Financial Tab */}
                  <TabsContent value="financial" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-revenue">Annual Revenue ($)</Label>
                        <Input
                          id="edit-revenue"
                          type="number"
                          value={editFormData.annualRevenue ?? ''}
                          onChange={(e) => setEditFormData({ ...editFormData, annualRevenue: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="50000000"
                          data-testid="input-edit-revenue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-revenue-range">Revenue Range</Label>
                        <Select
                          value={editFormData.revenueRange || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, revenueRange: value })}
                        >
                          <SelectTrigger>
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
                        <Label htmlFor="edit-funding-stage">Funding Stage</Label>
                        <Select
                          value={editFormData.fundingStage || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, fundingStage: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                            <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                            <SelectItem value="seed">Seed</SelectItem>
                            <SelectItem value="series_a">Series A</SelectItem>
                            <SelectItem value="series_b">Series B</SelectItem>
                            <SelectItem value="series_c">Series C</SelectItem>
                            <SelectItem value="ipo">IPO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-total-funding">Total Funding Raised ($)</Label>
                        <Input
                          id="edit-total-funding"
                          type="number"
                          value={editFormData.totalFundingRaised ?? ''}
                          onChange={(e) => setEditFormData({ ...editFormData, totalFundingRaised: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder="25000000"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Contact Tab */}
                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-website">Website</Label>
                        <Input
                          id="edit-website"
                          value={editFormData.website || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                          placeholder="https://example.com"
                          data-testid="input-edit-website"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-phone">Primary Phone</Label>
                        <Input
                          id="edit-phone"
                          value={editFormData.primaryPhone || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, primaryPhone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                          data-testid="input-edit-phone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-primary-email">Primary Email</Label>
                        <Input
                          id="edit-primary-email"
                          type="email"
                          value={editFormData.primaryEmail || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, primaryEmail: e.target.value })}
                          placeholder="info@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-location">Location</Label>
                        <Input
                          id="edit-location"
                          value={editFormData.location || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                          placeholder="New York, NY, USA"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Culture Tab */}
                  <TabsContent value="culture" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-mission">Mission Statement</Label>
                      <Textarea
                        id="edit-mission"
                        value={editFormData.missionStatement || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, missionStatement: e.target.value })}
                        placeholder="Company's mission and vision..."
                        rows={4}
                        data-testid="input-edit-mission"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-remote-policy">Remote Work Policy</Label>
                        <Select
                          value={editFormData.remoteWorkPolicy || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, remoteWorkPolicy: value })}
                        >
                          <SelectTrigger>
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
                        <Label htmlFor="edit-hiring-timeline">Typical Hiring Timeline</Label>
                        <Select
                          value={editFormData.typicalHiringTimeline || ''}
                          onValueChange={(value) => setEditFormData({ ...editFormData, typicalHiringTimeline: value })}
                        >
                          <SelectTrigger>
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
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  {/* Parent Company Link */}
                  {parentCompany && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Part of</p>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto font-medium text-primary"
                        onClick={() => setSelectedCompany(parentCompany)}
                        data-testid={`link-parent-company-${parentCompany.id}`}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        {parentCompany.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}

                  {/* Mission Statement */}
                  {selectedCompany.missionStatement && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">About</h4>
                      <p className="text-muted-foreground text-sm">{String(selectedCompany.missionStatement)}</p>
                    </div>
                  )}

                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCompany.industry && (
                      <div>
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Industry
                        </h4>
                        <p className="text-muted-foreground mt-1">{selectedCompany.industry}</p>
                      </div>
                    )}
                    {selectedCompany.primaryPhone && (
                      <div>
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Phone
                        </h4>
                        <p className="text-muted-foreground mt-1">{String(selectedCompany.primaryPhone)}</p>
                      </div>
                    )}
                    {selectedCompany.website && (
                      <div>
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Website
                        </h4>
                        <a href={String(selectedCompany.website)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-1 block text-sm">
                          {String(selectedCompany.website)}
                        </a>
                      </div>
                    )}
                    {selectedCompany.annualRevenue && (
                      <div>
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Revenue
                        </h4>
                        <p className="text-muted-foreground mt-1">{String(selectedCompany.annualRevenue)}</p>
                      </div>
                    )}
                  </div>

                  {/* Headquarters */}
                  {selectedCompany.headquarters && typeof selectedCompany.headquarters === 'object' && (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4" />
                        Headquarters
                      </h4>
                      <div className="text-muted-foreground text-sm">
                        {(selectedCompany.headquarters as any).street && <p>{(selectedCompany.headquarters as any).street}</p>}
                        <p>
                          {[
                            (selectedCompany.headquarters as any).city,
                            (selectedCompany.headquarters as any).state,
                            (selectedCompany.headquarters as any).postalCode
                          ].filter(Boolean).join(', ')}
                        </p>
                        {(selectedCompany.headquarters as any).country && <p>{(selectedCompany.headquarters as any).country}</p>}
                      </div>
                    </div>
                  )}

                  {/* Child Companies / Office Locations */}
                  {childCompanies && childCompanies.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4" />
                        Office Locations ({childCompanies.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {childCompanies.map((childCompany) => (
                          <button
                            key={childCompany.id}
                            onClick={() => setSelectedCompany(childCompany)}
                            className="text-left p-3 bg-muted rounded-md hover-elevate active-elevate-2 transition-all"
                            data-testid={`button-child-company-${childCompany.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{childCompany.location || childCompany.name}</p>
                                {(childCompany.headquarters as any)?.street && (
                                  <p className="text-muted-foreground text-xs mt-1">{(childCompany.headquarters as any).street}</p>
                                )}
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : selectedCompany.officeLocations && Array.isArray(selectedCompany.officeLocations) && selectedCompany.officeLocations.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Office Locations ({selectedCompany.officeLocations.length})
                        </h4>
                        <Button
                          size="sm"
                          onClick={() => convertToHierarchy.mutate(selectedCompany.id)}
                          disabled={convertToHierarchy.isPending}
                          data-testid="button-convert-to-hierarchy"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          {convertToHierarchy.isPending ? 'Converting...' : 'Make Offices Clickable'}
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {(selectedCompany.officeLocations as any[]).map((office: any, idx: number) => (
                          <div key={idx} className="text-sm p-2 bg-muted rounded-md">
                            <p className="font-medium">{office.city}, {office.country}</p>
                            {office.address && <p className="text-muted-foreground text-xs">{office.address}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Organization Chart */}
                  {orgChart && orgChart.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4" />
                        Organization Chart ({orgChart.length} members)
                      </h4>
                      <div className="space-y-3">
                        {/* C-Level Executives */}
                        {orgChart.filter(m => m.isCLevel).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">C-Suite</p>
                            <div className="space-y-2">
                              {orgChart.filter(m => m.isCLevel).map((member) => (
                                <div 
                                  key={member.id} 
                                  className="p-3 bg-primary/5 border border-primary/20 rounded-md"
                                  data-testid={`org-chart-member-${member.id}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      {member.candidateId ? (
                                        <Link 
                                          href={`/recruiting/candidates?id=${member.candidateId}`}
                                          className="font-medium text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                                          data-testid={`link-candidate-${member.candidateId}`}
                                        >
                                          <UserCircle className="h-3 w-3" />
                                          {member.firstName} {member.lastName}
                                        </Link>
                                      ) : (
                                        <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">{member.title}</p>
                                      {member.department && (
                                        <Badge variant="secondary" className="mt-2 text-xs">{member.department}</Badge>
                                      )}
                                    </div>
                                    {member.linkedinUrl && (
                                      <a 
                                        href={member.linkedinUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-xs"
                                        data-testid={`linkedin-link-${member.id}`}
                                      >
                                        LinkedIn →
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Executives */}
                        {orgChart.filter(m => !m.isCLevel && m.isExecutive).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">Executives</p>
                            <div className="space-y-2">
                              {orgChart.filter(m => !m.isCLevel && m.isExecutive).map((member) => (
                                <div 
                                  key={member.id} 
                                  className="p-3 bg-muted rounded-md"
                                  data-testid={`org-chart-member-${member.id}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      {member.candidateId ? (
                                        <Link 
                                          href={`/recruiting/candidates?id=${member.candidateId}`}
                                          className="font-medium text-sm text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                                          data-testid={`link-candidate-${member.candidateId}`}
                                        >
                                          <UserCircle className="h-3 w-3" />
                                          {member.firstName} {member.lastName}
                                        </Link>
                                      ) : (
                                        <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                                      )}
                                      <p className="text-xs text-muted-foreground mt-1">{member.title}</p>
                                      {member.department && (
                                        <Badge variant="secondary" className="mt-2 text-xs">{member.department}</Badge>
                                      )}
                                    </div>
                                    {member.linkedinUrl && (
                                      <a 
                                        href={member.linkedinUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-xs"
                                        data-testid={`linkedin-link-${member.id}`}
                                      >
                                        LinkedIn →
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Other Team Members */}
                        {orgChart.filter(m => !m.isCLevel && !m.isExecutive).length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground font-medium mb-2">Team Members</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {orgChart.filter(m => !m.isCLevel && !m.isExecutive).map((member) => (
                                <div 
                                  key={member.id} 
                                  className="p-2 bg-muted rounded-md text-sm"
                                  data-testid={`org-chart-member-${member.id}`}
                                >
                                  {member.candidateId ? (
                                    <Link 
                                      href={`/recruiting/candidates?id=${member.candidateId}`}
                                      className="font-medium text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                                      data-testid={`link-candidate-${member.candidateId}`}
                                    >
                                      <UserCircle className="h-3 w-3" />
                                      {member.firstName} {member.lastName}
                                    </Link>
                                  ) : (
                                    <p className="font-medium text-xs">{member.firstName} {member.lastName}</p>
                                  )}
                                  <p className="text-xs text-muted-foreground">{member.title}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Update Company Information */}
                  {selectedCompany.website && (
                    <div className="pt-4 border-t space-y-2">
                      <Button
                        onClick={() => updateCompanyInfo.mutate(selectedCompany.id)}
                        disabled={updateCompanyInfo.isPending}
                        className="w-full"
                        variant="outline"
                        data-testid="button-update-company-info"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        {updateCompanyInfo.isPending ? 'Updating...' : 'Update Company Information'}
                      </Button>
                      
                      <Button
                        onClick={() => discoverTeam.mutate(selectedCompany.id)}
                        disabled={discoverTeam.isPending}
                        className="w-full"
                        data-testid="button-discover-team"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {discoverTeam.isPending ? 'Discovering...' : 'Discover Team Members'}
                      </Button>
                    </div>
                  )}

                  {/* Legacy fields */}
                  {selectedCompany.employeeSize && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Employees
                        </h4>
                        <p className="text-muted-foreground mt-1">{selectedCompany.employeeSize} employees</p>
                      </div>
                      {selectedCompany.stage && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">Stage</h4>
                          <Badge variant="secondary" className={getStageColor(selectedCompany.stage)}>
                            {selectedCompany.stage}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent data-testid="delete-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
              {childCompanies && childCompanies.length > 0 && (
                <p className="text-destructive mt-2">
                  This company has {childCompanies.length} office location(s). Please delete those first.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCompany.isPending || (childCompanies && childCompanies.length > 0)}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCompany.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Members Preview Modal */}
      <Dialog open={showTeamPreview} onOpenChange={setShowTeamPreview}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="team-preview-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Users className="h-6 w-6" />
              Discovered Team Members ({discoveredTeam.length})
            </DialogTitle>
            <DialogDescription>
              Select team members to import as candidates
            </DialogDescription>
          </DialogHeader>

          {discoveredTeam.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team members found on this website</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllTeamMembers}
                  data-testid="button-select-all-team"
                >
                  {selectedTeamMembers.size === discoveredTeam.length ? 'Deselect All' : 'Select All'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {selectedTeamMembers.size} of {discoveredTeam.length} selected
                </p>
              </div>

              <div className="space-y-2">
                {discoveredTeam.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg hover-elevate cursor-pointer"
                    onClick={() => toggleTeamMember(index)}
                    data-testid={`team-member-${index}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamMembers.has(index)}
                      onChange={() => toggleTeamMember(index)}
                      className="mt-1"
                      data-testid={`checkbox-team-member-${index}`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      {member.title && (
                        <p className="text-sm text-muted-foreground">{member.title}</p>
                      )}
                      {member.bioUrl && (
                        <a
                          href={member.bioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Bio →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowTeamPreview(false)}
                  className="flex-1"
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportSelected}
                  disabled={selectedTeamMembers.size === 0 || importTeamMembers.isPending}
                  className="flex-1"
                  data-testid="button-import-selected"
                >
                  {importTeamMembers.isPending ? 'Importing...' : `Import ${selectedTeamMembers.size} Selected`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}