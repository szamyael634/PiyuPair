import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Calendar, DollarSign, Users, Star, TrendingUp, BookOpen, PenTool } from "lucide-react";

export function TutorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "tutor") {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  if (!user.approved) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Application Pending</CardTitle>
              <CardDescription>
                Your tutor application is being reviewed by {user.organizationName}. You'll be
                notified once approved.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}!</h1>
          <p className="text-gray-600 mt-1">
            {user.organizationName} • Manage your tutoring sessions and materials
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Calendar className="h-8 w-8 text-blue-600" />}
            label="Sessions This Month"
            value="24"
          />
          <StatCard
            icon={<Users className="h-8 w-8 text-purple-600" />}
            label="Active Students"
            value="18"
          />
          <StatCard
            icon={<Star className="h-8 w-8 text-yellow-600" />}
            label="Average Rating"
            value="4.9"
          />
          <StatCard
            icon={<DollarSign className="h-8 w-8 text-green-600" />}
            label="Earnings (95%)"
            value="$1,850"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/materials")}
          >
            <CardHeader>
              <BookOpen className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Learning Materials</CardTitle>
              <CardDescription>Upload and manage your teaching materials</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Manage Materials</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/quiz-maker")}
          >
            <CardHeader>
              <PenTool className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Quiz Maker</CardTitle>
              <CardDescription>Create quizzes and tests for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Create Quiz</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/sessions")}
          >
            <CardHeader>
              <Calendar className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>My Sessions</CardTitle>
              <CardDescription>View and manage your tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Sessions</Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions & Recent Reviews */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SessionItem
                  student="John Doe"
                  subject="Mathematics - Calculus"
                  date="Apr 17, 2026"
                  time="2:00 PM"
                  duration="2 hours"
                />
                <SessionItem
                  student="Jane Smith"
                  subject="Mathematics - Linear Algebra"
                  date="Apr 18, 2026"
                  time="10:00 AM"
                  duration="1.5 hours"
                />
                <SessionItem
                  student="Bob Wilson"
                  subject="Statistics"
                  date="Apr 20, 2026"
                  time="4:00 PM"
                  duration="2 hours"
                />
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/sessions")}
              >
                View All Sessions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
              <CardDescription>What students are saying about you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ReviewItem
                  student="Sarah Johnson"
                  rating={5}
                  comment="Excellent tutor! Really helped me understand calculus concepts."
                  improvement="Grade improved from C to A"
                />
                <ReviewItem
                  student="Mike Chen"
                  rating={5}
                  comment="Patient and knowledgeable. Highly recommended!"
                  improvement="Grade improved from B to A+"
                />
                <ReviewItem
                  student="Emily Davis"
                  rating={4}
                  comment="Very helpful sessions. Clear explanations."
                  improvement={null}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionItem({
  student,
  subject,
  date,
  time,
  duration,
}: {
  student: string;
  subject: string;
  date: string;
  time: string;
  duration: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
      <Users className="h-5 w-5 text-blue-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{student}</p>
        <p className="text-sm text-gray-600">{subject}</p>
        <p className="text-sm text-gray-500 mt-1">
          {date} at {time} • {duration}
        </p>
      </div>
    </div>
  );
}

function ReviewItem({
  student,
  rating,
  comment,
  improvement,
}: {
  student: string;
  rating: number;
  comment: string;
  improvement: string | null;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">{student}</p>
        <div className="flex">
          {Array.from({ length: rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{comment}</p>
      {improvement && (
        <div className="bg-green-50 border border-green-200 rounded px-2 py-1 inline-block">
          <p className="text-xs text-green-700 font-medium">
            <TrendingUp className="h-3 w-3 inline mr-1" />
            {improvement}
          </p>
        </div>
      )}
    </div>
  );
}
