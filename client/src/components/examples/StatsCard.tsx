import { StatsCard } from '../StatsCard';
import { Users, Briefcase, Target, TrendingUp } from 'lucide-react';

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <StatsCard
        title="Total Candidates"
        value={1248}
        change={{ value: 12.5, label: "from last month" }}
        icon={Users}
        description="Active in database"
      />
      <StatsCard
        title="Open Positions"
        value={23}
        change={{ value: -8.2, label: "from last week" }}
        icon={Briefcase}
        description="Currently hiring"
      />
      <StatsCard
        title="Match Rate"
        value="78%"
        change={{ value: 4.1, label: "improvement" }}
        icon={Target}
        description="AI matching accuracy"
      />
      <StatsCard
        title="Placements"
        value={156}
        change={{ value: 15.3, label: "this quarter" }}
        icon={TrendingUp}
        description="Successful hires"
      />
    </div>
  );
}