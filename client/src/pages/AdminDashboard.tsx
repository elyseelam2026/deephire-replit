import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Settings, Activity, Shield, TrendingUp, Database } from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    { label: "Total Users", value: "24", icon: Users, color: "text-blue-600" },
    { label: "Active Portals", value: "4", icon: Shield, color: "text-green-600" },
    { label: "System Health", value: "100%", icon: TrendingUp, color: "text-purple-600" },
    { label: "Database Size", value: "2.4 GB", icon: Database, color: "text-orange-600" },
  ];

  const adminSections = [
    {
      title: "User Management",
      description: "Manage user accounts, roles, and permissions across all portals",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "System Settings",
      description: "Configure system-wide settings, integrations, and security policies",
      href: "/admin/system",
      icon: Settings,
    },
    {
      title: "Activity Logs",
      description: "View audit logs and system activity across all portals",
      href: "#",
      icon: Activity,
      disabled: true,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-2">Pure system administration</p>
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

      {/* Admin Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {adminSections.map((section) => (
          <Card key={section.title} className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="h-5 w-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{section.description}</p>
              {section.disabled ? (
                <Button disabled className="w-full">
                  Coming Soon
                </Button>
              ) : (
                <Button className="w-full" asChild data-testid={`button-admin-${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Link href={section.href}>Access</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Researchers Portal</p>
              <p className="text-2xl font-bold">Active</p>
              <p className="text-xs text-green-600 mt-1">✓ All systems operational</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Uploads (24h)</p>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground mt-1">589 total records</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Backup</p>
              <p className="text-2xl font-bold">2h ago</p>
              <p className="text-xs text-green-600 mt-1">✓ Successful</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
