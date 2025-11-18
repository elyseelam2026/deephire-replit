import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/components/ChatInterface";
import { JobPostForm } from "@/components/JobPostForm";
import { FileUpload } from "@/components/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Users, Briefcase, CheckCircle, Clock, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    type?: 'jd_upload' | 'candidate_results' | 'clarification' | 'text' | 'job_created';
    fileName?: string;
    candidateIds?: number[];
    jobId?: number;
  };
};

type Conversation = {
  id: number;
  messages: Message[];
  status: string;
  phase: string;
  searchContext?: any;
  matchedCandidates?: any[];
};

export default function ClientPortal() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [longlist, setLonglist] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocationRoute] = useLocation();

  // todo: remove mock functionality - replace with real API calls
  const [currentJobs] = useState([
    {
      id: 1,
      title: "Senior Frontend Developer",
      status: "active",
      candidates: 15,
      posted: "2 days ago",
    },
    {
      id: 2,
      title: "Product Manager",
      status: "draft",
      candidates: 0,
      posted: "1 hour ago",
    },
  ]);

  // Create conversation on mount
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: (data) => {
      setConversationId(data.id);
      localStorage.setItem('clientConversationId', data.id.toString());
    },
  });

  // Load existing conversation or create new one
  useEffect(() => {
    const savedConversationId = localStorage.getItem('clientConversationId');
    
    if (savedConversationId) {
      setConversationId(parseInt(savedConversationId));
    } else if (!conversationId && !createConversationMutation.isPending) {
      createConversationMutation.mutate();
    }
  }, []);

  // Fetch current conversation
  const { data: conversation, isLoading: isLoadingConversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem('clientConversationId');
          setConversationId(null);
          createConversationMutation.mutate();
          return null;
        }
        throw new Error('Failed to fetch conversation');
      }
      return response.json();
    },
    enabled: !!conversationId,
    staleTime: 0,
    refetchOnMount: true,
    retry: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, file }: { message: string; file?: File }) => {
      if (!conversationId) throw new Error('No active conversation');

      const formData = new FormData();
      formData.append('content', message);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async (content: string, file?: File) => {
    await sendMessageMutation.mutateAsync({ message: content, file });
  };

  const handleFileSelect = async (file: File) => {
    setUploadedFile(file);
    setIsProcessing(true);
    
    // todo: remove mock functionality - replace with actual AI processing
    setTimeout(() => {
      const mockLonglist = [
        {
          id: 1,
          name: "Sarah Chen",
          title: "Senior Software Engineer",
          company: "Google",
          matchScore: 92,
          experience: "6 years",
        },
        {
          id: 2,
          name: "Michael Rodriguez",
          title: "Frontend Developer",
          company: "Meta",
          matchScore: 88,
          experience: "4 years",
        },
        {
          id: 3,
          name: "Emily Zhang",
          title: "Full Stack Developer",
          company: "Stripe",
          matchScore: 85,
          experience: "5 years",
        },
      ];
      setLonglist(mockLonglist);
      setIsProcessing(false);
    }, 3000);
  };

  const handleJobSubmit = (data: any) => {
    console.log('Job submission:', data);
    // todo: remove mock functionality - implement actual job posting
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      case "paused":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="client-portal">
      <div>
        <h1 className="text-3xl font-bold">Client Portal</h1>
        <p className="text-muted-foreground">
          Post jobs and find the perfect candidates with AI-powered matching.
        </p>
      </div>

      <Tabs defaultValue="chat" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Quick Upload
          </TabsTrigger>
          <TabsTrigger value="form" data-testid="tab-form">
            <Briefcase className="h-4 w-4 mr-2" />
            Create Job
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Users className="h-4 w-4 mr-2" />
            My Jobs
          </TabsTrigger>
        </TabsList>

        {/* AI Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>AI Recruiting Assistant</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tell me who you're looking for, or upload a job description to get started.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {conversationId && conversation ? (
                <ChatInterface
                  conversationId={conversationId}
                  messages={conversation.messages || []}
                  matchedCandidates={conversation.matchedCandidates}
                  onSendMessage={handleSendMessage}
                  isLoading={sendMessageMutation.isPending || isLoadingConversation}
                />
              ) : (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center space-y-2">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Loading AI Assistant...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Job Description Upload</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload your job description and get an instant candidate longlist powered by AI.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUpload
                onFileSelect={handleFileSelect}
                placeholder="Upload your job description (PDF, Word, or text file)"
                acceptedTypes=".pdf,.doc,.docx,.txt"
              />

              {isProcessing && (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="text-muted-foreground">
                        AI is analyzing your job description and finding candidates...
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {longlist.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Top Candidate Matches
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Found {longlist.length} highly qualified candidates for your position.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {longlist.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                          data-testid={`candidate-match-${candidate.id}`}
                        >
                          <div>
                            <h4 className="font-medium">{candidate.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {candidate.title} at {candidate.company} • {candidate.experience}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              {candidate.matchScore}% match
                            </Badge>
                            <Button size="sm" data-testid={`button-contact-${candidate.id}`}>
                              Contact
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center mt-6">
                      <Button variant="outline">
                        View Full Longlist ({longlist.length * 3} candidates)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Job Tab */}
        <TabsContent value="form">
          <JobPostForm onSubmit={handleJobSubmit} />
        </TabsContent>

        {/* My Jobs Tab */}
        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Posted Jobs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage your job postings and track candidate applications.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                    data-testid={`job-listing-${job.id}`}
                  >
                    <div>
                      <h4 className="font-medium">{job.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {job.candidates} candidates
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Posted {job.posted}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-view-candidates-${job.id}`}
                      >
                        View Candidates
                      </Button>
                      <Button size="sm" data-testid={`button-edit-job-${job.id}`}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}