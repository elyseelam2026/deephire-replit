import { JobCard } from '../JobCard';

export default function JobCardExample() {
  const handleViewCandidates = () => {
    console.log('View candidates triggered');
  };

  const handleEdit = () => {
    console.log('Edit job triggered');
  };

  return (
    <div className="max-w-md">
      <JobCard
        id={1}
        title="Senior Frontend Developer"
        company="TechCorp Inc"
        location="San Francisco, CA"
        department="Engineering"
        urgency="high"
        matchCount={15}
        createdAt="2024-01-15"
        onViewCandidates={handleViewCandidates}
        onEdit={handleEdit}
      />
    </div>
  );
}