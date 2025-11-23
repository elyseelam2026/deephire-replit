import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus, Users, Building2, Upload, FileUp, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Quick add schema
const quickAddSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Valid email required"),
  company: z.string().optional(),
  title: z.string().optional(),
});

type QuickAddForm = z.infer<typeof quickAddSchema>;

// Company add schema
const companyAddSchema = z.object({
  name: z.string().min(1, "Company name required"),
  industry: z.string().optional(),
  location: z.string().optional(),
});

type CompanyAddForm = z.infer<typeof companyAddSchema>;

export default function DataIngestion() {
  const { toast } = useToast();
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);

  // Quick add form
  const quickForm = useForm<QuickAddForm>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { firstName: "", lastName: "", email: "", company: "", title: "" }
  });

  // Company add form
  const companyForm = useForm<CompanyAddForm>({
    resolver: zodResolver(companyAddSchema),
    defaultValues: { name: "", industry: "", location: "" }
  });

  // Quick add mutation
  const quickAddMutation = useMutation({
    mutationFn: async (data: QuickAddForm) => {
      return apiRequest("POST", "/api/data-ingestion/quick-add", data);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Candidate added successfully" });
      quickForm.reset();
      setRecentCandidates([data, ...recentCandidates.slice(0, 4)]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add candidate", variant: "destructive" });
    }
  });

  // Company add mutation
  const companyAddMutation = useMutation({
    mutationFn: async (data: CompanyAddForm) => {
      return apiRequest("POST", "/api/data-ingestion/quick-add-company", data);
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Company added successfully" });
      companyForm.reset();
      setRecentCompanies([data, ...recentCompanies.slice(0, 4)]);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add company", variant: "destructive" });
    }
  });

  // Bulk upload mutations
  const candidateUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/data-ingestion/bulk-candidates", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Upload Complete", 
        description: `${data.count} candidates imported successfully` 
      });
      setCandidateFile(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    }
  });

  const companyUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/data-ingestion/bulk-companies", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Upload Complete", 
        description: `${data.count} companies imported successfully` 
      });
      setCompanyFile(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Ingestion</h1>
        <p className="text-muted-foreground mt-2">Add and manage candidate, company, and team data</p>
      </div>

      <Tabs defaultValue="quick-add" className="space-y-4">
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

        {/* Quick Add Tab */}
        <TabsContent value="quick-add" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Add Single Candidate</h2>
            <Form {...quickForm}>
              <form onSubmit={quickForm.handleSubmit((data) => quickAddMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={quickForm.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John" data-testid="input-first-name" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={quickForm.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Doe" data-testid="input-last-name" />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={quickForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="john@example.com" type="email" data-testid="input-email" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={quickForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Engineering Manager" data-testid="input-title" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={quickForm.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Company</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corp" data-testid="input-company" />
                    </FormControl>
                  </FormItem>
                )} />
                <Button type="submit" disabled={quickAddMutation.isPending} data-testid="button-quick-add">
                  {quickAddMutation.isPending ? "Adding..." : "Add Candidate"}
                </Button>
              </form>
            </Form>

            {recentCandidates.length > 0 && (
              <div className="mt-6 pt-6 border-t space-y-2">
                <h3 className="font-semibold text-sm">Recently Added</h3>
                {recentCandidates.map((c, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {c.firstName} {c.lastName} ({c.email})
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Candidates Bulk Upload */}
        <TabsContent value="candidates" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Candidates</h2>
            <p className="text-sm text-muted-foreground mb-4">Upload CSV or Excel file with candidate data</p>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCandidateFile(file);
                  }}
                  data-testid="input-candidate-file"
                  className="hidden"
                  id="candidate-file-input"
                />
                <label htmlFor="candidate-file-input" className="cursor-pointer">
                  <FileUp className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select file</p>
                  <p className="text-xs text-muted-foreground">CSV or Excel format</p>
                </label>
                {candidateFile && <p className="mt-2 text-sm text-green-600">{candidateFile.name}</p>}
              </div>
              <Button
                onClick={() => candidateFile && candidateUploadMutation.mutate(candidateFile)}
                disabled={!candidateFile || candidateUploadMutation.isPending}
                data-testid="button-upload-candidates"
              >
                {candidateUploadMutation.isPending ? "Uploading..." : "Upload Candidates"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Companies Bulk Upload */}
        <TabsContent value="companies" className="space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-4">Add Company</h2>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit((data) => companyAddMutation.mutate(data))} className="space-y-4">
                  <FormField control={companyForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Acme Corp" data-testid="input-company-name" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={companyForm.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Technology" data-testid="input-industry" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <FormField control={companyForm.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="San Francisco, CA" data-testid="input-location" />
                      </FormControl>
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={companyAddMutation.isPending} data-testid="button-add-company">
                    {companyAddMutation.isPending ? "Adding..." : "Add Company"}
                  </Button>
                </form>
              </Form>

              {recentCompanies.length > 0 && (
                <div className="mt-6 pt-6 border-t space-y-2">
                  <h3 className="font-semibold text-sm">Recently Added</h3>
                  {recentCompanies.map((c, i) => (
                    <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {c.name} {c.industry && `(${c.industry})`}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h2 className="text-xl font-semibold mb-4">Bulk Upload Companies</h2>
              <p className="text-sm text-muted-foreground mb-4">Upload CSV or Excel file with company data</p>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCompanyFile(file);
                  }}
                  data-testid="input-company-file"
                  className="hidden"
                  id="company-file-input"
                />
                <label htmlFor="company-file-input" className="cursor-pointer">
                  <FileUp className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select file</p>
                  <p className="text-xs text-muted-foreground">CSV or Excel format</p>
                </label>
                {companyFile && <p className="mt-2 text-sm text-green-600">{companyFile.name}</p>}
              </div>
              <Button
                onClick={() => companyFile && companyUploadMutation.mutate(companyFile)}
                disabled={!companyFile || companyUploadMutation.isPending}
                className="mt-4"
                data-testid="button-upload-companies"
              >
                {companyUploadMutation.isPending ? "Uploading..." : "Upload Companies"}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="bulk-upload" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Candidates Card */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Bulk Upload Candidates</h2>
              <p className="text-sm text-muted-foreground mb-4">Upload CSV or Excel with columns: firstName, lastName, email</p>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCandidateFile(file);
                  }}
                  data-testid="input-bulk-candidate-file"
                  className="hidden"
                  id="bulk-candidate-file-input"
                />
                <label htmlFor="bulk-candidate-file-input" className="cursor-pointer">
                  <FileUp className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select file</p>
                  {candidateFile && <p className="mt-2 text-sm text-green-600">{candidateFile.name}</p>}
                </label>
              </div>
              <Button
                onClick={() => candidateFile && candidateUploadMutation.mutate(candidateFile)}
                disabled={!candidateFile || candidateUploadMutation.isPending}
                className="mt-4 w-full"
                data-testid="button-bulk-upload-candidates"
              >
                {candidateUploadMutation.isPending ? "Uploading..." : "Upload Candidates"}
              </Button>
            </Card>

            {/* Companies Card */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Bulk Upload Companies</h2>
              <p className="text-sm text-muted-foreground mb-4">Upload CSV or Excel with columns: name, industry, location</p>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCompanyFile(file);
                  }}
                  data-testid="input-bulk-company-file"
                  className="hidden"
                  id="bulk-company-file-input"
                />
                <label htmlFor="bulk-company-file-input" className="cursor-pointer">
                  <FileUp className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to select file</p>
                  {companyFile && <p className="mt-2 text-sm text-green-600">{companyFile.name}</p>}
                </label>
              </div>
              <Button
                onClick={() => companyFile && companyUploadMutation.mutate(companyFile)}
                disabled={!companyFile || companyUploadMutation.isPending}
                className="mt-4 w-full"
                data-testid="button-bulk-upload-companies"
              >
                {companyUploadMutation.isPending ? "Uploading..." : "Upload Companies"}
              </Button>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
