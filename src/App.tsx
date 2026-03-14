import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();
const Index = lazy(() => import("./pages/Index"));
const SessionView = lazy(() => import("./components/SessionView"));
const ResetPasswordForm = lazy(() =>
  import("./components/ResetPasswordForm").then((module) => ({
    default: module.ResetPasswordForm,
  }))
);
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      <p className="text-sm text-gray-600">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/session/:sessionId" element={<SessionView />} />
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
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
