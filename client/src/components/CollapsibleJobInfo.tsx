import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, Briefcase, Target, DollarSign, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CollapsibleJobInfoProps {
  job: {
    jdText?: string | null;
    needAnalysis?: any;
    searchStrategy?: any;
    estimatedPlacementFee?: number | null;
    turnaroundLevel?: string | null;
    turnaroundHours?: number | null;
    skills?: string[] | null;
  };
}

export function CollapsibleJobInfo({ job }: CollapsibleJobInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="shadow">
      <CardContent className="p-0">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 rounded-none hover:bg-muted/50"
          data-testid="button-toggle-job-info"
        >
          <span className="text-sm font-medium text-muted-foreground">
            Job Details · NAP Summary · Compensation · Timeline
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        {isExpanded && (
          <div className="border-t">
            <Tabs defaultValue="brief" className="p-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="brief" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  Job Brief
                </TabsTrigger>
                <TabsTrigger value="nap" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  NAP Summary
                </TabsTrigger>
                <TabsTrigger value="comp" className="text-xs">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Comp
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Timeline
                </TabsTrigger>
              </TabsList>

              <TabsContent value="brief" className="space-y-3 mt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Job Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {job.jdText || 'No job description available'}
                  </p>
                </div>
                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-1">
                      {job.skills.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="nap" className="space-y-3 mt-4">
                {job.needAnalysis ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Needs Analysis Profile</h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                      {Object.entries(job.needAnalysis).map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                          <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No NAP data available</p>
                )}
              </TabsContent>

              <TabsContent value="comp" className="space-y-3 mt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Placement Fee</h4>
                  <div className="text-2xl font-bold">
                    ${(job.estimatedPlacementFee || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Estimated placement fee
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3 mt-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Turnaround</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{job.turnaroundHours || 12}</span>
                    <span className="text-sm text-muted-foreground">hours</span>
                  </div>
                  <Badge variant={job.turnaroundLevel === 'express' ? 'default' : 'secondary'} className="mt-2">
                    {job.turnaroundLevel === 'express' ? 'Express' : 'Standard'} Priority
                  </Badge>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
