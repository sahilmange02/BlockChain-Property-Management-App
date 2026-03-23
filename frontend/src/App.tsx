import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { Web3Provider } from "./context/Web3Context";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Navbar from "./components/layout/Navbar";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import PropertyListPage from "./pages/PropertyListPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import RegisterPropertyPage from "./pages/RegisterPropertyPage";
import TransferPropertyPage from "./pages/TransferPropertyPage";
import GovernmentDashboard from "./pages/GovernmentDashboard";
import AdminPanel from "./pages/AdminPanel";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Web3Provider>
          <BrowserRouter>
            <div className="app-shell">
              <Navbar />
              <Routes>
                {/* Public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/properties" element={<PropertyListPage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />

                {/* Citizen */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/register-property"
                  element={
                    <ProtectedRoute roles={["CITIZEN"]}>
                      <RegisterPropertyPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transfer/:propertyId"
                  element={
                    <ProtectedRoute roles={["CITIZEN"]}>
                      <TransferPropertyPage />
                    </ProtectedRoute>
                  }
                />

                {/* Government */}
                <Route
                  path="/government"
                  element={
                    <ProtectedRoute roles={["GOVERNMENT"]}>
                      <GovernmentDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["ADMIN"]}>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Toaster
              position="top-right"
              toastOptions={{
                style: { background: "#1f2937", color: "#fff", border: "1px solid #374151" },
              }}
            />
          </BrowserRouter>
        </Web3Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

