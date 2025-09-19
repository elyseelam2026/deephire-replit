import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/StatsCard";
import { JobCard } from "@/components/JobCard";
import { CandidateCard } from "@/components/CandidateCard";
import { Button } from "@/components/ui/button";
import { 
  Users, Briefcase, Target, TrendingUp, Plus, 
  Clock, CheckCircle, AlertCircle 
} from "lucide-react";

export default function Dashboard() {
  // todo: remove mock functionality - replace with real data from API
  const [recentJobs] = useState([
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "TechCorp Inc",
      location: "San Francisco, CA",
      department: "Engineering",
      urgency: "high" as const,
      matchCount: 15,
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      title: "Product Manager",
      company: "StartupXYZ",
      location: "New York, NY",
      department: "Product",
      urgency: "medium" as const,
      matchCount: 8,
      createdAt: "2024-01-14",
    },
  ]);

  const [topCandidates] = useState([
    {
      id: 1,
      firstName: "Sarah",
      lastName: "Chen",
      currentTitle: "Senior Software Engineer",
      currentCompany: "Google",
      location: "Mountain View, CA",
      yearsExperience: 6,
      skills: ["React", "TypeScript", "Node.js", "Python", "AWS", "Docker"],
      matchScore: 92,
      salaryExpectations: 180000,
      isAvailable: true,
    },
    {
      id: 2,
      firstName: "Michael",
      lastName: "Rodriguez",
      currentTitle: "Product Designer",
      currentCompany: "Apple",
      location: "Cupertino, CA",
      yearsExperience: 4,
      skills: ["Figma", "Sketch", "Prototyping", "User Research", "Design Systems"],
      matchScore: 87,
      salaryExpectations: 150000,
      isAvailable: true,
    },
  ]);

  const handleViewCandidates = (jobId: number) => {
    console.log(`View candidates for job ${jobId}`);
  };

  const handleEditJob = (jobId: number) => {
    console.log(`Edit job ${jobId}`);
  };

  const handleViewProfile = (candidateId: number) => {
    console.log(`View profile for candidate ${candidateId}`);
  };

  const handleContactCandidate = (candidateId: number) => {
    console.log(`Contact candidate ${candidateId}`);
  };

  return (
    <div className="space-y-6 p-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your recruiting overview.
          </p>
        </div>
        <Button data-testid="button-post-job">
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Candidates"
          value={1248}
          change={{ value: 12.5, label: "from last month" }}
          icon={Users}
          description="Active in database"
        />
        <StatsCard
          title="Open Positions"
          value={23}
          change={{ value: -8.2, label: "from last week" }}
          icon={Briefcase}
          description="Currently hiring"
        />
        <StatsCard
          title="Match Rate"
          value="78%"
          change={{ value: 4.1, label: "improvement" }}
          icon={Target}
          description="AI matching accuracy"
        />
        <StatsCard
          title="Placements"
          value={156}
          change={{ value: 15.3, label: "this quarter" }}
          icon={TrendingUp}
          description="Successful hires"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover-elevate cursor-pointer" data-testid="card-pending-reviews">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Candidates awaiting review
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" data-testid="card-interviews-today">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interviews Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer" data-testid="card-urgent-positions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Urgent Positions
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Jobs</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <JobCard
                key={job.id}
                {...job}
                onViewCandidates={() => handleViewCandidates(job.id)}
                onEdit={() => handleEditJob(job.id)}
              />
            ))}
          </div>
        </div>

        {/* Top Candidates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Top Candidates</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {topCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                {...candidate}
                onViewProfile={() => handleViewProfile(candidate.id)}
                onContact={() => handleContactCandidate(candidate.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}