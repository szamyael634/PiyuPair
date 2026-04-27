import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  Calendar,
  BookOpen,
  Users,
  Star,
  TrendingUp,
  Clock,
  Search,
  MessageSquare,
} from "lucide-react";

export function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== "student") {
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
              <CardTitle>Account Pending Approval</CardTitle>
              <CardDescription>
                Your student account is currently being reviewed by an administrator. You'll
                receive an email once your account is approved.
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
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-1">Here's what's happening with your learning journey</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Calendar className="h-8 w-8 text-blue-600" />}
            label="Upcoming Sessions"
            value="3"
          />
          <StatCard
            icon={<Clock className="h-8 w-8 text-purple-600" />}
            label="Hours This Month"
            value="12.5"
          />
          <StatCard
            icon={<Star className="h-8 w-8 text-yellow-600" />}
            label="Average Rating"
            value="4.8"
          />
          <StatCard
            icon={<TrendingUp className="h-8 w-8 text-green-600" />}
            label="Progress"
            value="+15%"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/find-tutors")}
          >
            <CardHeader>
              <Search className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Find a Tutor</CardTitle>
              <CardDescription>
                Browse qualified tutors and book your next session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Search Tutors</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/study-groups")}
          >
            <CardHeader>
              <Users className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Study Groups</CardTitle>
              <CardDescription>Join or create study groups with your peers</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Browse Groups</Button>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/library")}
          >
            <CardHeader>
              <BookOpen className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Open Library</CardTitle>
              <CardDescription>
                Access learning materials shared by organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Browse Library</Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Upcoming Sessions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled tutoring sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <SessionItem
                  subject="Mathematics"
                  tutor="Dr. Smith"
                  date="Apr 17, 2026"
                  time="2:00 PM"
                />
                <SessionItem
                  subject="Physics"
                  tutor="Prof. Johnson"
                  date="Apr 18, 2026"
                  time="10:00 AM"
                />
                <SessionItem
                  subject="Chemistry"
                  tutor="Ms. Williams"
                  date="Apr 20, 2026"
                  time="4:00 PM"
                />
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/sessions")}>
                View All Sessions
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your network</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ActivityItem
                  icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
                  text="New message in Study Group: Calculus 101"
                  time="2 hours ago"
                />
                <ActivityItem
                  icon={<BookOpen className="h-5 w-5 text-green-600" />}
                  text="New material added to library: Linear Algebra Notes"
                  time="5 hours ago"
                />
                <ActivityItem
                  icon={<Star className="h-5 w-5 text-yellow-600" />}
                  text="You rated Dr. Smith 5 stars"
                  time="1 day ago"
                />
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/newsfeed")}>
                View Newsfeed
              </Button>
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
  subject,
  tutor,
  date,
  time,
}: {
  subject: string;
  tutor: string;
  date: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
      <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">{subject}</p>
        <p className="text-sm text-gray-600">with {tutor}</p>
        <p className="text-sm text-gray-500 mt-1">
          {date} at {time}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ icon, text, time }: { icon: ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="flex-1">
        <p className="text-sm text-gray-900">{text}</p>
        <p className="text-xs text-gray-500 mt-0.5">{time}</p>
      </div>
    </div>
  );
}
