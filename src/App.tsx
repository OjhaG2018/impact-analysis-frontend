// frontend/src/App.tsx
// UPDATED: Added VideoAnalysisPage route and public AI interview route
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingSpinner } from './components/ui';
import {
  Dashboard,
  LoginPage,
  RegisterPage,
  ProjectsPage,
  ResourcesPage,
  QuestionnairesPage,
  BeneficiariesPage,
  InterviewsPage,
  AnalyticsPage,
  SettingsPage,
  AIInterviewsManagementPage,
  AIVoiceInterviewPage,
  VideoAnalysisPage,
} from './pages';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />
      
      {/* Public AI Interview Route - No authentication required */}
      <Route path="/ai-interview/:accessToken" element={<AIVoiceInterviewPage />} />
      
      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/questionnaires" element={<QuestionnairesPage />} />
                <Route path="/beneficiaries" element={<BeneficiariesPage />} />
                <Route path="/interviews" element={<InterviewsPage />} />
                <Route path="/ai-interviews" element={<AIInterviewsManagementPage />} />
                <Route path="/video-analysis" element={<VideoAnalysisPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;