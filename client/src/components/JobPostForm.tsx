import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "./FileUpload";
import { Briefcase, Plus, X } from "lucide-react";

interface JobPostFormProps {
  onSubmit: (data: JobFormData) => void;
  isLoading?: boolean;
}

interface JobFormData {
  title: string;
  department: string;
  company: string;
  location: string;
  urgency: string;
  description: string;
  requirements: string[];
  benefits: string[];
  jobFile?: File;
}

export function JobPostForm({ onSubmit, isLoading = false }: JobPostFormProps) {
  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    department: "",
    company: "",
    location: "",
    urgency: "medium",
    description: "",
    requirements: [],
    benefits: [],
  });

  const [newRequirement, setNewRequirement] = useState("");
  const [newBenefit, setNewBenefit] = useState("");

  const departments = [
    "Engineering", "Sales", "Marketing", "Design", "Product", "Operations", 
    "Human Resources", "Finance", "Legal", "Customer Success"
  ];

  const urgencyLevels = [
    { value: "low", label: "Low Priority" },
    { value: "medium", label: "Medium Priority" },
    { value: "high", label: "High Priority" },
    { value: "urgent", label: "Urgent Hire" },
  ];

  const handleInputChange = (field: keyof JobFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()]
      }));
      setNewBenefit("");
    }
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (file: File) => {
    setFormData(prev => ({ ...prev, jobFile: file }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="max-w-4xl mx-auto" data-testid="job-post-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Post New Job
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g. Senior Frontend Developer"
                required
                data-testid="input-job-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="e.g. TechCorp Inc"
                required
                data-testid="input-company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange("department", value)}
              >
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="e.g. San Francisco, CA / Remote"
                required
                data-testid="input-location"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="urgency">Priority Level</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) => handleInputChange("urgency", value)}
              >
                <SelectTrigger data-testid="select-urgency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {urgencyLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Job Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
              rows={6}
              required
              data-testid="textarea-description"
            />
          </div>

          {/* Requirements */}
          <div className="space-y-3">
            <Label>Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add a requirement (e.g. 5+ years React experience)"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRequirement())}
                data-testid="input-new-requirement"
              />
              <Button
                type="button"
                onClick={addRequirement}
                size="icon"
                data-testid="button-add-requirement"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.requirements.map((req, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {req}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => removeRequirement(index)}
                    data-testid={`button-remove-requirement-${index}`}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <Label>Benefits & Perks</Label>
            <div className="flex gap-2">
              <Input
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                placeholder="Add a benefit (e.g. Health insurance, Remote work)"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addBenefit())}
                data-testid="input-new-benefit"
              />
              <Button
                type="button"
                onClick={addBenefit}
                size="icon"
                data-testid="button-add-benefit"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.benefits.map((benefit, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {benefit}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => removeBenefit(index)}
                    data-testid={`button-remove-benefit-${index}`}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Job Description File (Optional)</Label>
            <FileUpload
              onFileSelect={handleFileSelect}
              placeholder="Upload existing job description document"
              acceptedTypes=".pdf,.doc,.docx,.txt"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline">
              Save as Draft
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="button-post-job"
            >
              {isLoading ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}