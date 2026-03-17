import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { apiCall } from '../lib/supabase';
import { toast } from 'sonner';

type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'tutor' | 'admin';
  phone?: string;
  bio?: string;
  currentGrade?: string;
  enrolledSubjects?: string[];
  subjects?: string[];
  qualifications?: string[];
  hourlyRate?: number;
  experience?: string;
  discountOffered?: number;
};

type EditProfileModalProps = {
  profile: Profile;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditProfileModal({ profile, onClose, onSuccess }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    currentGrade: '',
    enrolledSubjects: '',
    subjects: '',
    qualifications: '',
    hourlyRate: '',
    experience: '',
    discountOffered: '',
  });

  useEffect(() => {
    setFormData({
      name: profile.name || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      currentGrade: profile.currentGrade || '',
      enrolledSubjects: (profile.enrolledSubjects || []).join(', '),
      subjects: (profile.subjects || []).join(', '),
      qualifications: (profile.qualifications || []).join(', '),
      hourlyRate: profile.hourlyRate?.toString() || '',
      experience: profile.experience || '',
      discountOffered: profile.discountOffered?.toString() || '',
    });
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: Record<string, unknown> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
      };

      if (profile.role === 'student') {
        updates.currentGrade = formData.currentGrade.trim();
        updates.enrolledSubjects = splitCsv(formData.enrolledSubjects);
      }

      if (profile.role === 'tutor') {
        updates.subjects = splitCsv(formData.subjects);
        updates.qualifications = splitCsv(formData.qualifications);
        updates.hourlyRate = Number.parseFloat(formData.hourlyRate) || 0;
        updates.experience = formData.experience.trim();
        updates.discountOffered = Number.parseFloat(formData.discountOffered) || 0;
      }

      await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      toast.success('Profile updated successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2>
            <p className="text-sm text-gray-500">Update your public and contact information</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Full Name</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Phone Number</label>
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {profile.role === 'student' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Current Grade</label>
                <input
                  name="currentGrade"
                  value={formData.currentGrade}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Enrolled Subjects</label>
                <input
                  name="enrolledSubjects"
                  value={formData.enrolledSubjects}
                  onChange={handleChange}
                  placeholder="Math, Physics, English"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {profile.role === 'tutor' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Subjects</label>
                <input
                  name="subjects"
                  value={formData.subjects}
                  onChange={handleChange}
                  placeholder="Math, Physics, Chemistry"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Qualifications</label>
                <input
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  placeholder="BSc Math, Teaching Certificate"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Hourly Rate (PHP)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">Discount Offered (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    name="discountOffered"
                    value={formData.discountOffered}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Experience</label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}