import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Building2, Users, FileText, Zap } from "lucide-react";

export default function LearningIntelligence() {
  const { data: intelligence, isLoading, error } = useQuery({
    queryKey: ["/api/learning/intelligence"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading learning intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Error Loading Learning Data</CardTitle>
            <CardDescription>Failed to fetch learning intelligence</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const data = intelligence as any;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">DeepHire Learning Intelligence</h1>
        </div>
        <p className="text-muted-foreground">
          Real-time tracking of AI patterns learned from sourcing, placements, and recruitment data
        </p>
      </div>

      {/* Grid: 5 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Position Keywords */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Position Keywords
            </CardTitle>
            <CardDescription>Top {data?.positions?.length || 0} positions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.positions?.slice(0, 5).map((pos: any, i: number) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium">{pos.position}</div>
                  <Badge variant="secondary" className="text-xs">{pos.searchCount}x</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pos.skills?.slice(0, 2).map((skill: string, j: number) => (
                    <Badge key={j} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Company Sources */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Talent Sources
            </CardTitle>
            <CardDescription>Top {data?.companies?.length || 0} companies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.companies?.slice(0, 5).map((comp: any, i: number) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium truncate">{comp.companyName}</div>
                  <Badge variant="secondary" className="text-xs">{comp.searchCount}x</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {comp.titles?.slice(0, 2).map((title: string, j: number) => (
                    <Badge key={j} variant="outline" className="text-xs">{title}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Industry Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Industry Patterns
            </CardTitle>
            <CardDescription>{data?.industries?.length || 0} industries mapped</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.industries?.slice(0, 5).map((ind: any, i: number) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium">{ind.industry}</div>
                  <Badge variant="secondary" className="text-xs">{ind.searchCount}x</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {ind.roles?.slice(0, 2).map((role: string, j: number) => (
                    <Badge key={j} variant="outline" className="text-xs">{role}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Candidate Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Candidate Patterns
            </CardTitle>
            <CardDescription>Success trajectories learned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.candidates?.slice(0, 5).map((cand: any, i: number) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="font-medium truncate">{cand.pattern}</div>
                  <Badge 
                    variant={cand.successRate >= 70 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {cand.successRate}%
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Observed {cand.frequency} times
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Job Description Patterns */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              JD Patterns
            </CardTitle>
            <CardDescription>Effective descriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.jobDescriptions?.slice(0, 5).map((jd: any, i: number) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="text-muted-foreground">Pattern {i + 1}</div>
                  <Badge 
                    variant={jd.successRate >= 70 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {jd.successRate}%
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Used {jd.timesUsed} times
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Searches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.positions?.reduce((sum: number, p: any) => sum + (p.searchCount || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Companies Learned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.companies?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Industries Mapped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.industries?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Successful Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.candidates?.filter((c: any) => c.successRate >= 70).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">How This Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>🧠 <strong>DeepHire learns from every search and placement:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Position Keywords:</strong> Auto-enriched for each role searched</li>
            <li><strong>Talent Sources:</strong> Identifies top companies to source from</li>
            <li><strong>Industry Patterns:</strong> Maps typical skills & roles per industry</li>
            <li><strong>Candidate Success:</strong> Tracks which backgrounds lead to placements</li>
            <li><strong>Job Descriptions:</strong> Learns which JD patterns work best</li>
          </ul>
          <p className="pt-2">The more you search and hire, the smarter your AI becomes. 📈</p>
        </CardContent>
      </Card>
    </div>
  );
}
