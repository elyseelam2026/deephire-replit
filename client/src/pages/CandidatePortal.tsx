import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  User, Briefcase, GraduationCap, Award, FileText, Heart, Share2, 
  Eye, Settings, Plus, Trash2, Edit2, Calendar, MapPin, Star, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkExperience {
  id: number;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

interface Education {
  id: number;
  school: string;
  degree: string;
  field: string;
  graduationYear: number;
  description?: string;
}

interface CandidateProfile {
  id: number;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  email: string;
  phone?: string;
  bio: string;
  profileImage?: string;
  workExperience: WorkExperience[];
  education: Education[];
  skills: string[];
  endorsements: Record<string, number>;
  profileCompleteness: number;
}

export default function CandidatePortal() {
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [profile, setProfile] = useState<CandidateProfile>({
    id: 1,
    firstName: "Sarah",
    lastName: "Chen",
    headline: "Senior Software Engineer at Google",
    location: "Mountain View, CA",
    email: "sarah.chen@email.com",
    phone: "+1 (555) 123-4567",
    bio: "Passionate full-stack developer with 6+ years of experience building scalable web applications. Strong background in React, Node.js, and cloud technologies.",
    profileImage: undefined,
    workExperience: [
      {
        id: 1,
        company: "Google",
        position: "Senior Software Engineer",
        location: "Mountain View, CA",
        startDate: "2021-01",
        current: true,
        description: "Leading development of cloud infrastructure tools, mentoring junior engineers"
      },
      {
        id: 2,
        company: "Uber",
        position: "Software Engineer",
        location: "San Francisco, CA",
        startDate: "2019-06",
        endDate: "2020-12",
        current: false,
        description: "Built payment processing systems using Node.js and PostgreSQL"
      }
    ],
    education: [
      {
        id: 1,
        school: "Stanford University",
        degree: "Bachelor of Science",
        field: "Computer Science",
        graduationYear: 2019
      }
    ],
    skills: ["React", "TypeScript", "Node.js", "Python", "AWS", "Docker", "PostgreSQL"],
    endorsements: { React: 12, TypeScript: 8, Node: 10 },
    profileCompleteness: 75
  });

  const [newSkill, setNewSkill] = useState("");
  const [newWorkExp, setNewWorkExp] = useState<Partial<WorkExperience>>({});
  const [newEducation, setNewEducation] = useState<Partial<Education>>({});

  const addSkill = () => {
    if (newSkill.trim()) {
      setProfile(p => ({ 
        ...p, 
        skills: [...p.skills, newSkill],
        endorsements: { ...p.endorsements, [newSkill]: 0 }
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile(p => ({
      ...p,
      skills: p.skills.filter(s => s !== skill),
      endorsements: Object.fromEntries(
        Object.entries(p.endorsements).filter(([k]) => k !== skill)
      )
    }));
  };

  const endorseSkill = (skill: string) => {
    setProfile(p => ({
      ...p,
      endorsements: {
        ...p.endorsements,
        [skill]: (p.endorsements[skill] || 0) + 1
      }
    }));
  };

  const addWorkExperience = () => {
    if (newWorkExp.company && newWorkExp.position) {
      setProfile(p => ({
        ...p,
        workExperience: [...p.workExperience, { ...newWorkExp, id: Date.now() } as WorkExperience]
      }));
      setNewWorkExp({});
    }
  };

  const removeWorkExperience = (id: number) => {
    setProfile(p => ({
      ...p,
      workExperience: p.workExperience.filter(w => w.id !== id)
    }));
  };

  const addEducation = () => {
    if (newEducation.school && newEducation.degree) {
      setProfile(p => ({
        ...p,
        education: [...p.education, { ...newEducation, id: Date.now() } as Education]
      }));
      setNewEducation({});
    }
  };

  const removeEducation = (id: number) => {
    setProfile(p => ({
      ...p,
      education: p.education.filter(e => e.id !== id)
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                {/* Profile Picture & Name */}
                <div className="text-center mb-6">
                  <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary">
                    <AvatarImage src={profile.profileImage} />
                    <AvatarFallback>{profile.firstName[0]}{profile.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{profile.headline}</p>
                </div>

                <Separator className="my-4" />

                {/* Contact Info */}
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline text-xs">
                      {profile.email}
                    </a>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Profile Completeness */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Profile Completeness</span>
                    <span className="text-xs text-muted-foreground">{profile.profileCompleteness}%</span>
                  </div>
                  <Progress value={profile.profileCompleteness} className="h-2" />
                </div>

                {/* View Profile Button */}
                <Button className="w-full gap-2">
                  <Eye className="h-4 w-4" />
                  View Public Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  About
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingSection(editingSection === 'about' ? null : 'about')}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === 'about' ? (
                  <div className="space-y-4">
                    <Textarea 
                      value={profile.bio} 
                      onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      className="min-h-24"
                    />
                    <Button onClick={() => setEditingSection(null)} className="gap-2">
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="text-foreground">{profile.bio}</p>
                )}
              </CardContent>
            </Card>

            {/* Experience Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Experience
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingSection(editingSection === 'experience' ? null : 'experience')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingSection === 'experience' && (
                  <div className="border rounded-lg p-4 bg-muted/50 space-y-3 mb-4">
                    <Input placeholder="Company" value={newWorkExp.company || ''} onChange={(e) => setNewWorkExp(p => ({ ...p, company: e.target.value }))} />
                    <Input placeholder="Position" value={newWorkExp.position || ''} onChange={(e) => setNewWorkExp(p => ({ ...p, position: e.target.value }))} />
                    <Input placeholder="Location" value={newWorkExp.location || ''} onChange={(e) => setNewWorkExp(p => ({ ...p, location: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="month" value={newWorkExp.startDate || ''} onChange={(e) => setNewWorkExp(p => ({ ...p, startDate: e.target.value }))} />
                      <Input type="month" value={newWorkExp.endDate || ''} onChange={(e) => setNewWorkExp(p => ({ ...p, endDate: e.target.value }))} disabled={newWorkExp.current} />
                    </div>
                    <Textarea placeholder="Description" value={newWorkExp.description || ''} onChange={(e) => setNewWorkExp(p => ({ ...p, description: e.target.value }))} className="min-h-20" />
                    <Button onClick={addWorkExperience} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Experience
                    </Button>
                  </div>
                )}
                {profile.workExperience.map((exp) => (
                  <div key={exp.id} className="border-l-4 border-blue-600 pl-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{exp.position}</h3>
                        <p className="text-sm text-muted-foreground">{exp.company}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {exp.current ? 'Present' : new Date(exp.endDate!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        {exp.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {exp.location}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeWorkExperience(exp.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {exp.description && <p className="text-sm mt-2">{exp.description}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Education Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-600" />
                  Education
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingSection(editingSection === 'education' ? null : 'education')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingSection === 'education' && (
                  <div className="border rounded-lg p-4 bg-muted/50 space-y-3 mb-4">
                    <Input placeholder="School/University" value={newEducation.school || ''} onChange={(e) => setNewEducation(p => ({ ...p, school: e.target.value }))} />
                    <Input placeholder="Degree" value={newEducation.degree || ''} onChange={(e) => setNewEducation(p => ({ ...p, degree: e.target.value }))} />
                    <Input placeholder="Field of Study" value={newEducation.field || ''} onChange={(e) => setNewEducation(p => ({ ...p, field: e.target.value }))} />
                    <Input type="number" placeholder="Graduation Year" value={newEducation.graduationYear || ''} onChange={(e) => setNewEducation(p => ({ ...p, graduationYear: parseInt(e.target.value) }))} />
                    <Button onClick={addEducation} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Education
                    </Button>
                  </div>
                )}
                {profile.education.map((edu) => (
                  <div key={edu.id} className="border-l-4 border-green-600 pl-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{edu.school}</h3>
                        <p className="text-sm text-muted-foreground">{edu.degree} in {edu.field}</p>
                        <p className="text-xs text-muted-foreground mt-1">Graduated {edu.graduationYear}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeEducation(edu.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Skills Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-blue-600" />
                  Skills & Endorsements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Skill */}
                <div className="flex gap-2">
                  <Input 
                    placeholder="Add a new skill..." 
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                  />
                  <Button onClick={addSkill} variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Skills Grid */}
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <div key={skill} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-full">
                      <span className="text-sm font-medium">{skill}</span>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => endorseSkill(skill)}
                        >
                          <Heart className="h-3 w-3 fill-current text-red-500" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{profile.endorsements[skill] || 0}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 ml-1"
                        onClick={() => removeSkill(skill)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
