import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  User,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Mic,
  Video,
  Target,
  Users,
  Building2,
  Activity,
  ChevronRight,
  Download,
  Share2,
  Copy,
  ExternalLink,
  Home,
  CreditCard,
  BadgeCheck,
  UserCircle,
  Heart,
  MoreVertical,
  Play,
  Eye,
  MessageSquare,
  ClipboardList,
  TrendingUp,
  Hash,
  Globe,
  Shield
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Badge, LoadingSpinner, Modal } from '../../components/ui';

// Types
interface BeneficiaryDetails {
  id: number;
  project: number;
  project_code?: string;
  project_title?: string;
  beneficiary_id: string;
  name: string;
  father_husband_name: string;
  gender: 'male' | 'female' | 'other';
  gender_display?: string;
  age: number | null;
  phone: string;
  village: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
  category: string;
  bpl_status: boolean;
  occupation: string;
  annual_income: number | null;
  grant_amount_received: string | number | null;
  grant_received_date: string | null;
  grant_purpose: string;
  is_sampled: boolean;
  is_interviewed: boolean;
  additional_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Interview {
  id: number;
  interview_date: string;
  status: string;
  questionnaire_title?: string;
  interviewer_name?: string;
  duration_minutes?: number;
  completion_percentage?: number;
}

interface ActivityItem {
  id: number;
  action: string;
  description: string;
  timestamp: string;
  user_name?: string;
}

// Tab type
type TabType = 'overview' | 'interviews' | 'activity';

// Info Card Component
interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  color?: string;
  subValue?: string;
  className?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, color = 'text-gray-600', subValue, className = '' }) => (
  <div className={`bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow ${className}`}>
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg bg-gray-50`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 truncate">{value || 'N/A'}</p>
        {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ sampled: boolean; interviewed: boolean }> = ({ sampled, interviewed }) => {
  if (interviewed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Interviewed
      </span>
    );
  }
  if (sampled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
        <Target className="h-4 w-4" />
        Sampled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
      <Clock className="h-4 w-4" />
      Not Sampled
    </span>
  );
};

// Timeline Item Component
interface TimelineItemProps {
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ title, description, time, icon: Icon, iconColor, iconBg }) => (
  <div className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
    <div className={`p-2.5 ${iconBg} rounded-xl h-fit`}>
      <Icon className={`h-5 w-5 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      <p className="text-xs text-gray-400 mt-1">{time}</p>
    </div>
  </div>
);

// Interview Card Component
interface InterviewCardProps {
  interview: Interview;
  onClick: () => void;
}

