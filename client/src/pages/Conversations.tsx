import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Clock, User, Briefcase, Building2, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type Message = {
  role: string;
  content: string;
  timestamp?: string;
};

type Conversation = {
  id: number;
  jobId: number;
  candidateId: number | null;
  messages: Message[];
  status: string;
  createdAt: string;
  updatedAt: string;
  job: {
    id: number;
    title: string;
    department: string;
    company: {
      id: number;
      name: string;
      location: string;
    };
  };
  candidate?: {
    id: number;
    firstName: string;
    lastName: string;
    currentTitle: string;
    currentCompany: string;
  };
};

export default function Conversations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Success",
        description: "New conversation started",
      });
      // Navigate to the new conversation (use relative path in nested router)
      setLocation(`/conversations/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="conversations-page">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">Manage AI-powered candidate conversations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6" data-testid="conversations-page">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">Manage AI-powered candidate conversations</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load conversations. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return "?";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getLastMessage = (messages: Message[]) => {
    const userMessages = messages.filter(m => m.role !== 'system');
    return userMessages[userMessages.length - 1];
  };

  return (
    <div className="space-y-6 p-6" data-testid="conversations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">
            AI-powered candidate conversations ({conversations?.length || 0} active)
          </p>
        </div>
        <Button
          data-testid="button-new-conversation"
          onClick={() => createConversationMutation.mutate()}
          disabled={createConversationMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          {createConversationMutation.isPending ? 'Creating...' : 'Start New Conversation'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {conversations?.map((conversation) => {
          const lastMessage = getLastMessage(conversation.messages);
          const handleCardClick = () => {
            // Use relative path in nested router
            setLocation(`/conversations/${conversation.id}`);
          };
          return (
            <Card
              key={conversation.id}
              className="hover-elevate cursor-pointer"
              onClick={handleCardClick}
              data-testid={`conversation-card-${conversation.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg" data-testid={`conversation-job-${conversation.id}`}>
                        {conversation.job?.title || 'Active Conversation'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {conversation.job?.company?.name || 'In Progress'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(conversation.status)}>
                    {conversation.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversation.candidate && (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                        {getInitials(conversation.candidate.firstName, conversation.candidate.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm" data-testid={`conversation-candidate-${conversation.id}`}>
                        {conversation.candidate.firstName} {conversation.candidate.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.candidate.currentTitle} at {conversation.candidate.currentCompany}
                      </p>
                    </div>
                  </div>
                )}

                {lastMessage && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Last message from {lastMessage.role === 'recruiter' ? 'recruiter' : 'candidate'}:
                    </p>
                    <p className="text-sm line-clamp-2" data-testid={`conversation-last-message-${conversation.id}`}>
                      {lastMessage.content}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span data-testid={`conversation-updated-${conversation.id}`}>
                      {formatTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <span>{conversation.messages.filter(m => m.role !== 'system').length} messages</span>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-conversation-${conversation.id}`}>
                    View Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {conversations?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start AI-powered conversations with candidates to streamline your recruitment process.
            </p>
            <Button data-testid="button-start-first-conversation">
              <MessageSquare className="h-4 w-4 mr-2" />
              Start Your First Conversation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}