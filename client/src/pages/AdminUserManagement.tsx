import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Trash2, Edit2, LogOut, Shield, Activity, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
  department?: string;
  team?: string;
  status: string;
  lastLogin?: string;
  loginCount: number;
  permissions: string[];
}

const ROLE_DEFINITIONS = {
  admin: { label: "Administrator", desc: "Full system access, manage all features", color: "bg-red-100 text-red-800" },
  recruiter: { label: "Recruiter", desc: "Post jobs, source candidates, manage workflows", color: "bg-blue-100 text-blue-800" },
  hiring_manager: { label: "Hiring Manager", desc: "Review candidates, conduct interviews, make offers", color: "bg-purple-100 text-purple-800" },
  client_admin: { label: "Client Admin", desc: "Manage company account, team members, integrations", color: "bg-green-100 text-green-800" },
  viewer: { label: "Viewer", desc: "Read-only access to features", color: "bg-gray-100 text-gray-800" },
  candidate: { label: "Candidate", desc: "Candidate account", color: "bg-amber-100 text-amber-800" },
};

const PERMISSION_OPTIONS = [
  "view_candidates",
  "edit_candidates",
  "post_jobs",
  "manage_jobs",
  "view_analytics",
  "manage_users",
  "manage_integrations",
  "export_data",
  "view_reports",
  "manage_teams",
];

