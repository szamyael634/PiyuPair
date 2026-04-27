import { useParams } from "react-router";
import { JitsiMeetingView } from "./JitsiMeeting";

function toJitsiRoomName(sessionId: string): string {
  const base = `piyupair-session-${sessionId}`;
  return base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function VideoCall() {
  const { sessionId } = useParams();
  const roomName = sessionId ? toJitsiRoomName(sessionId) : null;

  if (!sessionId) {
    return (
      <JitsiMeetingView
        roomName={null}
        title="Video Call"
        subtitle="Session call"
        backLabel="Back to Sessions"
        backTo="/sessions"
        emptyMessage="Missing session id."
      />
    );
  }

  return (
    <JitsiMeetingView
      roomName={roomName}
      title="Video Call"
      subtitle={`Session #${sessionId}`}
      backLabel="Back to Sessions"
      backTo="/sessions"
      emptyMessage="Unable to create a room for this session."
    />
  );
}
