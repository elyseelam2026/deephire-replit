import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Briefcase, Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SoftSkillsEvaluator } from "./SoftSkillsEvaluator";
import { ActivityLog } from "./ActivityLog";
import { ATSPipelineStatus } from "./ATSPipelineStatus";
import { CandidateCareerHistoryTab } from "./CandidateCareerHistoryTab";
import { CandidateFilesTab } from "./CandidateFilesTab";
import { CandidateJobAssignmentsTab } from "./CandidateJobAssignmentsTab";
import { CandidateExecutiveBioTab } from "./CandidateExecutiveBioTab";

interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  email: string | null;
  phoneNumber: string | null;
  skills: string[] | null;
  cvUrl: string | null;
  linkedinUrl: string | null;
}

interface JobCandidate {
  id: number;
  fitScore: number | null;
  hardSkillScore: number | null;
  softSkillScore: number | null;
  status: string;
}

interface CandidateDetailModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  candidateId: number | null;
}

export function CandidateDetailModal({
  isOpen,
  onOpenChange,
  jobId,
  candidateId
}: CandidateDetailModalProps) {
  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ['/api/candidates', candidateId],
    enabled: !!candidateId && isOpen
  });

  const { data: jobCandidate } = useQuery<JobCandidate>({
    queryKey: ['/api/jobs', jobId, 'candidates', candidateId],
    enabled: !!candidateId && isOpen
  });

  if (!candidateId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : candidate ? (
          <>
            {/* Header */}
            <DialogHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback>
                    {candidate.firstName[0]}{candidate.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-2xl">
                    {candidate.firstName} {candidate.lastName}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-base">
                    <div className="space-y-1">
                      {candidate.currentTitle && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          {candidate.currentTitle}
                          {candidate.currentCompany && ` at ${candidate.currentCompany}`}
                        </div>
                      )}
                      {candidate.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {candidate.location}
                        </div>
                      )}
                      {candidate.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${candidate.email}`} className="hover:underline">
                            {candidate.email}
                          </a>
                        </div>
                      )}
                      {candidate.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {candidate.phoneNumber}
                        </div>
                      )}
                    </div>
                  </DialogDescription>
                </div>

                {/* Scores */}
                {jobCandidate && (
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-2">Fit Scores</div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        {jobCandidate.fitScore ?? "—"}
                      </div>
                      <div className="text-xs">
                        Hard: {jobCandidate.hardSkillScore}/70
                      </div>
                      <div className="text-xs">
                        Soft: {jobCandidate.softSkillScore}/30
                      </div>
                      <Badge className="mt-2">{jobCandidate.status}</Badge>
                    </div>
                  </div>
                )}
              </div>
            </DialogHeader>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="career">Career</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="jobs">Jobs</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {candidate.skills && candidate.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map(skill => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <CandidateExecutiveBioTab candidateId={candidate.id} />
                {candidate.linkedinUrl && (
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="font-medium text-sm">LinkedIn Profile</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {candidate.linkedinUrl}
                    </div>
                  </a>
                )}
                {candidate.cvUrl && (
                  <a
                    href={candidate.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 border rounded-lg hover:bg-accent"
                  >
                    <div className="font-medium text-sm">Resume / CV</div>
                    <div className="text-xs text-muted-foreground">
                      Download resume
                    </div>
                  </a>
                )}
              </TabsContent>

              <TabsContent value="evaluation" className="space-y-4">
                {jobCandidate && (
                  <ATSPipelineStatus
                    jobId={jobId}
                    candidateId={candidateId}
                    currentStatus={jobCandidate.status || 'sourced'}
                  />
                )}
                <SoftSkillsEvaluator
                  jobId={jobId}
                  candidateId={candidateId}
                  currentSoftSkillScore={jobCandidate?.softSkillScore ?? undefined}
                />
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <ActivityLog jobId={jobId} candidateId={candidateId} />
              </TabsContent>

              <TabsContent value="career">
                <CandidateCareerHistoryTab candidateId={candidate.id} />
              </TabsContent>

              <TabsContent value="files">
                <CandidateFilesTab candidateId={candidate.id} />
              </TabsContent>

              <TabsContent value="jobs">
                <CandidateJobAssignmentsTab candidateId={candidate.id} />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
