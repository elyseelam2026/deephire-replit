import { JobPostForm } from '../JobPostForm';

export default function JobPostFormExample() {
  const handleSubmit = (data: any) => {
    console.log('Job posting data:', data);
  };

  return (
    <div className="p-4">
      <JobPostForm onSubmit={handleSubmit} />
    </div>
  );
}