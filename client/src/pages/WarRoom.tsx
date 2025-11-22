import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Check, X } from 'lucide-react';

export default function WarRoom() {
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const jobId = new URLSearchParams(window.location.search).get('jobId');

  // Fetch candidates
  const { data: candidates = [] } = useQuery({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}/candidates`);
      return res.json();
    },
    enabled: !!jobId
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ vote }: { vote: string }) => {
      return apiRequest('POST', `/api/war-rooms/${jobId}/vote`, {
        candidateId: selectedCandidateId,
        vote,
        reasoning: ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/war-rooms', jobId] });
    }
  });

  const voteOptions = [
    { value: 'strong_yes', label: 'Strong Yes', color: 'bg-green-600' },
    { value: 'yes', label: 'Yes', color: 'bg-green-500' },
    { value: 'maybe', label: 'Maybe', color: 'bg-yellow-500' },
    { value: 'no', label: 'No', color: 'bg-red-500' },
    { value: 'strong_no', label: 'Strong No', color: 'bg-red-700' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">🎯 Hiring Committee War Room</h1>

      <div className="grid grid-cols-3 gap-8">
        {/* Candidate List */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {candidates.map((candidate: any) => (
                <button
                  key={candidate.id}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={`w-full p-3 rounded text-left ${
                    selectedCandidateId === candidate.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className="font-semibold">{candidate.firstName} {candidate.lastName}</div>
                  <div className="text-sm text-gray-600">{candidate.currentTitle}</div>
                  <Badge className="mt-2">{candidate.matchScore}% Match</Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Candidate Details + Voting */}
        {selectedCandidateId && (
          <div className="col-span-2 space-y-6">
            {candidates
              .filter((c: any) => c.id === selectedCandidateId)
              .map((candidate: any) => (
                <div key={candidate.id} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{candidate.firstName} {candidate.lastName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-600">Title</div>
                        <div className="font-semibold">{candidate.currentTitle}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Skills</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(candidate.skills || []).map((skill: string) => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Match Score</div>
                        <div className="text-2xl font-bold text-blue-600">{candidate.matchScore}%</div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Committee Voting */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Committee Vote</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-5 gap-3">
                        {voteOptions.map((option) => (
                          <Button
                            key={option.value}
                            className={`${option.color} text-white`}
                            onClick={() => voteMutation.mutate({ vote: option.value })}
                            disabled={voteMutation.isPending}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
