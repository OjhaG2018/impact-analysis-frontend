// features/pdf-analysis/PDFDocumentDetailPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, Sparkles, Table2, FileSearch, Loader2,
  Download, Calendar, User, Hash, BarChart3, Clock, Layers,
  ChevronRight, ChevronDown, Check, Eye, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { api, endpoints } from '../../api';

// ============== TYPES ==============

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
  theme_summaries?: PDFThemeSummary[];
  created_at: string;
}

interface PDFDocument {
  id: string;
  title: string;
  description: string;
  category: string;
  category_display: string;
  original_filename: string;
  file_size: number;
  file_size_display: string;
  page_count: number;
  word_count: number;
  status: string;
  status_display: string;
  themes_extracted: boolean;
  theme_count?: number;
  uploaded_by_name: string;
  project_name: string | null;
  summary_count: number;
  table_count: number;
  created_at: string;
  extracted_text?: string;
  summaries?: PDFSummary[];
  tables?: ExtractedTable[];
  themes?: PDFTheme[];
  error_message?: string;
}

interface PDFSummary {
  id: string;
  summary_type: string;
  summary_type_display: string;
  summary_text: string;
  key_findings: string[] | null;
  topics: string[] | null;
  entities: Record<string, string[]> | null;
  sentiment: string | null;
  model_used: string;
  tokens_used: number;
  processing_time_seconds: number;
  rating: number | null;
  feedback: string | null;
  generated_by_name: string;
  created_at: string;
}

interface ExtractedTable {
  id: string;
  page_number: number;
  table_index: number;
  table_data: string[][];
  headers: string[] | null;
  row_count: number;
  column_count: number;
}

// ============== CONSTANTS ==============

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  extracted: 'bg-green-100 text-green-700',
  themes_extracted: 'bg-indigo-100 text-indigo-700',
  summarized: 'bg-purple-100 text-purple-700',
  failed: 'bg-red-100 text-red-700',
};

const SUMMARY_TYPES = [
  { value: 'brief', label: 'Brief Summary', description: '2-3 paragraph overview' },
  { value: 'detailed', label: 'Detailed Summary', description: 'Comprehensive analysis' },
  { value: 'key_points', label: 'Key Points', description: 'Numbered list of insights' },
  { value: 'themes_overview', label: 'Themes Overview', description: 'Summary of all themes' },
  { value: 'custom', label: 'Custom Prompt', description: 'Your own instructions' },
];

// ============== HELPER FUNCTIONS ==============

