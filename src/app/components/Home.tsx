import { useNavigate } from 'react-router';
import { GraduationCap, Users, Award, MessageCircle, Video, Star } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-8" />
            <span className="text-2xl font-bold">Smart Tutoring</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 border-2 border-white rounded-lg hover:bg-white hover:text-blue-600 transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-6 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold"
            >
              Sign Up
            </button>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Find Your Perfect Tutor, Achieve Your Goals
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Smart matching • Verified tutors • Online & In-person sessions
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
          >
            Get Started Free
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
          Why Choose Smart Tutoring?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="size-12 text-blue-600" />}
            title="Smart Matching"
            description="Upload your grades and certificates to get matched with the perfect tutor for your needs"
          />
          <FeatureCard
            icon={<Award className="size-12 text-green-600" />}
            title="Verified Tutors"
            description="All tutors are verified by our admin team and rated by students"
          />
          <FeatureCard
            icon={<Video className="size-12 text-purple-600" />}
            title="Video Sessions"
            description="Learn from anywhere with built-in video calls and messaging"
          />
          <FeatureCard
            icon={<MessageCircle className="size-12 text-orange-600" />}
            title="Interactive Classroom"
            description="Google Classroom-like environment for assignments and activities"
          />
          <FeatureCard
            icon={<Star className="size-12 text-yellow-600" />}
            title="Top Rated"
            description="Browse top-rated and high-performing tutors with verified credentials"
          />
          <FeatureCard
            icon={<GraduationCap className="size-12 text-indigo-600" />}
            title="Become a Tutor"
            description="Students can apply as tutors with proper credentials and experience"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Step
              number="1"
              title="Sign Up"
              description="Create your account as a student or tutor"
            />
            <Step
              number="2"
              title="Upload Credentials"
              description="Students upload grades, tutors upload certificates"
            />
            <Step
              number="3"
              title="Get Matched"
              description="Our smart system suggests the best tutors for you"
            />
            <Step
              number="4"
              title="Start Learning"
              description="Connect via messages, video calls, and classroom"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Start Your Learning Journey?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of students and tutors today
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
          >
            Sign Up Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <GraduationCap className="size-6" />
            <span className="text-xl font-bold">Smart Tutoring Marketplace</span>
          </div>
          <p className="text-gray-400">© 2026 Smart Tutoring. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
