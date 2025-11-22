import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import LandingHome from "@/pages/LandingHome";
import Auth from "@/pages/Auth";
import CandidateLogin from "@/pages/CandidateLogin";
import CompanyRegister from "@/pages/CompanyRegister";
import CompanyLogin from "@/pages/CompanyLogin";
import CompanyPortal from "@/pages/CompanyPortal";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import ClientPortal from "@/pages/ClientPortal";
import CandidatePortal from "@/pages/CandidatePortal";
import CandidateDashboard from "@/pages/CandidateDashboard";
import CandidateProfile from "@/pages/CandidateProfile";
import CandidateJobsSearch from "@/pages/CandidateJobsSearch";
import CandidateApplications from "@/pages/CandidateApplications";
import PasswordReset from "@/pages/PasswordReset";
import CompanyForgotPassword from "@/pages/CompanyForgotPassword";
import CompanyPasswordReset from "@/pages/CompanyPasswordReset";
import Companies from "@/pages/Companies";
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Candidates from "@/pages/Candidates";
import CandidateDetail from "@/pages/CandidateDetail";
import CompanyDetail from "@/pages/CompanyDetail";
import CandidateSourcing from "@/pages/CandidateSourcing";
import RecyclingBin from "@/pages/RecyclingBin";
import Staging from "@/pages/Staging";
import Conversations from "@/pages/Conversations";
import ConversationDetail from "@/pages/ConversationDetail";
import Outreach from "@/pages/Outreach";
import Settings from "@/pages/Settings";
import DatabaseManagement from "@/pages/DatabaseManagement";
import AdminBulkUpload from "@/pages/AdminBulkUpload";
import AdminUserManagement from "@/pages/AdminUserManagement";
import AdminSystemSettings from "@/pages/AdminSystemSettings";
import VerifyEmail from "@/pages/VerifyEmail";
import CompanyVerifyEmail from "@/pages/CompanyVerifyEmail";
import NotFound from "@/pages/not-found";
import WarRoom from "@/pages/WarRoom";
import SalaryBenchmark from "@/pages/SalaryBenchmark";
import PredictiveScore from "@/pages/PredictiveScore";

function AppRouter() {
  return (
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
      <Route path="/researchers" component={() => <ResearchersApp><Dashboard /></ResearchersApp>} />
      <Route path="/researchers/companies" component={() => <ResearchersApp><Companies /></ResearchersApp>} />
      <Route path="/researchers/companies/:id" component={() => <ResearchersApp><CompanyDetail /></ResearchersApp>} />
      <Route path="/researchers/candidates" component={() => <ResearchersApp><Candidates /></ResearchersApp>} />
      <Route path="/researchers/candidates/:id" component={() => <ResearchersApp><CandidateDetail /></ResearchersApp>} />
      <Route path="/researchers/staging" component={() => <ResearchersApp><Staging /></ResearchersApp>} />
      <Route path="/researchers/bulk-upload" component={() => <ResearchersApp><AdminBulkUpload /></ResearchersApp>} />
      <Route path="/researchers/database-management" component={() => <ResearchersApp><DatabaseManagement /></ResearchersApp>} />
      
      {/* Admin Portal Routes */}
      <Route path="/admin" component={() => <AdminApp><Admin /></AdminApp>} />
      <Route path="/admin/users" component={() => <AdminApp><AdminUserManagement /></AdminApp>} />
      <Route path="/admin/system" component={() => <AdminApp><AdminSystemSettings /></AdminApp>} />
      
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