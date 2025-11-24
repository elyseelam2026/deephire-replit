import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Plus, X } from "lucide-react";

interface NAPConfirmationScreenProps {
  nap: any;
  jobId: number;
  onConfirm: (data: {
    dealBreakers: string[];
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    seniorityLevel: string;
    additionalNotes: string;
  }) => void;
  isLoading?: boolean;
}

export function NAPConfirmationScreen({
  nap,
  jobId,
  onConfirm,
  isLoading = false
}: NAPConfirmationScreenProps) {
  const [dealBreakers, setDealBreakers] = useState<string[]>(nap?.dealBreakers || []);
  const [mustHaveSkills, setMustHaveSkills] = useState<string[]>(nap?.mustHaveSkills || nap?.skills?.slice(0, Math.ceil((nap?.skills?.length || 0) / 2)) || []);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>(nap?.niceToHaveSkills || nap?.skills?.slice(Math.ceil((nap?.skills?.length || 0) / 2)) || []);
  const [seniorityLevel, setSeniorityLevel] = useState<string>(nap?.seniorityLevel || "Director-level");
  const [newDealBreaker, setNewDealBreaker] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState(nap?.additionalNotes || "");

  const addDealBreaker = () => {
    if (newDealBreaker.trim()) {
      setDealBreakers([...dealBreakers, newDealBreaker.trim()]);
      setNewDealBreaker("");
    }
  };

  const removeDealBreaker = (index: number) => {
    setDealBreakers(dealBreakers.filter((_, i) => i !== index));
  };

  const toggleSkillCategory = (skill: string) => {
    if (mustHaveSkills.includes(skill)) {
      setMustHaveSkills(mustHaveSkills.filter(s => s !== skill));
      if (!niceToHaveSkills.includes(skill)) {
        setNiceToHaveSkills([...niceToHaveSkills, skill]);
      }
    } else if (niceToHaveSkills.includes(skill)) {
      setNiceToHaveSkills(niceToHaveSkills.filter(s => s !== skill));
    } else {
      setMustHaveSkills([...mustHaveSkills, skill]);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      dealBreakers,
      mustHaveSkills,
      niceToHaveSkills,
      seniorityLevel,
      additionalNotes
    });
  };

  const allSkills = [...new Set([...mustHaveSkills, ...niceToHaveSkills])];

  return (
    <div className="space-y-6" data-testid="nap-confirmation-screen">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            NAP Confirmation
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Review and refine the Need Analysis Profile before sourcing candidates
          </p>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* NAP Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">NAP Summary</h3>
            {nap?.position?.title && (
              <div>
                <Label className="text-xs text-muted-foreground">Position</Label>
                <p className="font-medium">{nap.position.title}</p>
              </div>
            )}
            {nap?.position?.yearsExperience && (
              <div>
                <Label className="text-xs text-muted-foreground">Experience Required</Label>
                <p className="font-medium">{nap.position.yearsExperience}+ years</p>
              </div>
            )}
            {nap?.pain && (
              <div>
                <Label className="text-xs text-muted-foreground">Business Pain Point</Label>
                <p className="font-medium text-sm">{nap.pain}</p>
              </div>
            )}
          </div>

          {/* Seniority Level */}
          <div className="space-y-3">
            <Label htmlFor="seniority">Seniority Level</Label>
            <input
              id="seniority"
              type="text"
              value={seniorityLevel}
              onChange={(e) => setSeniorityLevel(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
              placeholder="e.g., VP-level, C-Suite, Individual Contributor"
              data-testid="input-seniority-level"
            />
          </div>

          {/* Deal-Breakers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <Label>Deal-Breakers (What disqualifies candidates?)</Label>
            </div>
            <div className="space-y-2">
              {dealBreakers.map((breaker, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-900"
                  data-testid={`deal-breaker-${idx}`}
                >
                  <span className="text-sm">{breaker}</span>
                  <button
                    onClick={() => removeDealBreaker(idx)}
                    className="text-red-600 hover:text-red-700"
                    data-testid="button-remove-deal-breaker"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDealBreaker}
                onChange={(e) => setNewDealBreaker(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDealBreaker()}
                placeholder="e.g., Cannot relocate, Must have PE deal experience"
                className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
                data-testid="input-new-deal-breaker"
              />
              <Button
                onClick={addDealBreaker}
                variant="outline"
                size="sm"
                data-testid="button-add-deal-breaker"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Skills Categorization */}
          <div className="space-y-3">
            <Label>Skills: Must-Have vs. Nice-to-Have</Label>
            <p className="text-xs text-muted-foreground">Click skills to toggle between categories</p>
            <div className="space-y-3">
              {allSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {allSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkillCategory(skill)}
                      className="transition-all"
                      data-testid={`skill-badge-${skill}`}
                    >
                      <Badge
                        variant={mustHaveSkills.includes(skill) ? "default" : "secondary"}
                        className="cursor-pointer hover:opacity-80"
                      >
                        {skill}
                        {mustHaveSkills.includes(skill) && <span className="ml-1">✓</span>}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No skills available</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-green-700 dark:text-green-400">Must-Have ({mustHaveSkills.length})</p>
                <p className="text-muted-foreground">Required for this role</p>
              </div>
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">Nice-to-Have ({niceToHaveSkills.length})</p>
                <p className="text-muted-foreground">Preferred but not critical</p>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Any additional context or special instructions for this search..."
              className="min-h-20"
              data-testid="textarea-additional-notes"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              size="lg"
              data-testid="button-confirm-nap"
            >
              {isLoading ? "Confirming..." : "Confirm NAP & Generate Search"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
