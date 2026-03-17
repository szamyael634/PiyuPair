import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import { supabase, apiCall } from '../lib/supabase';
import { ArrowLeft, Send, MessageCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Messages() {
  const navigate = useNavigate();
  const { userId: selectedUserId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(selectedUserId || null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<any>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser);
      loadUserInfo(selectedUser);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate('/login');
        return;
      }

      const [profileData, conversationsData] = await Promise.all([
        apiCall('/profile'),
        apiCall('/conversations'),
      ]);

      setProfile(profileData.profile);
      setConversations(conversationsData.conversations);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const { messages: messagesData } = await apiCall(`/messages/${userId}`);
      setMessages(messagesData);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const loadUserInfo = async (userId: string) => {
    try {
      const { tutor } = await apiCall(`/tutor/${userId}`).catch(() => ({ tutor: null }));
      if (tutor) {
        setSelectedUserInfo(tutor);
      } else {
        const { profile: userProfile } = await apiCall('/profile');
        setSelectedUserInfo(userProfile);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedUser) return;

    try {
      await apiCall('/messages', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: selectedUser,
          content: messageInput,
        }),
      });

      setMessageInput('');
      loadMessages(selectedUser);
      loadData(); // Refresh conversations
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <button
            onClick={() => navigate(profile?.role === 'tutor' ? '/tutor' : profile?.role === 'admin' ? '/admin' : '/student')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-2"
          >
            <ArrowLeft className="size-5" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                placeholder="Search conversations..."
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="size-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => setSelectedUser(conv.userId)}
                  className={`w-full p-4 border-b hover:bg-gray-50 transition text-left ${
                    selectedUser === conv.userId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-gray-800">{conv.userName}</p>
                    {conv.unread && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col bg-white">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="size-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              {selectedUserInfo && (
                <div className="p-4 border-b">
                  <p className="font-semibold text-gray-800">{selectedUserInfo.name}</p>
                  <p className="text-sm text-gray-500">{selectedUserInfo.email}</p>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === profile?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-lg ${
                          msg.senderId === profile?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.senderId === profile?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Type a message..."
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Send className="size-5" />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
