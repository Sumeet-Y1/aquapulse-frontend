import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { JoinSocietyPage } from "./pages/JoinSocietyPage";
import { SocietyDetailPage } from "./pages/SocietyDetailPage";
import { UnitDetailPage } from "./pages/UnitDetailPage";
import { MeetingsPage } from "./pages/MeetingsPage";
import { MeetingRoomPage } from "./pages/MeetingRoomPage";
import { LandingPage } from "./pages/LandingPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace state={{ from: location }} />;
}

function HomeRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppShell /> : <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRoute />}>
        <Route index element={<DashboardPage />} />
      </Route>
      <Route
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route path="join" element={<JoinSocietyPage />} />
        <Route path="societies/:societyId" element={<SocietyDetailPage />} />
        <Route path="societies/:societyId/meetings" element={<MeetingsPage />} />
        <Route path="meetings/:id" element={<MeetingRoomPage />} />
        <Route path="units/:unitId" element={<UnitDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
