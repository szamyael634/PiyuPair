import { Outlet } from "react-router";
import { FloatingSupportWidget } from "./FloatingSupportWidget";

export function Root() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
      <FloatingSupportWidget />
    </div>
  );
}
