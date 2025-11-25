import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { TrendingUp, Users, Briefcase, CheckCircle, Clock, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  // Sample metrics - these will come from API in production
  const metrics = {
    totalJobs: 24,
    activePostings: 8,
    totalCandidates: 1243,
    activeCandidates: 487,
    hires: 42,
    avgTimeToHire: "18 days",
  };

  const recentJobs = [
    { id: 1, title: "Senior Software Engineer", team: "Engineering", status: "Active", applications: 23 },
    { id: 2, title: "Product Manager", team: "Product", status: "Active", applications: 15 },
    { id: 3, title: "Data Scientist", team: "Data", status: "Closed", applications: 8 },
  ];

  const recentActivity = [
    { id: 1, action: "New application", candidate: "Alex Johnson", job: "Senior Software Engineer", time: "2 hours ago" },
    { id: 2, action: "Candidate advanced", candidate: "Sarah Chen", job: "Product Manager", time: "4 hours ago" },
    { id: 3, action: "Interview scheduled", candidate: "Michael Brown", job: "Data Scientist", time: "1 day ago" },
    { id: 4, action: "Job closed", job: "QA Engineer", count: "34 applications", time: "2 days ago" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Recruiting Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your recruitment pipeline and activity</p>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total Jobs</span>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activePostings} currently active</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Candidates</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCandidates}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activeCandidates} in active pipeline</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Hires</span>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.hires}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg time to hire: {metrics.avgTimeToHire}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Active Job Postings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 border rounded-lg hover-elevate cursor-pointer"
                  data-testid={`card-job-${job.id}`}
                  onClick={() => setLocation(`/recruiting/jobs/${job.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setLocation(`/recruiting/jobs/${job.id}`);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.team}</p>
                    </div>
                    <Badge variant={job.status === "Active" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{job.applications} applications</p>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild data-testid="button-view-all-jobs">
              <Link href="/recruiting/jobs">View All Jobs</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0" data-testid={`item-activity-${activity.id}`}>
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.action}</span>
                      {activity.candidate && (
                        <>
                          {" for "}
                          <span className="font-medium">{activity.candidate}</span>
                          {" on "}
                          <span className="text-muted-foreground">{activity.job}</span>
                        </>
                      )}
                      {activity.count && (
                        <>
                          {" - "}
                          <span className="text-muted-foreground">{activity.count}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-muted/50 border-muted">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Post a New Job</h3>
              <p className="text-sm text-muted-foreground">Start recruiting for an open position</p>
            </div>
            <Button asChild data-testid="button-post-job">
              <Link href="/recruiting/jobs">Post Job</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-muted/50 border-muted">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Source Candidates</h3>
              <p className="text-sm text-muted-foreground">Find and add candidates to your pipeline</p>
            </div>
            <Button asChild data-testid="button-source-candidates">
              <Link href="/recruiting/candidates">Source</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
