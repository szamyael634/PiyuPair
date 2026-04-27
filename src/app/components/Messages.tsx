import { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar } from "./ui/avatar";
import { Send, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type ChatMessage = {
  id: string;
  chatId: string;
  sender: string;
  content: string;
  time: string;
  isOwn: boolean;
};

type DbChatMessage = {
  id: string;
  chat_id: string;
  sender_name: string;
  content: string;
  is_own: boolean;
  created_at: string;
};

function toMessageTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function mapDbMessage(row: DbChatMessage): ChatMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    sender: row.sender_name,
    content: row.content,
    time: toMessageTime(row.created_at),
    isOwn: row.is_own,
  };
}

const mockChats = [
  {
    id: "1",
    name: "Dr. Michael Johnson",
    type: "private",
    lastMessage: "See you tomorrow at 2 PM!",
    time: "10:30 AM",
    unread: 0,
    avatar: "MJ",
  },
  {
    id: "2",
    name: "Calculus 101 Study Group",
    type: "group",
    lastMessage: "Sarah: Can someone explain derivatives?",
    time: "Yesterday",
    unread: 3,
    avatar: "C1",
  },
  {
    id: "3",
    name: "Sarah Williams",
    type: "private",
    lastMessage: "Thanks for the help!",
    time: "2 days ago",
    unread: 0,
    avatar: "SW",
  },
];

const mockMessages = [
  {
    id: "1",
    chatId: "1",
    sender: "Dr. Michael Johnson",
    content: "Hi! Ready for tomorrow's session?",
    time: "10:25 AM",
    isOwn: false,
  },
  {
    id: "2",
    chatId: "1",
    sender: "You",
    content: "Yes! I've prepared the topics we discussed.",
    time: "10:28 AM",
    isOwn: true,
  },
  {
    id: "3",
    chatId: "1",
    sender: "Dr. Michael Johnson",
    content: "Perfect! See you tomorrow at 2 PM!",
    time: "10:30 AM",
    isOwn: false,
  },
];

export function Messages() {
  const [selectedChat, setSelectedChat] = useState(mockChats[0]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [chats, setChats] = useState(mockChats);

  useEffect(() => {
    let isMounted = true;

    void supabase
      .from("chat_messages")
      .select("id, chat_id, sender_name, content, is_own, created_at")
      .in("chat_id", mockChats.map((chat) => chat.id))
      .order("created_at", { ascending: true })
      .then((result) => {
        const { data, error } = result;
        if (error || !data || !isMounted) return;

        const mapped = data.map((row: unknown) => mapDbMessage(row as DbChatMessage));
        setMessages(mapped.length > 0 ? mapped : mockMessages);

        setChats((current) =>
          current.map((chat) => {
            const latest = mapped.filter((message: ChatMessage) => message.chatId === chat.id).at(-1);
            if (!latest) return chat;
            return { ...chat, lastMessage: latest.content, time: latest.time };
          }),
        );
      });

    const channel = supabase
      .channel("chat-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const mapped = mapDbMessage(payload.new as DbChatMessage);

        if (!mockChats.some((chat) => chat.id === mapped.chatId)) return;

        setMessages((current) => (current.some((message) => message.id === mapped.id) ? current : [...current, mapped]));
        setChats((current) =>
          current.map((chat) =>
            chat.id === mapped.chatId
              ? { ...chat, lastMessage: mapped.content, time: mapped.time }
              : chat,
          ),
        );
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const handleSend = () => {
    if (newMessage.trim()) {
      const nextMessage = {
        chat_id: selectedChat.id,
        sender_name: "You",
        content: newMessage.trim(),
        is_own: true,
      };

      void supabase
        .from("chat_messages")
        .insert(nextMessage)
        .then((result) => {
          const { error } = result;
          if (error) {
            return;
          }
          setNewMessage("");
        });
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Chat with tutors, students, and study groups</p>
        </div>

        <Card className="h-[600px] flex">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <CardHeader>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="groups">Groups</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <div className="flex-1 overflow-y-auto">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedChat.id === chat.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
                >
                  <Avatar className="h-12 w-12 bg-blue-600 text-white flex items-center justify-center rounded-full">
                    {chat.avatar}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{chat.name}</p>
                      <span className="text-xs text-gray-500">{chat.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                  </div>
                  {chat.unread > 0 && (
                    <div className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {chat.unread}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                  {selectedChat.avatar}
                </Avatar>
                <div>
                  <CardTitle>{selectedChat.name}</CardTitle>
                  <p className="text-sm text-gray-500 capitalize">{selectedChat.type} chat</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {messages
                  .filter((message) => message.chatId === selectedChat.id)
                  .map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.isOwn
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-900"
                      }`}
                    >
                      {!message.isOwn && (
                        <p className="text-xs font-semibold mb-1">{message.sender}</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.isOwn ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {message.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                />
                <Button onClick={handleSend}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
