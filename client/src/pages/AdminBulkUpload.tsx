import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText } from "lucide-react";

export default function AdminBulkUpload() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Upload</h1>
        <p className="text-muted-foreground mt-2">Upload candidate and company data in bulk</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover-elevate cursor-pointer">
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
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate cursor-pointer">
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
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No uploads yet</p>
        </CardContent>
      </Card>
    </div>
  );
}
