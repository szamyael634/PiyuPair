import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { publicAnonKey, supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  createdAt: number;
};

const endpointBase = supabaseFunctionsBaseUrl;

function useStableId() {
  return useMemo(() => crypto.randomUUID(), []);
}

export function FloatingSupportWidget() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "ticket">("chat");

  const initialId = useStableId();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: initialId,
      role: "bot",
      content: "Hi! Ask a question here, or file a ticket for the developers.",
      createdAt: Date.now(),
    },
  ]);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [ticketEmail, setTicketEmail] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || activeTab !== "chat") return;
    const handle = window.setTimeout(() => {
      scrollRef.current?.scrollIntoView({ block: "end" });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [open, activeTab, messages.length]);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${publicAnonKey}`,
      apikey: publicAnonKey,
    }),
    [],
  );

  const sendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const response = await fetch(`${endpointBase}/support/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: trimmed, path: window.location.pathname }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok) throw new Error(data?.error || "Chat request failed");

      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        content: data.reply || "Thanks — can you share a bit more detail?",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat request failed";
      toast.error(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          content: "Sorry — I couldn’t reach support services. Try again or file a ticket.",
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const fileTicket = async () => {
    if (ticketLoading) return;

    const subject = ticketSubject.trim();
    const message = ticketMessage.trim();
    const email = ticketEmail.trim();

    if (!subject || !message) {
      toast.error("Please add a subject and message.");
      return;
    }

    setTicketLoading(true);

    try {
      const response = await fetch(`${endpointBase}/support/ticket`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email || undefined,
          subject,
          message,
          path: window.location.pathname,
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(data?.error || "Ticket submission failed");

      toast.success(`Ticket filed${data.id ? `: ${data.id}` : ""}`);
      setTicketSubject("");
      setTicketMessage("");
      setTicketEmail("");
      setActiveTab("chat");
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "bot",
          content: "Got it — your ticket was filed for the developers.",
          createdAt: Date.now(),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ticket submission failed";
      toast.error(message);
    } finally {
      setTicketLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            className="h-12 w-12 rounded-full p-0"
            aria-label="Open support chat"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0">
          <SheetHeader>
            <SheetTitle>Support</SheetTitle>
            <SheetDescription>
              Chat with the bot or file a ticket.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger className="flex-1" value="chat">
                  Chat
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="ticket">
                  File Ticket
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="mt-4">
                <ScrollArea className="h-80 rounded-md border border-gray-200 bg-white p-3">
                  <div className="space-y-3">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            m.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="mt-3 flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a question..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sendChat();
                      }
                    }}
                  />
                  <Button
                    onClick={() => void sendChat()}
                    disabled={chatLoading || !chatInput.trim()}
                    aria-label="Send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="ticket" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ticketEmail">Email (optional)</Label>
                    <Input
                      id="ticketEmail"
                      value={ticketEmail}
                      onChange={(e) => setTicketEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticketSubject">Subject</Label>
                    <Input
                      id="ticketSubject"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="What’s going on?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticketMessage">Message</Label>
                    <Textarea
                      id="ticketMessage"
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe the concern in detail..."
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => void fileTicket()}
                    disabled={ticketLoading}
                  >
                    {ticketLoading ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
