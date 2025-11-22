import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface SearchFilters {
  keywords: string[];
  jobTitles: string[];
  skills: string[];
  companies: string[];
  excludeCompanies: string[];
  locations: string[];
  education: string[];
}

interface SearchBuilderProps {
  onQueryGenerated: (query: string) => void;
  initialFilters?: SearchFilters;
}

export function SearchBuilder({ onQueryGenerated, initialFilters }: SearchBuilderProps) {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters || {
    keywords: [],
    jobTitles: [],
    skills: [],
    companies: [],
    excludeCompanies: [],
    locations: [],
    education: []
  });

  const [currentInput, setCurrentInput] = useState("");
  const [currentCategory, setCurrentCategory] = useState<keyof SearchFilters>("keywords");

  const addFilter = (category: keyof SearchFilters, value: string) => {
    if (!value.trim()) return;
    
    setFilters(prev => ({
      ...prev,
      [category]: [...(prev[category] || []), value.trim()]
    }));
    setCurrentInput("");
  };

  const removeFilter = (category: keyof SearchFilters, index: number) => {
    setFilters(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index)
    }));
  };

  const generateQuery = (): string => {
    const parts: string[] = [];

    // Keywords
    if (filters.keywords.length > 0) {
      const keywordPart = filters.keywords.map(k => `"${k}"`).join(" OR ");
      parts.push(`(${keywordPart})`);
    }

    // Job Titles
    if (filters.jobTitles.length > 0) {
      const titlePart = filters.jobTitles.map(t => `"${t}"`).join(" OR ");
      parts.push(`(${titlePart})`);
    }

    // Skills
    if (filters.skills.length > 0) {
      const skillPart = filters.skills.join(" AND ");
      parts.push(`(${skillPart})`);
    }

    // Companies (must include)
    if (filters.companies.length > 0) {
      const companyPart = filters.companies.map(c => `"${c}"`).join(" OR ");
      parts.push(`(${companyPart})`);
    }

    // Locations
    if (filters.locations.length > 0) {
      const locationPart = filters.locations.join(" OR ");
      parts.push(`(${locationPart})`);
    }

    // Education
    if (filters.education.length > 0) {
      const eduPart = filters.education.map(e => `"${e}"`).join(" OR ");
      parts.push(`(${eduPart})`);
    }

    // Excluded companies
    if (filters.excludeCompanies.length > 0) {
      filters.excludeCompanies.forEach(company => {
        parts.push(`-"${company}"`);
      });
    }

    return parts.length > 0 ? parts.join(" AND ") : "";
  };

  const handleGenerateAndSearch = () => {
    const query = generateQuery();
    if (query) {
      onQueryGenerated(query);
    }
  };

  const categories: Array<{ key: keyof SearchFilters; label: string; placeholder: string }> = [
    { key: "keywords", label: "Keywords", placeholder: "E.g., blockchain, AI, fintech" },
    { key: "jobTitles", label: "Job Titles", placeholder: "E.g., CEO, CTO, Product Manager" },
    { key: "skills", label: "Skills", placeholder: "E.g., Python, AWS, Machine Learning" },
    { key: "companies", label: "Companies (Include)", placeholder: "E.g., Google, Meta, Stripe" },
    { key: "excludeCompanies", label: "Companies (Exclude)", placeholder: "E.g., Freelance, Consulting" },
    { key: "locations", label: "Locations", placeholder: "E.g., San Francisco, NYC, London" },
    { key: "education", label: "Education", placeholder: "E.g., Stanford, MIT, Harvard" }
  ];

  const query = generateQuery();

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Search Criteria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-select">Category</Label>
              <select
                id="category-select"
                value={currentCategory}
                onChange={(e) => setCurrentCategory(e.target.value as keyof SearchFilters)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                data-testid="select-filter-category"
              >
                {categories.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-input">Value</Label>
              <div className="flex gap-2">
                <input
                  id="filter-input"
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder={categories.find(c => c.key === currentCategory)?.placeholder}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addFilter(currentCategory, currentInput);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
                  data-testid="input-filter-value"
                />
                <Button
                  size="sm"
                  onClick={() => addFilter(currentCategory, currentInput)}
                  data-testid="button-add-filter"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Display */}
      {categories.map(cat => (
        (filters[cat.key] as string[])?.length > 0 && (
          <Card key={cat.key} className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{cat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(filters[cat.key] as string[]).map((value, idx) => (
                  <Badge
                    key={idx}
                    variant={cat.key.includes("exclude") ? "destructive" : "default"}
                    className="flex items-center gap-1 cursor-pointer hover-elevate"
                    data-testid={`badge-${cat.key}-${idx}`}
                  >
                    {value}
                    <X
                      className="h-3 w-3 ml-1"
                      onClick={() => removeFilter(cat.key, idx)}
                      data-testid={`button-remove-${cat.key}-${idx}`}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}

      {/* Generated Query Preview */}
      {query && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-sm">Generated Boolean Query</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={query}
              readOnly
              className="min-h-[80px] resize-none bg-white dark:bg-gray-950"
              data-testid="textarea-generated-query"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This query will be used to search LinkedIn for matching candidates.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerateAndSearch}
        disabled={!query}
        className="w-full"
        size="lg"
        data-testid="button-generate-search"
      >
        Generate & Search
      </Button>
    </div>
  );
}
