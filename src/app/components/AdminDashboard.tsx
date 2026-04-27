import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Users, Building2, GraduationCap, DollarSign, CheckCircle, XCircle, Loader2, Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";

interface PendingStudent {
  id: string;
  full_name: string;
  email: string;
  program: string | null;
  student_id: string | null;
  year_level: string | null;
}

interface OrgRequest {
  id: string;
  org_name: string;
  contact_person: string;
  email: string;
  status: string;
}

interface Stats {
  totalStudents: number;
  totalTutors: number;
  totalOrgs: number;
  pendingStudents: number;
  pendingTutors: number;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [orgRequests, setOrgRequests]         = useState<OrgRequest[]>([]);
  const [stats, setStats]                     = useState<Stats | null>(null);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
  }, [user, navigate]);

  // ── Load initial data ──────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    const [studentsRes, orgsRes, statsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, program, student_id, year_level")
        .eq("role", "student")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("org_requests")
        .select("id, org_name, contact_person, email, status")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("approval_status", "approved"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "tutor").eq("approval_status", "approved"),
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("approval_status", "pending"),
        supabase.from("tutor_profiles").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      ]),
    ]);

    setPendingStudents((studentsRes.data as PendingStudent[]) ?? []);
    setOrgRequests((orgsRes.data as OrgRequest[]) ?? []);
    const [s, t, o, ps, pt] = statsRes;
    setStats({
      totalStudents:  s.count ?? 0,
      totalTutors:    t.count ?? 0,
      totalOrgs:      o.count ?? 0,
      pendingStudents: ps.count ?? 0,
      pendingTutors:  pt.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchData();

    // ── Realtime: re-fetch when profiles change ──────────────────────
    const channel = supabase
      .channel("admin_approvals")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "org_requests" }, (payload) => {
        setOrgRequests((prev) => [...prev, payload.new as OrgRequest]);
        toast.info("New organization request received");
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ── Action: approve / reject student ──────────────────────────────
  const handleStudentAction = async (studentId: string, name: string, action: "approved" | "rejected") => {
    const { error } = await supabase.rpc("approve_student", {
      p_student_id: studentId,
      p_status:     action,
    });
    if (error) {
      toast.error(`Failed to ${action} student: ${error.message}`);
      return;
    }
    toast.success(`${name} has been ${action}`);
    setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
    setStats((prev) => prev ? { ...prev, pendingStudents: prev.pendingStudents - 1 } : prev);
  };

  // ── Action: approve org request (creates org) ──────────────────────
  const handleOrgApprove = async (reqId: string, orgName: string) => {
    const { data: { supabase: client } = {} } = {} as any; // use imported client
    const { data, error } = await supabase.rpc("approve_org_request", {
      p_request_id: reqId,
      p_org_code:   `ORG-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    });
    if (error) {
      toast.error(`Failed to approve org request: ${error.message}`);
      return;
    }
    toast.success(`Organization "${orgName}" created`);
    setOrgRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  const handleOrgReject = async (reqId: string) => {
    const { error } = await supabase.rpc("reject_org_request", { p_request_id: reqId });
    if (error) { toast.error(error.message); return; }
    toast.success("Organization request rejected");
    setOrgRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">System overview and management</p>
          </div>
          {stats && (stats.pendingStudents + (stats.pendingTutors ?? 0)) > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <Bell className="h-5 w-5 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                {stats.pendingStudents + stats.pendingTutors} pending approvals
              </span>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <StatCard icon={<GraduationCap className="h-8 w-8 text-blue-600" />} label="Approved Students" value={String(stats?.totalStudents ?? 0)} />
              <StatCard icon={<Users className="h-8 w-8 text-purple-600" />} label="Approved Tutors" value={String(stats?.totalTutors ?? 0)} />
              <StatCard icon={<Building2 className="h-8 w-8 text-green-600" />} label="Organizations" value={String(stats?.totalOrgs ?? 0)} />
              <StatCard icon={<DollarSign className="h-8 w-8 text-orange-600" />} label="Pending Approvals" value={String((stats?.pendingStudents ?? 0) + (stats?.pendingTutors ?? 0))} />
            </div>

            {/* Pending Student Approvals */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Pending Student Approvals
                    {pendingStudents.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {pendingStudents.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Students waiting for account approval</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingStudents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No pending student approvals</p>
                  ) : (
                    <div className="space-y-4">
                      {pendingStudents.map((s) => (
                        <StudentApprovalItem
                          key={s.id}
                          name={s.full_name}
                          email={s.email}
                          program={s.program ?? "—"}
                          studentId={s.student_id ?? "—"}
                          yearLevel={s.year_level ?? "—"}
                          onApprove={() => handleStudentAction(s.id, s.full_name, "approved")}
                          onReject={() => handleStudentAction(s.id, s.full_name, "rejected")}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Organization Requests
                    {orgRequests.length > 0 && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        {orgRequests.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>New organization account requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {orgRequests.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No pending organization requests</p>
                  ) : (
                    <div className="space-y-4">
                      {orgRequests.map((req) => (
                        <OrgRequestItem
                          key={req.id}
                          name={req.org_name}
                          contactPerson={req.contact_person}
                          email={req.email}
                          onApprove={() => handleOrgApprove(req.id, req.org_name)}
                          onReject={() => handleOrgReject(req.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
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

function StudentApprovalItem({
  name, email, program, studentId, yearLevel, onApprove, onReject,
}: {
  name: string; email: string; program: string; studentId: string;
  yearLevel: string; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <p className="font-semibold text-lg">{name}</p>
        <p className="text-sm text-gray-600">{email}</p>
      </div>
      <div className="space-y-1 mb-4">
        <p className="text-sm"><strong>Program:</strong> {program}</p>
        <p className="text-sm"><strong>Student ID:</strong> {studentId}</p>
        <p className="text-sm"><strong>Year Level:</strong> {yearLevel}</p>
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

function OrgRequestItem({
  name, contactPerson, email, onApprove, onReject,
}: {
  name: string; contactPerson: string; email: string; onApprove: () => void; onReject: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <p className="font-semibold text-lg">{name}</p>
        <p className="text-sm text-gray-600">{email}</p>
      </div>
      <p className="text-sm mb-4"><strong>Contact:</strong> {contactPerson}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onApprove} className="flex-1">
          <Building2 className="h-4 w-4 mr-1" /> Approve & Create
        </Button>
        <Button size="sm" variant="destructive" onClick={onReject} className="flex-1">
          <XCircle className="h-4 w-4 mr-1" /> Reject
        </Button>
      </div>
    </div>
  );
}
