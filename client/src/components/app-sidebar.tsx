import { Building2, Users, Briefcase, MessageSquare, Mail, BarChart3, Settings, Clock, Trash2, Upload, Shield, Database } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

// Navigation items for different user roles

// Client Portal - For PE firms hiring through agency
// Access candidates through their jobs only (job-linked candidates)
const clientItems = [
  { title: "Dashboard", url: "/client", icon: BarChart3 },
  { title: "Jobs", url: "/client/jobs", icon: Briefcase },
  { title: "Messages", url: "/client/messages", icon: MessageSquare },
  { title: "Settings", url: "/client/settings", icon: Settings },
];

// Agency Portal - For recruiting team
// Access candidates through their jobs only (job-linked candidates)
const agencyItems = [
  { title: "Dashboard", url: "/recruiting", icon: BarChart3 },
  { title: "Jobs", url: "/recruiting/jobs", icon: Briefcase },
  { title: "Messages", url: "/recruiting/conversations", icon: MessageSquare },
  { title: "Settings", url: "/recruiting/settings", icon: Settings },
];

// Candidate Portal - For job seekers
const candidateItems = [
  { title: "Dashboard", url: "/candidate", icon: BarChart3 },
  { title: "Profile", url: "/candidate/profile", icon: Users },
  { title: "Job Matches", url: "/candidate/matches", icon: Briefcase },
  { title: "Messages", url: "/candidate/messages", icon: MessageSquare },
];

// Admin Portal - For system administrators (manages core database)
const adminItems = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Candidates", url: "/admin/candidates", icon: Users },
  { title: "Staging", url: "/admin/staging", icon: Clock },
  { title: "Bulk Upload", url: "/admin/bulk-upload", icon: Upload },
  { title: "Database Management", url: "/admin/database-management", icon: Database },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "System Settings", url: "/admin/system", icon: Shield },
];

type PortalType = 'agency' | 'client' | 'candidate' | 'admin';

interface AppSidebarProps {
  portal?: PortalType;
}

export function AppSidebar({ portal }: AppSidebarProps) {
  const [location] = useLocation();
  
  // Use explicit portal prop, or fall back to URL detection
  const userRole = portal || (
    location.startsWith('/admin') ? 'admin' :
    location.startsWith('/client') ? 'client' :
    location.startsWith('/candidate') ? 'candidate' :
    'agency'
  );
  
  const items = userRole === 'admin' ? adminItems : 
                userRole === 'client' ? clientItems : 
                userRole === 'candidate' ? candidateItems :
                agencyItems;

  return (
    <Sidebar data-testid="sidebar-main">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-primary font-semibold text-lg">
            DeepHire
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}