import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Building2, Clock, Upload, Database, TrendingUp } from "lucide-react";

export default function ResearchersDashboard() {
  const stats = [
    { label: "Candidates in Pool", value: "1,243", icon: Users, color: "text-blue-600" },
    { label: "Companies", value: "89", icon: Building2, color: "text-green-600" },
    { label: "Staging Items", value: "34", icon: Clock, color: "text-purple-600" },
    { label: "Recent Uploads", value: "3", icon: Upload, color: "text-orange-600" },
  ];

  const researcherTools = [
    {
      title: "Companies",
      description: "Manage and research company profiles",
      href: "/researchers/companies",
      icon: Building2,
    },
    {
      title: "Candidates",
      description: "View and manage candidate profiles in your pool",
      href: "/researchers/candidates",
      icon: Users,
    },
    {
      title: "Staging Area",
      description: "Review and process candidates before adding to pool",
      href: "/researchers/staging",
      icon: Clock,
    },
    {
      title: "Bulk Upload",
      description: "Upload candidates, companies, and team member data",
      href: "/researchers/bulk-upload",
      icon: Upload,
    },
    {
      title: "Database Management",
      description: "Data quality audits and duplicate detection",
      href: "/researchers/database-management",
      icon: Database,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Researchers</h1>
        <p className="text-muted-foreground mt-2">All sourcing work with AI</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{stat.label}</span>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Researcher Tools */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Sourcing Tools</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {researcherTools.map((tool) => (
            <Card key={tool.title} className="hover-elevate">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <tool.icon className="h-5 w-5" />
                  {tool.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{tool.description}</p>
                <Button className="w-full" asChild data-testid={`button-researcher-${tool.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Link href={tool.href}>Access</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Last Upload</p>
              <p className="text-lg font-semibold">2 hours ago</p>
              <p className="text-xs text-muted-foreground mt-1">245 candidates processed</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Quality</p>
              <p className="text-lg font-semibold">98.5%</p>
              <p className="text-xs text-green-600 mt-1">✓ Excellent</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Staging Queue</p>
              <p className="text-lg font-semibold">34 items</p>
              <p className="text-xs text-muted-foreground mt-1">Ready for review</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
