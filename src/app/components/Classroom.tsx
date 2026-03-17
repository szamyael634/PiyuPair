import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase, apiCall } from '../lib/supabase';
import { ArrowLeft, Plus, FileText, Upload, Send, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function Classroom() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateActivity, setShowCreateActivity] = useState(false);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    try {
      const [profileData, sessionData, activitiesData] = await Promise.all([
        apiCall('/profile'),
        apiCall(`/sessions/${sessionId}`),
        apiCall(`/activities/${sessionId}`),
      ]);

      setProfile(profileData.profile);
      setSession(sessionData.session);
      setActivities(activitiesData.activities);
    } catch (error) {
      console.error('Error loading classroom:', error);
      toast.error('Failed to load classroom');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Session not found</p>
      </div>
    );
  }

  const isTutor = profile?.role === 'tutor';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <button
            onClick={() => navigate(isTutor ? '/tutor' : '/student')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="size-5" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{session.subject} Classroom</h1>
              <p className="text-gray-600 mt-1">Session ID: {sessionId}</p>
            </div>
            {isTutor && (
              <button
                onClick={() => setShowCreateActivity(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="size-5" />
                Create Activity
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Activities Stream */}
        <div className="space-y-6">
          {activities.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <FileText className="size-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No activities yet</p>
              {isTutor && (
                <p className="text-gray-400 text-sm mt-2">Create your first activity to get started</p>
              )}
            </div>
          ) : (
            activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isTutor={isTutor}
                profile={profile}
                onSuccess={loadData}
              />
            ))
          )}
        </div>
      </div>

      {showCreateActivity && (
        <CreateActivityModal
          sessionId={sessionId!}
          onClose={() => setShowCreateActivity(false)}
          onSuccess={() => {
            setShowCreateActivity(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function ActivityCard({ activity, isTutor, profile, onSuccess }: any) {
  const [showSubmission, setShowSubmission] = useState(false);

  const hasSubmitted = activity.submissions?.some((s: any) => s.studentId === profile?.id);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <FileText className="size-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">{activity.title}</h3>
              <p className="text-sm text-gray-500">
                Posted {new Date(activity.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{activity.description}</p>
          
          {activity.dueDate && (
            <p className="text-sm text-orange-600 font-medium mb-2">
              Due: {new Date(activity.dueDate).toLocaleDateString()}
            </p>
          )}

          {activity.fileUrl && (
            <a
              href={activity.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              <Download className="size-4" />
              Download Attachment
            </a>
          )}
        </div>

        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          activity.type === 'assignment' ? 'bg-blue-100 text-blue-800' :
          activity.type === 'material' ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {activity.type}
        </span>
      </div>

      {/* Student Submission Section */}
      {!isTutor && activity.type === 'assignment' && (
        <div className="border-t pt-4">
          {hasSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">✓ Submitted</p>
            </div>
          ) : (
            <button
              onClick={() => setShowSubmission(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Upload className="size-4" />
              Submit Work
            </button>
          )}
        </div>
      )}

      {/* Tutor - View Submissions */}
      {isTutor && activity.submissions?.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold text-gray-800 mb-3">
            Submissions ({activity.submissions.length})
          </h4>
          <div className="space-y-2">
            {activity.submissions.map((submission: any, index: number) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                </p>
                {submission.notes && (
                  <p className="text-sm text-gray-700 mt-1">{submission.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showSubmission && (
        <SubmissionModal
          activityId={activity.id}
          onClose={() => setShowSubmission(false)}
          onSuccess={() => {
            setShowSubmission(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

function CreateActivityModal({ sessionId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'assignment',
    dueDate: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fileUrl = '';
      if (file) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          fileUrl = reader.result as string;
          
          await apiCall('/activities', {
            method: 'POST',
            body: JSON.stringify({
              sessionId,
              ...formData,
              fileUrl,
            }),
          });

          toast.success('Activity created!');
          onSuccess();
        };
        reader.readAsDataURL(file);
      } else {
        await apiCall('/activities', {
          method: 'POST',
          body: JSON.stringify({
            sessionId,
            ...formData,
          }),
        });

        toast.success('Activity created!');
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Failed to create activity');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Create Activity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Activity title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="assignment">Assignment</option>
              <option value="material">Material</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Activity description"
            />
          </div>

          {formData.type === 'assignment' && (
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Attachment (optional)</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
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
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubmissionModal({ activityId, onClose, onSuccess }: any) {
  const [notes, setNotes] = useState('');
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
      const reader = new FileReader();
      reader.onloadend = async () => {
        const fileUrl = reader.result as string;
        
        await apiCall(`/activities/${activityId}/submit`, {
          method: 'POST',
          body: JSON.stringify({ fileUrl, notes }),
        });

        toast.success('Submission successful!');
        onSuccess();
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Submit Your Work</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Upload File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Add any notes about your submission..."
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
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
