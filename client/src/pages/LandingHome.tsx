import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Users, ArrowRight, CheckCircle } from "lucide-react";

export default function LandingHome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">DeepHire</div>
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/client")} data-testid="nav-client-portal">
              Clients
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/recruiting")} data-testid="nav-recruiting-portal">
              Recruiters
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} data-testid="nav-admin-portal">
              Admin
            </Button>
            <Button variant="outline" onClick={() => setLocation("/auth")} data-testid="nav-sign-in">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">The Future of Talent Acquisition</h1>
          <p className="text-2xl text-muted-foreground mb-8">
            AI-powered recruiting for Private Equity. Find perfect candidates in minutes, not months.
          </p>
          <Button size="lg" onClick={() => setLocation("/auth")} className="gap-2">
            Get Started <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Three-Sided Marketplace */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          {/* Candidates */}
          <Card className="hover-elevate">
            <CardContent className="pt-8">
              <Users className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">For Candidates</h3>
              <p className="text-muted-foreground mb-6">
                Let AI find your perfect next role. We search across top companies and match opportunities tailored to your skills.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>AI-powered job matching</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Access to exclusive roles</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Direct company connections</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/auth?role=candidate")}
                data-testid="button-candidate-signup"
              >
                Join as Candidate
              </Button>
            </CardContent>
          </Card>

          {/* Companies */}
          <Card className="hover-elevate">
            <CardContent className="pt-8">
              <Briefcase className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">For Companies</h3>
              <p className="text-muted-foreground mb-6">
                Access pre-vetted talent and use AI to discover the exact candidates you need. From self-serve to executive search.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Pre-vetted candidate pool</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>AI-assisted search</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Talent intelligence reports</span>
                </li>
              </ul>
              <Button 
                className="w-full" 
                onClick={() => setLocation("/auth?role=company")}
                data-testid="button-company-signup"
              >
                Sign Up Company
              </Button>
            </CardContent>
          </Card>

          {/* Recruiters */}
          <Card className="hover-elevate">
            <CardContent className="pt-8">
              <Users className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold mb-3">For Recruiters</h3>
              <p className="text-muted-foreground mb-6">
                Manage candidate pipelines, run AI-powered searches, and access the full recruiting platform with comprehensive tooling.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Full candidate management</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>AI-powered search engine</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span>Team collaboration tools</span>
                </li>
              </ul>
              <Button 
                className="w-full"
                onClick={() => setLocation("/recruiting")}
                data-testid="button-recruiter-access"
              >
                Access Recruiting Portal
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Value Prop */}
        <div className="mt-20 bg-white dark:bg-slate-800 rounded-lg p-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Why DeepHire?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10x</div>
              <p className="text-muted-foreground">Faster candidate discovery with AI</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">92%</div>
              <p className="text-muted-foreground">Quality match accuracy from data science</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">$0</div>
              <p className="text-muted-foreground">Cost for perfect-fit recommendations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20 py-8 px-6 text-center text-muted-foreground">
        <p>© 2025 DeepHire. Reimagining talent acquisition for Private Equity.</p>
      </footer>
    </div>
  );
}
