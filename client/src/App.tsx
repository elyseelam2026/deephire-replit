import { Switch, Route, useLocation, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import ClientPortal from "@/pages/ClientPortal";
import CandidatePortal from "@/pages/CandidatePortal";
import Companies from "@/pages/Companies";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Candidates from "@/pages/Candidates";
import CandidateDetail from "@/pages/CandidateDetail";
import CompanyDetail from "@/pages/CompanyDetail";
import RecyclingBin from "@/pages/RecyclingBin";
import Staging from "@/pages/Staging";
import Conversations from "@/pages/Conversations";
import Outreach from "@/pages/Outreach";
import Settings from "@/pages/Settings";
import DataQualityDashboard from "@/pages/DataQualityDashboard";
import NotFound from "@/pages/not-found";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/recruiting/:rest*" component={RecruitingApp} />
      <Route path="/recruiting" component={RecruitingApp} />
      <Route path="/client/:rest*" component={ClientApp} />
      <Route path="/client" component={ClientApp} />
      <Route path="/admin/:rest*" component={AdminApp} />
      <Route path="/admin" component={AdminApp} />
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/candidate-portal" component={CandidatePortal} />
      <Route path="/candidates" component={CandidatesOnly} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RecruitingApp() {
  // Custom sidebar width for the recruiting application
  const style = {
    "--sidebar-width": "16rem",       // 256px for recruiting interface
    "--sidebar-width-icon": "3rem",   // default icon width
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router base="/recruiting">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/companies/:id" component={CompanyDetail} />
                <Route path="/companies" component={Companies} />
                <Route path="/jobs/:id" component={JobDetail} />
                <Route path="/jobs" component={Jobs} />
                <Route path="/candidates/:id" component={CandidateDetail} />
                <Route path="/candidates" component={Candidates} />
                <Route path="/recycling-bin" component={RecyclingBin} />
                <Route path="/staging" component={Staging} />
                <Route path="/conversations" component={Conversations} />
                <Route path="/outreach" component={Outreach} />
                <Route path="/settings" component={Settings} />
                <Route component={Dashboard} />
              </Switch>
            </Router>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function CandidatesOnly() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
            ← Back to Portal Selection
          </Button>
        </div>
        <ThemeToggle />
      </header>
      <main>
        <Candidates />
      </main>
    </div>
  );
}

function ClientApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router base="/client">
              <Switch>
                <Route path="/" component={ClientPortal} />
                <Route path="/post-job" component={ClientPortal} />
                <Route path="/jobs/:id" component={JobDetail} />
                <Route path="/jobs" component={Jobs} />
                <Route path="/candidates/:id" component={CandidateDetail} />
                <Route path="/candidates" component={Candidates} />
                <Route path="/companies/:id" component={CompanyDetail} />
                <Route path="/recycling-bin" component={RecyclingBin} />
                <Route path="/messages" component={Conversations} />
                <Route component={ClientPortal} />
              </Switch>
            </Router>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminApp() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Admin Portal</h1>
        </div>
        <ThemeToggle />
      </header>
      <main>
        <Admin />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppRouter />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}