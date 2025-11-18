import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatInterface } from "@/components/ChatInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  job?: {
    id: number;
    title: string;
    company: {
      name: string;
    };
  };
};

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>();
  const conversationId = parseInt(id || '0');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversation, isLoading } = useQuery<Conversation>({
    queryKey: ['/api/conversations', conversationId],
    enabled: !!conversationId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, file }: { message: string; file?: File }) => {
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

  const deleteConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
      // Check if we're in the client portal or recruiting portal
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/client')) {
        setLocation('/client/messages');
      } else {
        setLocation('/recruiting/conversations');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
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

  const handleBack = () => {
    const currentPath = window.location.pathname;
    if (currentPath.startsWith('/client')) {
      setLocation('/client/messages');
    } else {
      setLocation('/recruiting/conversations');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-2">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Conversation not found</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="conversation-detail">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {conversation.job?.title || 'Conversation'}
            </h1>
            {conversation.job?.company && (
              <p className="text-muted-foreground">
                {conversation.job.company.name}
              </p>
            )}
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              data-testid="button-delete-conversation"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this conversation and all its messages.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConversationMutation.mutate()}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>AI Recruiting Assistant</CardTitle>
              <p className="text-sm text-muted-foreground">
                Continue your conversation or ask follow-up questions.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ChatInterface
            conversationId={conversationId}
            messages={conversation.messages || []}
            matchedCandidates={conversation.matchedCandidates}
            onSendMessage={handleSendMessage}
            isLoading={sendMessageMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
