import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthMeterProps {
  password: string;
  onChange?: (strength: { isValid: boolean; score: number; feedback: string[] }) => void;
}

export function PasswordStrengthMeter({ password, onChange }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState({ isValid: false, score: 0, feedback: [] as string[] });

  useEffect(() => {
    if (!password) {
      setStrength({ isValid: false, score: 0, feedback: [] });
      onChange?.({ isValid: false, score: 0, feedback: [] });
      return;
    }

    let score = 0;
    const feedback: string[] = [];

    // Length checks
    if (password.length >= 8) score += 1;
    else feedback.push("At least 8 characters");

    if (password.length >= 12) score += 1;
    else if (password.length >= 8) feedback.push("12+ characters recommended");

    // Character type checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("Add lowercase letters");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("Add uppercase letters");

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push("Add numbers");

    if (/[!@#$%^&*]/.test(password)) score += 1;
    else feedback.push("Add special characters (!@#$%^&*)");

    const isValid = score >= 3;
    setStrength({ isValid, score, feedback });
    onChange?.({ isValid, score, feedback });
  }, [password, onChange]);

  const getStrengthColor = () => {
    if (strength.score === 0) return "bg-gray-200";
    if (strength.score <= 2) return "bg-red-500";
    if (strength.score <= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strength.score === 0) return "";
    if (strength.score <= 2) return "Weak";
    if (strength.score <= 4) return "Fair";
    return "Strong";
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Password Strength</label>
        <span className={`text-xs font-semibold ${
          strength.score <= 2 ? "text-red-600" :
          strength.score <= 4 ? "text-yellow-600" :
          "text-green-600"
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      <Progress 
        value={(strength.score / 6) * 100} 
        className="h-2"
      />
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {strength.feedback.map((item, idx) => (
            <li key={idx}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
