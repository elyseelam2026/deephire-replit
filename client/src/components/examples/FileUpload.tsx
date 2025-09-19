import { FileUpload } from '../FileUpload';

export default function FileUploadExample() {
  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name, file.size);
  };

  return (
    <div className="max-w-md space-y-4">
      <h3 className="font-medium">Job Description Upload</h3>
      <FileUpload
        onFileSelect={handleFileSelect}
        acceptedTypes=".pdf,.doc,.docx,.txt"
        placeholder="Upload your job description"
      />
    </div>
  );
}