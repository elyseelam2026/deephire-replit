import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Edit2, Eye, Heart, MessageSquare, Users, Zap, LogOut, Settings,
  TrendingUp, Bell, Share2
} from "lucide-react";

interface CandidateProfile {
  id: number;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  email: string;
  bio: string;
  skills: string[];
  workExperience: Array<{ company: string; position: string; years: string }>;
  education: Array<{ school: string; degree: string; field: string }>;
  profileCompleteness: number;
}

export default function CandidateDashboard() {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch candidate profile
  const { data: candidateData } = useQuery({
    queryKey: ["/api/candidate/me"],
    refetchOnWindowFocus: false,
  });

  useState(() => {
    setProfile(candidateData);
    setIsLoading(false);
  }, [candidateData]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center">Profile not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarFallback>{profile.firstName[0]}{profile.lastName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold mb-1">{profile.firstName} {profile.lastName}</h1>
                <p className="text-blue-100 mb-3">{profile.headline}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary">{profile.location}</Badge>
                  <Badge variant="secondary">{profile.skills.length} skills</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Profile Completeness */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Profile Strength</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={profile.profileCompleteness} className="h-3" />
                <p className="text-sm font-medium">{profile.profileCompleteness}% Complete</p>
                <p className="text-xs text-muted-foreground">Complete your profile to get discovered by recruiters</p>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm"><Eye className="h-4 w-4" /> Profile Views</span>
                  <span className="font-bold">234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm"><Heart className="h-4 w-4" /> Endorsements</span>
                  <span className="font-bold">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm"><MessageSquare className="h-4 w-4" /> Messages</span>
                  <span className="font-bold">3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Followers</span>
                  <span className="font-bold">42</span>
                </div>
              </CardContent>
            </Card>

            {/* Premium Upgrade */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Zap className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="font-semibold text-sm mb-2">Go Premium</p>
                  <p className="text-xs text-muted-foreground mb-4">Unlock blind auctions & premium visibility</p>
                  <Button className="w-full" size="sm">Upgrade Now</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* About */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle>About</CardTitle>
                    <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
                  </CardHeader>
                  <CardContent>
                    <p>{profile.bio}</p>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">No recent activity</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">No messages yet</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>Email notifications from recruiters</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4" />
                        <span>Open to opportunities</span>
                      </label>
                    </div>
                    <div className="pt-4 border-t">
                      <Button variant="destructive" className="w-full gap-2">
                        <LogOut className="h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
