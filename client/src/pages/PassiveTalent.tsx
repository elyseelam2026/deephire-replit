import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, AlertCircle } from 'lucide-react';

export default function PassiveTalent() {
  const [talentPool, setTalentPool] = useState([
    {
      id: 1,
      name: 'Sarah Chen',
      title: 'VP Engineering',
      reason: 'Perfect fit for future CTO role',
      savedDate: '2024-11-15',
      reengageDate: '2024-12-15',
    },
    {
      id: 2,
      name: 'Michael Torres',
      title: 'Senior Product Manager',
      reason: 'Strong background in B2B SaaS',
      savedDate: '2024-11-10',
      reengageDate: '2024-12-10',
    },
  ]);

  const handleReengage = (candidateId: number) => {
    alert(`Scheduling re-engagement email for candidate ${candidateId}...`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">💾 Passive Talent CRM</h1>
      <p className="text-gray-600 mb-8">Nurture relationships with top candidates for future opportunities</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{talentPool.length}</div>
            <p className="text-sm text-gray-600">Passive candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scheduled Outreach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">3</div>
            <p className="text-sm text-gray-600">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">42%</div>
            <p className="text-sm text-gray-600">To interviews</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {talentPool.map((candidate) => (
              <div key={candidate.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{candidate.name}</h3>
                    <p className="text-sm text-gray-600">{candidate.title}</p>
                  </div>
                  <Badge variant="secondary">{candidate.reason}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Saved {candidate.savedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      Re-engage {candidate.reengageDate}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleReengage(candidate.id)}
                  >
                    Reach Out
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
