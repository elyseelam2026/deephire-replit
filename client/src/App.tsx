import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

// Static imports - loaded immediately
import LandingHome from "@/pages/LandingHome";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/not-found";

// Lazy imports - code split (loaded on demand)
const CandidateLogin = lazy(() => import("@/pages/CandidateLogin"));
const CompanyRegister = lazy(() => import("@/pages/CompanyRegister"));
const CompanyLogin = lazy(() => import("@/pages/CompanyLogin"));
const CompanyPortal = lazy(() => import("@/pages/CompanyPortal"));
const Landing = lazy(() => import("@/pages/Landing"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Admin = lazy(() => import("@/pages/Admin"));
const ClientPortal = lazy(() => import("@/pages/ClientPortal"));
const CandidatePortal = lazy(() => import("@/pages/CandidatePortal"));
const CandidateDashboard = lazy(() => import("@/pages/CandidateDashboard"));
const CandidateProfile = lazy(() => import("@/pages/CandidateProfile"));
const CandidateJobsSearch = lazy(() => import("@/pages/CandidateJobsSearch"));
const CandidateApplications = lazy(() => import("@/pages/CandidateApplications"));
const PasswordReset = lazy(() => import("@/pages/PasswordReset"));
const CompanyForgotPassword = lazy(() => import("@/pages/CompanyForgotPassword"));
const CompanyPasswordReset = lazy(() => import("@/pages/CompanyPasswordReset"));
const Companies = lazy(() => import("@/pages/Companies"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobDetail = lazy(() => import("@/pages/JobDetail"));
const Candidates = lazy(() => import("@/pages/Candidates"));
const CandidateDetail = lazy(() => import("@/pages/CandidateDetail"));
const CompanyDetail = lazy(() => import("@/pages/CompanyDetail"));
const CandidateSourcing = lazy(() => import("@/pages/CandidateSourcing"));
const RecyclingBin = lazy(() => import("@/pages/RecyclingBin"));
const Staging = lazy(() => import("@/pages/Staging"));
const Conversations = lazy(() => import("@/pages/Conversations"));
const ConversationDetail = lazy(() => import("@/pages/ConversationDetail"));
const Outreach = lazy(() => import("@/pages/Outreach"));
const Settings = lazy(() => import("@/pages/Settings"));
const DatabaseManagement = lazy(() => import("@/pages/DatabaseManagement"));
const AdminBulkUpload = lazy(() => import("@/pages/AdminBulkUpload"));
const AdminUserManagement = lazy(() => import("@/pages/AdminUserManagement"));
const AdminSystemSettings = lazy(() => import("@/pages/AdminSystemSettings"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const ResearchersDashboard = lazy(() => import("@/pages/ResearchersDashboard"));
const ResearchManagement = lazy(() => import("@/pages/ResearchManagement"));
const DataIngestion = lazy(() => import("@/pages/DataIngestion"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const CompanyVerifyEmail = lazy(() => import("@/pages/CompanyVerifyEmail"));
const WarRoom = lazy(() => import("@/pages/WarRoom"));
const SalaryBenchmark = lazy(() => import("@/pages/SalaryBenchmark"));
const PredictiveScore = lazy(() => import("@/pages/PredictiveScore"));
const Monitoring = lazy(() => import("@/pages/Monitoring"));
const TenantAdminDashboard = lazy(() => import("@/pages/TenantAdminDashboard"));

// Loading component for suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading page...</p>
    </div>
  </div>
);

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
      {/* Public Pages */}
      <Route path="/" component={LandingHome} />
      <Route path="/auth" component={Auth} />
      
      {/* Candidate Portal Routes */}
      <Route path="/candidate/register" component={CandidatePortal} />
      <Route path="/candidate/verify-email/:candidateId" component={VerifyEmail} />
      <Route path="/candidate/dashboard/:candidateId" component={CandidateDashboard} />
      <Route path="/candidate/profile/:candidateId" component={CandidateProfile} />
      <Route path="/candidate/jobs/:candidateId" component={CandidateJobsSearch} />
      <Route path="/candidate/applications/:candidateId" component={CandidateApplications} />
      <Route path="/candidate/login" component={CandidateLogin} />
      <Route path="/candidate/reset-password" component={PasswordReset} />

      {/* Company Portal Routes */}
      <Route path="/company/register" component={CompanyRegister} />
      <Route path="/company/verify-email" component={CompanyVerifyEmail} />
      <Route path="/company/login" component={CompanyLogin} />
      <Route path="/company/forgot-password" component={CompanyForgotPassword} />
      <Route path="/company/reset-password" component={CompanyPasswordReset} />
      <Route path="/company/portal" component={CompanyPortal} />
      
      {/* Client Portal Routes */}
      <Route path="/client" component={() => <ClientApp><ClientPortal /></ClientApp>} />
      <Route path="/client/post-job" component={() => <ClientApp><ClientPortal /></ClientApp>} />
      <Route path="/client/source-candidates" component={() => <ClientApp><CandidateSourcing /></ClientApp>} />
      <Route path="/client/jobs/:id" component={() => <ClientApp><JobDetail /></ClientApp>} />
      <Route path="/client/jobs" component={() => <ClientApp><Jobs /></ClientApp>} />
      <Route path="/client/candidates/:id" component={() => <ClientApp><CandidateDetail /></ClientApp>} />
      <Route path="/client/candidates" component={() => <ClientApp><Candidates /></ClientApp>} />
      <Route path="/client/companies/:id" component={() => <ClientApp><CompanyDetail /></ClientApp>} />
      <Route path="/client/companies" component={() => <ClientApp><Companies /></ClientApp>} />
      <Route path="/client/recycling-bin" component={() => <ClientApp><RecyclingBin /></ClientApp>} />
      <Route path="/client/conversations/:id" component={() => <ClientApp><ConversationDetail /></ClientApp>} />
      <Route path="/client/messages" component={() => <ClientApp><Conversations /></ClientApp>} />
      <Route path="/client/settings" component={() => <ClientApp><Settings /></ClientApp>} />
      
      {/* Recruiting Portal Routes */}
      <Route path="/recruiting" component={() => <RecruitingApp><Dashboard /></RecruitingApp>} />
      <Route path="/recruiting/companies/:id" component={() => <RecruitingApp><CompanyDetail /></RecruitingApp>} />
      <Route path="/recruiting/companies" component={() => <RecruitingApp><Companies /></RecruitingApp>} />
      <Route path="/recruiting/jobs/:id" component={() => <RecruitingApp><JobDetail /></RecruitingApp>} />
      <Route path="/recruiting/jobs" component={() => <RecruitingApp><Jobs /></RecruitingApp>} />
      <Route path="/recruiting/candidates/:id" component={() => <RecruitingApp><CandidateDetail /></RecruitingApp>} />
      <Route path="/recruiting/candidates" component={() => <RecruitingApp><Candidates /></RecruitingApp>} />
      <Route path="/recruiting/recycling-bin" component={() => <RecruitingApp><RecyclingBin /></RecruitingApp>} />
      <Route path="/recruiting/staging" component={() => <RecruitingApp><Staging /></RecruitingApp>} />
      <Route path="/recruiting/conversations/:id" component={() => <RecruitingApp><ConversationDetail /></RecruitingApp>} />
      <Route path="/recruiting/conversations" component={() => <RecruitingApp><Conversations /></RecruitingApp>} />
      <Route path="/recruiting/outreach" component={() => <RecruitingApp><Outreach /></RecruitingApp>} />
      <Route path="/recruiting/settings" component={() => <RecruitingApp><Settings /></RecruitingApp>} />
      
      {/* Researchers Portal Routes */}
      <Route path="/researchers" component={() => <ResearchersApp><ResearchersDashboard /></ResearchersApp>} />
      <Route path="/researchers/companies" component={() => <ResearchersApp><Companies /></ResearchersApp>} />
      <Route path="/researchers/companies/:id" component={() => <ResearchersApp><CompanyDetail /></ResearchersApp>} />
      <Route path="/researchers/candidates" component={() => <ResearchersApp><Candidates /></ResearchersApp>} />
      <Route path="/researchers/candidates/:id" component={() => <ResearchersApp><CandidateDetail /></ResearchersApp>} />
      <Route path="/researchers/research-management" component={() => <ResearchersApp><ResearchManagement /></ResearchersApp>} />
      <Route path="/researchers/quality-management" component={() => <ResearchersApp><DatabaseManagement /></ResearchersApp>} />
      <Route path="/researchers/data-ingestion" component={() => <ResearchersApp><DataIngestion /></ResearchersApp>} />
      
      {/* Admin Portal Routes */}
      <Route path="/admin" component={() => <AdminApp><AdminDashboard /></AdminApp>} />
      <Route path="/admin/users" component={() => <AdminApp><AdminUserManagement /></AdminApp>} />
      <Route path="/admin/system" component={() => <AdminApp><AdminSystemSettings /></AdminApp>} />
      <Route path="/admin/monitoring" component={() => <AdminApp><Monitoring /></AdminApp>} />
      <Route path="/admin/tenant/:tenantId" component={() => <AdminApp><TenantAdminDashboard /></AdminApp>} />
      
      {/* Standalone Routes */}
      <Route path="/client-portal" component={ClientPortal} />
      <Route path="/candidates" component={CandidatesOnly} />
      
      {/* Enterprise Features */}
      <Route path="/war-room" component={() => <ClientApp><WarRoom /></ClientApp>} />
      <Route path="/salary-benchmark" component={() => <ClientApp><SalaryBenchmark /></ClientApp>} />
      <Route path="/predictive-score" component={() => <ClientApp><PredictiveScore /></ClientApp>} />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function RecruitingApp({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar portal="agency" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')} data-testid="button-back-home">
                ← Home
              </Button>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
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

function ClientApp({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar portal="client" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')} data-testid="button-back-home">
                ← Home
              </Button>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function ResearchersApp({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar portal="researcher" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')} data-testid="button-back-home">
                ← Home
              </Button>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminApp({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar portal="admin" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')} data-testid="button-back-home">
                ← Home
              </Button>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
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