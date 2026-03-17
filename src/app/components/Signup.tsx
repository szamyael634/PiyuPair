import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { apiCall } from '../lib/supabase';
import { Eye, EyeOff, Facebook, Github, GraduationCap, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type SocialProvider = 'facebook' | 'google' | 'github';
type CredentialField = 'studentCor' | 'studentReportCard' | 'tutorCor' | 'tutorReportCard' | 'tutorTraining' | 'tutorOther';

interface UploadedCredential {
  fileName: string;
  fileSize: number;
  fileType: string;
  base64Data: string;
}

const CREDENTIAL_LABELS: Record<CredentialField, string> = {
  studentCor: 'Certificate of Registration (COR)',
  studentReportCard: 'Report Card',
  tutorCor: 'Certificate of Registration (COR)',
  tutorReportCard: 'Report Card',
  tutorTraining: 'Training Certificates',
  tutorOther: 'Other Credentials',
};

const REQUIRED_CREDENTIALS_BY_ROLE: Record<'student' | 'tutor', CredentialField[]> = {
  student: ['studentCor'],
  tutor: ['tutorCor', 'tutorReportCard'],
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/3' };
  if (score <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: 'w-2/3' };
  return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [formData, setFormData] = useState({
    role: 'student',
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    bio: '',
    subjects: [] as string[],
    hourlyRate: '',
    qualifications: '',
    experience: '',
  });

  const [credentials, setCredentials] = useState<Record<CredentialField, UploadedCredential | null>>({
    studentCor: null,
    studentReportCard: null,
    tutorCor: null,
    tutorReportCard: null,
    tutorTraining: null,
    tutorOther: null,
  });

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  useEffect(() => {
    const syncVerificationState = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;
      const isVerified = Boolean(
        currentUser?.email_confirmed_at
        && currentUser?.email
        && currentUser.email.toLowerCase() === formData.email.trim().toLowerCase()
      );
      setEmailVerified(isVerified);
      if (isVerified) setVerificationSent(true);
    };

    void syncVerificationState();
  }, [formData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'email') {
      setVerificationSent(false);
      setEmailVerified(false);
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubjectsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const subjects = e.target.value.split(',').map(s => s.trim()).filter(s => s);
    setFormData({ ...formData, subjects });
  };

  const handleCredentialChange = async (field: CredentialField, file: File | null) => {
    if (!file) {
      setCredentials(prev => ({ ...prev, [field]: null }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Each credential file must be 10MB or smaller.');
      return;
    }

    const base64Data = await fileToBase64(file);

    setCredentials(prev => ({
      ...prev,
      [field]: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        base64Data,
      },
    }));
  };

  const fullName = [
    formData.firstName.trim(),
    formData.middleName.trim(),
    formData.lastName.trim(),
    formData.suffix.trim(),
  ]
    .filter(Boolean)
    .join(' ');

  const validateStep1 = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required.');
      return false;
    }

    if (!formData.email.trim()) {
      toast.error('Email is required.');
      return false;
    }

    if (!verificationSent) {
      toast.error('Please send a verification link to your email first.');
      return false;
    }

    if (!emailVerified) {
      toast.error('Please verify your email using the link sent to your inbox.');
      return false;
    }

    if (!formData.password || !formData.confirmPassword) {
      toast.error('Password and verify password are required.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.');
      return false;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    if (formData.role === 'student' && !credentials.studentCor) {
      toast.error('Student COR is required.');
      return false;
    }

    if (formData.role === 'tutor') {
      if (!credentials.tutorCor) {
        toast.error('Tutor COR is required.');
        return false;
      }
      if (!credentials.tutorReportCard) {
        toast.error('Tutor report card is required.');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);

    try {
      const role = formData.role === 'tutor' ? 'tutor' : 'student';
      const requiredCredentialKeys = REQUIRED_CREDENTIALS_BY_ROLE[role];
      const credentialUploads = Object.entries(credentials)
        .filter(([, value]) => Boolean(value?.base64Data))
        .map(([key, value]) => ({
          key,
          label: CREDENTIAL_LABELS[key as CredentialField],
          required: requiredCredentialKeys.includes(key as CredentialField),
          fileName: value!.fileName,
          fileType: value!.fileType,
          fileSize: value!.fileSize,
          base64Data: value!.base64Data,
        }));

      const payload = {
        name: fullName,
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        suffix: formData.suffix.trim(),
        role: formData.role,
        phone: formData.phone,
        bio: formData.bio,
        credentialUploads,
        ...(formData.role === 'tutor' && {
          subjects: formData.subjects,
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
          qualifications: formData.qualifications.split(',').map(q => q.trim()).filter(Boolean),
          experience: formData.experience,
        }),
      };

      const response = await apiCall('/signup/complete', {
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

  const handleSendVerificationLink = async () => {
    if (!formData.email.trim()) {
      toast.error('Enter your email first.');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      toast.error('Enter a valid password before sending verification.');
      return;
    }

    setSendingVerification(true);

    try {
      const email = formData.email.trim().toLowerCase();
      const redirectTo = `${window.location.origin}/signup`;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            role: formData.role,
            name: fullName || formData.firstName,
          },
        },
      });

      if (signUpError) {
        const message = String(signUpError.message || '').toLowerCase();
        const canResend =
          message.includes('already') ||
          message.includes('registered') ||
          message.includes('exists') ||
          message.includes('rate limit') ||
          message.includes('security purposes');

        if (!canResend) {
          throw signUpError;
        }

        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (resendError) {
          throw resendError;
        }

        setVerificationSent(true);
        toast.success('Verification link sent. Please check your email inbox.');
        return;
      }

      const isAutoConfirmed = Boolean(signUpData.user?.email_confirmed_at);
      if (isAutoConfirmed) {
        setVerificationSent(true);
        setEmailVerified(true);
        toast.success('Email is already verified for this account.');
        return;
      }

      setVerificationSent(true);
      toast.success('Verification link sent. Please check your email inbox.');
    } catch (error: any) {
      console.error('Verification link error:', error);
      toast.error(error.message || 'Failed to send verification link');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleOAuthSignup = async (provider: SocialProvider) => {
    try {
      const role = formData.role === 'tutor' ? 'tutor' : 'student';
      const redirectTo = `${window.location.origin}/login?oauth=${provider}&role=${role}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error(`${provider} signup error:`, error);
      toast.error(error.message || `Failed to start ${provider} signup`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-3xl">
        <div className="flex items-center justify-center gap-2 mb-6">
          <GraduationCap className="size-10 text-blue-600" />
          <span className="text-2xl font-bold text-gray-800">PiyuPair</span>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Create Account</h1>
        <p className="text-center text-gray-600 mb-2">Join our tutoring marketplace</p>
        <p className="text-center text-sm text-blue-700 mb-8">Step {step} of 2</p>

        <form onSubmit={handleSignup} className="space-y-6">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">I want to</label>
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

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Santos"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dela Cruz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suffix</label>
                  <input
                    type="text"
                    name="suffix"
                    value={formData.suffix}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jr., Sr., III"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+63"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
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

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-900 mb-3">
                  Email verification is required. We will send a verification link to your email address.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSendVerificationLink}
                    disabled={sendingVerification}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {sendingVerification ? 'Sending...' : 'Send Verification Link'}
                  </button>
                  <span className={`text-sm ${emailVerified ? 'text-green-700' : 'text-gray-600'}`}>
                    {emailVerified ? 'Email verified' : verificationSent ? 'Verification link sent. Check your inbox.' : 'Verification not sent yet.'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all`} />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Password strength: {passwordStrength.label}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verify Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? 'Hide password verification' : 'Show password verification'}
                  >
                    {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {formData.role === 'tutor' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Subjects (comma-separated)</label>
                    <input
                      type="text"
                      onChange={handleSubjectsChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Math, Physics, Chemistry"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications (comma-separated)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hourly Rate (PHP)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience</label>
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
                type="button"
                onClick={handleNextStep}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Continue to Step 2
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-sm text-gray-500">or</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthSignup('facebook')}
                  className="size-11 rounded-full bg-[#1877F2] text-white hover:opacity-90 transition flex items-center justify-center"
                  title="Sign up with Facebook"
                  aria-label="Sign up with Facebook"
                >
                  <Facebook className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthSignup('google')}
                  className="size-11 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition flex items-center justify-center"
                  title="Sign up with Google"
                  aria-label="Sign up with Google"
                >
                  <Mail className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthSignup('github')}
                  className="size-11 rounded-full bg-gray-900 text-white hover:opacity-90 transition flex items-center justify-center"
                  title="Sign up with GitHub"
                  aria-label="Sign up with GitHub"
                >
                  <Github className="size-5" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                Upload your credentials to complete registration. Required documents depend on your selected role.
              </div>

              {formData.role === 'student' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Certificate of Registration (COR) (Required)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => void handleCredentialChange('studentCor', e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {credentials.studentCor && <p className="text-xs text-gray-500 mt-1">Selected: {credentials.studentCor.fileName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Card (Optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => void handleCredentialChange('studentReportCard', e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {credentials.studentReportCard && <p className="text-xs text-gray-500 mt-1">Selected: {credentials.studentReportCard.fileName}</p>}
                  </div>
                </div>
              )}

              {formData.role === 'tutor' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Report Card (Required)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => void handleCredentialChange('tutorReportCard', e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {credentials.tutorReportCard && <p className="text-xs text-gray-500 mt-1">Selected: {credentials.tutorReportCard.fileName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Certificate of Registration (COR) (Required)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => void handleCredentialChange('tutorCor', e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {credentials.tutorCor && <p className="text-xs text-gray-500 mt-1">Selected: {credentials.tutorCor.fileName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Training Certificates (Optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => void handleCredentialChange('tutorTraining', e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {credentials.tutorTraining && <p className="text-xs text-gray-500 mt-1">Selected: {credentials.tutorTraining.fileName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Other Credentials (Optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => void handleCredentialChange('tutorOther', e.target.files?.[0] || null)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {credentials.tutorOther && <p className="text-xs text-gray-500 mt-1">Selected: {credentials.tutorOther.fileName}</p>}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Back to Step 1
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserPlus className="size-5" />
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </>
          )}
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
