import { useState } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Upload, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

const mockMaterials = [
  {
    id: "1",
    title: "Calculus I Notes",
    subject: "Mathematics",
    status: "approved",
    screening: "passed",
    downloads: 234,
  },
  {
    id: "2",
    title: "Linear Algebra Guide",
    subject: "Mathematics",
    status: "pending",
    screening: "passed",
    downloads: 0,
  },
  {
    id: "3",
    title: "Statistics Cheat Sheet",
    subject: "Statistics",
    status: "approved",
    screening: "passed",
    downloads: 156,
  },
];

export function MyMaterials() {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = () => {
    if (title && subject && description) {
      toast.success("Material submitted for review!");
      setTitle("");
      setSubject("");
      setDescription("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Learning Materials</h1>
            <p className="text-gray-600 mt-1">Upload and manage your teaching materials</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Learning Material</DialogTitle>
                <DialogDescription>
                  Share your teaching materials with students. Materials will be reviewed by your
                  organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Material Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Calculus I - Complete Notes"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="physics">Physics</SelectItem>
                      <SelectItem value="chemistry">Chemistry</SelectItem>
                      <SelectItem value="biology">Biology</SelectItem>
                      <SelectItem value="computer-science">Computer Science</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the content..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <Input type="file" className="hidden" id="fileUpload" accept=".pdf,.doc,.docx" />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                      <span className="text-xs text-gray-500 block mt-1">PDF, DOC, DOCX (max 10MB)</span>
                    </label>
                  </div>
                </div>
                <Button onClick={handleUpload} className="w-full">
                  Submit for Review
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {mockMaterials.map((material) => (
            <Card key={material.id}>
              <CardHeader>
                <FileText className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>{material.title}</CardTitle>
                <CardDescription>{material.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={material.status === "approved" ? "default" : "secondary"}>
                      {material.status === "approved" ? "Approved" : "Pending Review"}
                    </Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Auto-Screening: Passed
                    </Badge>
                    {material.status === "approved" && (
                      <span className="text-sm text-gray-500">{material.downloads} downloads</span>
                    )}
                  </div>
                  <Button variant="outline" className="w-full">View Details</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
