import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Globe, Users, DollarSign } from 'lucide-react';

export default function WhiteLabel() {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: 'Elite Ventures Partners',
      domain: 'recruit.elitevp.com',
      color: '#1e40af',
      status: 'active',
      revenue: 4500,
      placements: 12,
    },
    {
      id: 2,
      name: 'TechTalent Agency',
      domain: 'jobs.techtalent.co',
      color: '#059669',
      status: 'active',
      revenue: 3200,
      placements: 8,
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', domain: '', color: '#000000' });

  const handleAddClient = () => {
    if (newClient.name && newClient.domain) {
      setClients([
        ...clients,
        {
          id: clients.length + 1,
          ...newClient,
          status: 'active',
          revenue: 0,
          placements: 0,
        },
      ]);
      setNewClient({ name: '', domain: '', color: '#000000' });
      setShowForm(false);
    }
  };

  const totalRevenue = clients.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">🏢 White-Label Platform</h1>
      <p className="text-gray-600 mb-8">Manage agency partners and white-label instances</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Partners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Custom Domains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Button onClick={() => setShowForm(!showForm)} className="mb-4">
          + Add Partner
        </Button>

        {showForm && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Partner Name</label>
                  <Input
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="e.g., Acme Recruiting"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Custom Domain</label>
                  <Input
                    value={newClient.domain}
                    onChange={(e) => setNewClient({ ...newClient, domain: e.target.value })}
                    placeholder="e.g., recruit.acme.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Brand Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newClient.color}
                      onChange={(e) => setNewClient({ ...newClient, color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <Input value={newClient.color} readOnly className="flex-1" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddClient}>Create Instance</Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partner Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clients.map((client) => (
              <div key={client.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: client.color }}
                    />
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-gray-600">{client.domain}</p>
                    </div>
                  </div>
                  <Badge>{client.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Monthly Revenue</span>
                    <div className="font-semibold">${client.revenue.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Placements This Month</span>
                    <div className="font-semibold">{client.placements}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
