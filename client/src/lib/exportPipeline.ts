import { format } from "date-fns";

interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  currentTitle?: string | null;
  currentCompany?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  yearsExperience?: number | null;
}

interface JobCandidate {
  id: number;
  status: string;
  matchScore: number | null;
  searchTier: number | null;
  addedAt: string;
  statusHistory?: Array<{ status: string; timestamp: string }> | null;
  candidate: Candidate;
}

function calculateTimeInStage(jobCandidate: JobCandidate): string {
  try {
    const statusHistory = jobCandidate.statusHistory || [];
    let referenceDate: Date;

    if (statusHistory.length === 0) {
      referenceDate = new Date(jobCandidate.addedAt);
    } else {
      const lastChange = statusHistory[statusHistory.length - 1];
      if (!lastChange || !lastChange.timestamp) {
        referenceDate = new Date(jobCandidate.addedAt);
      } else {
        referenceDate = new Date(lastChange.timestamp);
      }
    }

    if (isNaN(referenceDate.getTime())) {
      return 'Unknown';
    }

    const diffMs = Date.now() - referenceDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return '< 1h';
  } catch {
    return 'Unknown';
  }
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export function exportPipelineToCSV(candidates: JobCandidate[], jobTitle?: string): void {
  const headers = [
    'Candidate Name',
    'Current Title',
    'Current Company',
    'Status',
    'Match Score',
    'Search Tier',
    'Time in Stage',
    'Added Date',
    'Email',
    'Phone',
    'Location',
    'Years of Experience'
  ];

  const rows = candidates.map(jc => {
    const candidate = jc.candidate;
    const fullName = candidate.displayName || `${candidate.firstName} ${candidate.lastName}`;
    const addedDate = format(new Date(jc.addedAt), 'yyyy-MM-dd HH:mm');
    const timeInStage = calculateTimeInStage(jc);

    return [
      escapeCSV(fullName),
      escapeCSV(candidate.currentTitle),
      escapeCSV(candidate.currentCompany),
      escapeCSV(jc.status),
      escapeCSV(jc.matchScore != null ? `${jc.matchScore}%` : ''),
      escapeCSV(jc.searchTier != null ? `T${jc.searchTier}` : ''),
      escapeCSV(timeInStage),
      escapeCSV(addedDate),
      escapeCSV(candidate.email),
      escapeCSV(candidate.phoneNumber),
      escapeCSV(candidate.location),
      escapeCSV(candidate.yearsExperience)
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const sanitizedTitle = sanitizeFilename(jobTitle || 'export');
  link.setAttribute('href', url);
  link.setAttribute('download', `pipeline-${sanitizedTitle}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
