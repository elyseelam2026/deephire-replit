import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, ArrowLeft } from "lucide-react";

const verifySchema = z.object({
  code: z.string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Must contain only numbers"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function CompanyVerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState(0);

  useEffect(() => {
    // Get email and companyId from sessionStorage (set by CompanyRegister)
    const storedEmail = sessionStorage.getItem("registerEmail");
    const storedCompanyId = sessionStorage.getItem("registerCompanyId");
    
    if (!storedEmail || !storedCompanyId) {
      toast({
        title: "Error",
        description: "Registration data not found. Please register again.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/company/register"), 2000);
      return;
    }

    setEmail(storedEmail);
    setCompanyId(parseInt(storedCompanyId));
  }, []);

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const onSubmit = async (data: VerifyFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/company/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: data.code,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Verification failed");
      }

      // Store companyId in localStorage
      localStorage.setItem("companyId", companyId.toString());
      
      toast({
        title: "Success!",
        description: "Email verified. Redirecting to dashboard...",
      });

      // Clean up sessionStorage
      sessionStorage.removeItem("registerEmail");
      sessionStorage.removeItem("registerCompanyId");

      setTimeout(() => {
        setLocation("/client");
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Verification failed";
      toast({
        title: "Error",
        description: errorMessage,
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
            onClick={() => setLocation("/company/register")}
            data-testid="button-back-to-register"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Mail className="h-5 w-5" />
              Verify Your Email
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground">
                We've sent a 6-digit code to
              </p>
              <p className="font-medium text-sm mt-1 break-all">{email}</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="000000" 
                          inputMode="numeric"
                          maxLength={6}
                          {...field} 
                          data-testid="input-verify-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                  data-testid="button-verify-submit"
                >
                  {isSubmitting ? "Verifying..." : "Verify Email"}
                </Button>
              </form>
            </Form>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Code expires in 24 hours. Check your spam folder if you don't see the email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
