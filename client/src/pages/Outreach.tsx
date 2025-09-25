import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Mail, Clock, User, Building2, Search, TrendingUp, Eye, Reply } from "lucide-react";
import { useState } from "react";

type EmailOutreach = {
  id: number;
  candidateId: number;
  jobId: number;
  subject: string;
  content: string;
  status: string;
  sentAt: string;
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    currentTitle: string;
    currentCompany: string;
    email: string;
  };
  job: {
    id: number;
    title: string;
    department: string;
    company: {
      id: number;
      name: string;
      location: string;
    };
  };
};

export default function Outreach() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: outreach, isLoading, error } = useQuery<EmailOutreach[]>({
    queryKey: ['/api/outreach'],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="outreach-page">
        <div>
          <h1 className="text-3xl font-bold">Email Outreach</h1>
          <p className="text-muted-foreground">Track and manage candidate email campaigns</p>
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
      <div className="space-y-6 p-6" data-testid="outreach-page">
        <div>
          <h1 className="text-3xl font-bold">Email Outreach</h1>
          <p className="text-muted-foreground">Track and manage candidate email campaigns</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load outreach campaigns. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "opened":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "replied":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
      case "bounced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Mail className="h-3 w-3" />;
      case "opened":
        return <Eye className="h-3 w-3" />;
      case "replied":
        return <Reply className="h-3 w-3" />;
      case "bounced":
        return <TrendingUp className="h-3 w-3 rotate-180" />;
      default:
        return <Mail className="h-3 w-3" />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const filteredOutreach = outreach?.filter((item) => 
    searchQuery === "" ||
    item.candidate.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.candidate.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalEmails = outreach?.length || 0;
  const openedEmails = outreach?.filter(e => e.status === 'opened' || e.status === 'replied').length || 0;
  const repliedEmails = outreach?.filter(e => e.status === 'replied').length || 0;
  const openRate = totalEmails > 0 ? Math.round((openedEmails / totalEmails) * 100) : 0;
  const replyRate = totalEmails > 0 ? Math.round((repliedEmails / totalEmails) * 100) : 0;

  return (
    <div className="space-y-6 p-6" data-testid="outreach-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Outreach</h1>
          <p className="text-muted-foreground">
            Track and manage candidate email campaigns ({totalEmails} total emails)
          </p>
        </div>
        <Button data-testid="button-new-campaign">
          <Mail className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold" data-testid="stats-total-emails">{totalEmails}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold" data-testid="stats-open-rate">{openRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Reply className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Reply Rate</p>
                <p className="text-2xl font-bold" data-testid="stats-reply-rate">{replyRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Replied</p>
                <p className="text-2xl font-bold" data-testid="stats-replied-emails">{repliedEmails}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-outreach"
          />
        </div>
      </div>

      {/* Outreach List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOutreach?.map((email) => (
          <Card key={email.id} className="hover-elevate" data-testid={`outreach-card-${email.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(email.candidate.firstName, email.candidate.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`outreach-candidate-${email.id}`}>
                      {email.candidate.firstName} {email.candidate.lastName}
                    </CardTitle>
                    <CardDescription>
                      {email.candidate.currentTitle} at {email.candidate.currentCompany}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className={getStatusColor(email.status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(email.status)}
                    {email.status}
                  </span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Building2 className="h-4 w-4" />
                  <span data-testid={`outreach-job-${email.id}`}>
                    {email.job.title} at {email.job.company.name}
                  </span>
                </div>
                <h4 className="font-medium text-sm mb-2" data-testid={`outreach-subject-${email.id}`}>
                  {email.subject}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`outreach-content-${email.id}`}>
                  {email.content}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span data-testid={`outreach-sent-${email.id}`}>
                    Sent {formatTime(email.sentAt)}
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-outreach-${email.id}`}>
                  View Details
                </Button>
                {email.status === 'replied' && (
                  <Button variant="secondary" size="sm" className="w-full" data-testid={`button-view-reply-${email.id}`}>
                    <Reply className="h-4 w-4 mr-2" />
                    View Reply
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOutreach?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No campaigns found' : 'No email campaigns yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No outreach campaigns match "${searchQuery}". Try a different search term.`
                : 'Start reaching out to candidates with personalized email campaigns.'
              }
            </p>
            {!searchQuery && (
              <Button data-testid="button-create-first-campaign">
                <Mail className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}