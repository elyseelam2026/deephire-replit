import { CandidateCard } from '../CandidateCard';

export default function CandidateCardExample() {
  const handleViewProfile = () => {
    console.log('View profile triggered');
  };

  const handleContact = () => {
    console.log('Contact candidate triggered');
  };

  return (
    <div className="max-w-md">
      <CandidateCard
        id={1}
        firstName="Sarah"
        lastName="Chen"
        currentTitle="Senior Software Engineer"
        currentCompany="Google"
        location="Mountain View, CA"
        yearsExperience={6}
        skills={["React", "TypeScript", "Node.js", "Python", "AWS", "Docker"]}
        matchScore={92}
        salaryExpectations={180000}
        isAvailable={true}
        onViewProfile={handleViewProfile}
        onContact={handleContact}
      />
    </div>
  );
}