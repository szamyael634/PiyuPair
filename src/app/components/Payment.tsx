import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CreditCard, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { publicAnonKey, supabaseFunctionsBaseUrl } from "../../../utils/supabase/info";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

type BookingState = {
  tutorId:      string;
  tutorName:    string;
  subjectLabel: string;
  date:         string;
  startTime:    string;
  hours:        number;
  hourlyRate:   number;
  topic:        string;
};

type LocationState = { booking?: BookingState };

export function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const state = (location.state || {}) as LocationState;

  const STORAGE_KEY = "pp_pending_booking";

  const booking = useMemo<BookingState | undefined>(() => {
    if (state.booking) return state.booking;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BookingState) : undefined;
    } catch { return undefined; }
  }, [state.booking]);

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [verifying,     setVerifying]     = useState(false);

  useEffect(() => {
    if (state.booking) {
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.booking)); } catch { /* ignore */ }
    }
  }, [state.booking]);

  const summary = useMemo(() => {
    if (!booking) return null;
    const subtotal      = booking.hours * booking.hourlyRate;
    const platformFee   = subtotal * 0.05;
    const total         = subtotal;
    const tutorReceives = subtotal - platformFee;
    return { subtotal, platformFee, total, tutorReceives };
  }, [booking]);

  // ── Handle Stripe redirect back ──────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkout   = params.get("checkout");
    const sessionId  = params.get("session_id");

    if (!checkout) return;

    if (checkout === "success" && sessionId) {
      // Verify booking was actually created by the webhook
      setVerifying(true);
      const verifyBooking = async () => {
        try {
          const { data } = await supabase
            .from("bookings")
            .select("id, status")
            .eq("stripe_session_id", sessionId)
            .maybeSingle();

          if (data?.status === "confirmed") {
            toast.success("Payment confirmed! Your session has been booked.");
            sessionStorage.removeItem(STORAGE_KEY);
            navigate("/sessions", { replace: true });
          } else {
            // Webhook may not have fired yet — poll once more after delay
            setTimeout(async () => {
              const { data: retry } = await supabase
                .from("bookings")
                .select("id, status")
                .eq("stripe_session_id", sessionId)
                .maybeSingle();

              if (retry?.status === "confirmed") {
                toast.success("Payment confirmed! Your session has been booked.");
                sessionStorage.removeItem(STORAGE_KEY);
                navigate("/sessions", { replace: true });
              } else {
                toast.error("Payment received but booking confirmation is still processing. Please check your sessions shortly.");
                navigate("/sessions", { replace: true });
              }
              setVerifying(false);
            }, 3000);
          }
        } catch {
          toast.error("Could not verify booking. Please check your sessions page.");
          setVerifying(false);
        }
      };
      verifyBooking();
      return;
    }

    if (checkout === "cancelled") {
      toast.message("Checkout cancelled. Your booking was not confirmed.");
      navigate("/payment", { replace: true });
    }
  }, [location.search, navigate]);

  const handleStripeCheckout = async () => {
    if (!booking || !summary) return;
    if (!user) { toast.error("You must be signed in to pay."); return; }

    setIsRedirecting(true);
    try {
      const amountCents = Math.max(1, Math.round(summary.total * 100));
      const endpoint    = `${supabaseFunctionsBaseUrl}/stripe/create-checkout-session`;

      const response = await fetch(endpoint, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:   `Bearer ${publicAnonKey}`,
          apikey:          publicAnonKey,
        },
        body: JSON.stringify({
          amountCents,
          currency:    "usd",
          description: `Tutoring session with ${booking.tutorName}`,
          metadata: {
            student_id:  user.id,          // needed by webhook to create booking
            tutor_id:    booking.tutorId,
            subject:     booking.subjectLabel,
            topic:       booking.topic,
            date:        booking.date,
            start_time:  booking.startTime,
            hours:       String(booking.hours),
            hourly_rate: String(booking.hourlyRate),
            total_amount: String(summary.total),
          },
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok) throw new Error(data?.error ?? "Failed to create Stripe checkout session");
      if (!data.url)    throw new Error("Stripe checkout URL missing in response");

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(booking));
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Stripe checkout failed");
      setIsRedirecting(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Confirming your booking…</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we verify your payment.</p>
        </div>
      </div>
    );
  }

  if (!booking || !summary) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>No booking details were found. Start by booking a tutor session.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/find-tutors")}>Find Tutors</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
          <p className="text-gray-600 mt-1">Complete payment to confirm your tutoring session</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Checkout
                </CardTitle>
                <CardDescription>
                  You will be redirected to Stripe's secure hosted checkout page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-700 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">Secure Payment</p>
                      <p className="text-xs text-blue-900/80 mt-1">
                        Your booking is confirmed automatically once payment is received. Platform fee is 5%.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" onClick={handleStripeCheckout} disabled={isRedirecting}>
                    {isRedirecting
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting to Stripe…</>
                      : `Pay $${summary.total.toFixed(2)} with Stripe`}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/book/${booking.tutorId}`)}>
                    Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order summary */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>{booking.tutorName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subject:</span><span className="font-medium">{booking.subjectLabel}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Topic:</span><span className="font-medium">{booking.topic}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Date:</span><span className="font-medium">{new Date(booking.date).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Time:</span><span className="font-medium">{booking.startTime}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Duration:</span><span className="font-medium">{booking.hours} hour{booking.hours !== 1 ? "s" : ""}</span></div>
                </div>
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-medium">${summary.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Platform Fee (5%):</span><span className="text-gray-600">${summary.platformFee.toFixed(2)}</span></div>
                  <div className="border-t pt-2 flex justify-between text-base">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-blue-600">${summary.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-700">
                    <strong>Note:</strong> Tutor receives ${summary.tutorReceives.toFixed(2)} after platform fee.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