const getThemeSummaryText = (theme: PDFTheme): string | null => {
  if (theme.summary) return theme.summary;
  if (theme.theme_summaries && theme.theme_summaries.length > 0) {
    const sortedSummaries = [...theme.theme_summaries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sortedSummaries[0].summary_text;
  }
  return null;
};

const themeHasSummary = (theme: PDFTheme): boolean => {
  return !!(theme.summary || theme.has_summary || (theme.theme_summaries && theme.theme_summaries.length > 0));
};

// ============== THEME ITEM COMPONENT ==============

const ThemeItem: React.FC<{
  theme: PDFTheme;
  onSummarize: (theme: PDFTheme) => void;
  onView: (theme: PDFTheme) => void;
  isExpanded: boolean;
  onToggle: () => void;
  isGenerating: boolean;
}> = ({ theme, onSummarize, onView, isExpanded, onToggle, isGenerating }) => {
  const contentText = theme.content_text || '';
  const contentPreview = contentText.length > 300 
    ? contentText.slice(0, 300) + '...' 
    : contentText;
  const summaryText = getThemeSummaryText(theme);
  const hasSummary = themeHasSummary(theme);

  return (
    <div className={`border rounded-lg mb-2 ${theme.is_verified ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div style={{ paddingLeft: `${theme.level * 20}px` }}>
            <div className="flex items-center gap-2 flex-wrap">
              {theme.theme_code && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  {theme.theme_code}
                </span>
              )}
              <span className="font-medium text-gray-900">{theme.theme_title}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{theme.word_count || 0} words</span>
              <span>•</span>
              <span className="capitalize">{theme.theme_type_display || theme.theme_type || 'Unknown'}</span>
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
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View content"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => onSummarize(theme)}
            disabled={isGenerating}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
            title="Generate summary"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <div className="mt-4">
            {summaryText ? (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs font-medium text-purple-700 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Summary
                </p>
                <p className="text-sm text-purple-900">{summaryText}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mb-3">No summary generated yet</p>
            )}
            
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Content Preview:</p>
              {contentPreview ? (
                <p className="text-sm text-gray-600 line-clamp-4">{contentPreview}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">No content available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============== MAIN COMPONENT ==============

const PDFDocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // State
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'text' | 'themes' | 'tables' | 'summaries'>('overview');
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingThemes, setIsExtractingThemes] = useState(false);
  const [generatingThemeId, setGeneratingThemeId] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Theme states
  const [expandedThemes, setExpandedThemes] = useState<Set<string>>(new Set());
  const [selectedTheme, setSelectedTheme] = useState<PDFTheme | null>(null);
  const [showThemeModal, setShowThemeModal] = useState(false);
  
  // Summary modal states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryType, setSummaryType] = useState('brief');
  const [customPrompt, setCustomPrompt] = useState('');

  // ============== DATA FETCHING ==============

  const fetchDocument = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.get<PDFDocument>(endpoints.pdfDocument(id));
      setDocument(response);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // ============== HANDLERS ==============

  const handleExtract = async () => {
    if (!document) return;
    
    setIsProcessing(true);
    try {
      await api.post(endpoints.pdfExtract(document.id), {});
      await fetchDocument();
      setSuccessMessage('Text extracted successfully!');
    } catch (err: any) {
      setError(err.message || 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractThemes = async () => {
    if (!document) return;
    
    setIsExtractingThemes(true);
    try {
      const response = await api.post<{ themes: PDFTheme[], total_themes: number }>(
        endpoints.pdfExtractThemes(document.id),
        { method: 'auto' }
      );
      await fetchDocument();
      setSuccessMessage(`Extracted ${response.total_themes} themes successfully!`);
      setActiveTab('themes');
    } catch (err: any) {
      setError(err.message || 'Theme extraction failed');
    } finally {
      setIsExtractingThemes(false);
    }
  };

  const handleGenerateThemeSummary = async (theme: PDFTheme) => {
    setGeneratingThemeId(theme.id);
    try {
      const response = await api.post<PDFThemeSummary>(
        endpoints.pdfThemeSummarize(theme.id),
        { summary_type: 'brief' }
      );
      
      await fetchDocument();
      
      // Update selected theme if modal is open
      if (selectedTheme?.id === theme.id) {
        setSelectedTheme(prev => prev ? {
          ...prev,
          summary: response.summary_text,
          has_summary: true,
          theme_summaries: [response, ...(prev.theme_summaries || [])]
        } : null);
      }
      
      setSuccessMessage('Theme summary generated successfully!');
    } catch (err: any) {
      setError(err.message || 'Theme summary generation failed');
    } finally {
      setGeneratingThemeId(null);
    }
  };

  const handleSummarizeAllThemes = async () => {
    if (!document) return;
    
    setIsGeneratingSummary(true);
    try {
      await api.post(endpoints.pdfSummarizeAllThemes(document.id), {});
      await fetchDocument();
      setSuccessMessage('All themes summarized successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to summarize themes');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateDocumentSummary = async () => {
    if (!document) return;
    
    setIsGeneratingSummary(true);
    try {
      await api.post(endpoints.pdfSummarize(document.id), {
        summary_type: summaryType,
        custom_prompt: summaryType === 'custom' ? customPrompt : undefined,
      });
      
      setShowSummaryModal(false);
      setSummaryType('brief');
      setCustomPrompt('');
      await fetchDocument();
      setSuccessMessage('Summary generated successfully!');
      setActiveTab('summaries');
    } catch (err: any) {
      setError(err.message || 'Summary generation failed');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const toggleThemeExpanded = (themeId: string) => {
    setExpandedThemes(prev => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested document could not be found.'}</p>
          <button
            onClick={() => navigate('/pdf-analysis')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to PDF Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!document) return null;

  const themeCount = document.themes?.length || document.theme_count || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/pdf-analysis')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to PDF Analysis
          </button>
          
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{document.title}</h1>
              <p className="text-gray-600">{document.original_filename}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${STATUS_COLORS[document.status]}`}>
                {document.status_display}
              </span>
              
              {document.status === 'pending' && (
                <button
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                  Extract Text
                </button>
              )}
              
              {(document.status === 'extracted' || document.status === 'summarized') && !document.themes_extracted && (
                <button
                  onClick={handleExtractThemes}
                  disabled={isExtractingThemes}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {isExtractingThemes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  Extract Themes
                </button>
              )}
              
              {(document.status === 'extracted' || document.status === 'themes_extracted' || document.status === 'summarized') && (
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Summary
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards - Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div 
            onClick={() => setActiveTab('overview')}
            className={`bg-white rounded-xl p-6 border-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              activeTab === 'overview' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${activeTab === 'overview' ? 'bg-blue-500' : 'bg-blue-100'}`}>
                <Hash className={`w-6 h-6 ${activeTab === 'overview' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pages</p>
                <p className="text-2xl font-bold text-gray-900">{document.page_count || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => setActiveTab('text')}
            className={`bg-white rounded-xl p-6 border-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              activeTab === 'text' ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${activeTab === 'text' ? 'bg-green-500' : 'bg-green-100'}`}>
                <BarChart3 className={`w-6 h-6 ${activeTab === 'text' ? 'text-white' : 'text-green-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Words</p>
                <p className="text-2xl font-bold text-gray-900">{document.word_count?.toLocaleString() || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => setActiveTab('themes')}
            className={`bg-white rounded-xl p-6 border-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              activeTab === 'themes' ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${activeTab === 'themes' ? 'bg-indigo-500' : 'bg-indigo-100'}`}>
                <Layers className={`w-6 h-6 ${activeTab === 'themes' ? 'text-white' : 'text-indigo-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Themes</p>
                <p className="text-2xl font-bold text-gray-900">{themeCount}</p>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => setActiveTab('summaries')}
            className={`bg-white rounded-xl p-6 border-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              activeTab === 'summaries' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${activeTab === 'summaries' ? 'bg-purple-500' : 'bg-purple-100'}`}>
                <Sparkles className={`w-6 h-6 ${activeTab === 'summaries' ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Summaries</p>
                <p className="text-2xl font-bold text-gray-900">{document.summary_count}</p>
              </div>
            </div>
          </div>
          
          <div 
            onClick={() => setActiveTab('tables')}
            className={`bg-white rounded-xl p-6 border-2 shadow-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
              activeTab === 'tables' ? 'border-orange-500 ring-2 ring-orange-100' : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${activeTab === 'tables' ? 'bg-orange-500' : 'bg-orange-100'}`}>
                <Table2 className={`w-6 h-6 ${activeTab === 'tables' ? 'text-white' : 'text-orange-600'}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Tables</p>
                <p className="text-2xl font-bold text-gray-900">{document.table_count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <div className="px-6">
              <nav className="flex space-x-8 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: FileText },
                  { id: 'text', label: 'Extracted Text', count: document.word_count, icon: FileText },
                  { id: 'themes', label: 'Themes', count: themeCount, icon: Layers },
                  { id: 'tables', label: 'Tables', count: document.table_count, icon: Table2 },
                  { id: 'summaries', label: 'Summaries', count: document.summary_count, icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-lg font-medium text-gray-800">{document.category_display}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-gray-700">{document.description || 'No description provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Uploaded By</label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800">{document.uploaded_by_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">File Size</label>
                    <p className="text-lg font-medium text-gray-800">{document.file_size_display}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Upload Date</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-800">
                        {new Date(document.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {document.project_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Project</label>
                      <p className="text-lg font-medium text-gray-800">{document.project_name}</p>
                    </div>
                  )}
                </div>

                {document.error_message && (
                  <div className="col-span-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 font-medium">Error</p>
                    <p className="text-red-600 text-sm mt-1">{document.error_message}</p>
                  </div>
                )}
              </div>
            )}

            {/* Text Tab */}
            {activeTab === 'text' && (
              <div>
                {document.extracted_text ? (
                  <div>
                    {/* Text Stats Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">{document.word_count?.toLocaleString() || 0}</strong> words
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">{document.extracted_text.length.toLocaleString()}</strong> characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">{document.extracted_text.split(/\n\n+/).length}</strong> paragraphs
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(document.extracted_text || '');
                          setSuccessMessage('Text copied to clipboard!');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Copy Text
                      </button>
                    </div>
                    
                    {/* Formatted Text Content */}
                    <div className="bg-white border border-gray-200 rounded-lg max-h-[600px] overflow-y-auto">
                      <div className="p-6">
                        {document.extracted_text.split(/\n\n+/).map((paragraph, idx) => {
                          const trimmed = paragraph.trim();
                          if (!trimmed) return null;
                          
                          // Check if it looks like a heading (short, possibly all caps or ends with colon)
                          const isHeading = trimmed.length < 100 && (
                            /^[A-Z\s\d.:]+$/.test(trimmed) || 
                            /^[\d.]+\s+[A-Z]/.test(trimmed) ||
                            /^(CHAPTER|SECTION|PART|APPENDIX)/i.test(trimmed)
                          );
                          
                          // Check if it's a list item
                          const isListItem = /^[\d•\-\*]\s*[.)]?\s+/.test(trimmed);
                          
                          if (isHeading) {
                            return (
                              <h3 key={idx} className="text-lg font-semibold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-100">
                                {trimmed}
                              </h3>
                            );
                          }
                          
                          if (isListItem) {
                            return (
                              <p key={idx} className="text-gray-700 leading-relaxed pl-4 py-1 border-l-2 border-gray-200 mb-2">
                                {trimmed}
                              </p>
                            );
                          }
                          
                          return (
                            <p key={idx} className="text-gray-700 leading-relaxed mb-4">
                              {trimmed}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Text not yet extracted</p>
                    <p className="text-sm mb-6 text-gray-400">Extract text from the PDF to view content here</p>
                    {document.status === 'pending' && (
                      <button
                        onClick={handleExtract}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                        {isProcessing ? 'Extracting...' : 'Extract Text'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Themes Tab */}
            {activeTab === 'themes' && (
              <div>
                {document.themes && document.themes.length > 0 ? (
                  <div>
                    {/* Themes Summary Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-indigo-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">{document.themes.length}</strong> theme{document.themes.length !== 1 ? 's' : ''} extracted
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">
                              {document.themes.filter(t => themeHasSummary(t)).length}
                            </strong> summarized
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">
                              {document.themes.reduce((sum, t) => sum + (t.word_count || 0), 0).toLocaleString()}
                            </strong> total words
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedThemes(new Set(document.themes?.map(t => t.id) || []))}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                        >
                          Expand All
                        </button>
                        <button
                          onClick={() => setExpandedThemes(new Set())}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                        >
                          Collapse All
                        </button>
                        <button
                          onClick={handleSummarizeAllThemes}
                          disabled={isGeneratingSummary}
                          className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          {isGeneratingSummary ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          Summarize All
                        </button>
                      </div>
                    </div>

                    {/* Theme Type Filter Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(() => {
                        const types = [...new Set(document.themes?.map(t => t.theme_type) || [])];
                        return types.map(type => {
                          const count = document.themes?.filter(t => t.theme_type === type).length || 0;
                          return (
                            <span 
                              key={type}
                              className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize"
                            >
                              {type}: {count}
                            </span>
                          );
                        });
                      })()}
                    </div>
                    
                    {/* Themes List */}
                    <div className="space-y-3">
                      {document.themes.map((theme, index) => {
                        const contentText = theme.content_text || '';
                        const contentPreview = contentText.length > 250 
                          ? contentText.slice(0, 250) + '...' 
                          : contentText;
                        const summaryText = getThemeSummaryText(theme);
                        const hasSummary = themeHasSummary(theme);
                        const isExpanded = expandedThemes.has(theme.id);
                        const isGenerating = generatingThemeId === theme.id;

                        return (
                          <div 
                            key={theme.id} 
                            className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
                              theme.is_verified 
                                ? 'border-green-300 ring-1 ring-green-100' 
                                : 'border-gray-200 hover:border-indigo-200 hover:shadow-md'
                            }`}
                          >
                            {/* Theme Header */}
                            <div
                              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                                isExpanded ? 'bg-indigo-50/50' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => toggleThemeExpanded(theme.id)}
                            >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                {/* Expand Icon */}
                                <div className={`p-1 rounded transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                </div>
                                
                                {/* Theme Number Badge */}
                                <div 
                                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm"
                                  style={{ 
                                    backgroundColor: theme.theme_code ? '#EEF2FF' : '#F3F4F6',
                                    color: theme.theme_code ? '#4F46E5' : '#6B7280',
                                    marginLeft: `${theme.level * 16}px`
                                  }}
                                >
                                  {theme.theme_code || (index + 1)}
                                </div>
                                
                                {/* Theme Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-semibold text-gray-900 truncate">
                                      {theme.theme_title}
                                    </h4>
                                    {theme.is_verified && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                        <Check className="w-3 h-3" /> Verified
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Hash className="w-3 h-3" />
                                      {(theme.word_count || 0).toLocaleString()} words
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-100 rounded-full capitalize">
                                      {theme.theme_type_display || theme.theme_type}
                                    </span>
                                    {hasSummary && (
                                      <span className="flex items-center gap-1 text-purple-600">
                                        <Sparkles className="w-3 h-3" /> Summarized
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleViewTheme(theme)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="View full content"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => handleGenerateThemeSummary(theme)}
                                  disabled={isGenerating}
                                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                                  title={hasSummary ? "Regenerate summary" : "Generate summary"}
                                >
                                  {isGenerating ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                  ) : (
                                    <Sparkles className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            
                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50 to-white">
                                <div className="p-5">
                                  {/* Summary Section */}
                                  {summaryText ? (
                                    <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 bg-purple-100 rounded-lg">
                                          <Sparkles className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <h5 className="font-medium text-purple-800">AI Summary</h5>
                                      </div>
                                      <p className="text-sm text-purple-900 leading-relaxed">{summaryText}</p>
                                    </div>
                                  ) : (
                                    <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                                      <Sparkles className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                      <p className="text-sm text-gray-500">No summary generated yet</p>
                                      <button
                                        onClick={() => handleGenerateThemeSummary(theme)}
                                        disabled={isGenerating}
                                        className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                                      >
                                        Click to generate
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Content Preview Section */}
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="p-1.5 bg-gray-100 rounded-lg">
                                        <FileText className="w-4 h-4 text-gray-600" />
                                      </div>
                                      <h5 className="font-medium text-gray-700">Content Preview</h5>
                                    </div>
                                    {contentPreview ? (
                                      <div className="p-4 bg-white rounded-xl border border-gray-200">
                                        <p className="text-sm text-gray-600 leading-relaxed">{contentPreview}</p>
                                        {contentText.length > 250 && (
                                          <button
                                            onClick={() => handleViewTheme(theme)}
                                            className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                                          >
                                            View full content
                                            <ChevronRight className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                                        <p className="text-sm text-gray-400 italic">No content available</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Layers className="w-10 h-10 text-indigo-400" />
                    </div>
                    <p className="text-xl font-medium text-gray-700 mb-2">No themes extracted yet</p>
                    <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                      Extract themes to identify topics, sections, and key areas in your document
                    </p>
                    {(document.status === 'extracted' || document.status === 'summarized') && (
                      <button
                        onClick={handleExtractThemes}
                        disabled={isExtractingThemes}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2 font-medium transition-colors"
                      >
                        {isExtractingThemes ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Layers className="w-5 h-5" />
                        )}
                        {isExtractingThemes ? 'Extracting Themes...' : 'Extract Themes'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tables Tab */}
            {activeTab === 'tables' && (
              <div>
                {document.tables && document.tables.length > 0 ? (
                  <div>
                    {/* Tables Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Table2 className="w-5 h-5 text-orange-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">{document.tables.length}</strong> table{document.tables.length !== 1 ? 's' : ''} extracted
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-600">
                            <strong className="text-gray-900">
                              {document.tables.reduce((sum, t) => sum + t.row_count, 0)}
                            </strong> total rows
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tables Grid */}
                    <div className="space-y-6">
                      {document.tables.map((table, idx) => (
                        <div key={table.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                          {/* Table Header */}
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Table2 className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">Table {idx + 1}</h4>
                                  <p className="text-sm text-gray-500">Page {table.page_number}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="px-3 py-1 bg-white rounded-full border border-gray-200 text-gray-600">
                                  {table.row_count} rows
                                </span>
                                <span className="px-3 py-1 bg-white rounded-full border border-gray-200 text-gray-600">
                                  {table.column_count} columns
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Table Content */}
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              {table.headers && table.headers.length > 0 && (
                                <thead>
                                  <tr className="bg-gray-50">
                                    {table.headers.map((header, i) => (
                                      <th 
                                        key={i} 
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200"
                                      >
                                        {header || `Column ${i + 1}`}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                              )}
                              <tbody className="divide-y divide-gray-100">
                                {table.table_data?.slice(0, 15).map((row, rowIdx) => (
                                  <tr 
                                    key={rowIdx} 
                                    className={`${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/50 transition-colors`}
                                  >
                                    {row.map((cell, cellIdx) => (
                                      <td 
                                        key={cellIdx} 
                                        className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate"
                                        title={cell}
                                      >
                                        {cell || <span className="text-gray-300">-</span>}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          {/* Show More Indicator */}
                          {table.row_count > 15 && (
                            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-center">
                              <span className="text-sm text-gray-500">
                                Showing 15 of <strong>{table.row_count}</strong> rows
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Table2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No tables extracted</p>
                    <p className="text-sm text-gray-400">Tables will appear here after text extraction</p>
                  </div>
                )}
              </div>
            )}

            {/* Summaries Tab */}
            {activeTab === 'summaries' && (
              <div className="space-y-6">
                {document.summaries && document.summaries.length > 0 ? (
                  document.summaries.map((summary) => (
                    <div key={summary.id} className="border rounded-lg p-6 bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {summary.summary_type_display}
                          </span>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {summary.generated_by_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(summary.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {summary.processing_time_seconds.toFixed(1)}s
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {summary.tokens_used} tokens
                        </div>
                      </div>

                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="whitespace-pre-wrap text-gray-700">{summary.summary_text}</p>
                      </div>

                      {summary.key_findings && summary.key_findings.length > 0 && (
                        <div className="p-4 bg-yellow-50 rounded-lg mb-4">
                          <p className="font-medium text-yellow-800 mb-2">Key Findings:</p>
                          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                            {summary.key_findings.map((finding, i) => (
                              <li key={i}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {summary.topics && summary.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {summary.topics.map((topic, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No summaries generated yet</p>
                    <p className="text-sm mb-6">Generate AI summaries to analyze this document</p>
                    {(document.status === 'extracted' || document.status === 'themes_extracted' || document.status === 'summarized') && (
                      <button
                        onClick={() => setShowSummaryModal(true)}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Generate Summary
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Detail Modal */}
      {showThemeModal && selectedTheme && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedTheme.theme_code && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                        {selectedTheme.theme_code}
                      </span>
                    )}
                    <h2 className="text-xl font-semibold">{selectedTheme.theme_title}</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedTheme.word_count || 0} words • {selectedTheme.theme_type_display || selectedTheme.theme_type}
                  </p>
                </div>
                <button onClick={() => setShowThemeModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
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
                disabled={generatingThemeId === selectedTheme.id}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {generatingThemeId === selectedTheme.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {getThemeSummaryText(selectedTheme) ? 'Regenerate Summary' : 'Generate Summary'}
              </button>
              <button 
                onClick={() => setShowThemeModal(false)} 
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Generation Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Generate AI Summary</h2>
                <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Select summary type for "{document.title}"</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
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
              <button 
                onClick={() => setShowSummaryModal(false)} 
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateDocumentSummary}
                disabled={isGeneratingSummary || (summaryType === 'custom' && !customPrompt)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isGeneratingSummary ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Summary</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFDocumentDetailPage;