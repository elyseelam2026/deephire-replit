import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle } from 'lucide-react';

export default function SlackIntegration() {
  const [notifications, setNotifications] = useState([
    { id: 1, event: 'New candidate match', enabled: true, channel: '#recruiting' },
    { id: 2, event: 'Job application received', enabled: true, channel: '#recruiting' },
    { id: 3, event: 'Offer accepted', enabled: true, channel: '#hiring-wins' },
    { id: 4, event: 'Interview scheduled', enabled: false, channel: '#recruiting' },
  ]);

  const [slackConnected, setSlackConnected] = useState(true);

  const handleToggle = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">💬 Slack Integration</h1>
      <p className="text-gray-600 mb-8">Get real-time recruiting alerts in your Slack workspace</p>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Connection Status</CardTitle>
              <p className="text-sm text-gray-600 mt-2">Workspace: @deep-hire-recruiting</p>
            </div>
            {slackConnected ? (
              <Badge className="bg-green-600">Connected</Badge>
            ) : (
              <Badge variant="secondary">Disconnected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Button variant={slackConnected ? 'outline' : 'default'}>
            {slackConnected ? 'Disconnect' : 'Connect to Slack'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    {notification.event}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Posts to {notification.channel}</p>
                </div>
                <button
                  onClick={() => handleToggle(notification.id)}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full ${
                    notification.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                      notification.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
