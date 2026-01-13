// features/pdf-analysis/PDFAnalysisPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Upload, Search, Eye, Trash2, Sparkles, RefreshCw, X,
  CheckCircle, AlertCircle, Loader2, FileUp, Table, List,
  BarChart3, Hash, Layers, BookOpen, ChevronRight, ChevronDown,
  Tag, FileSearch, Download, Check
} from 'lucide-react';
import { api, endpoints } from '../../api';

// ============== TYPES ==============

interface PDFDocument {
  id: string;
  title: string;
  description: string | null;
  category: string;
  category_display: string;
  file: string;
  original_filename: string;
  file_size: number;
  file_size_display: string;
  page_count: number;
  word_count: number;
  status: 'pending' | 'processing' | 'extracted' | 'themes_extracted' | 'summarized' | 'failed';
  status_display: string;
  themes_extracted: boolean;
  theme_count?: number;
  summary_count?: number;
  table_count?: number;
  extracted_text?: string;
  themes?: PDFTheme[];
  summaries?: PDFSummary[];
  created_at: string;
  updated_at: string;
}

interface PDFThemeSummary {
  id: string;
  theme: string;
  summary_type: string;
  summary_type_display?: string;
  summary_text: string;
  key_points?: string[] | null;
  created_at: string;
}

interface PDFTheme {
  id: string;
  document: string;
  theme_code: string | null;
  theme_title: string;
  full_title: string;
  theme_type: string;
  theme_type_display: string;
  content_text: string | null;
  word_count: number;
  order: number;
  level: number;
  parent_theme: string | null;
  summary: string | null;
  has_summary: boolean;
  is_verified: boolean;
  theme_summaries?: PDFThemeSummary[];  // Array of summaries
  created_at: string;
}

interface PDFSummary {
  id: string;
  document: string;
  summary_type: string;
  summary_type_display: string;
  summary_text: string;
  key_findings: string[] | null;
  topics: string[] | null;
  tokens_used: number;
  created_at: string;
}

interface PDFStats {
  total_documents: number;
  total_summaries: number;
  total_themes: number;
  total_pages_processed: number;
  documents_with_themes: number;
  recent_uploads_7_days: number;
}

// ============== CONSTANTS ==============

const CATEGORIES = [
  { value: 'report', label: 'Report' },
  { value: 'research', label: 'Research Paper' },
  { value: 'policy', label: 'Policy Document' },
  { value: 'educational', label: 'Educational Document' },
  { value: 'interview', label: 'Interview Transcript' },
  { value: 'financial', label: 'Financial Document' },
  { value: 'legal', label: 'Legal Document' },
  { value: 'other', label: 'Other' },
];

