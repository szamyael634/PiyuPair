import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase, apiCall } from '../lib/supabase';
import { ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function VideoCall() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState('00:00');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    loadData();
    startCall();
  }, [sessionId]);

  useEffect(() => {
    if (callStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - callStartTime.getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCallDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callStartTime]);

  const loadData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate('/login');
        return;
      }

      const [profileData, sessionDataResponse] = await Promise.all([
        apiCall('/profile'),
        apiCall(`/sessions/${sessionId}`),
      ]);

      setProfile(profileData.profile);
      setSession(sessionDataResponse.session);
    } catch (error) {
      console.error('Error loading session:', error);
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    try {
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCallStartTime(new Date());
      toast.success('Call started');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      toast.error('Failed to access camera/microphone');
    }
  };

  const toggleVideo = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
      }
    }
  };

  const toggleAudio = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
      }
    }
  };

  const endCall = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    const isTutor = profile?.role === 'tutor';
    navigate(isTutor ? '/tutor' : '/student');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-white">Session not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top Bar */}
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-white text-xl font-bold">{session.subject} Session</h1>
            <p className="text-gray-400 text-sm">Duration: {callDuration}</p>
          </div>
          <button
            onClick={() => navigate(`/classroom/${sessionId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            <Users className="size-5" />
            Go to Classroom
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {/* Main Video */}
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          {isVideoOn ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <VideoOff className="size-12 text-gray-400" />
              </div>
              <p className="text-white text-lg">Camera is off</p>
            </div>
          )}
        </div>

        {/* Remote Participant Placeholder */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg border-2 border-gray-600 flex items-center justify-center">
          <div className="text-center">
            <Users className="size-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Waiting for participant...</p>
          </div>
        </div>

        {/* Session Info Overlay */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <p className="text-white font-medium">{session.subject}</p>
          <p className="text-gray-300 text-sm">Session ID: {sessionId}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-6 py-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              isVideoOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? (
              <Video className="size-6 text-white" />
            ) : (
              <VideoOff className="size-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition ${
              isAudioOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
            }`}
            title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {isAudioOn ? (
              <Mic className="size-6 text-white" />
            ) : (
              <MicOff className="size-6 text-white" />
            )}
          </button>

          <button
            onClick={() => navigate('/messages')}
            className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition"
            title="Open messages"
          >
            <MessageCircle className="size-6 text-white" />
          </button>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition"
            title="End call"
          >
            <PhoneOff className="size-6 text-white" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            This is a demo video call interface. In production, integrate with services like Twilio, Agora, or WebRTC.
          </p>
        </div>
      </div>
    </div>
  );
}
