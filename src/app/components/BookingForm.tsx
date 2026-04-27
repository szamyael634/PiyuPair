import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, Clock, BookOpen, DollarSign, CreditCard } from "lucide-react";

export function BookingForm() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: "",
    startTime: "",
    hours: "",
    subject: "",
    topic: "",
    notes: "",
  });

  const tutorName = "Dr. Michael Johnson"; // Mock data
  const hourlyRate = 50; // Mock data
  const totalCost = Number(formData.hours) * hourlyRate;
  const commission = totalCost * 0.05;
  const tutorReceives = totalCost - commission;

  const subjectLabel = useMemo(() => {
    const map: Record<string, string> = {
      calculus: "Calculus",
      algebra: "Algebra",
      statistics: "Statistics",
      geometry: "Geometry",
    };
    return map[formData.subject] || "(Not selected)";
  }, [formData.subject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/payment", {
      state: {
        booking: {
          tutorId: tutorId || "1",
          tutorName,
          subjectLabel,
          date: formData.date,
          startTime: formData.startTime,
          hours: Number(formData.hours || 0),
          hourlyRate,
          topic: formData.topic,
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book a Tutoring Session</h1>
          <p className="text-gray-600 mt-1">{tutorName} - Mathematics</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>Fill in the information for your tutoring session</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Session Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="pl-10"
                          min={new Date().toISOString().split("T")[0]}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="startTime"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hours">Number of Hours</Label>
                    <Select
                      value={formData.hours}
                      onValueChange={(value) => setFormData({ ...formData, hours: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">30 minutes</SelectItem>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="1.5">1.5 hours</SelectItem>
                        <SelectItem value="2">2 hours</SelectItem>
                        <SelectItem value="2.5">2.5 hours</SelectItem>
                        <SelectItem value="3">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calculus">Calculus</SelectItem>
                        <SelectItem value="algebra">Algebra</SelectItem>
                        <SelectItem value="statistics">Statistics</SelectItem>
                        <SelectItem value="geometry">Geometry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic to Discuss</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., Derivatives and Integration"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any specific areas you need help with, materials to bring, etc."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" className="flex-1">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Proceed to Payment
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/find-tutors")}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Hourly Rate:</span>
                    <span className="font-medium">${hourlyRate}/hr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {formData.hours || "0"} hour{Number(formData.hours) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Subtotal:</span>
                      <span className="font-semibold">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform Fee (5%):</span>
                    <span className="text-gray-600">${commission.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold text-blue-600">${totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900">
                    <strong>Note:</strong> The system collects a 5% commission fee. The tutor
                    receives ${tutorReceives.toFixed(2)} for this session.
                  </p>
                </div>

                {formData.date && formData.startTime && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-600" />
                      <span>{new Date(formData.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span>{formData.startTime}</span>
                    </div>
                    {formData.subject && (
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4 text-gray-600" />
                        <span className="capitalize">{formData.subject}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
