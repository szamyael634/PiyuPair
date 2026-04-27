import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function RegisterOrganization() {
  const { register, loginError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    orgName:       "",
    name:          "", // contact person
    email:         "",
    message:       "",
    password:      "placeholder", // not used for org requests
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await register({
      ...formData,
      role: "organization_request" as any,
    });

    setLoading(false);

    if (success) {
      setSubmitted(true);
      toast.success("Organization request submitted! The admin will review and contact you.");
    } else {
      toast.error(loginError ?? "Submission failed. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              The Piyupair admin will review your organization request and create your account.
              You'll be contacted at <strong>{formData.email}</strong>.
            </p>
            <Link to="/" className="text-blue-600 hover:underline text-sm">
              Return to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Organization Registration</CardTitle>
          <CardDescription>
            Submit a request to create an organization account. The admin will review and set up your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input id="orgName" placeholder="Excellence Tutoring Center" value={formData.orgName} onChange={set("orgName")} required />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Contact Person</Label>
                <Input id="name" placeholder="Dr. Richard Smith" value={formData.name} onChange={set("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" placeholder="contact@excellence.com" value={formData.email} onChange={set("email")} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message to Admin (optional)</Label>
              <Textarea
                id="message"
                placeholder="Brief description of your organization and why you want to join Piyupair…"
                value={formData.message}
                onChange={set("message")}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
              ) : (
                "Submit Organization Request"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:underline">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
