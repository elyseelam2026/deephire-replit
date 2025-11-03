import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Upload, Loader2, Sparkles, User, FileText } from "lucide-react";
import { Link } from "wouter";

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

type MatchedCandidate = {
  candidateId: number;
  matchScore: number;
  firstName: string;
  lastName: string;
  currentTitle: string;
  currentCompany: string;
  location: string;
  skills: string[];
};

interface ChatInterfaceProps {
  conversationId?: number;
  onSendMessage: (content: string, file?: File) => Promise<void>;
  messages: Message[];
  matchedCandidates?: MatchedCandidate[];
  isLoading?: boolean;
}

export function ChatInterface({ messages, matchedCandidates, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    const messageContent = input.trim();
    setInput("");
    setSelectedFile(null);

    await onSendMessage(messageContent, selectedFile || undefined);
    
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setInput(`Uploaded: ${file.name}\n\nPlease analyze this job description.`);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Helper to render markdown links in message content
  const renderMessageContent = (content: string) => {
    // Split content by markdown links [text](url)
    const parts = [];
    let lastIndex = 0;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      // Add the link
      const linkText = match[1];
      const linkUrl = match[2];
      
      // Use Link component for internal links, <a> for external
      if (linkUrl.startsWith('http') || linkUrl.startsWith('mailto:')) {
        parts.push(
          <a 
            key={match.index}
            href={linkUrl} 
            className="text-primary underline hover:text-primary/80 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>
        );
      } else {
        parts.push(
          <Link
            key={match.index}
            href={linkUrl}
            className="text-primary underline hover:text-primary/80 font-medium"
          >
            {linkText}
          </Link>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-semibold">AI Recruiting Assistant</h3>
              <p className="text-muted-foreground max-w-md">
                Tell me who you're looking for, or upload a job description to get started.
              </p>
            </div>
            <div className="flex gap-3">
              <Card className="p-4 max-w-xs hover-elevate cursor-pointer" onClick={() => setInput("Find me a CFO with private equity experience in Hong Kong")}>
                <p className="text-sm font-medium mb-1">💼 Find a CFO</p>
                <p className="text-xs text-muted-foreground">PE experience in Hong Kong</p>
              </Card>
              <Card className="p-4 max-w-xs hover-elevate cursor-pointer" onClick={() => setInput("I need a senior software engineer with 5+ years React experience")}>
                <p className="text-sm font-medium mb-1">👨‍💻 Tech Talent</p>
                <p className="text-xs text-muted-foreground">Senior React engineer</p>
              </Card>
              <Card className="p-4 max-w-xs hover-elevate cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <p className="text-sm font-medium mb-1">📄 Upload JD</p>
                <p className="text-xs text-muted-foreground">Let AI analyze your job description</p>
              </Card>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
            data-testid={`message-${index}`}
          >
            {/* Avatar */}
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>
                {message.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            {/* Message Content */}
            <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[70%]`}>
              <Card className={`p-4 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                {/* File attachment indicator */}
                {message.metadata?.type === 'jd_upload' && message.metadata.fileName && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{message.metadata.fileName}</span>
                  </div>
                )}

                {/* Message text */}
                <p className="text-sm whitespace-pre-wrap">{renderMessageContent(message.content)}</p>

                {/* Candidate results indicator */}
                {message.metadata?.type === 'candidate_results' && message.metadata.candidateIds && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Badge variant="secondary" className="text-xs">
                      {message.metadata.candidateIds.length} candidates found
                    </Badge>
                  </div>
                )}
              </Card>
              
              <span className="text-xs text-muted-foreground mt-1">
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <Sparkles className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        {/* Matched Candidates Display */}
        {matchedCandidates && matchedCandidates.length > 0 && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-secondary text-secondary-foreground">
                <Sparkles className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <h3 className="font-semibold text-sm">Top Matches</h3>
              <div className="grid gap-3">
                {matchedCandidates.filter(m => m.matchScore > 50).slice(0, 5).map((match) => (
                  <Card 
                    key={match.candidateId} 
                    className="p-4 hover-elevate cursor-pointer"
                    data-testid={`candidate-card-${match.candidateId}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {match.firstName} {match.lastName}
                            </h4>
                            <Badge variant={match.matchScore >= 80 ? "default" : "secondary"} className="text-xs">
                              {match.matchScore}% match
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-muted-foreground mt-1">
                            {match.currentTitle}
                          </p>
                          {match.currentCompany && (
                            <p className="text-sm text-muted-foreground">
                              {match.currentCompany}
                            </p>
                          )}
                          {match.location && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {match.location}
                            </p>
                          )}
                        </div>
                      </div>
                      {match.skills && match.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {match.skills.slice(0, 4).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {match.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{match.skills.length - 4} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Selected file indicator */}
          {selectedFile && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setInput("");
                }}
                data-testid="button-remove-file"
              >
                ✕
              </Button>
            </div>
          )}

          {/* Input box */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4" />
            </Button>

            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe who you're looking for, or upload a job description..."
              className="resize-none min-h-[56px] max-h-32"
              disabled={isLoading}
              data-testid="input-message"
            />

            <Button
              onClick={handleSend}
              disabled={(!input.trim() && !selectedFile) || isLoading}
              size="icon"
              className="shrink-0"
              data-testid="button-send"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
