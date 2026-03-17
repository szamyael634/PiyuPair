import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase, apiCall } from '../lib/supabase';
import { GraduationCap, Upload, FileText, TrendingUp, Search, MessageCircle, Video, LogOut, Star, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import EditProfileModal from './EditProfileModal';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadCert, setShowUploadCert] = useState(false);
  const [showUploadGrade, setShowUploadGrade] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

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

      const [profileData, sessionsData, applicationsData] = await Promise.all([
        apiCall('/profile'),
        apiCall('/sessions'),
        apiCall('/applications'),
      ]);

      setProfile(profileData.profile);
      setSessions(sessionsData.sessions);
      setApplications(applicationsData.applications);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
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
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{profile?.name}</p>
                  <p className="text-sm text-gray-500">Student</p>
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
          <p className="text-gray-600">Manage your learning journey</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <ActionCard
            icon={<Search className="size-6" />}
            title="Browse Tutors"
            description="Find qualified tutors"
            onClick={() => navigate('/student/browse-tutors')}
            color="blue"
          />
          <ActionCard
            icon={<Upload className="size-6" />}
            title="Upload Certificate"
            description="Get tutor suggestions"
            onClick={() => setShowUploadCert(true)}
            color="green"
          />
          <ActionCard
            icon={<TrendingUp className="size-6" />}
            title="Upload Grades"
            description="Improve your performance"
            onClick={() => setShowUploadGrade(true)}
            color="purple"
          />
          <ActionCard
            icon={<MessageCircle className="size-6" />}
            title="Messages"
            description="Chat with tutors"
            onClick={() => navigate('/messages')}
            color="orange"
          />
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Active Sessions"
            value={sessions.filter(s => s.status === 'active').length}
            icon={<Video className="size-8 text-blue-600" />}
          />
          <StatCard
            title="Pending Applications"
            value={applications.filter(a => a.status === 'pending').length}
            icon={<FileText className="size-8 text-orange-600" />}
          />
          <StatCard
            title="Completed Sessions"
            value={sessions.filter(s => s.status === 'completed').length}
            icon={<Star className="size-8 text-green-600" />}
          />
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Active Sessions</h2>
          {sessions.filter(s => s.status === 'active').length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active sessions yet</p>
          ) : (
            <div className="space-y-4">
              {sessions.filter(s => s.status === 'active').map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">My Applications</h2>
          {applications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No applications yet</p>
          ) : (
            <div className="space-y-4">
              {applications.slice(0, 5).map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Certificate Modal */}
      {showUploadCert && (
        <UploadCertificateModal onClose={() => setShowUploadCert(false)} onSuccess={loadData} />
      )}

      {/* Upload Grade Modal */}
      {showUploadGrade && (
        <UploadGradeModal onClose={() => setShowUploadGrade(false)} onSuccess={loadData} />
      )}

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

function ActionCard({ icon, title, description, onClick, color }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
    green: 'bg-green-50 hover:bg-green-100 text-green-600',
    purple: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
    orange: 'bg-orange-50 hover:bg-orange-100 text-orange-600',
  };

  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-xl shadow-md transition ${colorClasses[color]}`}
    >
      <div className="mb-3">{icon}</div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm opacity-80">{description}</p>
    </button>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
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

function SessionCard({ session }: any) {
  const navigate = useNavigate();

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-800">{session.subject}</h3>
          <p className="text-sm text-gray-500">Session ID: {session.id}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
          Active
        </span>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => navigate(`/classroom/${session.id}`)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Go to Classroom
        </button>
        <button
          onClick={() => navigate(`/video-call/${session.id}`)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm flex items-center gap-2"
        >
          <Video className="size-4" />
          Join Call
        </button>
      </div>
    </div>
  );
}

function ApplicationCard({ application }: any) {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    declined: 'bg-red-100 text-red-800',
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800">{application.subject}</h3>
          <p className="text-sm text-gray-500 mt-1">{application.message}</p>
        </div>
        <span className={`px-3 py-1 text-sm rounded-full ${statusColors[application.status]}`}>
          {application.status}
        </span>
      </div>
    </div>
  );
}

function UploadCertificateModal({ onClose, onSuccess }: any) {
  const [subject, setSubject] = useState('');
  const [certificateType, setCertificateType] = useState('enrollment');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        await apiCall('/upload-certificate', {
          method: 'POST',
          body: JSON.stringify({
            subject,
            certificateType,
            certificateData: base64,
          }),
        });

        toast.success('Certificate uploaded successfully!');
        onSuccess();
        onClose();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Upload Certificate</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Math, Physics, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Certificate Type</label>
            <select
              value={certificateType}
              onChange={(e) => setCertificateType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="enrollment">Enrollment</option>
              <option value="completion">Completion</option>
              <option value="training">Training</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept="image/*,.pdf"
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadGradeModal({ onClose, onSuccess }: any) {
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestedTutors, setSuggestedTutors] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const response = await apiCall('/upload-grade', {
          method: 'POST',
          body: JSON.stringify({
            subject,
            grade,
            gradeData: base64,
          }),
        });

        if (response.suggestedTutors) {
          setSuggestedTutors(response.suggestedTutors);
          toast.success(`Grade uploaded! Found ${response.suggestedTutors.length} tutors to help improve.`);
        } else {
          toast.success('Grade uploaded successfully!');
          onSuccess();
          onClose();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload grade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Upload Grade</h2>
        
        {suggestedTutors.length === 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="Math, Physics, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Grade (%)</label>
              <input
                type="number"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                min="0"
                max="100"
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="75"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Grade Document</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept="image/*,.pdf"
                required
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">Here are recommended tutors for {subject}:</p>
            <div className="space-y-3 mb-4">
              {suggestedTutors.map((tutor) => (
                <div key={tutor.id} className="border rounded-lg p-3">
                  <p className="font-bold">{tutor.name}</p>
                  <p className="text-sm text-gray-600">Rating: {tutor.rating.toFixed(1)} ⭐</p>
                  <p className="text-sm text-gray-600">${tutor.hourlyRate}/hr</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
