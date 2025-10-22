import { Building2, Users, Briefcase, MessageSquare, Mail, BarChart3, Settings, Clock, Trash2 } from "lucide-react";
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
const adminItems = [
  { title: "Dashboard", url: "/recruiting", icon: BarChart3 },
  { title: "Companies", url: "/recruiting/companies", icon: Building2 },
  { title: "Jobs", url: "/recruiting/jobs", icon: Briefcase },
  { title: "Candidates", url: "/recruiting/candidates", icon: Users },
  { title: "Recycling Bin", url: "/recruiting/recycling-bin", icon: Trash2 },
  { title: "Staging", url: "/recruiting/staging", icon: Clock },
  { title: "Conversations", url: "/recruiting/conversations", icon: MessageSquare },
  { title: "Outreach", url: "/recruiting/outreach", icon: Mail },
  { title: "Settings", url: "/recruiting/settings", icon: Settings },
];

const clientItems = [
  { title: "Dashboard", url: "/client", icon: BarChart3 },
  { title: "Post Job", url: "/client/post-job", icon: Briefcase },
  { title: "My Jobs", url: "/client/jobs", icon: Briefcase },
  { title: "Candidates", url: "/client/candidates", icon: Users },
  { title: "Messages", url: "/client/messages", icon: MessageSquare },
];

const candidateItems = [
  { title: "Dashboard", url: "/candidate", icon: BarChart3 },
  { title: "Profile", url: "/candidate/profile", icon: Users },
  { title: "Job Matches", url: "/candidate/matches", icon: Briefcase },
  { title: "Messages", url: "/candidate/messages", icon: MessageSquare },
];

export function AppSidebar() {
  const [location] = useLocation();
  
  // todo: remove mock functionality - determine user role from auth context
  const userRole = "admin"; // mock role for prototype
  
  const items = userRole === "admin" ? adminItems : 
                userRole === "client" ? clientItems : 
                candidateItems;

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