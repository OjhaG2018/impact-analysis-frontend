import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, User, Phone, MapPin, Calendar, Briefcase,
  IndianRupee, CheckCircle2, Clock, AlertCircle, Mail, Globe, GraduationCap,
  Languages, Award, Building2, CreditCard, Hash, Activity, Target,
  ClipboardList, Shield, Wallet, BadgeCheck
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Badge, LoadingSpinner, Modal } from '../../components/ui';

interface FieldResource {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display?: string;
  organization?: number | null;
  phone?: string;
  profile_photo?: string | null;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhar_number?: string;
  bank_account?: string;
  ifsc_code?: string;
  daily_rate?: string | number | null;
  education?: string;
  languages_known?: string;
  experience_years?: number;
  is_available?: boolean;
  is_active?: boolean;
  joined_date?: string | null;
  date_joined?: string;
}

type TabType = 'overview' | 'assignments' | 'activity';

interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  color?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, color = 'text-gray-600' }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-gray-50">
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 truncate">{value || 'N/A'}</p>
      </div>
    </div>
  </div>
);

const StatusBadge: React.FC<{ available: boolean; active: boolean }> = ({ available, active }) => {
  if (!active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
        <AlertCircle className="h-4 w-4" /> Inactive
      </span>
    );
  }
  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="h-4 w-4" /> Available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
      <Clock className="h-4 w-4" /> On Assignment
    </span>
  );
};

const FieldResourceProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<FieldResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) loadResource();
  }, [id]);

  const loadResource = async () => {
    try {
      const data = await api.get<FieldResource>(`${endpoints.users}${id}/`);
      setResource(data);
    } catch (error) {
      console.error('Error loading resource:', error);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!resource) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoints.users}${resource.id}/`);
      navigate('/resources');
    } catch (error) {
      alert('Failed to delete resource');
    }
    setDeleting(false);
  };

  const toggleAvailability = async () => {
    if (!resource) return;
    try {
      await api.patch(`${endpoints.users}${resource.id}/`, { is_available: !resource.is_available });
      loadResource();
    } catch (error) {
      alert('Failed to update availability');
    }
  };

  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRelativeTime = (dateStr: string): string => {
    const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getFullName = (res: FieldResource): string => {
    const name = `${res.first_name || ''} ${res.last_name || ''}`.trim();
    return name || res.username || 'Unknown';
  };

  const getInitials = (res: FieldResource): string => {
    if (res.first_name && res.last_name) return `${res.first_name[0]}${res.last_name[0]}`.toUpperCase();
    return (res.username?.[0] || 'U').toUpperCase();
  };

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'assignments', label: 'Assignments', icon: ClipboardList },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;

  if (!resource) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Resource Not Found</h2>
        <p className="text-gray-500 mb-4">The field resource you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/resources')}><ArrowLeft className="h-4 w-4" /> Back to Resources</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
          <button onClick={() => navigate('/resources')} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                {resource.profile_photo ? (
                  <img src={resource.profile_photo} alt={getFullName(resource)} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span className="text-2xl font-bold text-indigo-600">{getInitials(resource)}</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{getFullName(resource)}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-white/80 text-sm flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> {resource.email}
                  </span>
                  <StatusBadge available={resource.is_available ?? true} active={resource.is_active ?? true} />
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{resource.experience_years || 0}</p>
                <p className="text-white/70 text-sm">Years Exp.</p>
              </div>
              {resource.daily_rate && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">₹{parseFloat(resource.daily_rate.toString())}</p>
                  <p className="text-white/70 text-sm">Daily Rate</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Badge variant={resource.is_available ? 'success' : 'warning'}>{resource.role_display || 'Field Resource'}</Badge>
            {resource.education && <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4" />{resource.education}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAvailability}>
              {resource.is_available ? <><Clock className="h-4 w-4 text-amber-600" /> Mark Busy</> : <><CheckCircle2 className="h-4 w-4 text-green-600" /> Mark Available</>}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/resources/${resource.id}/edit`)}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(true)} className="text-red-600 hover:bg-red-50 border-red-200">
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
                activeTab === tab.id ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-400" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={User} label="Full Name" value={getFullName(resource)} color="text-blue-600" />
                  <InfoCard icon={Hash} label="Username" value={resource.username} color="text-purple-600" />
                  <InfoCard icon={Mail} label="Email" value={resource.email} color="text-emerald-600" />
                  <InfoCard icon={Phone} label="Phone" value={resource.phone} color="text-green-600" />
                  <InfoCard icon={Shield} label="Role" value={resource.role_display || resource.role} color="text-indigo-600" />
                  <InfoCard icon={BadgeCheck} label="Status" value={resource.is_active ? 'Active' : 'Inactive'} color={resource.is_active ? 'text-green-600' : 'text-red-600'} />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-400" /> Location Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={MapPin} label="Address" value={resource.address} color="text-rose-600" />
                  <InfoCard icon={Building2} label="City" value={resource.city} color="text-blue-600" />
                  <InfoCard icon={Globe} label="State" value={resource.state} color="text-purple-600" />
                  <InfoCard icon={Hash} label="Pincode" value={resource.pincode} color="text-gray-600" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-400" /> Professional Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={GraduationCap} label="Education" value={resource.education} color="text-amber-600" />
                  <InfoCard icon={Languages} label="Languages Known" value={resource.languages_known} color="text-teal-600" />
                  <InfoCard icon={Award} label="Experience" value={resource.experience_years ? `${resource.experience_years} years` : null} color="text-indigo-600" />
                  <InfoCard icon={IndianRupee} label="Daily Rate" value={formatCurrency(resource.daily_rate)} color="text-green-600" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gray-400" /> Bank & ID Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={CreditCard} label="Aadhar Number" value={resource.aadhar_number ? `XXXX-XXXX-${resource.aadhar_number.slice(-4)}` : null} color="text-blue-600" />
                  <InfoCard icon={Wallet} label="Bank Account" value={resource.bank_account ? `XXXX${resource.bank_account.slice(-4)}` : null} color="text-emerald-600" />
                  <InfoCard icon={Hash} label="IFSC Code" value={resource.ifsc_code} color="text-purple-600" />
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-gray-400" /> Status & Tracking
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`p-5 border-l-4 ${resource.is_available ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${resource.is_available ? 'bg-green-50' : 'bg-amber-50'}`}>
                        {resource.is_available ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <Clock className="h-6 w-6 text-amber-600" />}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Availability</p>
                        <p className="text-lg font-bold text-gray-900">{resource.is_available ? 'Available' : 'On Assignment'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className={`p-5 border-l-4 ${resource.is_active ? 'border-l-blue-500' : 'border-l-red-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${resource.is_active ? 'bg-blue-50' : 'bg-red-50'}`}>
                        <BadgeCheck className={`h-6 w-6 ${resource.is_active ? 'text-blue-600' : 'text-red-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Account Status</p>
                        <p className="text-lg font-bold text-gray-900">{resource.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-5 border-l-4 border-l-purple-500">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Calendar className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Joined</p>
                        <p className="text-lg font-bold text-gray-900">{resource.date_joined ? formatRelativeTime(resource.date_joined) : 'N/A'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Joined: {formatDate(resource.date_joined)}</span></div>
                  <div className="flex items-center gap-2"><Hash className="h-4 w-4" /><span>ID: {resource.id}</span></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Assignments</h3>
                  <p className="text-sm text-gray-500 mt-1">Projects and beneficiaries assigned to this resource</p>
                </div>
                <Button onClick={() => navigate(`/assignments?resource=${resource.id}`)}>
                  <Target className="h-4 w-4" /> View All Assignments
                </Button>
              </div>
              <Card className="p-12 text-center">
                <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Assignments</h3>
                <p className="text-gray-500 mb-4">This resource has no active assignments.</p>
                <Button variant="outline" onClick={() => navigate(`/assignments?resource=${resource.id}`)}>Manage Assignments</Button>
              </Card>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900">Activity Timeline</h3>
              <Card className="p-12 text-center">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h3>
                <p className="text-gray-500">Activity will be recorded as this resource works on assignments.</p>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Field Resource">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">Deleting this resource will remove their account and all associated data.</p>
            </div>
          </div>
          <p className="text-gray-600">Are you sure you want to delete <strong>"{getFullName(resource)}"</strong>?</p>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? 'Deleting...' : 'Delete Resource'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FieldResourceProfilePage;