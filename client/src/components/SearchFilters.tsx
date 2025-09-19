import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, X, Filter } from "lucide-react";

interface FilterOption {
  key: string;
  label: string;
  value: string;
}

interface SearchFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOption[];
  onFilterChange: (filters: FilterOption[]) => void;
  onClearFilters: () => void;
  placeholder?: string;
  filterSections?: {
    department: string[];
    location: string[];
    experience: string[];
    skills: string[];
  };
}

export function SearchFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onClearFilters,
  placeholder = "Search candidates, jobs, or companies...",
  filterSections = {
    department: ["Engineering", "Sales", "Marketing", "Design", "Product", "Operations"],
    location: ["San Francisco", "New York", "Austin", "Seattle", "Remote", "Boston"],
    experience: ["0-2 years", "3-5 years", "6-10 years", "10+ years"],
    skills: ["React", "Python", "JavaScript", "TypeScript", "Node.js", "AWS", "Docker", "Kubernetes"]
  },
}: SearchFiltersProps) {
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedExperience, setSelectedExperience] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");

  const addFilter = (key: string, label: string, value: string) => {
    const newFilter = { key, label, value };
    const existingFilterIndex = filters.findIndex(f => f.key === key);
    
    let newFilters;
    if (existingFilterIndex >= 0) {
      newFilters = [...filters];
      newFilters[existingFilterIndex] = newFilter;
    } else {
      newFilters = [...filters, newFilter];
    }
    
    onFilterChange(newFilters);
  };

  const removeFilter = (key: string) => {
    const newFilters = filters.filter(f => f.key !== key);
    onFilterChange(newFilters);
    
    // Reset the corresponding select
    if (key === "department") setSelectedDepartment("");
    if (key === "location") setSelectedLocation("");
    if (key === "experience") setSelectedExperience("");
    if (key === "skill") setSelectedSkill("");
  };

  return (
    <Card data-testid="search-filters">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-4 w-4" />
          Search & Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {/* Filter Selects */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={selectedDepartment}
              onValueChange={(value) => {
                setSelectedDepartment(value);
                addFilter("department", "Department", value);
              }}
            >
              <SelectTrigger data-testid="select-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {filterSections.department.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select
              value={selectedLocation}
              onValueChange={(value) => {
                setSelectedLocation(value);
                addFilter("location", "Location", value);
              }}
            >
              <SelectTrigger data-testid="select-location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {filterSections.location.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience">Experience</Label>
            <Select
              value={selectedExperience}
              onValueChange={(value) => {
                setSelectedExperience(value);
                addFilter("experience", "Experience", value);
              }}
            >
              <SelectTrigger data-testid="select-experience">
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                {filterSections.experience.map((exp) => (
                  <SelectItem key={exp} value={exp}>
                    {exp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill">Skills</Label>
            <Select
              value={selectedSkill}
              onValueChange={(value) => {
                setSelectedSkill(value);
                addFilter("skill", "Skill", value);
              }}
            >
              <SelectTrigger data-testid="select-skill">
                <SelectValue placeholder="Select skill" />
              </SelectTrigger>
              <SelectContent>
                {filterSections.skills.map((skill) => (
                  <SelectItem key={skill} value={skill}>
                    {skill}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {filters.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Active Filters:</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                data-testid="button-clear-filters"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Badge
                  key={filter.key}
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`badge-filter-${filter.key}`}
                >
                  <span>{filter.label}: {filter.value}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => removeFilter(filter.key)}
                    data-testid={`button-remove-filter-${filter.key}`}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}