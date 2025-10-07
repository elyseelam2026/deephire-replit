import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, TrendingUp, Phone, Globe, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Company } from "@shared/schema";

export default function Companies() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const { data: companies, isLoading, error } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

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

  return (
    <div className="space-y-6 p-6" data-testid="companies-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">
            Manage your client companies ({companies?.length || 0} total)
          </p>
        </div>
        <Button data-testid="button-add-company">
          <Building2 className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies?.map((company) => (
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
        ))}
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
      <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid={`company-profile-${selectedCompany?.id}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Building2 className="h-6 w-6" />
              {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription>
              Company details and information
            </DialogDescription>
          </DialogHeader>
          
          {selectedCompany && (
            <div className="space-y-6">
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

              {/* Office Locations */}
              {selectedCompany.officeLocations && Array.isArray(selectedCompany.officeLocations) && selectedCompany.officeLocations.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    Office Locations ({selectedCompany.officeLocations.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(selectedCompany.officeLocations as any[]).map((office: any, idx: number) => (
                      <div key={idx} className="text-sm p-2 bg-muted rounded-md">
                        <p className="font-medium">{office.city}, {office.country}</p>
                        {office.address && <p className="text-muted-foreground text-xs">{office.address}</p>}
                      </div>
                    ))}
                  </div>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}