const InterviewCard: React.FC<InterviewCardProps> = ({ interview, onClick }) => (
  <Card 
    className="p-4 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-emerald-500"
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <ClipboardList className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{interview.questionnaire_title || 'Interview'}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(interview.interview_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
          {interview.interviewer_name && (
            <p className="text-xs text-gray-400 mt-1">By: {interview.interviewer_name}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <Badge variant={interview.status === 'completed' ? 'success' : 'warning'}>
          {interview.status}
        </Badge>
        {interview.duration_minutes && (
          <p className="text-xs text-gray-500 mt-2">{interview.duration_minutes} min</p>
        )}
      </div>
    </div>
    {interview.completion_percentage !== undefined && (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Completion</span>
          <span>{interview.completion_percentage}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${interview.completion_percentage}%` }}
          />
        </div>
      </div>
    )}
  </Card>
);

const BeneficiaryProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [beneficiary, setBeneficiary] = useState<BeneficiaryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Related data
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [projectInfo, setProjectInfo] = useState<{ code: string; title: string } | null>(null);

  useEffect(() => {
    if (id) {
      loadBeneficiary();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'interviews' && beneficiary) {
      loadInterviews();
    }
    if (activeTab === 'activity' && beneficiary) {
      loadActivities();
    }
  }, [activeTab, beneficiary]);

  const loadBeneficiary = async () => {
    try {
      const data = await api.get<BeneficiaryDetails>(`${endpoints.beneficiaries}${id}/`);
      setBeneficiary(data);
      
      // Load project info
      if (data.project) {
        try {
          const project = await api.get<{ code: string; title: string }>(`${endpoints.projects}${data.project}/`);
          setProjectInfo({ code: project.code, title: project.title });
        } catch (e) {
          console.log('Could not load project info');
        }
      }
    } catch (error) {
      console.error('Error loading beneficiary:', error);
    }
    setLoading(false);
  };

  const loadInterviews = async () => {
    try {
      const data = await api.get<{ results: Interview[] }>(`${endpoints.interviews}?beneficiary=${id}`);
      setInterviews(data.results || []);
    } catch (error) {
      console.error('Error loading interviews:', error);
      // Mock data for demo
      if (beneficiary?.is_interviewed) {
        setInterviews([
          {
            id: 1,
            interview_date: beneficiary.updated_at,
            status: 'completed',
            questionnaire_title: 'Impact Assessment Survey',
            interviewer_name: 'Field Resource',
            duration_minutes: 25,
            completion_percentage: 100
          }
        ]);
      }
    }
  };

  const loadActivities = async () => {
    // Generate activity timeline from beneficiary data
    if (beneficiary) {
      const activityList: ActivityItem[] = [
        {
          id: 1,
          action: 'Record Created',
          description: 'Beneficiary record was created in the system',
          timestamp: beneficiary.created_at,
        },
      ];

      if (beneficiary.is_sampled) {
        activityList.push({
          id: 2,
          action: 'Added to Sample',
          description: 'Beneficiary was selected for interview sampling',
          timestamp: beneficiary.updated_at,
        });
      }

      if (beneficiary.is_interviewed) {
        activityList.push({
          id: 3,
          action: 'Interview Completed',
          description: 'Interview was successfully completed',
          timestamp: beneficiary.updated_at,
        });
      }

      if (beneficiary.updated_at !== beneficiary.created_at) {
        activityList.push({
          id: 4,
          action: 'Record Updated',
          description: 'Beneficiary information was updated',
          timestamp: beneficiary.updated_at,
        });
      }

      setActivities(activityList.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    }
  };

  const handleDelete = async () => {
    if (!beneficiary) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoints.beneficiaries}${beneficiary.id}/`);
      navigate('/beneficiaries');
    } catch (error) {
      alert('Failed to delete beneficiary');
      console.error('Error deleting beneficiary:', error);
    }
    setDeleting(false);
  };

  const toggleSampledStatus = async () => {
    if (!beneficiary) return;
    try {
      await api.patch(`${endpoints.beneficiaries}${beneficiary.id}/`, {
        is_sampled: !beneficiary.is_sampled
      });
      loadBeneficiary();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleCopyId = () => {
    if (beneficiary) {
      navigator.clipboard.writeText(beneficiary.beneficiary_id);
      // Could add a toast notification here
    }
  };

  // Format currency
  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Tabs configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'interviews', label: 'Interviews', icon: ClipboardList, count: interviews.length },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!beneficiary) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Beneficiary Not Found</h2>
        <p className="text-gray-500 mb-4">The beneficiary you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/beneficiaries')}>
          <ArrowLeft className="h-4 w-4" /> Back to Beneficiaries
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Top Section with Avatar */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-8">
          <button
            onClick={() => navigate('/beneficiaries')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Beneficiaries
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                <UserCircle className="h-12 w-12 text-emerald-600" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-white">{beneficiary.name}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <button 
                    onClick={handleCopyId}
                    className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm bg-white/20 px-2 py-1 rounded-lg"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {beneficiary.beneficiary_id}
                    <Copy className="h-3 w-3 ml-1" />
                  </button>
                  <StatusBadge sampled={beneficiary.is_sampled} interviewed={beneficiary.is_interviewed} />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{beneficiary.age || '-'}</p>
                <p className="text-white/70 text-sm">Years Old</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{beneficiary.gender_display?.charAt(0) || '-'}</p>
                <p className="text-white/70 text-sm">Gender</p>
              </div>
              {beneficiary.grant_amount_received && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">₹{parseFloat(beneficiary.grant_amount_received.toString()) / 1000}K</p>
                  <p className="text-white/70 text-sm">Grant</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {projectInfo && (
              <button 
                onClick={() => navigate(`/projects/${beneficiary.project}`)}
                className="flex items-center gap-1.5 hover:text-emerald-600"
              >
                <Building2 className="h-4 w-4" />
                {projectInfo.code} - {projectInfo.title}
                <ExternalLink className="h-3 w-3" />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleSampledStatus}
            >
              {beneficiary.is_sampled ? (
                <>
                  <Target className="h-4 w-4 text-emerald-600" />
                  Remove from Sample
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Add to Sample
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/beneficiaries/${beneficiary.id}/edit`)}>
            <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-emerald-600 border-emerald-600 bg-emerald-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={User} label="Full Name" value={beneficiary.name} color="text-blue-600" />
                  <InfoCard icon={UserCircle} label="Father/Husband Name" value={beneficiary.father_husband_name} color="text-purple-600" />
                  <InfoCard icon={Heart} label="Gender" value={beneficiary.gender_display || beneficiary.gender} color="text-pink-600" />
                  <InfoCard icon={Calendar} label="Age" value={beneficiary.age ? `${beneficiary.age} years` : null} color="text-amber-600" />
                  <InfoCard icon={Phone} label="Phone Number" value={beneficiary.phone} color="text-green-600" />
                  <InfoCard icon={Shield} label="Category" value={beneficiary.category} color="text-indigo-600" />
                </div>
              </div>

              {/* Location Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={Home} label="Village" value={beneficiary.village} color="text-emerald-600" />
                  <InfoCard icon={MapPin} label="Block/Tehsil" value={beneficiary.block} color="text-rose-600" />
                  <InfoCard icon={Building2} label="District" value={beneficiary.district} color="text-blue-600" />
                  <InfoCard icon={Globe} label="State" value={beneficiary.state} color="text-purple-600" />
                  <InfoCard icon={Hash} label="Pincode" value={beneficiary.pincode} color="text-gray-600" />
                  <InfoCard 
                    icon={MapPin} 
                    label="Full Address" 
                    value={[beneficiary.village, beneficiary.block, beneficiary.district, beneficiary.state].filter(Boolean).join(', ') || null} 
                    color="text-teal-600"
                    className="lg:col-span-1"
                  />
                </div>
              </div>

              {/* Economic Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  Economic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={Briefcase} label="Occupation" value={beneficiary.occupation} color="text-amber-600" />
                  <InfoCard icon={IndianRupee} label="Annual Income" value={formatCurrency(beneficiary.annual_income)} color="text-green-600" />
                  <InfoCard 
                    icon={CreditCard} 
                    label="BPL Status" 
                    value={beneficiary.bpl_status ? 'Yes - Below Poverty Line' : 'No'} 
                    color={beneficiary.bpl_status ? 'text-orange-600' : 'text-gray-600'} 
                  />
                </div>
              </div>

              {/* Grant Information */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-gray-400" />
                  Grant Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard 
                    icon={IndianRupee} 
                    label="Grant Amount Received" 
                    value={formatCurrency(beneficiary.grant_amount_received)} 
                    color="text-green-600" 
                  />
                  <InfoCard 
                    icon={Calendar} 
                    label="Grant Received Date" 
                    value={formatDate(beneficiary.grant_received_date)} 
                    color="text-blue-600" 
                  />
                  <InfoCard 
                    icon={Target} 
                    label="Grant Purpose" 
                    value={beneficiary.grant_purpose} 
                    color="text-purple-600" 
                  />
                </div>
              </div>

              {/* Status Cards */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" />
                  Status & Tracking
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`p-5 border-l-4 ${beneficiary.is_sampled ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${beneficiary.is_sampled ? 'bg-blue-50' : 'bg-gray-50'}`}>
                        <Target className={`h-6 w-6 ${beneficiary.is_sampled ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Sample Status</p>
                        <p className="text-lg font-bold text-gray-900">
                          {beneficiary.is_sampled ? 'Sampled' : 'Not Sampled'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className={`p-5 border-l-4 ${beneficiary.is_interviewed ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${beneficiary.is_interviewed ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <ClipboardList className={`h-6 w-6 ${beneficiary.is_interviewed ? 'text-green-600' : 'text-amber-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Interview Status</p>
                        <p className="text-lg font-bold text-gray-900">
                          {beneficiary.is_interviewed ? 'Completed' : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Clock className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatRelativeTime(beneficiary.updated_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {formatDate(beneficiary.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Updated: {formatDate(beneficiary.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    <span>ID: {beneficiary.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Interviews Tab */}
          {activeTab === 'interviews' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Interview History</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {interviews.length} interview{interviews.length !== 1 ? 's' : ''} recorded
                  </p>
                </div>
                {beneficiary.is_sampled && !beneficiary.is_interviewed && (
                  <Button onClick={() => navigate(`/ai-interviews?beneficiary=${beneficiary.id}`)}>
                    <Mic className="h-4 w-4" /> Start Interview
                  </Button>
                )}
              </div>

              {interviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interviews.map((interview) => (
                    <InterviewCard 
                      key={interview.id} 
                      interview={interview}
                      onClick={() => navigate(`/interviews/${interview.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Interviews Yet</h3>
                  <p className="text-gray-500 mb-4">
                    {beneficiary.is_sampled 
                      ? 'This beneficiary is sampled but hasn\'t been interviewed yet.'
                      : 'Add this beneficiary to the sample to conduct an interview.'}
                  </p>
                  {beneficiary.is_sampled ? (
                    <Button onClick={() => navigate(`/ai-interviews?beneficiary=${beneficiary.id}`)}>
                      <Mic className="h-4 w-4" /> Start AI Interview
                    </Button>
                  ) : (
                    <Button onClick={toggleSampledStatus}>
                      <Target className="h-4 w-4" /> Add to Sample
                    </Button>
                  )}
                </Card>
              )}

              {/* Related Media */}
              {beneficiary.is_interviewed && (
                <div className="mt-8">
                  <h4 className="font-medium text-gray-900 mb-4">Related Analysis</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card 
                      className="p-4 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate(`/video-analysis?beneficiary=${beneficiary.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <Video className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Video Analysis</p>
                          <p className="text-xs text-gray-500">View video recordings</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                      </div>
                    </Card>

                    <Card 
                      className="p-4 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate(`/audio-analysis?beneficiary=${beneficiary.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Mic className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Audio Analysis</p>
                          <p className="text-xs text-gray-500">View transcriptions</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                      </div>
                    </Card>

                    <Card 
                      className="p-4 hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => navigate(`/sentiment-analysis?beneficiary=${beneficiary.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-50 rounded-lg">
                          <Activity className="h-5 w-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Sentiment</p>
                          <p className="text-xs text-gray-500">View sentiment analysis</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900">Activity Timeline</h3>
              
              {activities.length > 0 ? (
                <Card className="divide-y divide-gray-100">
                  {activities.map((activity) => (
                    <TimelineItem
                      key={activity.id}
                      title={activity.action}
                      description={activity.description}
                      time={formatRelativeTime(activity.timestamp)}
                      icon={
                        activity.action.includes('Created') ? FileText :
                        activity.action.includes('Sample') ? Target :
                        activity.action.includes('Interview') ? CheckCircle2 :
                        Clock
                      }
                      iconColor={
                        activity.action.includes('Created') ? 'text-blue-600' :
                        activity.action.includes('Sample') ? 'text-purple-600' :
                        activity.action.includes('Interview') ? 'text-green-600' :
                        'text-gray-600'
                      }
                      iconBg={
                        activity.action.includes('Created') ? 'bg-blue-50' :
                        activity.action.includes('Sample') ? 'bg-purple-50' :
                        activity.action.includes('Interview') ? 'bg-green-50' :
                        'bg-gray-50'
                      }
                    />
                  ))}
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
                  <p className="text-gray-500">Activity will be recorded as you interact with this beneficiary.</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Beneficiary"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                Deleting this beneficiary will permanently remove all associated data including interview responses.
              </p>
            </div>
          </div>
          
          <p className="text-gray-600">
            Are you sure you want to delete <strong>"{beneficiary.name}"</strong> ({beneficiary.beneficiary_id})?
          </p>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Beneficiary'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BeneficiaryProfilePage;