import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, MapPin, Calendar, ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface Application {
  id: number;
  jobId: number;
  jobTitle: string;
  companyName: string;
  location: string;
  status: "applied" | "rejected" | "accepted" | "interview";
  appliedAt: string;
  jobUrl?: string;
}

export default function CandidateApplications() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch candidate applications
  const { data: applications = [], isLoading } = useQuery<Application[]>({
    queryKey: [`/api/candidate/${candidateId}/applications`],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
        return <Badge className="bg-green-600">Accepted</Badge>;
      case "interview":
        return <Badge className="bg-blue-600">Interview</Badge>;
      case "rejected":
        return <Badge className="bg-red-600">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-600">Applied</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "interview":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/candidate/dashboard/${candidateId}`)}
          className="mb-6"
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Your Applications</CardTitle>
            <CardDescription>Track the status of all your job applications</CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No applications yet</p>
                <p className="text-muted-foreground mb-6">
                  Start applying to jobs to track your applications here
                </p>
                <Button onClick={() => setLocation(`/candidate/jobs/${candidateId}`)} data-testid="button-browse-jobs">
                  Browse Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`card-application-${app.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{app.jobTitle}</h3>
                        {getStatusBadge(app.status)}
                      </div>

                      <p className="text-muted-foreground mb-3">{app.companyName}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {app.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied {formatDate(app.appliedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <div>{getStatusIcon(app.status)}</div>
                      {app.status === "interview" && (
                        <Button variant="outline" size="sm" data-testid={`button-view-interview-${app.id}`}>
                          Schedule
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {applications.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{applications.length}</div>
                <p className="text-sm text-muted-foreground">Total Applications</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {applications.filter((a) => a.status === "accepted").length}
                </div>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {applications.filter((a) => a.status === "interview").length}
                </div>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {applications.filter((a) => a.status === "applied").length}
                </div>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
