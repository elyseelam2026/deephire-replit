import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Building2, Users, ExternalLink } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface ResearchStatus {
  status: 'processing' | 'completed' | 'failed';
  results?: any[];
  totalResults?: number;
  progress?: number;
}

export function CompanyResearch() {
  const [companyName, setCompanyName] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [researchId, setResearchId] = useState<number | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ResearchStatus | null>(null);
  const { toast } = useToast();

  const startResearch = async () => {
    if (!companyName.trim()) {
      toast({
        title: 'Company name required',
        description: 'Please enter a company name to research',
        variant: 'destructive'
      });
      return;
    }

    setIsResearching(true);
    setStatus(null);
    setResearchId(null);
    setLinkedinUrl(null);

    try {
      const response = await apiRequest('POST', '/api/research/company', {
        companyName: companyName.trim()
      });

      const data = await response.json();

      setLinkedinUrl(data.linkedinUrl);
      setStatus({ status: 'processing', progress: 0 });

      toast({
        title: 'Research started',
        description: `Sourcing employees from ${companyName}...`
      });

      pollStatus(data.snapshotId);
    } catch (error) {
      console.error('Research error:', error);
      toast({
        title: 'Research failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
      setIsResearching(false);
    }
  };

  const pollStatus = async (snapshotId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setIsResearching(false);
        toast({
          title: 'Research timeout',
          description: 'The research is taking longer than expected. Check back later.',
          variant: 'destructive'
        });
        return;
      }

      try {
        const response = await fetch(`/api/research/status/${snapshotId}`);
        const data: ResearchStatus = await response.json();

        setStatus(data);

        if (data.status === 'completed') {
          setIsResearching(false);
          toast({
            title: 'Research complete',
            description: `Found ${data.totalResults || 0} employees`
          });
          queryClient.invalidateQueries({ queryKey: ['/api/staging-candidates'] });
        } else if (data.status === 'failed') {
          setIsResearching(false);
          toast({
            title: 'Research failed',
            description: 'Could not complete research',
            variant: 'destructive'
          });
        } else {
          attempts++;
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Status poll error:', error);
        setIsResearching(false);
      }
    };

    poll();
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-company-research">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            AI Company Research
          </CardTitle>
          <CardDescription>
            Automatically source employees from any company using LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              data-testid="input-company-name"
              placeholder="Enter company name (e.g., KKR, Goldman Sachs, Sequoia)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isResearching && startResearch()}
              disabled={isResearching}
            />
            <Button
              data-testid="button-start-research"
              onClick={startResearch}
              disabled={isResearching || !companyName.trim()}
            >
              {isResearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Research
                </>
              )}
            </Button>
          </div>

          {linkedinUrl && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Found:</span>
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {linkedinUrl.split('/').slice(-2, -1)[0]}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {status && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {status.status === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      Processing... {status.progress ? `${status.progress}%` : ''}
                    </span>
                  </>
                ) : status.status === 'completed' ? (
                  <>
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      Found {status.totalResults || 0} employees
                    </span>
                  </>
                ) : null}
              </div>

              {status.status === 'completed' && status.results && status.results.length > 0 && (
                <div className="border rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium">Sample Results:</h4>
                  <div className="space-y-2">
                    {status.results.slice(0, 5).map((employee: any, idx: number) => (
                      <div key={idx} className="text-sm border-l-2 border-primary pl-3">
                        <div className="font-medium">{employee.name || employee.full_name}</div>
                        <div className="text-muted-foreground">
                          {employee.position || employee.job_title}
                        </div>
                      </div>
                    ))}
                    {status.results.length > 5 && (
                      <div className="text-xs text-muted-foreground">
                        + {status.results.length - 5} more employees
                      </div>
                    )}
                  </div>
                  <div className="pt-2">
                    <Button
                      data-testid="button-view-staging"
                      size="sm"
                      onClick={() => {
                        window.location.hash = '/recruiting/staging';
                      }}
                    >
                      View in Staging →
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Searches LinkedIn for company profile</p>
            <p>• Extracts up to 50 employees with job titles</p>
            <p>• Stages candidates for review before adding to database</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
