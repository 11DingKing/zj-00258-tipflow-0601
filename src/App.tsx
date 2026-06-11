import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/store/auth";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import ReportPage from "@/pages/Report";
import CluesPage from "@/pages/Clues";
import StatisticsPage from "@/pages/Statistics";

function Protected({
  children,
  roles,
}: {
  children: JSX.Element;
  roles?: string[];
}) {
  const user = useAuthStore((s) => s.user);
  const restore = useAuthStore((s) => s.restore);
  const loc = useLocation();
  const restored = useAuthStore((s) => !!s.user);

  useEffect(() => {
    if (!user) restore();
  }, []);

  if (!restored && !user) return <LoginPage />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#0F2747",
          colorInfo: "#2563EB",
          borderRadius: 8,
          fontFamily:
            '"PingFang SC","Helvetica Neue",Helvetica,Arial,sans-serif',
        },
        components: {
          Button: {
            algorithm: true,
            colorPrimary: "#0F2747",
            controlHeight: 36,
          },
          Table: {
            headerBg: "#F8FAFC",
            headerSplitColor: "#F1F5F9",
            rowHoverBg: "rgba(15,39,71,0.03)",
          },
          Tag: {
            borderRadiusSM: 6,
          },
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Protected>
                <AppLayout />
              </Protected>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route
              path="report"
              element={
                <Protected roles={["reporter", "grid_member"]}>
                  <ReportPage />
                </Protected>
              }
            />
            <Route
              path="clues"
              element={
                <Protected roles={["operator", "verifier"]}>
                  <CluesPage />
                </Protected>
              }
            />
            <Route
              path="statistics"
              element={
                <Protected roles={["operator"]}>
                  <StatisticsPage />
                </Protected>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
