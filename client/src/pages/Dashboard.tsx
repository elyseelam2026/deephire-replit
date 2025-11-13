import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/components/ChatInterface";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

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

export default function Dashboard() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const { toast} = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get companyId from URL params (for demo/testing purposes)
  // TODO: This will come from user session when authentication is implemented
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get('companyId');

  // Create conversation on mount (once)
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (companyId) {
        body.companyId = parseInt(companyId);
      }
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Failed to create conversation');
      return response.json();
    },
    onSuccess: (data) => {
      setConversationId(data.id);
      // Persist conversation ID in localStorage for memory
      localStorage.setItem('currentConversationId', data.id.toString());
    },
  });

  // Load existing conversation from localStorage OR create new one
  useEffect(() => {
    // Check if there's a saved conversation ID
    const savedConversationId = localStorage.getItem('currentConversationId');
    
    if (savedConversationId) {
      // Resume existing conversation
      const id = parseInt(savedConversationId);
      setConversationId(id);
    } else if (!conversationId && !createConversationMutation.isPending) {
      // Create new conversation only if no saved one exists
      createConversationMutation.mutate();
    }
  }, []);

  // Fetch current conversation with error handling for missing conversations
  const { data: conversation, isLoading } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem('currentConversationId');
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
      const formData = new FormData();
      formData.append('message', message);
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
    if (!conversationId) {
      toast({
        title: "Error",
        description: "No active conversation",
        variant: "destructive",
      });
      return;
    }

    await sendMessageMutation.mutateAsync({ message: content, file });
  };

  // Auto-redirect to Jobs page when job is created (only once per job)
  useEffect(() => {
    if (!conversation?.messages) return;
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage?.metadata?.type === 'job_created' && lastMessage.metadata.jobId) {
      const jobId = lastMessage.metadata.jobId;
      
      // Check if we've already redirected for this job
      const redirectedJobs = JSON.parse(localStorage.getItem('redirectedJobs') || '[]');
      if (redirectedJobs.includes(jobId)) {
        return; // Already redirected, don't do it again
      }
      
      // Mark this job as redirected
      redirectedJobs.push(jobId);
      localStorage.setItem('redirectedJobs', JSON.stringify(redirectedJobs));
      
      // Small delay to show "Job Created!" message first
      const timer = setTimeout(() => {
        toast({
          title: "Redirecting...",
          description: "Taking you to the Jobs page to see your results",
        });
        setLocation('/jobs');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [conversation?.messages]);

  const handleNewConversation = () => {
    // Clear localStorage and create new conversation
    localStorage.removeItem('currentConversationId');
    setConversationId(null);
    createConversationMutation.mutate();
  };

  const messages = conversation?.messages || [];
  const matchedCandidates = conversation?.matchedCandidates || [];

  return (
    <div className="h-full flex flex-col" data-testid="dashboard">
      {/* Header with New Conversation button */}
      {messages.length > 0 && (
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Conversation #{conversationId}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNewConversation}
            data-testid="button-new-conversation"
          >
            New Conversation
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          conversationId={conversationId || undefined}
          messages={messages}
          matchedCandidates={matchedCandidates}
          onSendMessage={handleSendMessage}
          isLoading={sendMessageMutation.isPending}
        />
      </div>
    </div>
  );
}
