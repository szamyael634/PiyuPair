import { createBrowserRouter } from "react-router";
import Root from "./components/Root";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import StudentDashboard from "./components/StudentDashboard";
import TutorDashboard from "./components/TutorDashboard";
import AdminDashboard from "./components/AdminDashboard";
import BrowseTutors from "./components/BrowseTutors";
import TutorProfile from "./components/TutorProfile";
import Classroom from "./components/Classroom";
import Messages from "./components/Messages";
import VideoCall from "./components/VideoCall";
import NotFound from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "login", Component: Login },
      { path: "signup", Component: Signup },
      { path: "student", Component: StudentDashboard },
      { path: "student/browse-tutors", Component: BrowseTutors },
      { path: "student/tutor/:id", Component: TutorProfile },
      { path: "tutor", Component: TutorDashboard },
      { path: "admin", Component: AdminDashboard },
      { path: "classroom/:sessionId", Component: Classroom },
      { path: "messages", Component: Messages },
      { path: "messages/:userId", Component: Messages },
      { path: "video-call/:sessionId", Component: VideoCall },
      { path: "*", Component: NotFound },
    ],
  },
]);
