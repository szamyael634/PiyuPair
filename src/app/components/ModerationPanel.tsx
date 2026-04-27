import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Flag, CheckCircle, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { publicAnonKey, supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";
import { useNavigate } from "react-router";

interface ContentFlag {
  id:           string;
  content_type: string;
  content_id:   string;
  reason:       string;
  auto_flagged: boolean;
  status:       string;
  created_at:   string;
}

export function ModerationPanel() {
  const { user, session } = useAuth();
  const navigate          = useNavigate();
  const [flags, setFlags] = useState<ContentFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
  }, [user, navigate]);

  const fetchFlags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("content_flags")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (!error) setFlags((data as ContentFlag[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchFlags();

    // Realtime: new flags stream in as users report / auto-screen triggers
    const channel = supabase
      .channel("moderation_flags")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "content_flags" }, (payload) => {
        setFlags((prev) => [payload.new as ContentFlag, ...prev]);
        toast.warning("New content flag received");
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "content_flags" }, (payload) => {
        // Remove from open list when reviewed
        if ((payload.new as ContentFlag).status !== "open") {
          setFlags((prev) => prev.filter((f) => f.id !== (payload.new as ContentFlag).id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const act = async (flagId: string, action: "approved" | "removed" | "warned", notes?: string) => {
    setActioning((prev) => ({ ...prev, [flagId]: true }));
    try {
      const token     = session?.access_token;
      const endpoint  = `${supabaseFunctionsBaseUrl}/moderation/review`;

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:   `Bearer ${token}`,
          apikey:          publicAnonKey,
        },
        body: JSON.stringify({ flag_id: flagId, action, notes }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");

      toast.success(`Content ${action}`);
      setFlags((prev) => prev.filter((f) => f.id !== flagId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActioning((prev) => ({ ...prev, [flagId]: false }));
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Flag className="h-8 w-8 text-red-500" />
            Realtime Moderation
          </h1>
          <p className="text-gray-600 mt-1">
            Review flagged content. New flags appear instantly via live stream.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : flags.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">All clear!</p>
              <p className="text-sm text-gray-500 mt-1">No open content flags right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {flags.length} open flag{flags.length !== 1 ? "s" : ""}
              </p>
              <Button variant="outline" size="sm" onClick={fetchFlags}>Refresh</Button>
            </div>

            {flags.map((flag) => (
              <Card key={flag.id} className="border-l-4 border-l-red-400">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {flag.auto_flagged ? (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Auto-flagged
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
                            <Flag className="h-3 w-3 mr-1" /> User report
                          </Badge>
                        )}
                        <span className="capitalize">{flag.content_type.replace("_", " ")}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs font-mono text-gray-400">
                        ID: {flag.content_id}
                      </CardDescription>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(flag.created_at).toLocaleString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-md px-3 py-2 mb-4">
                    <p className="text-sm text-gray-700">
                      <strong>Reason:</strong> {flag.reason}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => act(flag.id, "approved", "Content reviewed — no violation found")}
                      disabled={actioning[flag.id]}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Keep (Dismiss)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => act(flag.id, "warned", "User warned about content policy")}
                      disabled={actioning[flag.id]}
                      variant="outline"
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" /> Warn
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => act(flag.id, "removed")}
                      disabled={actioning[flag.id]}
                      variant="destructive"
                    >
                      {actioning[flag.id]
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <><Trash2 className="h-4 w-4 mr-1" /> Remove Content</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
