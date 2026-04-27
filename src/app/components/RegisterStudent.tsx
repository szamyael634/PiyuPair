import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { GraduationCap, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RegisterStudent() {
  const navigate = useNavigate();
  const { register, loginError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name:       "",
    email:      "",
    password:   "",
    studentId:  "",
    program:    "",
    yearLevel:  "",
    department: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await register({ ...formData, role: "student" });

    setLoading(false);

    if (success) {
      toast.success(
        "Registration submitted! Your account is pending admin approval. " +
        "You'll be able to sign in once approved."
      );
      navigate("/login");
    } else {
      toast.error(loginError ?? "Registration failed. Please try again.");
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Student Registration</CardTitle>
          <CardDescription>Create your student account</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Approval notice */}
          <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              Student accounts require admin approval before you can sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" value={formData.name} onChange={set("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@university.edu" value={formData.email} onChange={set("email")} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={formData.password} onChange={set("password")} required minLength={8} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID Number</Label>
                <Input id="studentId" placeholder="2026-12345" value={formData.studentId} onChange={set("studentId")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">Program</Label>
                <Input id="program" placeholder="Computer Science" value={formData.program} onChange={set("program")} required />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yearLevel">Year Level</Label>
                <select
                  id="yearLevel"
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={formData.yearLevel}
                  onChange={set("yearLevel")}
                  required
                >
                  <option value="">Select year level</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" placeholder="College of Engineering" value={formData.department} onChange={set("department")} required />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : "Register as Student"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
            <Link to="/" className="text-sm text-gray-500 hover:underline mt-2 inline-block">
              Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
