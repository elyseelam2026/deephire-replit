import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Mail, Phone, Calendar, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: number;
  type: "note" | "email" | "call" | "meeting";
  content: string;
  createdAt: string;
  createdBy?: string;
}

interface ActivityLogProps {
  jobId: number;
  candidateId: number;
}

const activityTypes = [
  { key: "note", label: "Note", icon: MessageSquare, color: "bg-blue-100 dark:bg-blue-900" },
  { key: "email", label: "Email", icon: Mail, color: "bg-purple-100 dark:bg-purple-900" },
  { key: "call", label: "Call", icon: Phone, color: "bg-green-100 dark:bg-green-900" },
  { key: "meeting", label: "Meeting", icon: Calendar, color: "bg-orange-100 dark:bg-orange-900" }
];

export function ActivityLog({ jobId, candidateId }: ActivityLogProps) {
  const [activeTab, setActiveTab] = useState<"all" | "note" | "email" | "call" | "meeting">("all");
  const [newActivityContent, setNewActivityContent] = useState("");
  const [selectedType, setSelectedType] = useState<"note" | "email" | "call" | "meeting">("note");
  const { toast } = useToast();

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['/api/jobs', jobId, 'candidates', candidateId, 'activities'],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}/activities`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    }
  });

  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          content: newActivityContent
        })
      });
      if (!response.ok) throw new Error('Failed to add activity');
      return response.json();
    },
    onSuccess: () => {
      setNewActivityContent("");
      toast({
        title: "Activity recorded",
        description: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} logged successfully`
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/jobs', jobId, 'candidates', candidateId, 'activities'] 
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record activity",
        variant: "destructive"
      });
    }
  });

  const filtered = activeTab === "all" 
    ? activities 
    : activities.filter(a => a.type === activeTab);

  return (
    <div className="space-y-4" data-testid="activity-log">
      {/* Add Activity */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            {activityTypes.map(type => (
              <Button
                key={type.key}
                variant={selectedType === type.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.key as any)}
                data-testid={`button-activity-type-${type.key}`}
              >
                <type.icon className="h-4 w-4 mr-1" />
                {type.label}
              </Button>
            ))}
          </div>
          <Textarea
            placeholder={`Log a ${selectedType}...`}
            value={newActivityContent}
            onChange={(e) => setNewActivityContent(e.target.value)}
            className="min-h-20 text-sm"
            data-testid="textarea-activity-content"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => addActivityMutation.mutate()}
              disabled={!newActivityContent.trim() || addActivityMutation.isPending}
              size="sm"
              data-testid="button-add-activity"
            >
              {addActivityMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Activity
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Activity Timeline */}
      <div>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({activities.length})</TabsTrigger>
            {activityTypes.map(type => (
              <TabsTrigger key={type.key} value={type.key}>
                {type.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No {activeTab === "all" ? "activities" : activeTab}s yet
              </div>
            ) : (
              filtered.map((activity) => {
                const typeInfo = activityTypes.find(t => t.key === activity.type)!;
                const Icon = typeInfo.icon;
                return (
                  <Card key={activity.id} className="p-3" data-testid={`activity-${activity.id}`}>
                    <div className="flex gap-3">
                      <div className={`${typeInfo.color} rounded-full p-2 flex-shrink-0 h-10 w-10 flex items-center justify-center`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {activity.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground break-words whitespace-pre-wrap">
                          {activity.content}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
