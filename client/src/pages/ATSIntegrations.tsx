import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Plug } from 'lucide-react';

export default function ATSIntegrations() {
  const [connections, setConnections] = useState([
    { id: 1, atsType: 'greenhouse', status: 'connected', lastSync: '2 hours ago' },
    { id: 2, atsType: 'workday', status: 'disconnected', lastSync: 'Never' },
  ]);

  const atsSystems = [
    { name: 'Greenhouse', icon: '🌱', status: 'Connected', connected: true },
    { name: 'Workday', icon: '📅', status: 'Not Connected', connected: false },
    { name: 'Lever', icon: '📊', status: 'Not Connected', connected: false },
    { name: 'Bullhorn', icon: '💼', status: 'Not Connected', connected: false },
  ];

  const handleConnect = (atsType: string) => {
    alert(`Connecting to ${atsType}... OAuth flow would open here`);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">🔗 ATS Integrations</h1>
      <p className="text-gray-600 mb-8">Connect your Applicant Tracking System to sync job postings and candidate data</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {atsSystems.map((ats) => (
          <Card key={ats.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{ats.icon}</span>
                  <div>
                    <CardTitle>{ats.name}</CardTitle>
                    <p className="text-sm text-gray-600">{ats.status}</p>
                  </div>
                </div>
                {ats.connected ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleConnect(ats.name)}
                variant={ats.connected ? 'outline' : 'default'}
                className="w-full"
              >
                <Plug className="w-4 h-4 mr-2" />
                {ats.connected ? 'Disconnect' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-semibold capitalize">{conn.atsType}</div>
                  <div className="text-sm text-gray-600">Last synced: {conn.lastSync}</div>
                </div>
                <Badge variant={conn.status === 'connected' ? 'default' : 'secondary'}>
                  {conn.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
