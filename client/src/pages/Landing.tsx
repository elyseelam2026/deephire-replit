import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Search, User, Settings, ArrowRight, Zap, Users, Target } from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  const portals = [
    {
      id: "corporate",
      title: "Corporate Client",
      description: "Companies looking to hire top talent for their teams",
      icon: Building2,
      features: ["Post job openings", "Review candidate matches", "Track hiring pipeline", "Manage interviews"],
      buttonText: "Access Corporate Portal",
      route: "/client",
      color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      id: "recruitment",
      title: "Recruitment Agency",
      description: "Executive search firms and recruitment professionals",
      icon: Search,
      features: ["AI-powered candidate matching", "Manage multiple clients", "Outreach campaigns", "Conversation tracking"],
      buttonText: "Access Agency Portal",
      route: "/recruiting",
      color: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
      iconColor: "text-green-600 dark:text-green-400"
    },
    {
      id: "candidate",
      title: "Candidates",
      description: "Job seekers and professionals exploring opportunities",
      icon: User,
      features: ["Search job opportunities", "Track applications", "Update your profile", "Connect with recruiters"],
      buttonText: "Access Candidate Portal",
      route: "/candidate-portal",
      color: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
      iconColor: "text-purple-600 dark:text-purple-400",
      comingSoon: true
    },
    {
      id: "admin",
      title: "Admin Portal",
      description: "Platform administrators and data management",
      icon: Settings,
      features: ["Bulk upload candidates", "Import company data", "System configuration", "Data analytics"],
      buttonText: "Access Admin Portal",
      route: "/admin",
      color: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
      iconColor: "text-orange-600 dark:text-orange-400"
    }
  ];

  const handlePortalAccess = (route: string, comingSoon?: boolean) => {
    if (comingSoon) {
      // TODO: Add coming soon notification
      return;
    }
    setLocation(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              DeepHire
            </h1>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            AI-Powered Talent Acquisition Platform
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Revolutionizing recruitment with intelligent candidate matching, automated outreach, 
            and streamlined hiring workflows for modern organizations.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="text-center">
            <div className="p-4 bg-primary/10 rounded-lg inline-block mb-3">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">1000+</h3>
            <p className="text-muted-foreground">Qualified Candidates</p>
          </div>
          <div className="text-center">
            <div className="p-4 bg-primary/10 rounded-lg inline-block mb-3">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">250+</h3>
            <p className="text-muted-foreground">Partner Companies</p>
          </div>
          <div className="text-center">
            <div className="p-4 bg-primary/10 rounded-lg inline-block mb-3">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">95%</h3>
            <p className="text-muted-foreground">Match Accuracy</p>
          </div>
        </div>

        {/* Portal Selection */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-foreground mb-2">Choose Your Portal</h3>
            <p className="text-muted-foreground">
              Select the portal that matches your role to access the right tools and features.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {portals.map((portal) => {
              const IconComponent = portal.icon;
              return (
                <Card 
                  key={portal.id} 
                  className={`relative hover-elevate transition-all duration-300 ${portal.color}`}
                  data-testid={`portal-card-${portal.id}`}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 bg-background rounded-xl shadow-sm">
                        <IconComponent className={`h-8 w-8 ${portal.iconColor}`} />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-foreground">
                      {portal.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {portal.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2 mb-6">
                      {portal.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      onClick={() => handlePortalAccess(portal.route, portal.comingSoon)}
                      disabled={portal.comingSoon}
                      data-testid={`button-${portal.id}-portal`}
                    >
                      {portal.comingSoon ? (
                        "Coming Soon"
                      ) : (
                        <>
                          {portal.buttonText}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                    {portal.comingSoon && (
                      <div className="absolute top-4 right-4">
                        <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full">
                          Soon
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-border">
          <p className="text-muted-foreground text-sm">
            © 2025 DeepHire. Powered by AI technology for intelligent talent acquisition.
          </p>
        </div>
      </div>
    </div>
  );
}