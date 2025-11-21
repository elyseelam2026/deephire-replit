import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileAutofillProps {
  email: string;
  onAutofillComplete: (data: any) => void;
  onSkip: () => void;
}

export default function ProfileAutofill({ email, onAutofillComplete, onSkip }: ProfileAutofillProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
  };

  const handleAutofill = async () => {
    if (!linkedinUrl && !cvFile) {
      toast({
        title: "Error",
        description: "Please provide LinkedIn URL or upload CV",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      if (linkedinUrl) formData.append("linkedinUrl", linkedinUrl);
      if (cvFile) formData.append("cv", cvFile);

      const response = await fetch("/api/candidate/autofill-profile", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Autofill failed");

      const data = await response.json();
      
      toast({
        title: "Success!",
        description: `Profile auto-filled! You earned +${data.creditsAwarded} credits`,
      });

      onAutofillComplete(data.profileData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse profile. Try manually filling.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <Zap className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
          </div>
          <CardTitle className="text-center">Boost Your Profile with AI</CardTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Upload your CV or LinkedIn URL and let AI auto-fill your profile
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">💰 +50 Credits</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">Earn credits by completing with AI auto-fill</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">LinkedIn URL (Optional)</label>
              <Input
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                disabled={isLoading}
                data-testid="input-linkedin-url"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-950 text-gray-500">or</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Upload CV (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-400 transition">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleCVUpload}
                  disabled={isLoading}
                  className="hidden"
                  id="cv-upload"
                />
                <label htmlFor="cv-upload" className="cursor-pointer">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {cvFile ? cvFile.name : "Click to upload or drag & drop"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF, DOC, or TXT</p>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAutofill}
              disabled={isLoading || (!linkedinUrl && !cvFile)}
              className="w-full"
              data-testid="button-autofill-profile"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? "Analyzing with AI..." : "Auto-Fill My Profile"}
            </Button>

            <Button
              variant="outline"
              onClick={onSkip}
              disabled={isLoading}
              className="w-full"
              data-testid="button-skip-autofill"
            >
              Skip & Fill Manually
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            We'll use AI to extract your professional info and pre-fill the form. You can always edit it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
