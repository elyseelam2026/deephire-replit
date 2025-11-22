import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function SalaryBenchmark() {
  const [jobId, setJobId] = useState<number | null>(null);
  const [candidateId, setCandidateId] = useState<number | null>(null);

  const { data: offerData } = useQuery({
    queryKey: ['/api/offer-optimization', jobId, candidateId],
    queryFn: async () => {
      if (!jobId || !candidateId) return null;
      const res = await fetch(`/api/offer-optimization?jobId=${jobId}&candidateId=${candidateId}`);
      return res.json();
    },
    enabled: !!jobId && !!candidateId
  });

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/offer-optimization', {
        jobId,
        candidateId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offer-optimization'] });
    }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">💰 Salary Benchmarking & Offer Optimizer</h1>

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
        onClick={() => optimizeMutation.mutate()}
        disabled={!jobId || !candidateId}
        className="mb-8"
        size="lg"
      >
        Generate Offer Recommendation
      </Button>

      {optimizeMutation.isPending && (
        <div className="text-center py-8">Calculating market-competitive offer...</div>
      )}

      {offerData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Benchmark */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Market Benchmark
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Base Salary</div>
                <div className="text-2xl font-bold">${offerData.benchmarkSalary?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Bonus</div>
                <div className="text-xl font-semibold">${offerData.benchmarkBonus?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Equity</div>
                <div className="text-xl font-semibold">{offerData.benchmarkEquity}%</div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recommended Offer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-600">Base Salary</div>
                <div className="text-2xl font-bold text-green-600">${offerData.recommendedSalary?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Bonus</div>
                <div className="text-xl font-semibold">${offerData.recommendedBonus?.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Equity</div>
                <div className="text-xl font-semibold">{offerData.recommendedEquity}%</div>
              </div>
            </CardContent>
          </Card>

          {/* Success Probability */}
          <Card>
            <CardHeader>
              <CardTitle>Acceptance Probability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold text-blue-600">
                {Math.round((offerData.acceptanceProbability || 0) * 100)}%
              </div>
              <div className="text-sm text-gray-600 mt-4">
                {offerData.reasoning}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
