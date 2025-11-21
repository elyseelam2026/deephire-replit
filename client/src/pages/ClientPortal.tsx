import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, CheckCircle, Clock, MessageSquare, Sparkles } from "lucide-react";
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

type Job = {
  id: number;
  title: string;
  description?: string;
  status: string;
  companyId: number;
  skills?: string[];
  createdAt?: string;
};

export default function ClientPortal() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocationRoute] = useLocation();

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

  // Fetch real jobs from API
  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    queryFn: async () => {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      return response.json();
    },
  });

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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" data-testid="tab-chat">
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Briefcase className="h-4 w-4 mr-2" />
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
                    Tell me who you're looking for, or upload a job description to create new jobs and find candidates.
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
              {isLoadingJobs ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Loading jobs...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">No jobs posted yet. Use the AI Assistant to create your first job.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                      data-testid={`job-listing-${job.id}`}
                      onClick={() => setLocationRoute(`/client/jobs/${job.id}`)}
                    >
                      <div>
                        <h4 className="font-medium">{job.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {job.skills?.join(", ") || "No skills listed"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-view-job-${job.id}`}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}