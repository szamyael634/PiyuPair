import { useMemo } from "react";
import { JitsiMeeting } from "@jitsi/react-sdk";
import { useNavigate } from "react-router";
import { Navigation } from "./Navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useAuth } from "../contexts/AuthContext";

const JITSI_DOMAIN = "meet.jit.si";

type JitsiMeetingProps = {
  roomName: string | null;
  title: string;
  subtitle: string;
  backLabel: string;
  backTo: string;
  emptyMessage: string;
};

export function JitsiMeetingView({
  roomName,
  title,
  subtitle,
  backLabel,
  backTo,
  emptyMessage,
}: JitsiMeetingProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userInfo = useMemo(() => {
    const displayName = user?.name?.trim();
    return displayName ? { displayName } : undefined;
  }, [user?.name]);

  if (!roomName) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{emptyMessage}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate(backTo)}>{backLabel}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(backTo)}>
            {backLabel}
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden border bg-white">
          <JitsiMeeting
            domain={JITSI_DOMAIN}
            roomName={roomName}
            userInfo={userInfo}
            configOverwrite={{
              prejoinPageEnabled: true,
              disableDeepLinking: true,
            }}
            interfaceConfigOverwrite={{
              APP_NAME: "Piyupair",
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
            }}
            getIFrameRef={(iframeRef) => {
              iframeRef.style.height = "calc(100vh - 190px)";
              iframeRef.style.width = "100%";
            }}
            onReadyToClose={() => navigate(backTo)}
          />
        </div>
      </div>
    </div>
  );
}