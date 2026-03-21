import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { Web3Provider } from "@/context/Web3Context";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { CitizenDashboard } from "@/pages/CitizenDashboard";
import { PropertyRegistrationPage } from "@/pages/PropertyRegistrationPage";
import { PropertyListingPage } from "@/pages/PropertyListingPage";
import { PropertyDetailPage } from "@/pages/PropertyDetailPage";
import { OwnershipTransferPage } from "@/pages/OwnershipTransferPage";
import { GovernmentDashboard } from "@/pages/GovernmentDashboard";
import { AdminPanel } from "@/pages/AdminPanel";
import { UserRole } from "@/types";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/properties" element={<PropertyListingPage />} />
              <Route path="/properties/:id" element={<PropertyDetailPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <CitizenDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/register-property"
                element={
                  <ProtectedRoute>
                    <PropertyRegistrationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/transfer/:propertyId"
                element={
                  <ProtectedRoute>
                    <OwnershipTransferPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/government"
                element={
                  <ProtectedRoute roles={[UserRole.GOVERNMENT]}>
                    <GovernmentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute roles={[UserRole.ADMIN]}>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" />
        </AuthProvider>
      </Web3Provider>
    </QueryClientProvider>
  );
}
