import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: 0 },
  },
});
const Index = lazy(() => import("./pages/Index"));
const SessionView = lazy(() => import("./components/SessionView"));
const ResetPasswordForm = lazy(() =>
  import("./components/ResetPasswordForm").then((module) => ({
    default: module.ResetPasswordForm,
  }))
);
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const ForgotPasswordForm = lazy(() =>
  import("./components/ForgotPasswordForm").then((module) => ({
    default: module.ForgotPasswordForm,
  }))
);

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/session/:sessionId" element={<SessionView />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route
                path="/forgot-password"
                element={
                  <ForgotPasswordForm onBack={() => window.location.assign("/")} />
                }
              />
              <Route
                path="/reset-password"
                element={
                  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="w-full max-w-md">
                      <ResetPasswordForm />
                    </div>
                  </div>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
