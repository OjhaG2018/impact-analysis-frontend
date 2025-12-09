# Features Folder Structure

This folder contains all feature modules organized by domain. Each feature has its own folder with related components, hooks, and utilities.

## ✅ Completed Structure

```
features/
├── auth/                    # ✅ Authentication & Authorization (Login/Register)
│   ├── LoginPage.tsx
│   └── index.ts
│
├── dashboard/               # ✅ Main Dashboard
│   ├── DashboardPage.tsx
│   └── index.ts
│
├── projects/                # ✅ Projects Management
│   ├── ProjectsPage.tsx    # Re-exports from pages/ProjectsPage.tsx
│   └── index.ts
│
├── beneficiaries/           # ✅ Beneficiaries Management
│   ├── BeneficiariesPage.tsx  # Re-exports from pages/BeneficiariesPage.tsx
│   └── index.ts
│
├── field-resources/         # ✅ Field Resources Management
│   ├── FieldResourcesPage.tsx  # Re-exports from pages/ResourcesPage.tsx
│   └── index.ts
│
├── questionnaires/          # ✅ Questionnaires Management
│   ├── QuestionnairesPage.tsx  # Re-exports from pages/QuestionnairesPage.tsx
│   └── index.ts
│
├── interviews/              # ✅ Interview Pipeline
│   ├── InterviewsPage.tsx  # Re-exports from pages/InterviewsPage.tsx
│   └── index.ts
│
├── ai-voice-interviews/     # ✅ AI Voice Interviews
│   ├── AIVoiceInterviewPage.tsx  # Re-exports from pages/AIVoiceInterviewPage.tsx
│   ├── AIInterviewsManagementPage.tsx  # Re-exports from pages/AIInterviewsManagementPage.tsx
│   └── index.ts
│
├── video-analysis/          # ✅ Video Analysis Dashboard
│   ├── VideoAnalysisPage.tsx  # Re-exports from pages/VideoAnalysisPage.tsx
│   └── index.ts
│
├── analytics/               # ✅ Analytics & Reports
│   ├── AnalyticsPage.tsx   # Re-exports from pages/AnalyticsPage.tsx
│   └── index.ts
│
├── settings/                # ✅ Settings & Configuration
│   ├── SettingsPage.tsx    # Re-exports from pages/SettingsPage.tsx
│   └── index.ts
│
└── index.ts                 # Central export for all features
```

## 📖 Usage Examples

### Import from main features index:
```typescript
import { 
  LoginPage,
  DashboardPage,
  ProjectsPage,
  BeneficiariesPage,
  FieldResourcesPage,
  QuestionnairesPage,
  InterviewsPage,
  AIVoiceInterviewPage,
  AIInterviewsManagementPage,
  VideoAnalysisPage,
  AnalyticsPage,
  SettingsPage
} from '@/features';
```

### Import directly from feature folder:
```typescript
import { LoginPage } from '@/features/auth';
import { ProjectsPage } from '@/features/projects';
import { DashboardPage } from '@/features/dashboard';
```

## 🔄 Migration Strategy

Currently, the feature folders re-export from the existing `pages/` folder. This allows:
1. **Immediate organization** without breaking existing code
2. **Gradual migration** - move actual implementations when needed
3. **Zero downtime** - all imports work immediately

### To fully migrate a feature:
1. Move the actual component file from `pages/` to the feature folder
2. Update imports in the component (e.g., `../api` → `../../api`)
3. Update the feature's index.ts to export directly instead of re-exporting

## 🎯 Benefits

1. **Organized** - Each feature in its own folder
2. **Scalable** - Easy to add new features
3. **Maintainable** - Changes isolated to feature folders
4. **Clean Imports** - Single source of truth
5. **Future-Ready** - Can add feature-specific:
   - Components
   - Hooks (useProjects, useBeneficiaries, etc.)
   - Utils
   - Types
   - API calls
   - Tests

## 📝 Adding New Features

1. Create folder: `mkdir features/new-feature`
2. Add components: `features/new-feature/NewFeaturePage.tsx`
3. Create index: `features/new-feature/index.ts`
4. Export from main: Update `features/index.ts`

Example:
```typescript
// features/new-feature/index.ts
export { default as NewFeaturePage } from './NewFeaturePage';

// features/index.ts
export * from './new-feature';
```

## 🚀 Next Steps

When you need to modify any feature:
1. Go to its feature folder (e.g., `features/projects/`)
2. Make your changes
3. All related code stays together
4. Easy to find and maintain

The structure is ready for future enhancements like:
- Feature-specific hooks
- Feature-specific components
- Feature-specific utilities
- Feature-specific tests
