import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Users, FileText, Star, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

interface TutorApplication {
  id: string;
  user_id: string;
  approval_status: string;
  subjects: string[] | null;
  education: string | null;
  experience: string | null;
  credentials_urls: string[] | null;
  profiles: { full_name: string; email: string } | null;
}

interface Material {
  id: string;
  title: string;
  approval_status: string;
  profiles: { full_name: string } | null;
}

interface OrgStats {
  activeTutors: number;
  pendingApplications: number;
  totalMaterials: number;
}

export function OrganizationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<TutorApplication[]>([]);
  const [materials, setMaterials]       = useState<Material[]>([]);
  const [stats, setStats]               = useState<OrgStats | null>(null);
  const [orgCode, setOrgCode]           = useState<string>("Loading…");
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!user || user.role !== "organization") navigate("/login");
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user?.organizationId) return;
    setLoading(true);

    const [appsRes, matsRes, codeRes, statsRes] = await Promise.all([
      supabase
        .from("tutor_profiles")
        .select("id, user_id, approval_status, subjects, education, experience, credentials_urls, profiles(full_name, email)")
        .eq("organization_id", user.organizationId)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("materials")
        .select("id, title, approval_status, profiles(full_name)")
        .eq("organization_id", user.organizationId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("organizations")
        .select("unique_code")
        .eq("id", user.organizationId)
        .maybeSingle(),
      Promise.all([
        supabase.from("tutor_profiles").select("id", { count: "exact", head: true }).eq("organization_id", user.organizationId).eq("approval_status", "approved"),
        supabase.from("tutor_profiles").select("id", { count: "exact", head: true }).eq("organization_id", user.organizationId).eq("approval_status", "pending"),
        supabase.from("materials").select("id", { count: "exact", head: true }).eq("organization_id", user.organizationId),
      ]),
    ]);

    setApplications((appsRes.data as TutorApplication[]) ?? []);
    setMaterials((matsRes.data as Material[]) ?? []);
    setOrgCode(codeRes.data?.unique_code ?? "—");
    const [active, pending, mats] = statsRes;
    setStats({
      activeTutors:       active.count  ?? 0,
      pendingApplications: pending.count ?? 0,
      totalMaterials:     mats.count    ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!user || user.role !== "organization") return;
    fetchData();

    // Realtime: new tutor applications
    const channel = supabase
      .channel("org_dashboard")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "tutor_profiles",
        filter: `organization_id=eq.${user.organizationId}`,
      }, (payload) => {
        toast.info("New tutor application received");
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleTutorAction = async (tutorId: string, name: string, action: "approved" | "rejected") => {
    const { error } = await supabase.rpc("approve_tutor", {
      p_tutor_id: tutorId,
      p_status:   action,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${name} has been ${action}`);
    setApplications((prev) => prev.filter((a) => a.user_id !== tutorId));
    setStats((prev) => prev ? { ...prev, pendingApplications: prev.pendingApplications - 1, activeTutors: action === "approved" ? prev.activeTutors + 1 : prev.activeTutors } : prev);
  };

  const handleMaterialApprove = async (materialId: string) => {
    const { error } = await supabase
      .from("materials")
      .update({ approval_status: "approved" })
      .eq("id", materialId);
    if (error) { toast.error(error.message); return; }
    toast.success("Material approved");
    setMaterials((prev) => prev.map((m) => m.id === materialId ? { ...m, approval_status: "approved" } : m));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{user.organizationName ?? user.name}</h1>
          <p className="text-gray-600 mt-1">Organization Dashboard</p>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-700">
              <strong>Your Unique Organization Code: </strong>
              <code className="bg-white px-2 py-1 rounded border border-gray-300 ml-2 font-mono">
                {orgCode}
              </code>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Share this code with tutors who want to apply under your organization
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <StatCard icon={<Users className="h-8 w-8 text-blue-600" />} label="Active Tutors" value={String(stats?.activeTutors ?? 0)} />
              <StatCard icon={<Clock className="h-8 w-8 text-orange-600" />} label="Pending Applications" value={String(stats?.pendingApplications ?? 0)} />
              <StatCard icon={<FileText className="h-8 w-8 text-purple-600" />} label="Learning Materials" value={String(stats?.totalMaterials ?? 0)} />
            </div>

            {/* Pending tutor applications */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pending Tutor Applications
                  {applications.length > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-300">{applications.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>Review and approve or reject tutor applications</CardDescription>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No pending tutor applications</p>
                ) : (
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <ApplicationItem
                        key={app.id}
                        name={app.profiles?.full_name ?? "Unknown"}
                        email={app.profiles?.email ?? "—"}
                        subjects={(app.subjects ?? []).join(", ")}
                        education={app.education ?? "—"}
                        credentialsCount={app.credentials_urls?.length ?? 0}
                        onApprove={() => handleTutorAction(app.user_id, app.profiles?.full_name ?? "Tutor", "approved")}
                        onReject={() => handleTutorAction(app.user_id, app.profiles?.full_name ?? "Tutor", "rejected")}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Materials */}
            <Card>
              <CardHeader>
                <CardTitle>Learning Materials Library</CardTitle>
                <CardDescription>Materials submitted by your tutors</CardDescription>
              </CardHeader>
              <CardContent>
                {materials.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No materials submitted yet</p>
                ) : (
                  <div className="space-y-3">
                    {materials.map((mat) => (
                      <div key={mat.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium">{mat.title}</p>
                          <p className="text-sm text-gray-600">by {mat.profiles?.full_name ?? "Unknown"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={mat.approval_status === "approved" ? "default" : "outline"}>
                            {mat.approval_status}
                          </Badge>
                          {mat.approval_status === "pending" && (
                            <Button size="sm" onClick={() => handleMaterialApprove(mat.id)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card><CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {icon}
      </div>
    </CardContent></Card>
  );
}

function ApplicationItem({
  name, email, subjects, education, credentialsCount, onApprove, onReject,
}: {
  name: string; email: string; subjects: string; education: string;
  credentialsCount: number; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-lg">{name}</p>
          <p className="text-sm text-gray-600">{email}</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          {credentialsCount} credential{credentialsCount !== 1 ? "s" : ""} uploaded
        </Badge>
      </div>
      <div className="space-y-1 mb-4">
        <p className="text-sm"><strong>Subjects:</strong> {subjects || "—"}</p>
        <p className="text-sm"><strong>Education:</strong> {education}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} className="flex-1">
          <CheckCircle className="h-4 w-4 mr-1" /> Approve
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} className="flex-1">
          <XCircle className="h-4 w-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}
