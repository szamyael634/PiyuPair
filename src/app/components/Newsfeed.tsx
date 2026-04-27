import { useEffect, useState } from "react";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar } from "./ui/avatar";
import { Heart, MessageCircle, Share2, Send, Calendar, BookOpen, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { publicAnonKey, supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";

type FeedPost = {
  id: string;
  author: string;
  role: string;
  avatar: string;
  time: string;
  content: string;
  type: string;
  likes: number;
  comments: number;
};

type DbFeedPost = {
  id: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  post_type: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
};

function toRelativeTime(createdAt: string): string {
  const created = new Date(createdAt).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - created) / 60000));
  if (diffMinutes < 1)  return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)   return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function mapDbPost(row: DbFeedPost): FeedPost {
  return {
    id:       row.id,
    author:   row.author_name,
    role:     row.author_role,
    avatar:   row.author_avatar,
    time:     toRelativeTime(row.created_at),
    content:  row.content,
    type:     row.post_type,
    likes:    row.likes_count,
    comments: row.comments_count,
  };
}

const mockPosts: FeedPost[] = [
  { id: "1", author: "Dr. Michael Johnson", role: "Tutor",        avatar: "MJ", time: "2 hours ago", content: "📚 New webinar this Friday: 'Mastering Calculus - Tips and Tricks'! Free for all students. Register in the comments!", type: "event",        likes: 24, comments: 8  },
  { id: "2", author: "Sarah Williams",      role: "Student",      avatar: "SW", time: "5 hours ago", content: "Can anyone recommend resources for learning quantum physics? Need help with the basics! 🔬",                            type: "question",     likes: 12, comments: 15 },
  { id: "3", author: "Excellence Tutoring", role: "Organization", avatar: "ET", time: "1 day ago",   content: "🎉 We're excited to announce our new Chemistry Lab series starting next month!",                                     type: "announcement", likes: 45, comments: 6  },
  { id: "4", author: "James Chen",          role: "Tutor",        avatar: "JC", time: "1 day ago",   content: "Just uploaded new programming materials to the Open Library! Check out 'Python for Beginners'. 💻",                  type: "material",     likes: 38, comments: 12 },
];

export function Newsfeed() {
  const { user, session } = useAuth();
  const [newPost,   setNewPost]   = useState("");
  const [posts,     setPosts]     = useState<FeedPost[]>(mockPosts);
  const [reporting, setReporting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    void supabase
      .from("newsfeed_posts")
      .select("id, author_name, author_role, author_avatar, post_type, content, likes_count, comments_count, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error || !data || !isMounted) return;
        setPosts(data.map((row: unknown) => mapDbPost(row as DbFeedPost)));
      });

    const channel = supabase
      .channel("newsfeed-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "newsfeed_posts" }, (payload) => {
        const mapped = mapDbPost(payload.new as DbFeedPost);
        setPosts((prev) => (prev.some((p) => p.id === mapped.id) ? prev : [mapped, ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "newsfeed_posts" }, (payload) => {
        // Reflect removed/moderated posts
        const updated = mapDbPost(payload.new as DbFeedPost);
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const handlePost = () => {
    if (!newPost.trim()) return;

    const content = newPost.trim();
    void supabase
      .from("newsfeed_posts")
      .insert({
        author_name:   user?.name         ?? "Anonymous",
        author_role:   user?.role         ?? "student",
        author_avatar: (user?.name ?? "?").slice(0, 2).toUpperCase(),
        post_type:     "question",
        content,
      })
      .then(({ error }) => {
        if (error) { toast.error("Unable to publish post right now"); return; }
        toast.success("Post shared successfully!");
        setNewPost("");
      });
  };

  // ── Report a post ────────────────────────────────────────────────────
  const handleReport = async (postId: string) => {
    if (!user) { toast.error("You must be signed in to report content."); return; }
    setReporting((prev) => ({ ...prev, [postId]: true }));

    try {
      const token    = session?.access_token;
      const endpoint = `${supabaseFunctionsBaseUrl}/moderation/flag`;

      const res = await fetch(endpoint, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:   `Bearer ${token}`,
          apikey:          publicAnonKey,
        },
        body: JSON.stringify({
          content_type: "post",
          content_id:   postId,
          reason:       "User report: inappropriate or policy-violating content",
        }),
      });

      if (res.ok) {
        toast.success("Post reported. Our moderation team will review it.");
      } else {
        const json = await res.json();
        throw new Error(json.error ?? "Report failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Report failed");
    } finally {
      setReporting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Newsfeed</h1>
          <p className="text-gray-600 mt-1">Stay updated with the latest from your community</p>
        </div>

        {/* Create Post */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Textarea
              placeholder="Share a question, announcement, or upcoming event..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={3}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handlePost} disabled={!newPost.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 bg-blue-600 text-white flex items-center justify-center rounded-full">
                    {post.avatar}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{post.author}</p>
                        <p className="text-sm text-gray-500">
                          {post.role} • {post.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.type === "event"    && <Calendar className="h-5 w-5 text-purple-600" />}
                        {post.type === "material" && <BookOpen  className="h-5 w-5 text-green-600"  />}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 mb-4">{post.content}</p>
                <div className="flex items-center gap-6 pt-3 border-t border-gray-200">
                  <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors">
                    <Heart className="h-5 w-5" />
                    <span className="text-sm">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                    <MessageCircle className="h-5 w-5" />
                    <span className="text-sm">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors">
                    <Share2 className="h-5 w-5" />
                    <span className="text-sm">Share</span>
                  </button>
                  {/* Report button — only shown to signed-in non-admin users */}
                  {user && user.role !== "admin" && (
                    <button
                      className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      onClick={() => handleReport(post.id)}
                      disabled={reporting[post.id]}
                      title="Report this post"
                    >
                      <Flag className="h-4 w-4" />
                      <span>{reporting[post.id] ? "Reporting…" : "Report"}</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
