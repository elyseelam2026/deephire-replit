import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/components/ChatInterface";
import { apiRequest } from "@/lib/queryClient";
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
    },
  });

  // Create conversation once on mount
  useEffect(() => {
    if (!conversationId && !createConversationMutation.isPending) {
      createConversationMutation.mutate();
    }
  }, []);

  // Fetch current conversation (only GET, no side effects)
  const { data: conversation, isLoading } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await fetch(`/api/conversations/${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      return response.json();
    },
    enabled: !!conversationId,
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

  // Auto-redirect to Jobs page when job is created
  useEffect(() => {
    if (!conversation?.messages) return;
    
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage?.metadata?.type === 'job_created' && lastMessage.metadata.jobId) {
      // Small delay to show "Job Created!" message first
      const timer = setTimeout(() => {
        toast({
          title: "Redirecting...",
          description: "Taking you to the Jobs page to see your results",
        });
        setLocation('/recruiting/jobs');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [conversation?.messages]);

  const messages = conversation?.messages || [];
  const matchedCandidates = conversation?.matchedCandidates || [];

  return (
    <div className="h-full" data-testid="dashboard">
      <ChatInterface
        conversationId={conversationId || undefined}
        messages={messages}
        matchedCandidates={matchedCandidates}
        onSendMessage={handleSendMessage}
        isLoading={sendMessageMutation.isPending}
      />
    </div>
  );
}
