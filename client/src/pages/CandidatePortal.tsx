import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import VerifyEmail from "./VerifyEmail";
import ProfileAutofill from "./ProfileAutofill";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Briefcase, GraduationCap, Award, Mail, Lock, User, Plus, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const candidateRegistrationSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  headline: z.string().min(1, "Professional headline required"),
  location: z.string().min(1, "Location required"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
});

type RegistrationFormData = z.infer<typeof candidateRegistrationSchema>;

interface WorkExperience {
  company: string;
  position: string;
  years: string;
}

interface Education {
  school: string;
  degree: string;
  field: string;
}

export default function CandidatePortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [candidateId, setCandidateId] = useState<number | null>(null);

  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [newWork, setNewWork] = useState({ company: "", position: "", years: "" });

  const [education, setEducation] = useState<Education[]>([]);
  const [newEdu, setNewEdu] = useState({ school: "", degree: "", field: "" });

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(candidateRegistrationSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      headline: "",
      location: "",
      bio: "",
    },
  });

  const addWorkExperience = () => {
    if (newWork.company && newWork.position && newWork.years) {
      setWorkExperience([...workExperience, newWork]);
      setNewWork({ company: "", position: "", years: "" });
    }
  };

  const removeWorkExperience = (index: number) => {
    setWorkExperience(workExperience.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    if (newEdu.school && newEdu.degree && newEdu.field) {
      setEducation([...education, newEdu]);
      setNewEdu({ school: "", degree: "", field: "" });
    }
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const addSkill = () => {
    if (newSkill.trim()) {
      setSkills([...skills, newSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/candidate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          skills,
          workExperience,
          education,
        }),
      });

      if (!response.ok) throw new Error("Registration failed");

      const responseData = await response.json();
      
      toast({
        title: "Profile saved!",
        description: "Check your email for verification code",
      });
      
      setCandidateId(responseData.candidateId);
      setVerifyEmail(data.email);
      setIsVerifying(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <VerifyEmail 
        email={verifyEmail} 
        onVerified={() => {
          setIsVerifying(false);
          setIsRegistered(true);
          setTimeout(() => {
            window.location.href = `/candidate/dashboard/${candidateId}`;
          }, 2000);
        }}
      />
    );
  }

  if (isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Registration Complete!</h2>
            <p className="text-muted-foreground">Your profile has been added to our talent bank. Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
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

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Create Your Candidate Profile</h1>
          <p className="text-lg text-muted-foreground">Join our talent bank and let AI find perfect opportunities</p>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-4 mb-12 px-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step >= s
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              <span className="text-sm font-medium hidden sm:inline">
                {s === 1 ? "Account" : s === 2 ? "Profile" : "Experience"}
              </span>
            </div>
          ))}
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Account Credentials */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    Create Account
                  </CardTitle>
                  <CardDescription>Set up your login credentials</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-firstName" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-lastName" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
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
                          <Input type="password" placeholder="••••••••" {...field} data-testid="input-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <Button
                    type="button"
                    className="w-full"
                    data-testid="button-step1-next"
                    onClick={() => {
                      if (form.getValues("firstName") && form.getValues("lastName") && form.getValues("email") && form.getValues("password")) {
                        setStep(2);
                      }
                    }}
                  >
                    Continue to Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Basic Profile */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Build Your Profile
                  </CardTitle>
                  <CardDescription>Tell recruiters about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Headline</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., VP Finance at Fortune 500 Tech Company" {...field} data-testid="input-headline" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., New York, NY" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About You</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about your background, expertise, and what you're looking for..."
                            className="min-h-24"
                            {...field}
                            data-testid="textarea-bio"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)} data-testid="button-step2-back">
                      Back
                    </Button>
                    <Button type="button" className="flex-1" onClick={() => setStep(3)} data-testid="button-step2-next">
                      Continue to Experience
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Experience & Skills */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Experience & Skills
                  </CardTitle>
                  <CardDescription>Add your work history and skills</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Work Experience */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Briefcase className="h-4 w-4" />
                      <h3 className="font-semibold">Work Experience</h3>
                    </div>
                    <div className="space-y-3 mb-4">
                      {workExperience.map((exp, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg flex justify-between items-start" data-testid={`work-experience-${idx}`}>
                          <div className="text-sm">
                            <p className="font-medium">{exp.position}</p>
                            <p className="text-xs text-muted-foreground">{exp.company} • {exp.years}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWorkExperience(idx)}
                            data-testid={`button-remove-work-${idx}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
                      <Input
                        placeholder="Company"
                        value={newWork.company}
                        onChange={(e) => setNewWork({ ...newWork, company: e.target.value })}
                        data-testid="input-company"
                      />
                      <Input
                        placeholder="Position"
                        value={newWork.position}
                        onChange={(e) => setNewWork({ ...newWork, position: e.target.value })}
                        data-testid="input-position"
                      />
                      <Input
                        placeholder="Years (e.g., 2018-2023)"
                        value={newWork.years}
                        onChange={(e) => setNewWork({ ...newWork, years: e.target.value })}
                        data-testid="input-years"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addWorkExperience} className="gap-2" data-testid="button-add-work">
                        <Plus className="h-4 w-4" />
                        Add Experience
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Education */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="h-4 w-4" />
                      <h3 className="font-semibold">Education</h3>
                    </div>
                    <div className="space-y-3 mb-4">
                      {education.map((edu, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg flex justify-between items-start" data-testid={`education-${idx}`}>
                          <div className="text-sm">
                            <p className="font-medium">{edu.degree} in {edu.field}</p>
                            <p className="text-xs text-muted-foreground">{edu.school}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(idx)}
                            data-testid={`button-remove-edu-${idx}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
                      <Input
                        placeholder="School/University"
                        value={newEdu.school}
                        onChange={(e) => setNewEdu({ ...newEdu, school: e.target.value })}
                        data-testid="input-school"
                      />
                      <Input
                        placeholder="Degree (e.g., Bachelor of Science)"
                        value={newEdu.degree}
                        onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                        data-testid="input-degree"
                      />
                      <Input
                        placeholder="Field of Study"
                        value={newEdu.field}
                        onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
                        data-testid="input-field"
                      />
                      <Button type="button" size="sm" variant="outline" onClick={addEducation} className="gap-2" data-testid="button-add-edu">
                        <Plus className="h-4 w-4" />
                        Add Education
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Skills */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="h-4 w-4" />
                      <h3 className="font-semibold">Key Skills</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-2" data-testid={`skill-badge-${idx}`}>
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(idx)}
                            className="ml-1 hover:text-destructive"
                            data-testid={`button-remove-skill-${idx}`}
                          >
                            ✕
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a skill..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                        data-testid="input-skill"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={addSkill} data-testid="button-add-skill">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)} data-testid="button-step3-back">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting} data-testid="button-submit">
                      {isSubmitting ? "Submitting..." : "Complete Registration"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
