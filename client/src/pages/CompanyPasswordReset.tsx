import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { useToast } from "@/hooks/use-toast";
import { Lock, CheckCircle2, ArrowLeft } from "lucide-react";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function CompanyPasswordReset() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ isValid: false, score: 0, feedback: [] as string[] });
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  // Extract email and token from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    const tokenParam = params.get("token");

    if (!emailParam || !tokenParam) {
      toast({
        title: "Invalid Reset Link",
        description: "This password reset link is invalid or has expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/company/login"), 2000);
      return;
    }

    setEmail(emailParam);
    setToken(tokenParam);
    setIsLoading(false);
  }, []);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!passwordStrength.isValid) {
      toast({
        title: "Weak Password",
        description: "Please use a stronger password with uppercase, lowercase, numbers, and special characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/company/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Password reset failed");
      }

      toast({
        title: "Password Reset Successful",
        description: "You can now log in with your new password",
      });

      setIsSuccess(true);
      setTimeout(() => {
        setLocation("/company/login");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
            <p className="text-muted-foreground mb-6">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5" />
            <CardTitle>Reset Your Password</CardTitle>
          </div>
          <CardDescription>Enter your new password</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••"
                        disabled={isSubmitting}
                        data-testid="input-new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <PasswordStrengthMeter 
                      password={field.value}
                      onChange={setPasswordStrength}
                    />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !passwordStrength.isValid}
                data-testid="button-reset-password"
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 pt-6 border-t">
            <Button 
              variant="link" 
              onClick={() => setLocation("/company/login")}
              className="w-full"
              data-testid="button-back-to-login-reset"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
