import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { apiCall } from '../lib/supabase';
import { ArrowLeft, Star, DollarSign, BookOpen, Award, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function TutorProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  useEffect(() => {
    loadTutor();
  }, [id]);

  const loadTutor = async () => {
    try {
      const { tutor: tutorData } = await apiCall(`/tutor/${id}`);
      setTutor(tutorData);
    } catch (error) {
      console.error('Error loading tutor:', error);
      toast.error('Failed to load tutor profile');
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

  if (!tutor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Tutor not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/student/browse-tutors')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="size-5" />
            Back to Browse
          </button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{tutor.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="size-5 fill-current" />
                  <span className="text-gray-800 font-bold text-lg">
                    {tutor.rating > 0 ? tutor.rating.toFixed(1) : 'New Tutor'}
                  </span>
                  {tutor.totalReviews > 0 && (
                    <span className="text-gray-500 ml-2">({tutor.totalReviews} reviews)</span>
                  )}
                </div>
                {tutor.discountOffered > 0 && (
                  <span className="px-4 py-1 bg-green-100 text-green-800 font-semibold rounded-full">
                    {tutor.discountOffered}% OFF
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">${tutor.hourlyRate}</p>
              <p className="text-gray-600">per hour</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Contact</h3>
              <p className="text-gray-600">{tutor.email}</p>
              {tutor.phone && <p className="text-gray-600">{tutor.phone}</p>}
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Stats</h3>
              <p className="text-gray-600">Total Sessions: {tutor.totalSessions || 0}</p>
              <p className="text-gray-600">Total Earnings: ${tutor.totalEarnings?.toFixed(2) || '0.00'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowApplicationModal(true)}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
            >
              <Send className="size-5" />
              Apply for Session
            </button>
            <button
              onClick={() => navigate(`/messages/${tutor.id}`)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <MessageCircle className="size-5" />
              Message
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">About</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{tutor.bio}</p>
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="size-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Subjects</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tutor.subjects.map((subject: string, index: number) => (
              <span
                key={index}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>

        {/* Qualifications */}
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="size-6 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800">Qualifications</h2>
          </div>
          <ul className="space-y-2">
            {tutor.qualifications?.map((qual: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-gray-600">{qual}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Experience */}
        {tutor.experience && (
          <div className="bg-white rounded-xl shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Experience</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{tutor.experience}</p>
          </div>
        )}
      </div>

      {showApplicationModal && (
        <ApplicationModal
          tutorId={tutor.id}
          tutorName={tutor.name}
          tutorSubjects={tutor.subjects}
          onClose={() => setShowApplicationModal(false)}
        />
      )}
    </div>
  );
}

function ApplicationModal({ tutorId, tutorName, tutorSubjects, onClose }: any) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sessionType, setSessionType] = useState('online');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiCall('/applications', {
        method: 'POST',
        body: JSON.stringify({
          tutorId,
          subject,
          message,
          sessionType,
        }),
      });

      toast.success('Application submitted successfully!');
      navigate('/student');
    } catch (error) {
      console.error('Application error:', error);
      toast.error('Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Apply to {tutorName}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a subject</option>
              {tutorSubjects.map((subj: string, index: number) => (
                <option key={index} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="online">Online</option>
              <option value="in-person">In-Person</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Tell the tutor about your learning goals..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
