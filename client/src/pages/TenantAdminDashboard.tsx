import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Mail, Trash2, Plus, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "member", "viewer"]),
});

type InviteMemberData = z.infer<typeof inviteMemberSchema>;

interface TenantMember {
  id: number;
  userId: number;
  tenantId: number;
  role: string;
  email: string;
  name: string;
  joinedAt: string;
}

export default function TenantAdminDashboard() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<InviteMemberData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  // Fetch tenant members
  const { data: members = [], isLoading, refetch } = useQuery<TenantMember[]>({
    queryKey: [`/api/tenants/${tenantId}/members`],
    enabled: !!tenantId,
  });

  // Fetch tenant info
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}`],
    enabled: !!tenantId,
  });

  // Invite member mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteMemberData) => {
      const response = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: parseInt(tenantId!),
          email: data.email,
          role: data.role,
        }),
      });
      if (!response.ok) throw new Error("Failed to invite member");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Team member invitation sent successfully",
      });
      form.reset();
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/tenants/${tenantId}/members/${memberId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to remove member");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Member Removed",
        description: "Team member has been removed",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InviteMemberData) => {
    inviteMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} className="mb-4">
            ← Back
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Users className="h-8 w-8" />
            Tenant Administration
          </h1>
          <p className="text-muted-foreground">
            Manage team members for {tenant?.name || "your organization"}
          </p>
        </div>

        {/* Invite Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>Send an invitation to add a new team member</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full px-3 py-2 border border-input rounded-md bg-background"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    <Button
                      type="submit"
                      disabled={inviteMutation.isPending}
                      className="w-full"
                    >
                      {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({members.length})
            </CardTitle>
            <CardDescription>Current and pending team members</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center text-muted-foreground">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="text-center text-muted-foreground">No team members yet</div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{member.name || member.email}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        variant={member.role === "admin" ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {member.role === "admin" && <Shield className="h-3 w-3" />}
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Badge>

                      <span className="text-sm text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMutation.mutate(member.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