const SUMMARY_TYPES = [
  { value: 'brief', label: 'Brief Summary', description: '2-3 paragraph overview' },
  { value: 'detailed', label: 'Detailed Summary', description: 'Comprehensive analysis' },
  { value: 'key_points', label: 'Key Points', description: 'Numbered list of insights' },
  { value: 'themes_overview', label: 'Themes Overview', description: 'Summary of all themes' },
  { value: 'custom', label: 'Custom Prompt', description: 'Your own instructions' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  extracted: 'bg-green-100 text-green-700',
  themes_extracted: 'bg-indigo-100 text-indigo-700',
  summarized: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

// ============== HELPER FUNCTION ==============

// Get the best summary for a theme (either from theme.summary or theme_summaries array)
const getThemeSummaryText = (theme: PDFTheme): string | null => {
  // First check if there's a direct summary field
  if (theme.summary) {
    return theme.summary;
  }
  
  // Then check if there are theme_summaries
  if (theme.theme_summaries && theme.theme_summaries.length > 0) {
    // Get the most recent summary
    const sortedSummaries = [...theme.theme_summaries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedSummaries[0].summary_text;
  }
  
  return null;
};

// Check if theme has any summary
const themeHasSummary = (theme: PDFTheme): boolean => {
  return !!(theme.summary || theme.has_summary || (theme.theme_summaries && theme.theme_summaries.length > 0));
};

// ============== COMPONENTS ==============

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className={`${color} rounded-lg p-4 shadow-sm`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="p-3 bg-white rounded-full shadow-sm">{icon}</div>
    </div>
  </div>
);

// Theme List Item Component - FIXED with null checks and proper summary handling
const ThemeItem: React.FC<{
  theme: PDFTheme;
  onSummarize: (theme: PDFTheme) => void;
  onView: (theme: PDFTheme) => void;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ theme, onSummarize, onView, isExpanded, onToggle }) => {
  // Safe content text with fallback
  const contentText = theme.content_text || '';
  const contentPreview = contentText.length > 300 
    ? contentText.slice(0, 300) + '...' 
    : contentText;

  // Get summary text from either source
  const summaryText = getThemeSummaryText(theme);
  const hasSummary = themeHasSummary(theme);

  return (
    <div className={`border rounded-lg mb-2 ${theme.is_verified ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <div style={{ paddingLeft: `${theme.level * 16}px` }}>
            <div className="flex items-center gap-2">
              {theme.theme_code && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {theme.theme_code}
                </span>
              )}
              <span className="font-medium text-gray-900">{theme.theme_title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{theme.word_count || 0} words</span>
              <span>•</span>
              <span className="capitalize">{theme.theme_type || 'Unknown'}</span>
              {hasSummary && (
                <>
                  <span>•</span>
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Summarized
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onView(theme)}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
            title="View content"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSummarize(theme)}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
            title="Generate summary"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-3 border-t bg-gray-50">
          <div className="mt-3">
            {summaryText ? (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">Summary:</p>
                <p className="text-sm text-gray-700">{summaryText}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mb-3">No summary generated yet</p>
            )}
            {contentPreview ? (
              <p className="text-xs text-gray-400 mt-2 line-clamp-3">
                {contentPreview}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2 italic">No content available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============== MAIN COMPONENT ==============

const PDFAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [stats, setStats] = useState<PDFStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PDFDocument | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<PDFTheme | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'themes' | 'summaries'>('overview');
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Summary state
  const [summaryType, setSummaryType] = useState('brief');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingThemeId, setGeneratingThemeId] = useState<string | null>(null);

  // Processing state
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [extractingThemesId, setExtractingThemesId] = useState<string | null>(null);

  // ============== DATA FETCHING ==============

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const query = params.toString();
      const response = await api.get<PDFDocument[] | { results: PDFDocument[] }>(
        `${endpoints.pdfDocuments}${query ? `?${query}` : ''}`
      );
      
      const docs = Array.isArray(response) ? response : response.results || [];
      setDocuments(docs);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<PDFStats>(endpoints.pdfStats);
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchDocumentDetail = useCallback(async (id: string) => {
    try {
      const response = await api.get<PDFDocument>(endpoints.pdfDocument(id));
      setSelectedDocument(response);
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch document details');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ============== HANDLERS ==============

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) return;

    try {
      setUploading(true);
      setUploadError(null);
      
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('category', uploadCategory);

      await api.uploadFile(endpoints.pdfDocuments, formData);

      handleCloseUploadModal();
      fetchDocuments();
      fetchStats();
      setSuccessMessage('Document uploaded successfully!');
    } catch (err: any) {
      let errorMessage = 'Upload failed';
      if (err.response?.data) {
        const data = err.response.data;
        if (data.file) {
          errorMessage = Array.isArray(data.file) ? data.file[0] : data.file;
        } else if (data.detail) {
          errorMessage = data.detail;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadTitle('');
    setUploadDescription('');
    setUploadCategory('other');
    setUploadError(null);
  };

  const handleExtract = async (doc: PDFDocument) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(doc.id));
      await api.post(endpoints.pdfExtract(doc.id), {});
      fetchDocuments();
      if (selectedDocument?.id === doc.id) {
        fetchDocumentDetail(doc.id);
      }
      setSuccessMessage('Text extracted successfully!');
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const handleExtractThemes = async (doc: PDFDocument) => {
    try {
      setExtractingThemesId(doc.id);
      const response = await api.post<{ themes: PDFTheme[], total_themes: number }>(
        endpoints.pdfExtractThemes(doc.id),
        { method: 'auto' }
      );
      
      fetchDocuments();
      if (selectedDocument?.id === doc.id) {
        await fetchDocumentDetail(doc.id);
      }
      
      setSuccessMessage(`Extracted ${response.total_themes} themes successfully!`);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Theme extraction failed');
    } finally {
      setExtractingThemesId(null);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDocument) return;

    try {
      setGenerating(true);
      await api.post(endpoints.pdfSummarize(selectedDocument.id), {
        summary_type: summaryType,
        custom_prompt: summaryType === 'custom' ? customPrompt : undefined,
      });

      setShowSummaryModal(false);
      setSummaryType('brief');
      setCustomPrompt('');
      await fetchDocumentDetail(selectedDocument.id);
      fetchDocuments();
      setSuccessMessage('Summary generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Summary generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateThemeSummary = async (theme: PDFTheme) => {
    try {
      setGeneratingThemeId(theme.id);
      setGenerating(true);
      
      // Call the theme summarize endpoint
      const response = await api.post<PDFThemeSummary>(
        `${endpoints.pdfThemes}${theme.id}/summarize/`,
        { summary_type: 'brief' }
      );
      
      // Refresh document to get updated theme data
      if (selectedDocument) {
        const updatedDoc = await fetchDocumentDetail(selectedDocument.id);
        
        // Also update the selectedTheme if we're viewing it
        if (selectedTheme?.id === theme.id && updatedDoc?.themes) {
          const updatedTheme = updatedDoc.themes.find(t => t.id === theme.id);
          if (updatedTheme) {
            // Manually add the new summary to the theme
            setSelectedTheme({
              ...updatedTheme,
              summary: response.summary_text,
              has_summary: true,
              theme_summaries: [response, ...(updatedTheme.theme_summaries || [])]
            });
          }
        }
      }
      
      setSuccessMessage('Theme summary generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Theme summary generation failed');
    } finally {
      setGenerating(false);
      setGeneratingThemeId(null);
    }
  };

  const handleSummarizeAllThemes = async () => {
    if (!selectedDocument) return;

    try {
      setGenerating(true);
      await api.post(`${endpoints.pdfDocument(selectedDocument.id)}summarize_all_themes/`, {});
      
      await fetchDocumentDetail(selectedDocument.id);
      setSuccessMessage('Themes overview generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Themes overview generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (doc: PDFDocument) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) return;

    try {
      await api.delete(endpoints.pdfDocument(doc.id));
      fetchDocuments();
      fetchStats();
      if (selectedDocument?.id === doc.id) {
        setShowDetailModal(false);
        setSelectedDocument(null);
      }
      setSuccessMessage('Document deleted successfully!');
    } catch (err: any) {
      setError(err.message || 'Delete failed');
    }
  };

  const handleViewDocument = async (doc: PDFDocument) => {
    setSelectedDocument(doc);
    setShowDetailModal(true);
    setActiveTab('overview');
    fetchDocumentDetail(doc.id);
  };

  const handleOpenSummaryModal = (doc: PDFDocument) => {
    setSelectedDocument(doc);
    setShowSummaryModal(true);
  };

  const toggleThemeExpanded = (themeId: string) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(themeId)) {
        next.delete(themeId);
      } else {
        next.add(themeId);
      }
      return next;
    });
  };

  const handleViewTheme = (theme: PDFTheme) => {
    setSelectedTheme(theme);
    setShowThemeModal(true);
  };

  // ============== RENDER ==============

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-blue-600" />
          PDF Analysis & Theme Extraction
        </h1>
        <p className="text-gray-600 mt-1">
          Upload PDFs, extract themes/topics, and generate AI summaries
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="Total Documents"
            value={stats.total_documents}
            icon={<FileText className="w-6 h-6 text-blue-600" />}
            color="bg-blue-50"
          />
          <StatCard
            title="Pages Processed"
            value={stats.total_pages_processed}
            icon={<List className="w-6 h-6 text-green-600" />}
            color="bg-green-50"
          />
          <StatCard
            title="Themes Extracted"
            value={stats.total_themes}
            icon={<Layers className="w-6 h-6 text-indigo-600" />}
            color="bg-indigo-50"
          />
          <StatCard
            title="Summaries Generated"
            value={stats.total_summaries}
            icon={<Sparkles className="w-6 h-6 text-purple-600" />}
            color="bg-purple-50"
          />
          <StatCard
            title="Docs with Themes"
            value={stats.documents_with_themes}
            icon={<BookOpen className="w-6 h-6 text-orange-600" />}
            color="bg-orange-50"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="extracted">Extracted</option>
              <option value="themes_extracted">Themes Extracted</option>
              <option value="summarized">Summarized</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setCategoryFilter('');
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              title="Clear filters"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload PDF
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-gray-500">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No documents found</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload your first PDF
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Document</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Themes</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Pages</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Size</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{doc.title}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {doc.original_filename}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{doc.category_display}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                      {doc.status === 'processing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                      {doc.status_display}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {doc.themes_extracted ? (
                      <span className="inline-flex items-center gap-1 text-sm text-indigo-600">
                        <Layers className="w-4 h-4" />
                        {doc.theme_count || 0}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.page_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.file_size_display}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <button
                        onClick={() => navigate(`/pdf-analysis/${doc.id}`)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Extract Text */}
                      {(doc.status === 'pending' || doc.status === 'failed') && (
                        <button
                          onClick={() => handleExtract(doc)}
                          disabled={processingIds.has(doc.id)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                          title="Extract text"
                        >
                          {processingIds.has(doc.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileSearch className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Extract Themes */}
                      {(doc.status === 'extracted' || doc.status === 'themes_extracted' || doc.status === 'summarized') && !doc.themes_extracted && (
                        <button
                          onClick={() => handleExtractThemes(doc)}
                          disabled={extractingThemesId === doc.id}
                          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50"
                          title="Extract themes"
                        >
                          {extractingThemesId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Layers className="w-4 h-4" />
                          )}
                        </button>
                      )}

                      {/* Summarize */}
                      {(doc.status === 'extracted' || doc.status === 'themes_extracted' || doc.status === 'summarized') && (
                        <button
                          onClick={() => handleOpenSummaryModal(doc)}
                          className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Generate summary"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(doc)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upload PDF Document</h2>
                <button onClick={handleCloseUploadModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{uploadError}</span>
                </div>
              )}

              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file?.type === 'application/pdf') {
                    setUploadFile(file);
                    setUploadError(null);
                    if (!uploadTitle) setUploadTitle(file.name.replace('.pdf', ''));
                  } else {
                    setUploadError('Only PDF files are allowed');
                  }
                }}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{uploadFile.name}</p>
                      <p className="text-sm text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button onClick={() => setUploadFile(null)} className="p-1 text-gray-400 hover:text-red-500">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">
                      Drag & drop your PDF here, or{' '}
                      <label className="text-blue-600 hover:underline cursor-pointer">
                        browse
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.type === 'application/pdf') {
                                setUploadFile(file);
                                setUploadError(null);
                                if (!uploadTitle) setUploadTitle(file.name.replace('.pdf', ''));
                              } else {
                                setUploadError('Only PDF files are allowed');
                              }
                            }
                          }}
                        />
                      </label>
                    </p>
                    <p className="text-sm text-gray-400">PDF files up to 200MB</p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={handleCloseUploadModal} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || !uploadTitle || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload & Process</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {showDetailModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{selectedDocument.title}</h2>
                <p className="text-sm text-gray-500">{selectedDocument.original_filename}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b px-6">
              <div className="flex gap-4">
                {['overview', 'text', 'themes', 'summaries'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`py-3 px-2 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'overview' && 'Overview'}
                    {tab === 'text' && 'Extracted Text'}
                    {tab === 'themes' && `Themes (${selectedDocument.themes?.length || 0})`}
                    {tab === 'summaries' && `Summaries (${selectedDocument.summaries?.length || 0})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${STATUS_COLORS[selectedDocument.status]}`}>
                      {selectedDocument.status_display}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Pages</p>
                    <p className="font-semibold">{selectedDocument.page_count}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Words</p>
                    <p className="font-semibold">{selectedDocument.word_count?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Themes</p>
                    <p className="font-semibold">{selectedDocument.themes?.length || 0}</p>
                  </div>
                </div>
              )}

              {/* Text Tab */}
              {activeTab === 'text' && (
                <div>
                  {selectedDocument.extracted_text ? (
                    <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {selectedDocument.extracted_text.slice(0, 10000)}
                        {selectedDocument.extracted_text.length > 10000 && '...'}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No extracted text available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Themes Tab */}
              {activeTab === 'themes' && (
                <div>
                  {selectedDocument.themes && selectedDocument.themes.length > 0 ? (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Layers className="w-5 h-5 text-indigo-600" />
                          Extracted Themes ({selectedDocument.themes.length})
                        </h3>
                        <button
                          onClick={handleSummarizeAllThemes}
                          disabled={generating}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50"
                        >
                          {generating && !generatingThemeId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Summarize All Themes
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {selectedDocument.themes.map((theme) => (
                          <ThemeItem
                            key={theme.id}
                            theme={theme}
                            onSummarize={handleGenerateThemeSummary}
                            onView={handleViewTheme}
                            isExpanded={expandedThemes.has(theme.id)}
                            onToggle={() => toggleThemeExpanded(theme.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">No themes extracted yet</p>
                      <button
                        onClick={() => handleExtractThemes(selectedDocument)}
                        disabled={extractingThemesId === selectedDocument.id}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {extractingThemesId === selectedDocument.id ? (
                          <><Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Extracting...</>
                        ) : (
                          <>Extract Themes</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Summaries Tab */}
              {activeTab === 'summaries' && (
                <div>
                  {selectedDocument.summaries && selectedDocument.summaries.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDocument.summaries.map((summary) => (
                        <div key={summary.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                              {summary.summary_type_display}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(summary.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{summary.summary_text}</p>
                          
                          {summary.key_findings && summary.key_findings.length > 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                              <p className="text-sm font-medium text-yellow-800 mb-2">Key Findings:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {summary.key_findings.map((finding, i) => (
                                  <li key={i} className="text-sm text-yellow-700">{finding}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No summaries generated yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <div className="flex gap-2">
                {(selectedDocument.status === 'extracted' || selectedDocument.status === 'themes_extracted') && !selectedDocument.themes_extracted && (
                  <button
                    onClick={() => handleExtractThemes(selectedDocument)}
                    disabled={extractingThemesId === selectedDocument.id}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {extractingThemesId === selectedDocument.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    Extract Themes
                  </button>
                )}
                <button
                  onClick={() => handleOpenSummaryModal(selectedDocument)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </button>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme Detail Modal */}
      {showThemeModal && selectedTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {selectedTheme.theme_code && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        {selectedTheme.theme_code}
                      </span>
                    )}
                    <h2 className="text-xl font-semibold">{selectedTheme.theme_title}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{selectedTheme.word_count || 0} words • {selectedTheme.theme_type || 'Unknown'}</p>
                </div>
                <button onClick={() => setShowThemeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Show summary from either source */}
              {(() => {
                const summaryText = getThemeSummaryText(selectedTheme);
                if (summaryText) {
                  return (
                    <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h3 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Summary
                      </h3>
                      <p className="text-purple-900">{summaryText}</p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <h3 className="font-medium text-gray-800 mb-2">Content</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {selectedTheme.content_text ? (
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTheme.content_text}</p>
                  ) : (
                    <p className="text-gray-400 italic">No content available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <button
                onClick={() => handleGenerateThemeSummary(selectedTheme)}
                disabled={generating || generatingThemeId === selectedTheme.id}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {generatingThemeId === selectedTheme.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {getThemeSummaryText(selectedTheme) ? 'Regenerate Summary' : 'Generate Summary'}
              </button>
              <button onClick={() => setShowThemeModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Generation Modal */}
      {showSummaryModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Generate AI Summary</h2>
                <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Select summary type for "{selectedDocument.title}"</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {SUMMARY_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      summaryType === type.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="summaryType"
                      value={type.value}
                      checked={summaryType === type.value}
                      onChange={(e) => setSummaryType(e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{type.label}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>

              {summaryType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Prompt</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your custom instructions..."
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowSummaryModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={generating || (summaryType === 'custom' && !customPrompt)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Summary</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFAnalysisPage;