import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { apiCall } from '../lib/supabase';
import { GraduationCap, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    phone: '',
    bio: '',
    subjects: [] as string[],
    hourlyRate: '',
    qualifications: '',
    experience: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subjects = e.target.value.split(',').map(s => s.trim()).filter(s => s);
    setFormData({ ...formData, subjects });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phone: formData.phone,
        bio: formData.bio,
        ...(formData.role === 'tutor' && {
          subjects: formData.subjects,
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
          qualifications: formData.qualifications.split(',').map(q => q.trim()),
          experience: formData.experience,
        }),
      };

      const response = await apiCall('/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (response.needsApproval) {
        toast.success('Account created! Waiting for admin approval.');
        navigate('/login');
      } else {
        toast.success('Account created successfully!');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    try {
      const role = formData.role === 'tutor' ? 'tutor' : 'student';
      const redirectTo = `${window.location.origin}/login?oauth=facebook&role=${role}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Facebook signup error:', error);
      toast.error(error.message || 'Failed to start Facebook signup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <GraduationCap className="size-10 text-blue-600" />
          <span className="text-2xl font-bold text-gray-800">PiyuPair</span>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Create Account</h1>
        <p className="text-center text-gray-600 mb-8">Join our tutoring marketplace</p>

        <form onSubmit={handleSignup} className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              I want to
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="student">Find a Tutor (Student)</option>
              <option value="tutor">Become a Tutor</option>
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Tutor-specific fields */}
          {formData.role === 'tutor' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subjects (comma-separated)
                </label>
                <input
                  type="text"
                  onChange={handleSubjectsChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Math, Physics, Chemistry"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualifications (comma-separated)
                </label>
                <input
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bachelor in Math, Teaching Certificate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hourly Rate (PHP)
                </label>
                <input
                  type="number"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="25.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience
                </label>
                <textarea
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your teaching experience..."
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus className="size-5" />
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={handleFacebookSignup}
            className="w-full bg-[#1877F2] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Sign up with Facebook
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 font-semibold hover:underline"
            >
              Login
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
