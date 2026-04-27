import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Star, Upload } from "lucide-react";
import { toast } from "sonner";

const RATED_SESSIONS_KEY = "piyupair_rated_sessions";

function loadRatedSessions(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(RATED_SESSIONS_KEY) || "{}") as Record<string, true>;
  } catch {
    return {};
  }
}

function saveRatedSession(sessionId: string) {
  const rated = loadRatedSessions();
  rated[sessionId] = true;
  localStorage.setItem(RATED_SESSIONS_KEY, JSON.stringify(rated));
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        const active = starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange(starValue)}
            className="p-1"
            aria-label={`Rate ${starValue} star${starValue === 1 ? "" : "s"}`}
          >
            <Star
              className={`h-6 w-6 ${active ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function RateSession() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const safeSessionId = sessionId || "";

  const [tutorRating, setTutorRating] = useState(0);
  const [organizationRating, setOrganizationRating] = useState(0);
  const [comment, setComment] = useState("");
  const [gradeImproved, setGradeImproved] = useState(false);
  const [improvementNote, setImprovementNote] = useState("");
  const [proofFileName, setProofFileName] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!safeSessionId) return false;
    if (tutorRating === 0 || organizationRating === 0) return false;
    if (gradeImproved && !proofFileName) return false;
    return true;
  }, [safeSessionId, tutorRating, organizationRating, gradeImproved, proofFileName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!safeSessionId) return;

    saveRatedSession(safeSessionId);
    toast.success("Thanks! Your rating has been submitted.");
    navigate("/sessions");
  };

  if (!safeSessionId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Rate Session</CardTitle>
              <CardDescription>No session was selected to rate.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/sessions")}>Back to Sessions</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rate Session</h1>
          <p className="text-gray-600 mt-1">
            Rate your tutor and organization. Add proof if your grade improved.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>Session ID: {safeSessionId}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Tutor Rating</Label>
                <StarPicker value={tutorRating} onChange={setTutorRating} />
              </div>

              <div className="space-y-2">
                <Label>Organization Rating</Label>
                <StarPicker value={organizationRating} onChange={setOrganizationRating} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  rows={4}
                  placeholder="Share what went well, what could improve, etc."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
                <Checkbox
                  id="gradeImproved"
                  checked={gradeImproved}
                  onCheckedChange={(v) => setGradeImproved(Boolean(v))}
                />
                <div className="flex-1">
                  <Label htmlFor="gradeImproved">My grade improved because of tutoring</Label>
                  <p className="text-xs text-gray-600 mt-1">
                    If you have proof (e.g., screenshot, grade report), upload it to add an additional rating note.
                  </p>

                  {gradeImproved && (
                    <div className="mt-4 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="improvementNote">Improvement Note</Label>
                        <Input
                          id="improvementNote"
                          placeholder="e.g., Grade improved from C to A"
                          value={improvementNote}
                          onChange={(e) => setImprovementNote(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Upload Proof</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                          <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                          <Input
                            type="file"
                            className="hidden"
                            id="proofUpload"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setProofFileName(file ? file.name : null);
                            }}
                          />
                          <label htmlFor="proofUpload" className="cursor-pointer">
                            <span className="text-sm text-blue-600 hover:underline">Click to upload</span>
                            <span className="text-xs text-gray-500 block mt-1">PDF, JPG, PNG</span>
                          </label>
                          {proofFileName && (
                            <p className="text-xs text-gray-600 mt-2">Selected: {proofFileName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={!canSubmit}>
                  Submit Rating
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/sessions")}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
