import { useParams } from "react-router";
import { JitsiMeetingView } from "./JitsiMeeting";

function toClassroomRoomName(classroomId: string): string {
  const base = `piyupair-classroom-${classroomId}`;
  return base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ClassroomCall() {
  const { classroomId } = useParams();

  const roomName = classroomId ? toClassroomRoomName(classroomId) : null;

  return (
    <JitsiMeetingView
      roomName={roomName}
      title="Classroom Video Call"
      subtitle={classroomId ? `Classroom #${classroomId}` : "Classroom call"}
      backLabel="Back to Classroom"
      backTo={classroomId ? `/classroom/${classroomId}` : "/study-groups"}
      emptyMessage="Missing classroom id."
    />
  );
}