import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

export default function PredictiveScore() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);

  const { data: scoreData } = useQuery({
    queryKey: ['/api/predictive-score', jobId, candidateId],
    queryFn: async () => {
      if (!jobId || !candidateId) return null;
      const res = await fetch(`/api/predictive-score?jobId=${jobId}&candidateId=${candidateId}`);
      return res.json();
    },
    enabled: !!jobId && !!candidateId
  });

  const scoreMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/predictive-score', {
        jobId,
        candidateId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/predictive-score'] });
    }
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">🔮 Predictive Success Scoring</h1>
      <p className="text-gray-600 mb-8">AI-powered prediction of candidate success probability (2+ year tenure)</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-semibold mb-2">Job ID</label>
          <Input
            type="number"
            placeholder="Enter job ID"
            value={jobId || ''}
            onChange={(e) => setJobId(parseInt(e.target.value) || null)}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Candidate ID</label>
          <Input
            type="number"
            placeholder="Enter candidate ID"
            value={candidateId || ''}
            onChange={(e) => setCandidateId(parseInt(e.target.value) || null)}
          />
        </div>
      </div>

      <Button
        onClick={() => scoreMutation.mutate()}
        disabled={!jobId || !candidateId}
        size="lg"
        className="mb-8"
      >
        Calculate Predictive Score
      </Button>

      {scoreMutation.isPending && (
        <div className="text-center py-8">Analyzing historical success patterns...</div>
      )}

      {scoreData && (
        <div className="space-y-6">
          {/* Main Score */}
          <Card className="border-2 border-blue-500">
            <CardHeader>
              <CardTitle className="text-2xl">Success Probability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-6xl font-bold text-blue-600">
                {Math.round((scoreData.successProbability || 0) * 100)}%
              </div>
              <Progress value={(scoreData.successProbability || 0) * 100} className="h-3" />
              <p className="text-gray-600">{scoreData.reasoning}</p>
            </CardContent>
          </Card>

          {/* Retention Risk */}
          <div className={`p-6 rounded-lg border-l-4 ${getRiskColor(scoreData.retentionRisk)} border-l-8`}>
            <div className="flex items-center gap-3 mb-2">
              {scoreData.retentionRisk === 'high' ? (
                <AlertCircle className="w-6 h-6" />
              ) : (
                <TrendingUp className="w-6 h-6" />
              )}
              <h3 className="text-xl font-bold capitalize">Retention Risk: {scoreData.retentionRisk}</h3>
            </div>
            <p className="text-gray-700">Predicted tenure: {scoreData.stayLength} months</p>
          </div>

          {/* Risk Factors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Job Hopping Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Math.round((scoreData.jobHoppingScore || 0) * 100)}</div>
                <Progress value={(scoreData.jobHoppingScore || 0) * 100} className="mt-3 h-2" />
                <p className="text-xs text-gray-600 mt-2">Lower is better</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Culture Fit Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Math.round((scoreData.cultureFitScore || 0) * 100)}</div>
                <Progress value={(scoreData.cultureFitScore || 0) * 100} className="mt-3 h-2" />
                <p className="text-xs text-gray-600 mt-2">Higher is better</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Growth Potential</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Math.round((scoreData.skillGrowthPotential || 0) * 100)}</div>
                <Progress value={(scoreData.skillGrowthPotential || 0) * 100} className="mt-3 h-2" />
                <p className="text-xs text-gray-600 mt-2">Learning potential</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Rating */}
          <Card>
            <CardHeader>
              <CardTitle>Expected Performance Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-yellow-600">{scoreData.performanceRating?.toFixed(1)}/5</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-3xl ${star <= scoreData.performanceRating ? '⭐' : '☆'}`} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
