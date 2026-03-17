import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { apiCall } from '../lib/supabase';
import { Search, Star, DollarSign, BookOpen, ArrowLeft, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { formatPHP } from '../lib/currency';

export default function BrowseTutors() {
  const navigate = useNavigate();
  const [tutors, setTutors] = useState<any[]>([]);
  const [filteredTutors, setFilteredTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxRate, setMaxRate] = useState('');

  useEffect(() => {
    loadTutors();
  }, []);

  useEffect(() => {
    filterTutors();
  }, [searchQuery, subjectFilter, minRating, maxRate, tutors]);

  const loadTutors = async () => {
    try {
      const { tutors: tutorData } = await apiCall('/tutors');
      setTutors(tutorData);
      setFilteredTutors(tutorData);
    } catch (error) {
      console.error('Error loading tutors:', error);
      toast.error('Failed to load tutors');
    } finally {
      setLoading(false);
    }
  };

  const filterTutors = () => {
    let filtered = [...tutors];

    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subjects.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (subjectFilter) {
      filtered = filtered.filter((t) =>
        t.subjects.some((s: string) => s.toLowerCase().includes(subjectFilter.toLowerCase()))
      );
    }

    if (minRating) {
      filtered = filtered.filter((t) => t.rating >= parseFloat(minRating));
    }

    if (maxRate) {
      filtered = filtered.filter((t) => t.hourlyRate <= parseFloat(maxRate));
    }

    setFilteredTutors(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tutors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/student')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="size-5" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Browse Tutors</h1>
          <p className="text-gray-600 mt-2">Find the perfect tutor for your needs</p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="size-5 text-gray-600" />
            <h2 className="text-xl font-bold text-gray-800">Search & Filter</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by name or subject
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Search..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Math, Physics..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Rating
              </label>
              <input
                type="number"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                min="0"
                max="5"
                step="0.1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="4.0"
              />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Found {filteredTutors.length} tutor{filteredTutors.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Tutors Grid */}
        {filteredTutors.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">No tutors found matching your criteria</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TutorCard({ tutor }: any) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800 mb-1">{tutor.name}</h3>
            <div className="flex items-center gap-1 text-yellow-500 mb-2">
              <Star className="size-4 fill-current" />
              <span className="text-gray-800 font-semibold">
                {tutor.rating > 0 ? tutor.rating.toFixed(1) : 'New'}
              </span>
              {tutor.totalReviews > 0 && (
                <span className="text-gray-500 text-sm ml-1">
                  ({tutor.totalReviews} reviews)
                </span>
              )}
            </div>
          </div>
          {tutor.discountOffered > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
              -{tutor.discountOffered}%
            </span>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{tutor.bio}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BookOpen className="size-4" />
            <span className="font-medium">Subjects:</span>
            <span className="truncate">{tutor.subjects.slice(0, 2).join(', ')}</span>
            {tutor.subjects.length > 2 && <span>+{tutor.subjects.length - 2}</span>}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="size-4" />
            <span className="font-medium">Rate:</span>
            <span className="font-bold text-blue-600">{formatPHP(tutor.hourlyRate)}/hr</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Sessions:</span>
            <span>{tutor.totalSessions || 0}</span>
          </div>
        </div>

        <button
          onClick={() => navigate(`/student/tutor/${tutor.id}`)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          View Profile
        </button>
      </div>
    </div>
  );
}
