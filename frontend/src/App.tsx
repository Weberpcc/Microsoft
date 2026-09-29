import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { WebsitesPage } from './pages/WebsitesPage';
import { WebsiteDetailsPage } from './pages/WebsiteDetailsPage';
import { SEOAuditPage } from './pages/SEOAuditPage';
import { AuditReportPage } from './pages/AuditReportPage';
import { KeywordTrackingPage } from './pages/KeywordTrackingPage';
import { OptimizationsPage } from './pages/OptimizationsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { CompetitorsPage } from './pages/CompetitorsPage';
import { MemoryLabPage } from './pages/MemoryLabPage';
import { MemoryExplorerPage } from './pages/MemoryExplorerPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected routes wrapped in AppLayout */}
              <Route path="/dashboard" element={<AppLayout><DashboardPage /></AppLayout>} />
              <Route path="/websites" element={<AppLayout><WebsitesPage /></AppLayout>} />
              <Route path="/websites/:id" element={<AppLayout><WebsiteDetailsPage /></AppLayout>} />
              <Route path="/audits/new" element={<AppLayout><SEOAuditPage /></AppLayout>} />
              <Route path="/audits/:id" element={<AppLayout><AuditReportPage /></AppLayout>} />
              <Route path="/keywords" element={<AppLayout><KeywordTrackingPage /></AppLayout>} />
              <Route path="/optimizations" element={<AppLayout><OptimizationsPage /></AppLayout>} />
              <Route path="/assistant" element={<AppLayout><AIAssistantPage /></AppLayout>} />
              <Route path="/competitors" element={<AppLayout><CompetitorsPage /></AppLayout>} />
              <Route path="/memory-lab" element={<AppLayout><MemoryLabPage /></AppLayout>} />
              <Route path="/memory-explorer" element={<AppLayout><MemoryExplorerPage /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
              <Route path="/profile" element={<AppLayout><ProfilePage /></AppLayout>} />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
