import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft, CheckCircle2, Briefcase, GraduationCap, Award } from "lucide-react";

const profileSchema = z.object({
  skills: z.array(z.string()),
  salaryExpectations: z.coerce.number().optional(),
  yearsExperience: z.coerce.number().optional(),
  employmentType: z.string().optional(),
  isAvailable: z.boolean().optional(),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    field: z.string(),
    graduationYear: z.coerce.number().optional(),
  })),
  workExperience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string().optional(),
    description: z.string().optional(),
  })),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CandidateProfile() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newSkill, setNewSkill] = useState("");
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Fetch candidate data
  const { data: candidate, isLoading } = useQuery({
    queryKey: [`/api/candidate/${candidateId}`],
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      skills: [],
      education: [],
      workExperience: [],
      salaryExpectations: 0,
      yearsExperience: 0,
      employmentType: "full-time",
      isAvailable: true,
    },
  });

  // Populate form when candidate data loads
  useEffect(() => {
    if (candidate) {
      form.reset({
        skills: candidate.skills || [],
        education: candidate.education || [],
        workExperience: candidate.careerHistory || [],
        salaryExpectations: candidate.salaryExpectations,
        yearsExperience: candidate.yearsExperience,
        employmentType: candidate.employmentType || "full-time",
        isAvailable: true,
      });
      
      // Calculate completion percentage
      let filled = 0;
      if (candidate.skills?.length) filled++;
      if (candidate.education?.length) filled++;
      if (candidate.careerHistory?.length) filled++;
      if (candidate.salaryExpectations) filled++;
      if (candidate.yearsExperience) filled++;
      setCompletionPercentage(Math.round((filled / 5) * 100));
    }
  }, [candidate]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch(`/api/candidate/${candidateId}/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      setTimeout(() => setLocation(`/candidate/dashboard/${candidateId}`), 1500);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const skills = form.watch("skills");
  const education = form.watch("education");
  const workExperience = form.watch("workExperience");

  const addSkill = () => {
    if (newSkill.trim()) {
      form.setValue("skills", [...skills, newSkill]);
      setNewSkill("");
    }
  };

  const removeSkill = (index: number) => {
    form.setValue("skills", skills.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    form.setValue("education", [
      ...education,
      { school: "", degree: "", field: "", graduationYear: new Date().getFullYear() },
    ]);
  };

  const removeEducation = (index: number) => {
    form.setValue("education", education.filter((_, i) => i !== index));
  };

  const addWorkExperience = () => {
    form.setValue("workExperience", [
      ...workExperience,
      { company: "", title: "", startDate: "", endDate: "" },
    ]);
  };

  const removeWorkExperience = (index: number) => {
    form.setValue("workExperience", workExperience.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProfileFormData) => {
    await updateMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-12 pb-8 text-center">
            <p>Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation(`/candidate/dashboard/${candidateId}`)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>Fill out your professional details to get better job recommendations</CardDescription>
            
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Professional Information
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="10" {...field} data-testid="input-years-experience" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type</FormLabel>
                          <FormControl>
                            <select {...field} className="w-full px-3 py-2 border rounded-md" data-testid="select-employment-type">
                              <option value="full-time">Full-time</option>
                              <option value="part-time">Part-time</option>
                              <option value="contract">Contract</option>
                              <option value="freelance">Freelance</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="salaryExpectations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary Expectations (USD)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="100000" {...field} data-testid="input-salary" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Skills
                  </h3>
                  
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="Add a skill (e.g., Python, Leadership)"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      data-testid="input-add-skill"
                    />
                    <Button type="button" onClick={addSkill} data-testid="button-add-skill">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" data-testid={`badge-skill-${index}`}>
                        {skill}
                        <Trash2
                          className="h-3 w-3 ml-1 hover:text-red-500"
                          onClick={() => removeSkill(index)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Work Experience */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Work Experience
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addWorkExperience} data-testid="button-add-work">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {workExperience.map((_, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium">Experience {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWorkExperience(index)}
                            data-testid={`button-remove-work-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.company`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company</FormLabel>
                              <FormControl>
                                <Input placeholder="Company name" {...field} data-testid={`input-company-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.title`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Senior Engineer" {...field} data-testid={`input-title-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.startDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Start Date (YYYY-MM)</FormLabel>
                                <FormControl>
                                  <Input placeholder="2020-01" {...field} data-testid={`input-start-date-${index}`} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`workExperience.${index}.endDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date (YYYY-MM) - Leave blank if current</FormLabel>
                                <FormControl>
                                  <Input placeholder="2024-01" {...field} data-testid={`input-end-date-${index}`} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`workExperience.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Describe your role and achievements..." {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Education */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addEducation} data-testid="button-add-education">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {education.map((_, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between mb-2">
                          <h4 className="font-medium">Education {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEducation(index)}
                            data-testid={`button-remove-education-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`education.${index}.school`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>School / University</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Stanford University" {...field} data-testid={`input-school-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`education.${index}.degree`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Degree</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Bachelor's" {...field} data-testid={`input-degree-${index}`} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`education.${index}.field`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Field of Study</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Computer Science" {...field} data-testid={`input-field-${index}`} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`education.${index}.graduationYear`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Graduation Year</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="2020" {...field} data-testid={`input-grad-year-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={updateMutation.isPending} data-testid="button-save-profile">
                  {updateMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
