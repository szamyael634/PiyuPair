import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase, apiCall } from '../lib/supabase';
import { GraduationCap, Users, DollarSign, TrendingUp, CheckCircle, XCircle, Eye, LogOut, Star, Award } from 'lucide-react';
import { toast } from 'sonner';
import { formatPHP } from '../lib/currency';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate('/login');
        return;
      }

      const [profileData, dashData, approvalsData] = await Promise.all([
        apiCall('/profile'),
        apiCall('/admin/dashboard'),
        apiCall('/admin/pending-approvals'),
      ]);

      if (profileData.profile.role !== 'admin') {
        toast.error('Unauthorized - Admin access only');
        navigate('/');
        return;
      }

      setProfile(profileData.profile);
      setDashboardData(dashData);
      setPendingApprovals(approvalsData.approvals);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    try {
      await apiCall(`/admin/approve/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ approved }),
      });

      toast.success(approved ? 'User approved!' : 'User rejected');
      loadData();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to update approval status');
    }
  };

  const viewCredentials = async (userId: string) => {
    try {
      const { profile: userProfile, certificates, credentials } = await apiCall(`/admin/credentials/${userId}`);
      setSelectedUser({ profile: userProfile, certificates, credentials });
    } catch (error) {
      console.error('Error fetching credentials:', error);
      toast.error('Failed to fetch credentials');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-800">PiyuPair Admin</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-semibold text-gray-800">{profile?.name}</p>
                <p className="text-sm text-gray-500">Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="size-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage platform and oversee operations</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Students"
            value={dashboardData?.stats.totalStudents || 0}
            icon={<Users className="size-8 text-blue-600" />}
            color="blue"
          />
          <StatCard
            title="Active Tutors"
            value={dashboardData?.stats.totalTutors || 0}
            icon={<GraduationCap className="size-8 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Pending Approvals"
            value={dashboardData?.stats.pendingApprovals || 0}
            icon={<Award className="size-8 text-orange-600" />}
            color="orange"
          />
          <StatCard
            title="Total Commission"
            value={formatPHP(dashboardData?.stats.totalCommission)}
            icon={<DollarSign className="size-8 text-purple-600" />}
            color="purple"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <StatCard
            title="Total Sessions"
            value={dashboardData?.stats.totalSessions || 0}
            icon={<TrendingUp className="size-8 text-indigo-600" />}
            color="indigo"
          />
          <StatCard
            title="Total Revenue"
            value={formatPHP(dashboardData?.stats.totalRevenue)}
            icon={<DollarSign className="size-8 text-green-600" />}
            color="green"
          />
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Avg Commission Rate"
            value={`${((dashboardData?.stats.averageCommissionRate || 0) * 100).toFixed(2)}%`}
            icon={<DollarSign className="size-8 text-purple-600" />}
            color="purple"
          />
          <StatCard
            title="High-Match Commission"
            value={formatPHP(dashboardData?.stats.commissionByBand?.high?.commissionTotal)}
            icon={<TrendingUp className="size-8 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Low-Match Commission"
            value={formatPHP(dashboardData?.stats.commissionByBand?.low?.commissionTotal)}
            icon={<TrendingUp className="size-8 text-orange-600" />}
            color="orange"
          />
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pending Tutor Approvals</h2>
          {pendingApprovals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending approvals</p>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <ApprovalCard
                  key={approval.userId}
                  approval={approval}
                  onApprove={() => handleApproval(approval.userId, true)}
                  onReject={() => handleApproval(approval.userId, false)}
                  onViewCredentials={() => viewCredentials(approval.userId)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top Tutors */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Rated Tutors</h2>
            {dashboardData?.topRatedTutors?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No rated tutors yet</p>
            ) : (
              <div className="space-y-3">
                {dashboardData?.topRatedTutors?.slice(0, 5).map((tutor: any, index: number) => (
                  <div key={tutor.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{tutor.name}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="size-4 text-yellow-500 fill-current" />
                          <span className="text-gray-600">{tutor.rating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{tutor.totalSessions} sessions</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Top Performing Tutors</h2>
            {dashboardData?.topPerformingTutors?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No tutors yet</p>
            ) : (
              <div className="space-y-3">
                {dashboardData?.topPerformingTutors?.slice(0, 5).map((tutor: any, index: number) => (
                  <div key={tutor.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-semibold text-gray-800">{tutor.name}</p>
                        <p className="text-sm text-gray-600">{formatPHP(tutor.totalEarnings)}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{tutor.totalSessions} sessions</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credentials Modal */}
      {selectedUser && (
        <CredentialsModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
    indigo: 'bg-indigo-50',
  };
  const backgroundClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div className={`${backgroundClass} rounded-xl p-6`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function ApprovalCard({ approval, onApprove, onReject, onViewCredentials }: any) {
  const profile = approval.profile;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{profile.name}</h3>
          <p className="text-sm text-gray-600">{profile.email}</p>
          <p className="text-sm text-gray-500 mt-1">Applied: {new Date(approval.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600"><strong>Subjects:</strong> {profile.subjects?.join(', ')}</p>
        <p className="text-sm text-gray-600"><strong>Rate:</strong> {formatPHP(profile.hourlyRate)}/hr</p>
        <p className="text-sm text-gray-600 mt-2">{profile.bio}</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onViewCredentials}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2 text-sm"
        >
          <Eye className="size-4" />
          View Credentials
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm"
        >
          <CheckCircle className="size-4" />
          Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm"
        >
          <XCircle className="size-4" />
          Reject
        </button>
      </div>
    </div>
  );
}

function CredentialsModal({ user, onClose }: any) {
  const modernCredentials = Array.isArray(user.credentials) ? user.credentials : [];
  const legacyCertificates = Array.isArray(user.certificates) ? user.certificates : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">User Credentials</h2>
        
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-2">Profile Information</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {user.profile.name}</p>
            <p><strong>Email:</strong> {user.profile.email}</p>
            <p><strong>Phone:</strong> {user.profile.phone || 'N/A'}</p>
            <p><strong>Bio:</strong> {user.profile.bio}</p>
            {user.profile.qualifications && (
              <p><strong>Qualifications:</strong> {user.profile.qualifications.join(', ')}</p>
            )}
            {user.profile.experience && (
              <p><strong>Experience:</strong> {user.profile.experience}</p>
            )}
          </div>
        </div>

        {modernCredentials.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Uploaded Signup Credentials</h3>
            <div className="space-y-3">
              {modernCredentials.map((doc: any, index: number) => (
                <div key={`${doc.path || doc.fileName || 'doc'}-${index}`} className="border rounded-lg p-3">
                  <p className="text-sm"><strong>Document:</strong> {doc.label || doc.key || 'Credential'}</p>
                  <p className="text-sm"><strong>File:</strong> {doc.fileName || 'N/A'}</p>
                  <p className="text-sm"><strong>Type:</strong> {doc.fileType || 'Unknown'}</p>
                  <p className="text-sm"><strong>Required:</strong> {doc.required ? 'Yes' : 'No'}</p>
                  <p className="text-sm text-gray-500">Uploaded: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}</p>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Open Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {legacyCertificates.length > 0 && (
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Legacy Certificates</h3>
            <div className="space-y-3">
              {legacyCertificates.map((cert: any) => (
                <div key={cert.id} className="border rounded-lg p-3">
                  <p className="text-sm"><strong>Subject:</strong> {cert.subject}</p>
                  <p className="text-sm"><strong>Type:</strong> {cert.certificateType}</p>
                  <p className="text-sm text-gray-500">Uploaded: {new Date(cert.uploadedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {modernCredentials.length === 0 && legacyCertificates.length === 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
            No credentials found for this user.
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}
