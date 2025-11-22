import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Zap } from "lucide-react";

export default function ResearchManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Research Management</h1>
        <p className="text-muted-foreground mt-2">AI-powered research and promise tracking</p>
      </div>

      <Tabs defaultValue="ai-research" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-research">
            <Search className="h-4 w-4 mr-2" />
            AI Research
          </TabsTrigger>
          <TabsTrigger value="ai-promises">
            <Zap className="h-4 w-4 mr-2" />
            AI Promises
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Research</CardTitle>
              <CardDescription>
                Research candidates and companies using AI intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">AI research tools coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-promises" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Promises</CardTitle>
              <CardDescription>
                Track and manage AI processing promises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">AI promises tracking coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
