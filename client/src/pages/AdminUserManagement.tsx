import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminUserManagement() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">Manage system users and permissions</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <p className="font-medium">Admin User</p>
                <p className="text-sm text-muted-foreground">admin@deephire.com</p>
              </div>
              <Badge>Administrator</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 border rounded-md">
              <p className="font-medium">Administrator</p>
              <p className="text-sm text-muted-foreground">Full system access</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">Moderator</p>
              <p className="text-sm text-muted-foreground">Data management and support</p>
            </div>
            <div className="p-3 border rounded-md">
              <p className="font-medium">Viewer</p>
              <p className="text-sm text-muted-foreground">Read-only access</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
