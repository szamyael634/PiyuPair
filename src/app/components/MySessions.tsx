import { useMemo } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar, Clock, Star, MessageCircle, Video } from "lucide-react";

const RATED_SESSIONS_KEY = "piyupair_rated_sessions";

function loadRatedSessions(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(RATED_SESSIONS_KEY) || "{}") as Record<string, true>;
  } catch {
    return {};
  }
}

const upcomingSessions = [
  {
    id: "1",
    tutor: "Dr. Michael Johnson",
    subject: "Mathematics - Calculus",
    date: "Apr 17, 2026",
    time: "2:00 PM",
    duration: "2 hours",
    status: "confirmed",
  },
  {
    id: "2",
    tutor: "Sarah Williams",
    subject: "Physics",
    date: "Apr 18, 2026",
    time: "10:00 AM",
    duration: "1.5 hours",
    status: "confirmed",
  },
];

const pastSessions = [
  {
    id: "3",
    tutor: "Dr. Michael Johnson",
    subject: "Mathematics",
    date: "Apr 10, 2026",
    duration: "2 hours",
    status: "completed",
    rated: false,
  },
  {
    id: "4",
    tutor: "Prof. James Chen",
    subject: "Computer Science",
    date: "Apr 8, 2026",
    duration: "1 hour",
    status: "completed",
    rated: true,
  },
];

export function MySessions() {
  const navigate = useNavigate();

  const ratedSessions = useMemo(() => loadRatedSessions(), []);
  const resolvedPastSessions = useMemo(() => {
    return pastSessions.map((s) => ({ ...s, rated: s.rated || Boolean(ratedSessions[s.id]) }));
  }, [ratedSessions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Sessions</h1>
          <p className="text-gray-600 mt-1">Manage your tutoring sessions</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {upcomingSessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{session.subject}</CardTitle>
                        <CardDescription className="mt-1">with {session.tutor}</CardDescription>
                      </div>
                      <Badge variant="default">Confirmed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      {session.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-600" />
                      {session.time} • {session.duration}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3">
                      <Button variant="outline" className="flex-1 min-w-[140px]">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                      <Button
                        className="flex-1 min-w-[140px]"
                        onClick={() => navigate(`/sessions/${session.id}/call`)}
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Video Call
                      </Button>
                      <Button variant="outline" className="flex-1 min-w-[140px]">Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {resolvedPastSessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{session.subject}</CardTitle>
                        <CardDescription className="mt-1">with {session.tutor}</CardDescription>
                      </div>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      {session.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-600" />
                      {session.duration}
                    </div>
                    {!session.rated && (
                      <Button className="w-full mt-3" onClick={() => navigate(`/rate/${session.id}`)}>
                        <Star className="h-4 w-4 mr-2" />
                        Rate Session
                      </Button>
                    )}
                    {session.rated && (
                      <p className="text-sm text-green-600 text-center pt-2">✓ Rated</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
