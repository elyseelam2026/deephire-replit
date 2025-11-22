import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

const verifySchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function VerifyEmail() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  
  // Fetch candidate data to get email
  const { data: candidateData, isLoading } = useQuery({
    queryKey: [`/api/candidate/${candidateId}`],
  });

  const email = (candidateData as any)?.email || "";

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  useEffect(() => {
    // Auto-send code on mount if email is loaded
    if (!email) return;

    const sendCode = async () => {
      try {
        const response = await fetch("/api/send-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, method: "email" }),
        });

        const data = await response.json();
        
        // In development mode, the code is returned in response
        if (data.devCode) {
          setDevCode(data.devCode);
          form.setValue("code", data.devCode);
        }
      } catch (error) {
        console.error("Error sending code:", error);
      }
    };

    sendCode();
  }, [email, form]);

  const onSubmit = async (data: VerifyFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: data.code }),
      });

      if (!response.ok) throw new Error("Invalid code");

      toast({
        title: "Success!",
        description: "Email verified successfully",
      });
      setLocation(`/candidate/dashboard/${candidateId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid or expired code",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, method: "email" }),
      });

      const data = await response.json();
      
      // In development mode, the code is returned in response
      if (data.devCode) {
        setDevCode(data.devCode);
        form.setValue("code", data.devCode);
      }

      toast({
        title: "Code sent",
        description: data.devCode ? `Test code: ${data.devCode}` : "Check your email for the verification code",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend code",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <Mail className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
          <CardTitle className="text-center">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>

          {devCode && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Development Mode</p>
              <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-300" data-testid="text-dev-code">{devCode}</p>
              <p className="text-xs text-muted-foreground mt-1">Auto-filled above</p>
            </div>
          )}

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
                        maxLength={6}
                        {...field}
                        data-testid="input-verification-code"
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
                data-testid="button-verify-email"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify Email
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isResending}
              data-testid="button-resend-code"
            >
              {isResending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resend Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
