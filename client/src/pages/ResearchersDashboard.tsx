import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Users, Building2, TrendingUp } from "lucide-react";

export default function ResearchersDashboard() {
  const metrics = [
    { label: "Total Candidates", value: "1,243", icon: Users, color: "text-blue-600" },
    { label: "Total Companies", value: "89", icon: Building2, color: "text-green-600" },
    { label: "Success Rate", value: "98.5%", icon: TrendingUp, color: "text-purple-600" },
    { label: "Research Queries", value: "342", icon: BarChart3, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research Management Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of sourcing and research activities</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{metric.label}</span>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>AI Research Queries Processed</span>
              <span className="font-semibold">342</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>Candidates Added This Month</span>
              <span className="font-semibold">215</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span>Data Quality Score</span>
              <span className="font-semibold">98.5%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
