import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Filter,
  Download,
  UserPlus,
  BarChart3,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PipelineControlsProps {
  totalCount: number;
  filteredCount?: number;
  searchQuery?: string;
  filters?: PipelineFilters;
  onSearch?: (query: string) => void;
  onFilterChange?: (filters: PipelineFilters) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  onAddCandidates?: () => void;
  onShowAnalytics?: () => void;
}

export interface PipelineFilters {
  status?: string[];
  minScore?: number;
  searchTier?: number[];
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

const statusOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "presented", label: "Presented" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "placed", label: "Placed" },
  { value: "rejected", label: "Rejected" }
];

export default function PipelineControls({
  totalCount,
  filteredCount,
  searchQuery = "",
  filters = {},
  onSearch,
  onFilterChange,
  onExport,
  onAddCandidates,
  onShowAnalytics
}: PipelineControlsProps) {
  const { toast } = useToast();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearchChange = (value: string) => {
    onSearch?.(value);
  };

  const handleStatusFilter = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];
    
    const newFilters = { ...filters, status: newStatuses.length > 0 ? newStatuses : undefined };
    onFilterChange?.(newFilters);
  };

  const handleScoreFilter = (minScore: string) => {
    const score = minScore === "any" ? undefined : parseInt(minScore);
    const newFilters = { ...filters, minScore: score };
    onFilterChange?.(newFilters);
  };

  const handleTierFilter = (tier: string) => {
    const tierNum = parseInt(tier);
    const currentTiers = filters.searchTier || [];
    const newTiers = currentTiers.includes(tierNum)
      ? currentTiers.filter(t => t !== tierNum)
      : [...currentTiers, tierNum];
    
    const newFilters = { ...filters, searchTier: newTiers.length > 0 ? newTiers : undefined };
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    onFilterChange?.({});
    onSearch?.("");
  };

  const activeFilterCount = [
    filters.status?.length || 0,
    filters.minScore ? 1 : 0,
    filters.searchTier?.length || 0
  ].reduce((a, b) => a + b, 0);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (onExport) {
      onExport(format);
    } else {
      toast({
        title: "Export Feature",
        description: `${format.toUpperCase()} export will be available soon`
      });
    }
  };

  return (
    <div className="space-y-3" data-testid="pipeline-controls">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-pipeline-search"
          />
        </div>

        {/* Filter Button */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" data-testid="button-filters">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map(option => (
                    <Badge
                      key={option.value}
                      variant={filters.status?.includes(option.value) ? "default" : "outline"}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleStatusFilter(option.value)}
                      data-testid={`filter-status-${option.value}`}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Score Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum Match Score</label>
                <Select
                  value={filters.minScore?.toString() || "any"}
                  onValueChange={handleScoreFilter}
                >
                  <SelectTrigger data-testid="select-min-score">
                    <SelectValue placeholder="Any score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any score</SelectItem>
                    <SelectItem value="90">90%+</SelectItem>
                    <SelectItem value="80">80%+</SelectItem>
                    <SelectItem value="70">70%+</SelectItem>
                    <SelectItem value="60">60%+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tier Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Tier</label>
                <div className="flex gap-1">
                  {[1, 2].map(tier => (
                    <Badge
                      key={tier}
                      variant={filters.searchTier?.includes(tier) ? "default" : "outline"}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleTierFilter(tier.toString())}
                      data-testid={`filter-tier-${tier}`}
                    >
                      Tier {tier}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="export-csv">
              CSV Spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')} data-testid="export-pdf">
              PDF Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Candidates */}
        {onAddCandidates && (
          <Button onClick={onAddCandidates} data-testid="button-add-candidates">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Candidates
          </Button>
        )}

        {/* Analytics */}
        {onShowAnalytics && (
          <Button variant="outline" onClick={onShowAnalytics} data-testid="button-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(searchQuery || activeFilterCount > 0) && (
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary">
              Search: "{searchQuery}"
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleSearchChange("")}
              />
            </Badge>
          )}
          {filters.status?.map(status => (
            <Badge key={status} variant="secondary">
              Status: {statusOptions.find(s => s.value === status)?.label}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleStatusFilter(status)}
              />
            </Badge>
          ))}
          {filters.minScore && (
            <Badge variant="secondary">
              Score: {filters.minScore}%+
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleScoreFilter("")}
              />
            </Badge>
          )}
          {filters.searchTier?.map(tier => (
            <Badge key={tier} variant="secondary">
              Tier {tier}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => handleTierFilter(tier.toString())}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Result Count */}
      <div className="text-sm text-muted-foreground">
        {filteredCount !== undefined && filteredCount !== totalCount ? (
          <>Showing {filteredCount} of {totalCount} candidates</>
        ) : (
          <>{totalCount} {totalCount === 1 ? 'candidate' : 'candidates'}</>
        )}
      </div>
    </div>
  );
}
