import { useState } from "react";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Star, Search, BookOpen, Calendar, DollarSign } from "lucide-react";

const mockTutors = [
  {
    id: "1",
    name: "Dr. Michael Johnson",
    subjects: ["Mathematics", "Statistics"],
    organization: "Excellence Tutoring Center",
    rating: 4.9,
    reviewCount: 45,
    hourlyRate: 50,
    experience: "PhD in Mathematics",
    availability: "Mon-Fri, 2PM-8PM",
  },
  {
    id: "2",
    name: "Sarah Williams",
    subjects: ["Physics", "Chemistry"],
    organization: "Academic Success Institute",
    rating: 4.8,
    reviewCount: 38,
    hourlyRate: 45,
    experience: "MSc in Physics",
    availability: "Tue-Sat, 10AM-6PM",
  },
  {
    id: "3",
    name: "Prof. James Chen",
    subjects: ["Computer Science", "Programming"],
    organization: "Tech Academy",
    rating: 5.0,
    reviewCount: 62,
    hourlyRate: 60,
    experience: "15 years teaching experience",
    availability: "Mon-Thu, 4PM-9PM",
  },
  {
    id: "4",
    name: "Dr. Emily Davis",
    subjects: ["Biology", "Chemistry"],
    organization: "Excellence Tutoring Center",
    rating: 4.7,
    reviewCount: 29,
    hourlyRate: 48,
    experience: "PhD in Molecular Biology",
    availability: "Wed-Sun, 1PM-7PM",
  },
];

export function FindTutors() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const filteredTutors = mockTutors.filter((tutor) => {
    const matchesSearch =
      tutor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutor.subjects.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSubject =
      subjectFilter === "all" || tutor.subjects.includes(subjectFilter);
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find a Tutor</h1>
          <p className="text-gray-600 mt-1">
            Browse qualified tutors vetted by trusted organizations
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Statistics">Statistics</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tutors List */}
        <div className="grid md:grid-cols-2 gap-6">
          {filteredTutors.map((tutor) => (
            <Card
              key={tutor.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/book/${tutor.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{tutor.name}</CardTitle>
                    <CardDescription className="mt-1">{tutor.organization}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{tutor.rating}</span>
                    <span className="text-sm text-gray-500">({tutor.reviewCount})</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Subjects:</p>
                    <div className="flex flex-wrap gap-2">
                      {tutor.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="h-4 w-4" />
                    {tutor.experience}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    {tutor.availability}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
                      <DollarSign className="h-5 w-5" />
                      {tutor.hourlyRate}/hour
                    </div>
                    <Button onClick={() => navigate(`/book/${tutor.id}`)}>Book Session</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTutors.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No tutors found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setSubjectFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
