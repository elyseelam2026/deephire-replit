import { useState } from 'react';
import { SearchFilters } from '../SearchFilters';

interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export default function SearchFiltersExample() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOption[]>([]);

  const handleClearFilters = () => {
    setFilters([]);
    setSearchQuery("");
  };

  return (
    <div className="max-w-4xl">
      <SearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
        placeholder="Search candidates by name, skills, or company..."
      />
    </div>
  );
}