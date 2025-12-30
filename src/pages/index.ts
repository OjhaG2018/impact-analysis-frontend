// src/pages/index.ts

// Re-export from features
export { LoginPage } from '../features/auth';
export { RegisterPage } from '../features/auth';
export { PasswordResetPage } from '../features/auth';           // NEW
export { PasswordResetConfirmPage } from '../features/auth';    // NEW
export { DashboardPage as Dashboard } from '../features/dashboard';
export { ProjectsPage } from '../features/projects';
export { BeneficiariesPage } from '../features/beneficiaries';
export { FieldResourcesPage as ResourcesPage, ResourceAssignmentsPage, MyAssignmentsPage, AttendancePage } from '../features/field-resources';
export { QuestionnairesPage } from '../features/questionnaires';
export { InterviewsPage } from '../features/interviews';
export { AIVoiceInterviewPage, AIInterviewsManagementPage } from '../features/ai-voice-interviews';
export { VideoAnalysisPage, SentimentAnalysisPage, AudioAnalysisPage, PrerecordedVideoUploadPage } from '../features/video-analysis';
export { AnalyticsPage } from '../features/analytics';
export { SettingsPage } from '../features/settings';