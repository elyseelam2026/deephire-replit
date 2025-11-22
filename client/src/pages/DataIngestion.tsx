import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Users, Building2, Upload } from "lucide-react";
import AdminBulkUpload from "@/pages/AdminBulkUpload";

export default function DataIngestion() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Ingestion</h1>
        <p className="text-muted-foreground mt-2">Add and manage candidate, company, and team data</p>
      </div>

      <Tabs defaultValue="bulk-upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="quick-add">
            <UserPlus className="h-4 w-4 mr-2" />
            Quick Add
          </TabsTrigger>
          <TabsTrigger value="candidates">
            <Users className="h-4 w-4 mr-2" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="companies">
            <Building2 className="h-4 w-4 mr-2" />
            Companies
          </TabsTrigger>
          <TabsTrigger value="bulk-upload">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-upload">
          <AdminBulkUpload />
        </TabsContent>

        <TabsContent value="quick-add">
          <p className="text-muted-foreground">Quick Add feature coming soon</p>
        </TabsContent>

        <TabsContent value="candidates">
          <p className="text-muted-foreground">Candidate upload feature coming soon</p>
        </TabsContent>

        <TabsContent value="companies">
          <p className="text-muted-foreground">Company upload feature coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
