import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase, apiCall } from '../lib/supabase';
import { GraduationCap, DollarSign, Users, Star, MessageCircle, LogOut, CheckCircle, XCircle, Calendar, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import EditProfileModal from './EditProfileModal';
import { formatPHP } from '../lib/currency';

export default function TutorDashboard() {
  const REFRESH_INTERVAL_MS = 10000;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useEffect(() => {
    void loadData();

    const intervalId = window.setInterval(() => {
      void loadData(true);
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void loadData(true);
      }
    };

    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, []);

  const loadData = async (silent = false) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate('/login');
        return;
      }

      const [profileData, applicationsData, sessionsData] = await Promise.all([
        apiCall('/profile'),
        apiCall('/applications'),
        apiCall('/sessions'),
      ]);

      setProfile(profileData.profile);
      setApplications(applicationsData.applications);
      setSessions(sessionsData.sessions);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (!silent) {
        toast.error('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (applicationId: string, status: 'accepted' | 'declined') => {
    try {
      await apiCall(`/applications/${applicationId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });

      toast.success(`Application ${status}!`);
      loadData();
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
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

  if (!profile?.approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="size-8 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pending Approval</h1>
          <p className="text-gray-600 mb-6">
            Your tutor application is being reviewed by our admin team. You'll be notified once approved.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowEditProfile(true)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Logout
            </button>
          </div>

          {showEditProfile && profile && (
            <EditProfileModal
              profile={profile}
              onClose={() => setShowEditProfile(false)}
              onSuccess={loadData}
            />
          )}
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const activeSessions = sessions.filter(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-800">PiyuPair</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditProfile(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="size-4" />
                Edit Profile
              </button>
              <button
                onClick={() => navigate('/messages')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <MessageCircle className="size-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="size-10 overflow-hidden rounded-full bg-gray-100">
                  {profile?.profilePictureUrl ? (
                    <img src={profile.profilePictureUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
                      {profile?.name?.[0] || 'T'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{profile?.name}</p>
                  <p className="text-sm text-gray-500">Tutor</p>
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
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {profile?.name}!
          </h1>
          <p className="text-gray-600">Manage your students and sessions</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Earnings"
            value={formatPHP(profile?.totalEarnings)}
            icon={<DollarSign className="size-8 text-green-600" />}
            color="green"
          />
          <StatCard
            title="Active Sessions"
            value={activeSessions.length}
            icon={<Users className="size-8 text-blue-600" />}
            color="blue"
          />
          <StatCard
            title="Pending Applications"
            value={pendingApplications.length}
            icon={<Calendar className="size-8 text-orange-600" />}
            color="orange"
          />
          <StatCard
            title="Rating"
            value={profile?.rating > 0 ? profile.rating.toFixed(1) : 'New'}
            icon={<Star className="size-8 text-yellow-600" />}
            color="yellow"
          />
        </div>

        {/* Pending Applications */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pending Applications</h2>
          {pendingApplications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending applications</p>
          ) : (
            <div className="space-y-4">
              {pendingApplications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  onAccept={() => handleApplicationAction(application.id, 'accepted')}
                  onDecline={() => handleApplicationAction(application.id, 'declined')}
                />
              ))}
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Sessions</h2>
          {activeSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active sessions</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {activeSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showEditProfile && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditProfile(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colorClasses = {
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    yellow: 'bg-yellow-50',
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-6`}>
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

function ApplicationCard({ application, onAccept, onDecline }: any) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{application.subject}</h3>
          <p className="text-sm text-gray-500">Application ID: {application.id}</p>
          <p className="text-sm text-gray-600 mt-2">{application.message}</p>
          <p className="text-sm text-gray-500 mt-1">
            Type: <span className="font-medium">{application.sessionType}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
        >
          <CheckCircle className="size-4" />
          Accept
        </button>
        <button
          onClick={onDecline}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
        >
          <XCircle className="size-4" />
          Decline
        </button>
      </div>
    </div>
  );
}

function SessionCard({ session }: any) {
  const navigate = useNavigate();

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="mb-4">
        <h3 className="font-bold text-gray-800">{session.subject}</h3>
        <p className="text-sm text-gray-500">Session ID: {session.id}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/classroom/${session.id}`)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Classroom
        </button>
        <button
          onClick={() => navigate(`/video-call/${session.id}`)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
        >
          Call
        </button>
      </div>
    </div>
  );
}
