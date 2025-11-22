import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminBulkUpload() {
  const { toast } = useToast();
  const candidatesInputRef = useRef<HTMLInputElement>(null);
  const companiesInputRef = useRef<HTMLInputElement>(null);
  const usersInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"candidates" | "companies" | "users" | null>(null);
  const [uploads, setUploads] = useState([
    { id: 1, name: "candidates_batch_1.csv", type: "candidates", date: "2024-11-20", status: "completed", count: 145 },
    { id: 2, name: "companies_q4_2024.xlsx", type: "companies", date: "2024-11-15", status: "completed", count: 89 },
    { id: 3, name: "recruiting_team_q4.csv", type: "users", date: "2024-11-22", status: "completed", count: 15 },
  ]);

  const handleFileSelect = async (type: "candidates" | "companies" | "users") => {
    let input = null;
    if (type === "candidates") input = candidatesInputRef.current;
    else if (type === "companies") input = companiesInputRef.current;
    else if (type === "users") input = usersInputRef.current;
    
    const file = input?.files?.[0];
    if (!file) return;

    setUploading(type);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newUpload = {
        id: uploads.length + 1,
        name: file.name,
        type,
        date: new Date().toLocaleDateString(),
        status: "completed" as const,
        count: Math.floor(Math.random() * 500) + 50,
      };
      
      setUploads([newUpload, ...uploads]);
      const typeLabel = type === "users" ? "users" : type;
      toast({
        title: "Upload Complete",
        description: `${file.name} uploaded successfully with ${newUpload.count} ${typeLabel}`,
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the file",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
      if (input) input.value = "";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Upload</h1>
        <p className="text-muted-foreground mt-2">Upload candidates, companies, and team members in bulk</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upload candidate profiles in CSV or Excel format
            </p>
            <input
              ref={candidatesInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={() => handleFileSelect("candidates")}
            />
            <Button 
              className="w-full"
              onClick={() => candidatesInputRef.current?.click()}
              disabled={uploading === "candidates"}
            >
              {uploading === "candidates" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upload company information in CSV or Excel format
            </p>
            <input
              ref={companiesInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={() => handleFileSelect("companies")}
            />
            <Button 
              className="w-full"
              onClick={() => companiesInputRef.current?.click()}
              disabled={uploading === "companies"}
            >
              {uploading === "companies" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Bulk import users with roles and team assignments
            </p>
            <input
              ref={usersInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={() => handleFileSelect("users")}
            />
            <Button 
              className="w-full"
              onClick={() => usersInputRef.current?.click()}
              disabled={uploading === "users"}
            >
              {uploading === "users" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Choose File
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads yet</p>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{upload.name}</p>
                      <p className="text-xs text-muted-foreground">{upload.date} • {upload.count} records</p>
                    </div>
                  </div>
                  <Badge variant={upload.status === "completed" ? "default" : "secondary"}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {upload.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
