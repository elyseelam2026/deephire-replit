import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

export default function Auth() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<"candidate" | "company" | null>(null);
  const [tab, setTab] = useState<"login" | "register">("register");

  useEffect(() => {
    // Check URL params for role
    const params = new URLSearchParams(window.location.search);
    const paramRole = params.get("role");
    if (paramRole === "candidate" || paramRole === "company") {
      setRole(paramRole as any);
    }
  }, []);

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Choose Your Role</h1>
          </div>

          <div className="grid gap-4">
            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => setRole("candidate")}
              data-testid="role-card-candidate"
            >
              <CardContent className="pt-6 text-center">
                <h2 className="text-xl font-bold mb-2">I'm a Candidate</h2>
                <p className="text-muted-foreground text-sm">Find your next opportunity</p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover-elevate"
              onClick={() => setRole("company")}
              data-testid="role-card-company"
            >
              <CardContent className="pt-6 text-center">
                <h2 className="text-xl font-bold mb-2">I'm from a Company</h2>
                <p className="text-muted-foreground text-sm">Find top talent</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setRole(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Choose Role
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="register">Register</TabsTrigger>
            <TabsTrigger value="login">Sign In</TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            {role === "candidate" && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Candidate Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/candidate/register")}
                    data-testid="button-register-candidate"
                  >
                    Continue to Registration
                  </Button>
                </CardContent>
              </Card>
            )}
            {role === "company" && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Company Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/company/register")}
                    data-testid="button-register-company"
                  >
                    Continue to Registration
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="login">
            {role === "candidate" && (
              <Card>
                <CardHeader>
                  <CardTitle>Sign In to Your Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/candidate/login")}
                    data-testid="button-login-candidate"
                  >
                    Continue to Sign In
                  </Button>
                </CardContent>
              </Card>
            )}
            {role === "company" && (
              <Card>
                <CardHeader>
                  <CardTitle>Sign In to Your Account</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    className="w-full" 
                    onClick={() => setLocation("/company/login")}
                    data-testid="button-login-company"
                  >
                    Continue to Sign In
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
