import { Navigate, Route, Routes, useLocation, type Location } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { JoinSocietyPage } from "./pages/JoinSocietyPage";
import { SocietyDetailPage } from "./pages/SocietyDetailPage";
import { UnitDetailPage } from "./pages/UnitDetailPage";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace state={{ from: location }} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="join" element={<JoinSocietyPage />} />
        <Route path="societies/:societyId" element={<SocietyDetailPage />} />
        <Route path="units/:unitId" element={<UnitDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
