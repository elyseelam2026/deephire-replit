import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Briefcase } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function CompanyLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/company/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }

      toast({
        title: "Welcome back!",
        description: "Redirecting to your dashboard...",
      });
      
      // Store company ID in localStorage for context
      localStorage.setItem("companyId", result.companyId.toString());
      
      setTimeout(() => {
        setLocation("/client");
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation("/auth")}
            data-testid="button-back-to-auth"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Briefcase className="h-5 w-5" />
              Company Login
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="hello@company.com" {...field} data-testid="input-company-login-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} data-testid="input-company-login-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  data-testid="button-company-login-submit"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 space-y-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto" 
                    onClick={() => setLocation("/company/register")}
                    data-testid="button-to-company-register"
                  >
                    Register here
                  </Button>
                </p>
              </div>
              <div className="text-center">
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm" 
                  onClick={() => setLocation("/company/forgot-password")}
                  data-testid="button-company-forgot-password"
                >
                  Forgot password?
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
