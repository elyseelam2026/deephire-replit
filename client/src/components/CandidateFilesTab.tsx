import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Trash2, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CandidateFile {
  id: number;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  category: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface CandidateFilesTabProps {
  candidateId: number;
}

export function CandidateFilesTab({ candidateId }: CandidateFilesTabProps) {
  const { toast } = useToast();
  const { data: files, isLoading } = useQuery<CandidateFile[]>({
    queryKey: ['/api/candidates', candidateId, 'files'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/files`);
      if (response.status === 404) return [];
      if (!response.ok) throw new Error('Failed to fetch files');
      return response.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await fetch(`/api/candidates/${candidateId}/files/${fileId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete file');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'File deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/candidates', candidateId, 'files'] });
    },
    onError: () => {
      toast({ title: 'Error deleting file', variant: 'destructive' });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No files uploaded yet
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-2" data-testid="files-tab">
      {files.map((file) => (
        <Card key={file.id} className="p-3 hover-elevate">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.originalFilename}</p>
                <p className="text-xs text-muted-foreground">
                  {file.category} • {formatFileSize(file.fileSize)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => window.open(`/api/candidates/${candidateId}/files/${file.id}/download`)}
                data-testid={`button-download-file-${file.id}`}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate(file.id)}
                disabled={deleteMutation.isPending}
                data-testid={`button-delete-file-${file.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
