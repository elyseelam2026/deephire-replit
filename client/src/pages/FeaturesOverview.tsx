import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, Users, Target, Video, BarChart3, Zap, 
  Plug, Database, MessageSquare, Globe, ArrowRight 
} from 'lucide-react';

export default function FeaturesOverview() {
  const features = [
    {
      name: 'Salary Benchmarking',
      icon: DollarSign,
      description: 'Market data + offer optimization with acceptance probability',
      route: '/salary-benchmark',
      status: 'live',
      revenue: '$199+',
      color: 'bg-green-600',
    },
    {
      name: 'War Room',
      icon: Users,
      description: 'Hiring committee voting + consensus scoring for candidates',
      route: '/war-room',
      status: 'live',
      revenue: '$499+',
      color: 'bg-blue-600',
    },
    {
      name: 'Predictive Scoring',
      icon: Target,
      description: 'AI success probability + 2-year retention risk analysis',
      route: '/predictive-score',
      status: 'live',
      revenue: '$149+',
      color: 'bg-purple-600',
    },
    {
      name: 'Video Screening',
      icon: Video,
      description: 'One-way video interviews with AI communication scoring',
      route: '#',
      status: 'beta',
      revenue: '$99+',
      color: 'bg-red-600',
    },
    {
      name: 'Diversity Analytics',
      icon: BarChart3,
      description: 'DEI metrics + bias detection + compliance reporting',
      route: '#',
      status: 'beta',
      revenue: '$79+',
      color: 'bg-yellow-600',
    },
    {
      name: 'Competitor Intel',
      icon: Zap,
      description: 'Interview tracking + talent flow analytics',
      route: '#',
      status: 'beta',
      revenue: '$129+',
      color: 'bg-orange-600',
    },
    {
      name: 'ATS Integrations',
      icon: Plug,
      description: 'Sync with Greenhouse, Workday, Lever, Bullhorn',
      route: '/ats-integrations',
      status: 'live',
      revenue: 'Included',
      color: 'bg-cyan-600',
    },
    {
      name: 'Passive Talent CRM',
      icon: Database,
      description: 'Save candidates + automated re-engagement campaigns',
      route: '/passive-talent',
      status: 'live',
      revenue: 'Included',
      color: 'bg-indigo-600',
    },
    {
      name: 'Slack Integration',
      icon: MessageSquare,
      description: 'Real-time recruiting alerts in your Slack workspace',
      route: '/slack-integration',
      status: 'live',
      revenue: 'Included',
      color: 'bg-pink-600',
    },
    {
      name: 'White-Label Platform',
      icon: Globe,
      description: 'Multi-tenant setup + custom branding + resell revenue',
      route: '/white-label',
      status: 'live',
      revenue: '20-33% margin',
      color: 'bg-teal-600',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">🚀 DeepHire 10-Feature Platform</h1>
        <p className="text-lg text-gray-600">
          AI-powered enterprise recruiting with comprehensive talent management & revenue multipliers
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">10</div>
            <p className="text-sm text-gray-600">Enterprise Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">7</div>
            <p className="text-sm text-gray-600">Live Features</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">$1.5M</div>
            <p className="text-sm text-gray-600">Annual ARR Potential</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">100%</div>
            <p className="text-sm text-gray-600">PostgreSQL Backed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">0</div>
            <p className="text-sm text-gray-600">LSP Errors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <a
              key={feature.name}
              href={feature.route}
              className="block"
            >
              <Card
                className="cursor-pointer transition-all hover:shadow-lg h-full"
              >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`${feature.color} p-2 rounded-lg text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant={feature.status === 'live' ? 'default' : 'secondary'}>
                        {feature.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold mb-2">{feature.name}</h3>
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                      {feature.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-600">
                        {feature.revenue}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
            </a>
          );
        })}
      </div>

      <Card className="mt-12">
        <CardHeader>
          <CardTitle>Revenue Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-lg mb-1">Candidate Tier</div>
              <p className="text-sm text-gray-600">$9.99/year per candidate</p>
              <p className="text-xs text-gray-500 mt-2">10,000 candidates × $9.99 = $99,900/year</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="font-semibold text-lg mb-1">Company Tier</div>
              <p className="text-sm text-gray-600">$1,999-$50,000/month per company</p>
              <p className="text-xs text-gray-500 mt-2">50 companies × $10k avg = $600k/year</p>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="font-semibold text-lg mb-1">Agency/White-Label</div>
              <p className="text-sm text-gray-600">20-33% revenue share on placements</p>
              <p className="text-xs text-gray-500 mt-2">10 agencies × $100k = $1M+/year</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Total Annual Recurring Revenue (ARR) Potential: $1.7M+</strong> from enterprise features alone, 
              plus marketplace transaction fees, premium support, and white-label revenue share.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
