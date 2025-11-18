import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface SearchPyramidProps {
  candidates: Array<{
    hardSkillScore?: number | null;
  }>;
}

export function SearchPyramid({ candidates }: SearchPyramidProps) {
  const bands = [
    { min: 92, max: 100, label: '92–100%', color: 'bg-purple-600', labelColor: 'text-purple-600' },
    { min: 85, max: 91,  label: '85–91%',  color: 'bg-blue-600', labelColor: 'text-blue-600' },
    { min: 70, max: 84,  label: '70–84%',  color: 'bg-green-600', labelColor: 'text-green-600' },
    { min: 60, max: 69,  label: '60–69%',  color: 'bg-yellow-500', labelColor: 'text-yellow-600' },
    { min: 0,  max: 59,  label: '<60%',    color: 'bg-gray-400', labelColor: 'text-gray-600' },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Search Pyramid</CardTitle>
        <p className="text-sm text-muted-foreground">Market quality distribution</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {bands.map(band => {
          const count = candidates.filter(c => {
            const score = c.hardSkillScore ?? 0;
            return score >= band.min && score <= band.max;
          }).length;

          const maxCount = Math.max(...bands.map(b => 
            candidates.filter(c => {
              const score = c.hardSkillScore ?? 0;
              return score >= b.min && score <= b.max;
            }).length
          ), 1);

          const widthPercent = count === 0 ? 0 : Math.max(15, (count / maxCount) * 100);

          return (
            <div key={band.min} data-testid={`pyramid-band-${band.label}`}>
              <div className="flex justify-between items-baseline text-sm mb-1.5">
                <span className={`font-bold text-2xl ${band.labelColor}`}>{count}</span>
                <span className="text-muted-foreground font-medium">{band.label}</span>
              </div>
              <div className="h-12 rounded-r-full overflow-hidden bg-muted/40">
                <div 
                  className={`${band.color} h-full transition-all duration-1000 ease-out flex items-center px-3`}
                  style={{ width: `${widthPercent}%` }}
                >
                  {count > 0 && (
                    <span className="text-white text-xs font-medium whitespace-nowrap">
                      {count} {count === 1 ? 'candidate' : 'candidates'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-4xl font-bold" data-testid="text-total-candidates">{candidates.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Candidates Mapped</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