export default function AdminUserManagement() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "viewer",
    jobTitle: "",
    department: "",
    team: "",
    permissions: [] as string[],
  });
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "Admin User",
      email: "admin@deephire.com",
      role: "admin",
      jobTitle: "System Administrator",
      department: "Operations",
      team: "Core",
      status: "active",
      lastLogin: "2 minutes ago",
      loginCount: 487,
      permissions: ["view_candidates", "edit_candidates", "post_jobs", "manage_jobs", "view_analytics", "manage_users", "manage_integrations", "export_data"],
    },
    {
      id: 2,
      name: "Sarah Chen",
      email: "sarah@deephire.com",
      role: "recruiter",
      jobTitle: "Senior Recruiter",
      department: "Recruiting",
      team: "Enterprise",
      status: "active",
      lastLogin: "1 hour ago",
      loginCount: 234,
      permissions: ["view_candidates", "edit_candidates", "post_jobs", "manage_jobs", "export_data"],
    },
    {
      id: 3,
      name: "John Smith",
      email: "john@deephire.com",
      role: "hiring_manager",
      jobTitle: "Engineering Manager",
      department: "Recruiting",
      team: "Enterprise",
      status: "active",
      lastLogin: "5 hours ago",
      loginCount: 142,
      permissions: ["view_candidates", "edit_candidates", "view_analytics"],
    },
  ]);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle || "",
        department: user.department || "",
        team: user.team || "",
        permissions: user.permissions,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        email: "",
        role: "viewer",
        jobTitle: "",
        department: "",
        team: "",
        permissions: [],
      });
    }
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Error", description: "Please fill in name and email", variant: "destructive" });
      return;
    }

    if (editingId) {
      setUsers(users.map((u) => (u.id === editingId ? { ...u, ...formData, status: "active" } : u)));
      toast({ title: "Success", description: "User updated successfully" });
    } else {
      setUsers([
        ...users,
        {
          id: users.length + 1,
          ...formData,
          status: "active",
          lastLogin: "Never",
          loginCount: 0,
        },
      ]);
      toast({ title: "Success", description: "User added successfully" });
    }
    setIsOpen(false);
  };

  const handleDelete = (id: number) => {
    setUsers(users.filter((u) => u.id !== id));
    toast({ title: "Success", description: "User deleted successfully" });
  };

  const togglePermission = (perm: string) => {
    setFormData({
      ...formData,
      permissions: formData.permissions.includes(perm) ? formData.permissions.filter((p) => p !== perm) : [...formData.permissions, perm],
    });
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage system users, roles, permissions, and team assignments</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity Audit</TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                System Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="input-search-users" />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 border rounded-lg space-y-3" data-testid={`card-user-${user.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.jobTitle && <p className="text-xs text-muted-foreground mt-1">{user.jobTitle} • {user.department}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={ROLE_DEFINITIONS[user.role as keyof typeof ROLE_DEFINITIONS]?.color || ""}>{ROLE_DEFINITIONS[user.role as keyof typeof ROLE_DEFINITIONS]?.label || user.role}</Badge>
                          <Badge variant="outline">{user.status}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LogOut className="h-3 w-3" />
                        <span>Last login: {user.lastLogin}</span>
                        <span>•</span>
                        <span>{user.loginCount} total logins</span>
                      </div>

                      {user.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {user.permissions.slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {perm.replace(/_/g, " ")}
                            </Badge>
                          ))}
                          {user.permissions.length > 3 && <Badge variant="secondary" className="text-xs">+{user.permissions.length - 3}</Badge>}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(user)} className="flex-1" data-testid={`button-edit-user-${user.id}`}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)} data-testid={`button-delete-user-${user.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROLES & PERMISSIONS TAB */}
        <TabsContent value="roles" className="space-y-4">
          {Object.entries(ROLE_DEFINITIONS).map(([roleKey, role]) => (
            <Card key={roleKey}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {role.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{role.desc}</p>
                <div className="grid grid-cols-2 gap-2">
                  {roleKey === "admin" &&
                    PERMISSION_OPTIONS.map((perm) => (
                      <Badge key={perm} variant="default" className="text-xs">
                        {perm.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  {roleKey === "recruiter" && ["view_candidates", "edit_candidates", "post_jobs", "manage_jobs", "export_data"].map((perm) => <Badge key={perm} variant="default" className="text-xs">{perm.replace(/_/g, " ")}</Badge>)}
                  {roleKey === "hiring_manager" && ["view_candidates", "edit_candidates", "view_analytics"].map((perm) => <Badge key={perm} variant="default" className="text-xs">{perm.replace(/_/g, " ")}</Badge>)}
                  {roleKey === "client_admin" && ["manage_teams", "view_candidates", "view_analytics", "manage_integrations"].map((perm) => <Badge key={perm} variant="default" className="text-xs">{perm.replace(/_/g, " ")}</Badge>)}
                  {roleKey === "viewer" && ["view_candidates", "view_analytics"].map((perm) => <Badge key={perm} variant="default" className="text-xs">{perm.replace(/_/g, " ")}</Badge>)}
                  {roleKey === "candidate" && ["view_analytics"].map((perm) => <Badge key={perm} variant="default" className="text-xs">{perm.replace(/_/g, " ")}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ACTIVITY AUDIT TAB */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { user: "Admin User", action: "Created user", resource: "Sarah Chen", time: "2 minutes ago" },
                  { user: "Sarah Chen", action: "Exported candidates", resource: "Enterprise Job", time: "1 hour ago" },
                  { user: "John Smith", action: "Reviewed candidate", resource: "Alice Johnson", time: "3 hours ago" },
                  { user: "Admin User", action: "Updated permissions", resource: "Recruiter role", time: "1 day ago" },
                ].map((log, i) => (
                  <div key={i} className="p-3 border rounded-md flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user} • {log.resource}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{log.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit User Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>{editingId ? "Update user information and permissions" : "Create a new system user with roles and permissions"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" data-testid="input-user-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@company.com" data-testid="input-user-email" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} placeholder="Senior Recruiter" data-testid="input-job-title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Recruiting" data-testid="input-department" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="team">Team</Label>
                <Input id="team" value={formData.team} onChange={(e) => setFormData({ ...formData, team: e.target.value })} placeholder="Enterprise" data-testid="input-team" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(role) => setFormData({ ...formData, role })}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="recruiter">Recruiter</SelectItem>
                    <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                    <SelectItem value="client_admin">Client Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-md">
                {PERMISSION_OPTIONS.map((perm) => (
                  <div key={perm} className="flex items-center space-x-2">
                    <input type="checkbox" id={perm} checked={formData.permissions.includes(perm)} onChange={() => togglePermission(perm)} className="h-4 w-4" data-testid={`checkbox-permission-${perm}`} />
                    <label htmlFor={perm} className="text-xs cursor-pointer">
                      {perm.replace(/_/g, " ")}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button onClick={handleSave} data-testid="button-save-user">
                {editingId ? "Update" : "Add"} User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
