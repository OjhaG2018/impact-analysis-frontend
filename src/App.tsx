// frontend/src/App.tsx
import React from 'react';
import GrameenUdyamiDashboard from './pages/GrameenUdyamiDashboard';
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
  ResourceAssignmentsPage,
  MyAssignmentsPage,
  AttendancePage,

  BeneficiariesPage,
  InterviewsPage,
  AnalyticsPage,
  SettingsPage,
  AIInterviewsManagementPage,
  AIVoiceInterviewPage,
  VideoAnalysisPage,
  SentimentAnalysisPage,
  PrerecordedVideoUploadPage,
  AudioAnalysisPage,
  PasswordResetPage,
  PasswordResetConfirmPage,
} from './pages';
import { ProjectDetailsPage } from './features/projects';
import { BeneficiaryProfilePage, BeneficiaryEditPage } from './features/beneficiaries';
import { FieldResourceProfilePage, FieldResourceEditPage } from './features/field-resources';
import { QuestionnairesPage, QuestionBankPage } from './features/questionnaires';
import { InterviewDetailPage } from './features/interviews';
import { 

  AISessionTemplatesPage 
} from './features/ai-voice-interviews';

import { OrganizationSettingsPage } from './features/settings';




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
      
      {/* Password Reset Routes - Public */}
      <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <PasswordResetPage />} />
      <Route path="/reset-password/:uid/:token" element={user ? <Navigate to="/" /> : <PasswordResetConfirmPage />} />
      
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
                
                {/* Projects */}
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailsPage />} />
                
                {/* Beneficiaries */}
                <Route path="/beneficiaries" element={<BeneficiariesPage />} />
                <Route path="/beneficiaries/:id" element={<BeneficiaryProfilePage />} />
                <Route path="/beneficiaries/:id/edit" element={<BeneficiaryEditPage />} />
                
                {/* Field Resources */}
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/resources/:id" element={<FieldResourceProfilePage />} />
                <Route path="/resources/:id/edit" element={<FieldResourceEditPage />} />
                <Route path="/assignments" element={<ResourceAssignmentsPage />} />
                <Route path="/my-assignments" element={<MyAssignmentsPage />} />
                <Route path="/attendance" element={<AttendancePage />} />
                
                {/* Questionnaires */}
                <Route path="/questionnaires" element={<QuestionnairesPage />} />
                <Route path="/questionnaires/questions" element={<QuestionBankPage />} />
                
                {/* Interviews */}
                <Route path="/interviews" element={<InterviewsPage />} />
                <Route path="/interviews/:id" element={<InterviewDetailPage />} />
                <Route path="/ai-interviews" element={<AIInterviewsManagementPage />} />
                <Route path="/ai-interviews" element={<AIInterviewsManagementPage />} />
                <Route path="/ai-interviews/templates" element={<AISessionTemplatesPage />} />
                
                {/* Analysis */}
                <Route path="/video-analysis" element={<VideoAnalysisPage />} />
                <Route path="/video-analysis/upload" element={<PrerecordedVideoUploadPage />} />
                <Route path="/audio-analysis" element={<AudioAnalysisPage />} />
                <Route path="/sentiment-analysis" element={<SentimentAnalysisPage />} />
                <Route path="/upload-videos" element={<PrerecordedVideoUploadPage />} />
                
                {/* Analytics & Settings */}
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/organization" element={<OrganizationSettingsPage />} />
                {/* Demo */}
                <Route path="/demo/grameen-udyami" element={<GrameenUdyamiDashboard />} />
                
                {/* Catch all */}
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