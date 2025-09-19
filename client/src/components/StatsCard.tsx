import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  description?: string;
}

export function StatsCard({ title, value, change, icon: Icon, description }: StatsCardProps) {
  const isPositiveChange = change && change.value > 0;
  const isNegativeChange = change && change.value < 0;

  return (
    <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid="text-stats-value">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {change && (
          <div className="flex items-center space-x-1 text-xs mt-1">
            <span
              className={`font-medium ${
                isPositiveChange
                  ? "text-green-600 dark:text-green-400"
                  : isNegativeChange
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              }`}
              data-testid="text-stats-change"
            >
              {isPositiveChange ? "+" : ""}{change.value}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}