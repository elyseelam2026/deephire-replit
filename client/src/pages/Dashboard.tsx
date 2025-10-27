import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/components/ChatInterface";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    type?: 'jd_upload' | 'candidate_results' | 'clarification' | 'text';
    fileName?: string;
    candidateIds?: number[];
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

  // Create conversation on mount (once)
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

  const messages = conversation?.messages || [];

  return (
    <div className="h-full" data-testid="dashboard">
      <ChatInterface
        conversationId={conversationId || undefined}
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={sendMessageMutation.isPending}
      />
    </div>
  );
}
