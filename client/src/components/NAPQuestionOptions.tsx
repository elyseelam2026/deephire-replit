import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type NAPQuestion = {
  dimension: 'growthPreference' | 'remotePolicy' | 'leadershipStyle' | 'competitorContext' | 'teamDynamics';
  question: string;
  options: Array<{
    label: string;
    value: string;
    description?: string;
  }>;
};

interface NAPQuestionOptionsProps {
  question: NAPQuestion;
  onSelect: (dimension: string, value: string) => void;
  isLoading?: boolean;
}

export function NAPQuestionOptions({ question, onSelect, isLoading }: NAPQuestionOptionsProps) {
  const dimensionEmoji: Record<string, string> = {
    growthPreference: '🎯',
    remotePolicy: '🌍',
    leadershipStyle: '👔',
    competitorContext: '🏢',
    teamDynamics: '👥'
  };

  return (
    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 p-4">
      <div className="space-y-3">
        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
          {dimensionEmoji[question.dimension]} {question.question}
        </p>
        
        <div className="flex flex-wrap gap-2">
          {question.options.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => onSelect(question.dimension, option.value)}
              disabled={isLoading}
              className="text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900 border-blue-300 dark:border-blue-700"
              data-testid={`nap-option-${question.dimension}-${idx}`}
            >
              {option.label}
              {option.description && (
                <span className="ml-1 text-xs opacity-70">({option.description})</span>
              )}
            </Button>
          ))}
        </div>
        
        <p className="text-xs text-blue-700 dark:text-blue-300 italic">
          Or type your own answer in the chat below
        </p>
      </div>
    </Card>
  );
}

// Standard NAP questions for generic role discovery
export const STANDARD_NAP_QUESTIONS: Record<string, NAPQuestion> = {
  growthPreference: {
    dimension: 'growthPreference',
    question: 'Are they building/leading teams or going deep as a specialist?',
    options: [
      { label: 'Leadership Builder', value: 'leadership', description: 'Team scaling' },
      { label: 'Deep Specialist', value: 'specialist', description: 'Expertise' },
      { label: 'Flexible', value: 'flexible' }
    ]
  },
  remotePolicy: {
    dimension: 'remotePolicy',
    question: 'What work arrangement do you need?',
    options: [
      { label: 'Remote', value: 'remote' },
      { label: 'Hybrid', value: 'hybrid' },
      { label: 'On-Site', value: 'onsite' },
      { label: 'Flexible', value: 'flexible' }
    ]
  },
  leadershipStyle: {
    dimension: 'leadershipStyle',
    question: 'What leadership style fits your team?',
    options: [
      { label: 'Hands-On Coach', value: 'hands_on' },
      { label: 'Hands-Off Executive', value: 'hands_off' },
      { label: 'Collaborative', value: 'collaborative' },
      { label: 'No Preference', value: 'flexible' }
    ]
  },
  competitorContext: {
    dimension: 'competitorContext',
    question: 'Any specific companies to poach talent from?',
    options: [
      { label: 'FAANG', value: 'faang' },
      { label: 'Fortune 500', value: 'fortune500' },
      { label: 'Startups', value: 'startups' },
      { label: 'Any', value: 'any' }
    ]
  },
  teamDynamics: {
    dimension: 'teamDynamics',
    question: 'Tell me about the team they\'ll lead/join',
    options: [
      { label: 'High Performers', value: 'high_performers' },
      { label: 'Mixed Levels', value: 'mixed' },
      { label: 'Building From Scratch', value: 'new_team' },
      { label: 'Skip for Now', value: 'skip' }
    ]
  }
};
