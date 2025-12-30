// src/features/settings/OrganizationSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Building2, Save, Upload, Trash2, Users, Phone, Mail,
  Globe, Shield, Bell, Key, CreditCard, FileText,
  CheckCircle, AlertCircle, X, Loader2, Eye, EyeOff, Plus,
  Settings, Palette, Image, Link2, Database
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';
import { Card, Button, Input, Select, Modal, Badge, LoadingSpinner } from '../../components/ui';

// ============== LOCAL TYPES ==============
interface LocalOrganization {
  id: number;
  name: string;
  code: string;
  description: string;
  logo: string | null;
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timezone: string;
  date_format: string;
  currency: string;
  language: string;
  primary_color: string;
  secondary_color: string;
  ai_interviews_enabled: boolean;
  sentiment_analysis_enabled: boolean;
  video_capture_enabled: boolean;
  max_projects: number;
  max_users: number;
  storage_limit_gb: number;
  total_users: number;
  total_projects: number;
  storage_used_gb: number;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  role_display: string;
  is_active: boolean;
  joined_at: string;
  last_login: string | null;
}

interface APIKey {
  id: number;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

// Backend response type
interface BackendOrganization {
  id: number;
  name: string;
  description?: string;
  logo?: string | null;
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============== CONSTANTS ==============
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (SGT)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY (31-Dec-2024)' },
];

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'GBP', label: '£ British Pound (GBP)' },
  { value: 'AED', label: 'د.إ UAE Dirham (AED)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'bn', label: 'Bengali' },
  { value: 'te', label: 'Telugu' },
  { value: 'mr', label: 'Marathi' },
  { value: 'ta', label: 'Tamil' },
];

const DEFAULT_ORG: LocalOrganization = {
  id: 0, name: '', code: '', description: '', logo: null, website: '', email: '', phone: '',
  address: '', city: '', state: '', country: 'India', pincode: '', timezone: 'Asia/Kolkata',
  date_format: 'DD/MM/YYYY', currency: 'INR', language: 'en', primary_color: '#10B981',
  secondary_color: '#3B82F6', ai_interviews_enabled: true, sentiment_analysis_enabled: true,
  video_capture_enabled: false, max_projects: 50, max_users: 100, storage_limit_gb: 50,
  total_users: 0, total_projects: 0, storage_used_gb: 0, created_at: '', updated_at: '',
};

// ============== MAIN COMPONENT ==============
const OrganizationSettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [organization, setOrganization] = useState<LocalOrganization>(DEFAULT_ORG);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'features' | 'members' | 'api' | 'billing'>('general');
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showDeleteKeyModal, setShowDeleteKeyModal] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<APIKey | null>(null);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('field_resource');
  const [inviting, setInviting] = useState(false);
  
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [showGeneratedKey, setShowGeneratedKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  
  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  
  useEffect(() => { loadOrganization(); }, []);
  
  const loadOrganization = async () => {
    setLoading(true);
    try {
      let orgData: LocalOrganization | null = null;
      let memberData: OrganizationMember[] = [];
      
      // Try to get organization
      if (user?.organization) {
        try {
          // Try current endpoint first
          const backendOrg = await api.get<BackendOrganization>('/core/organizations/current/');
          orgData = {
            ...DEFAULT_ORG,
            id: backendOrg.id,
            name: backendOrg.name || '',
            code: `ORG-${backendOrg.id}`,
            description: backendOrg.description || '',
            logo: backendOrg.logo || null,
            email: backendOrg.contact_email || '',
            phone: backendOrg.contact_phone || '',
            website: backendOrg.website || '',
            address: backendOrg.address || '',
            created_at: backendOrg.created_at || '',
          };
        } catch {
          // Fallback: try to get by ID
          try {
            const backendOrg = await api.get<BackendOrganization>(`/core/organizations/${user.organization}/`);
            orgData = {
              ...DEFAULT_ORG,
              id: backendOrg.id,
              name: backendOrg.name || '',
              code: `ORG-${backendOrg.id}`,
              description: backendOrg.description || '',
              logo: backendOrg.logo || null,
              email: backendOrg.contact_email || '',
              phone: backendOrg.contact_phone || '',
              website: backendOrg.website || '',
              address: backendOrg.address || '',
              created_at: backendOrg.created_at || '',
            };
          } catch (e) {
            console.log('Could not fetch organization details');
          }
        }
      }
      
      // Try to fetch organization members
      try {
        const membersResponse = await api.get<OrganizationMember[]>('/core/organizations/members/');
        memberData = Array.isArray(membersResponse) ? membersResponse : [];
      } catch {
        // Fallback: fetch users from same org
        try {
          if (user?.organization) {
            const usersResponse = await api.get<any>(`/core/users/?organization=${user.organization}`);
            const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.results || []);
            memberData = users.map((u: any) => ({
              id: u.id,
              user_id: u.id,
              name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
              email: u.email,
              role: u.role,
              role_display: u.role_display || u.role,
              is_active: u.is_active,
              joined_at: u.date_joined,
              last_login: u.last_login,
            }));
          }
        } catch {
          console.log('Could not fetch users');
        }
      }
      
      if (orgData) {
        orgData.total_users = memberData.length;
        setOrganization(orgData);
      }
      
      setMembers(memberData);
      
      // Try to load API keys if admin
      if (isAdmin) {
        try {
          const keysResponse = await api.get<APIKey[]>('/core/api-keys/');
          setApiKeys(Array.isArray(keysResponse) ? keysResponse : []);
        } catch { 
          console.log('API keys endpoint not available'); 
        }
      }
    } catch (err: any) {
      console.error('Failed to load organization:', err);
      // Mock data for demo
      setOrganization({
        ...DEFAULT_ORG, 
        id: 1, 
        name: (user as any)?.organization_name || 'Demo Organization', 
        code: 'DEMO-ORG',
        description: 'A demo organization for testing purposes', 
        email: 'contact@demo-org.com',
        phone: '+91 98765 43210', 
        website: 'https://demo-org.com', 
        address: '123 Main Street',
        city: 'Mumbai', 
        state: 'Maharashtra', 
        country: 'India', 
        pincode: '400001',
        total_users: 12, 
        total_projects: 5, 
        storage_used_gb: 2.5, 
        created_at: '2024-01-01T00:00:00Z',
      });
      setMembers([
        { id: 1, user_id: 1, name: 'Admin User', email: 'admin@demo-org.com', role: 'admin',
          role_display: 'Administrator', is_active: true, joined_at: '2024-01-01T00:00:00Z', last_login: '2024-01-15T10:30:00Z' },
        { id: 2, user_id: 2, name: 'Manager User', email: 'manager@demo-org.com', role: 'manager',
          role_display: 'Project Manager', is_active: true, joined_at: '2024-01-05T00:00:00Z', last_login: '2024-01-14T15:00:00Z' },
      ]);
    } finally { 
      setLoading(false); 
    }
  };
  
  const handleFieldChange = (field: keyof LocalOrganization, value: any) => {
    setOrganization(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    setSaving(true); 
    setError(''); 
    setSuccess('');
    try {
      if (organization.id) {
        try {
          await api.patch('/core/organizations/current/', {
            name: organization.name, 
            description: organization.description, 
            website: organization.website,
            contact_email: organization.email, 
            contact_phone: organization.phone, 
            address: organization.address,
          });
        } catch {
          await api.patch(`/core/organizations/${organization.id}/`, {
            name: organization.name, 
            description: organization.description, 
            website: organization.website,
            contact_email: organization.email, 
            contact_phone: organization.phone, 
            address: organization.address,
          });
        }
      }
      setSuccess('Organization settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to save settings');
    } finally { 
      setSaving(false); 
    }
  };
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Image size must be less than 2MB'); return; }
    
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const response = await api.uploadFile<{ logo: string; message?: string }>('/core/organizations/logo/', formData);
      setOrganization(prev => ({ ...prev, logo: response.logo }));
      setSuccess('Logo uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { 
      setError(err.message || 'Failed to upload logo'); 
    } finally { 
      setUploadingLogo(false); 
    }
  };
  
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) { setError('Email is required'); return; }
    setInviting(true);
    try {
      await api.post('/core/organizations/invite/', { email: inviteEmail, role: inviteRole });
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false); 
      setInviteEmail(''); 
      setInviteRole('field_resource');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { 
      setError(err.response?.data?.detail || err.message || 'Failed to send invitation'); 
    } finally { 
      setInviting(false); 
    }
  };
  
  const handleGenerateApiKey = async () => {
    if (!newKeyName.trim()) { setError('API key name is required'); return; }
    setGeneratingKey(true);
    try {
      const response = await api.post<{ key: string; id: number }>('/core/api-keys/', { name: newKeyName });
      setGeneratedKey(response.key); 
      setShowGeneratedKey(true);
      loadOrganization();
    } catch (err: any) { 
      setError(err.response?.data?.detail || err.message || 'Failed to generate API key'); 
    } finally { 
      setGeneratingKey(false); 
    }
  };
  
  const handleDeleteApiKey = async () => {
    if (!selectedApiKey) return;
    try {
      await api.delete(`/core/api-keys/${selectedApiKey.id}/`);
      setApiKeys(prev => prev.filter(k => k.id !== selectedApiKey.id));
      setShowDeleteKeyModal(false); 
      setSelectedApiKey(null);
      setSuccess('API key deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) { 
      setError(err.message || 'Failed to delete API key'); 
    }
  };

  const renderTabs = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-4 overflow-x-auto">
        {[
          { id: 'general', label: 'General', icon: Building2 },
          { id: 'branding', label: 'Branding', icon: Palette },
          { id: 'features', label: 'Features', icon: Settings },
          { id: 'members', label: 'Members', icon: Users },
          { id: 'api', label: 'API Keys', icon: Key },
          { id: 'billing', label: 'Usage & Billing', icon: CreditCard },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          ><tab.icon className="w-4 h-4" />{tab.label}</button>
        ))}
      </nav>
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Organization Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Organization Name *" value={organization.name} onChange={(e) => handleFieldChange('name', e.target.value)} placeholder="Enter organization name" />
          <Input label="Organization Code" value={organization.code} disabled className="bg-gray-50" />
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={organization.description} onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" rows={3} placeholder="Brief description of your organization" />
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Email" type="email" value={organization.email} onChange={(e) => handleFieldChange('email', e.target.value)} placeholder="contact@organization.com" />
          <Input label="Phone" type="tel" value={organization.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} placeholder="+91 98765 43210" />
          <Input label="Website" type="url" value={organization.website} onChange={(e) => handleFieldChange('website', e.target.value)} placeholder="https://organization.com" />
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Input label="Street Address" value={organization.address} onChange={(e) => handleFieldChange('address', e.target.value)} placeholder="123 Main Street" /></div>
          <Input label="City" value={organization.city} onChange={(e) => handleFieldChange('city', e.target.value)} placeholder="Mumbai" />
          <Input label="State" value={organization.state} onChange={(e) => handleFieldChange('state', e.target.value)} placeholder="Maharashtra" />
          <Input label="Country" value={organization.country} onChange={(e) => handleFieldChange('country', e.target.value)} placeholder="India" />
          <Input label="Pincode" value={organization.pincode} onChange={(e) => handleFieldChange('pincode', e.target.value)} placeholder="400001" />
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Localization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Timezone" value={organization.timezone} onChange={(e) => handleFieldChange('timezone', e.target.value)} options={TIMEZONES} />
          <Select label="Date Format" value={organization.date_format} onChange={(e) => handleFieldChange('date_format', e.target.value)} options={DATE_FORMATS} />
          <Select label="Currency" value={organization.currency} onChange={(e) => handleFieldChange('currency', e.target.value)} options={CURRENCIES} />
          <Select label="Default Language" value={organization.language} onChange={(e) => handleFieldChange('language', e.target.value)} options={LANGUAGES} />
        </div>
      </Card>
    </div>
  );

  const renderBrandingTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Organization Logo</h3>
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
            {organization.logo ? <img src={organization.logo} alt="Logo" className="w-full h-full object-contain" /> : <Image className="w-12 h-12 text-gray-400" />}
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-3">Upload your organization logo. Recommended size: 512x512px. Max file size: 2MB.</p>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </Button>
              {organization.logo && (
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => handleFieldChange('logo', null)}>
                  <Trash2 className="w-4 h-4" /> Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Brand Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={organization.primary_color} onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300" />
              <Input value={organization.primary_color} onChange={(e) => handleFieldChange('primary_color', e.target.value)} className="flex-1" placeholder="#10B981" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for buttons, links, and accents</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={organization.secondary_color} onChange={(e) => handleFieldChange('secondary_color', e.target.value)}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300" />
              <Input value={organization.secondary_color} onChange={(e) => handleFieldChange('secondary_color', e.target.value)} className="flex-1" placeholder="#3B82F6" />
            </div>
            <p className="text-xs text-gray-500 mt-1">Used for secondary elements and highlights</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 text-white rounded-lg" style={{ backgroundColor: organization.primary_color }}>Primary Button</button>
            <button className="px-4 py-2 text-white rounded-lg" style={{ backgroundColor: organization.secondary_color }}>Secondary Button</button>
            <span className="font-medium" style={{ color: organization.primary_color }}>Primary Link</span>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderFeaturesTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">AI & Interview Features</h3>
        <div className="space-y-4">
          {[
            { key: 'ai_interviews_enabled' as const, icon: Settings, iconColor: 'text-purple-600', bgColor: 'bg-purple-100', title: 'AI Voice Interviews', desc: 'Enable AI-powered voice interviews for beneficiaries' },
            { key: 'sentiment_analysis_enabled' as const, icon: Bell, iconColor: 'text-blue-600', bgColor: 'bg-blue-100', title: 'Sentiment Analysis', desc: 'Analyze emotional sentiment in interview responses' },
            { key: 'video_capture_enabled' as const, icon: Image, iconColor: 'text-red-600', bgColor: 'bg-red-100', title: 'Video Capture', desc: 'Record video during AI interviews' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${item.bgColor} rounded-lg flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
              <button onClick={() => handleFieldChange(item.key, !organization[item.key])}
                className={`relative w-12 h-6 rounded-full transition-colors ${organization[item.key] ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${organization[item.key] ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
      
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Plan Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-600 mb-2"><Users className="w-5 h-5" /><span className="font-medium">Max Users</span></div>
            <p className="text-2xl font-bold text-gray-800">{organization.max_users}</p>
            <p className="text-sm text-gray-500">{organization.total_users} currently active</p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 mb-2"><FileText className="w-5 h-5" /><span className="font-medium">Max Projects</span></div>
            <p className="text-2xl font-bold text-gray-800">{organization.max_projects}</p>
            <p className="text-sm text-gray-500">{organization.total_projects} projects created</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 text-purple-600 mb-2"><Database className="w-5 h-5" /><span className="font-medium">Storage Limit</span></div>
            <p className="text-2xl font-bold text-gray-800">{organization.storage_limit_gb} GB</p>
            <p className="text-sm text-gray-500">{organization.storage_used_gb.toFixed(1)} GB used</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderMembersTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold text-gray-900">Team Members</h3><p className="text-sm text-gray-500">{members.length} members in your organization</p></div>
        {isAdmin && <Button onClick={() => setShowInviteModal(true)}><Plus className="w-4 h-4" />Invite Member</Button>}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <span className="text-emerald-700 font-medium">{member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                      </div>
                      <div><p className="font-medium text-gray-900">{member.name}</p><p className="text-sm text-gray-500">{member.email}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><Badge variant={member.role === 'admin' ? 'info' : 'default'}>{member.role_display}</Badge></td>
                  <td className="px-6 py-4"><Badge variant={member.is_active ? 'success' : 'warning'}>{member.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{member.last_login ? new Date(member.last_login).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderApiTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h3 className="font-semibold text-gray-900">API Keys</h3><p className="text-sm text-gray-500">Manage API keys for programmatic access</p></div>
        {isAdmin && <Button onClick={() => setShowApiKeyModal(true)}><Plus className="w-4 h-4" />Generate API Key</Button>}
      </div>
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div><p className="font-medium text-yellow-800">Keep your API keys secure</p><p className="text-sm text-yellow-700 mt-1">API keys provide full access to your organization's data. Never share them publicly or commit them to version control.</p></div>
        </div>
      </Card>
      {apiKeys.length === 0 ? (
        <Card className="p-12 text-center">
          <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No API Keys</h3>
          <p className="text-gray-500 mb-4">Generate an API key to access the API programmatically.</p>
          {isAdmin && <Button onClick={() => setShowApiKeyModal(true)}><Plus className="w-4 h-4" />Generate API Key</Button>}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apiKeys.map(key => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{key.name}</td>
                    <td className="px-6 py-4"><code className="px-2 py-1 bg-gray-100 rounded text-sm">{key.key_prefix}...</code></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(key.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                    <td className="px-6 py-4"><Badge variant={key.is_active ? 'success' : 'danger'}>{key.is_active ? 'Active' : 'Revoked'}</Badge></td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && key.is_active && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => { setSelectedApiKey(key); setShowDeleteKeyModal(true); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );

  const renderBillingTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div><h3 className="font-semibold text-gray-900">Current Plan</h3><p className="text-sm text-gray-500">Your organization's subscription details</p></div>
          <span className="px-4 py-1 text-base font-medium bg-green-100 text-green-800 rounded-full">Professional</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Users', used: organization.total_users, max: organization.max_users, color: 'bg-emerald-500' },
            { label: 'Projects', used: organization.total_projects, max: organization.max_projects, color: 'bg-blue-500' },
            { label: 'Storage', used: organization.storage_used_gb, max: organization.storage_limit_gb, color: 'bg-purple-500', suffix: ' GB' },
            { label: 'AI Interview Minutes', used: 450, max: 1000, color: 'bg-orange-500' },
          ].map(item => (
            <div key={item.label} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-xl font-bold text-gray-800">{typeof item.used === 'number' && item.used % 1 !== 0 ? item.used.toFixed(1) : item.used}{item.suffix || ''} / {item.max}{item.suffix || ''}</p>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${(Number(item.used) / item.max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Billing Information</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div><p className="text-sm text-gray-500">Next billing date</p><p className="font-medium text-gray-900">January 1, 2025</p></div>
          <div className="text-right"><p className="text-sm text-gray-500">Amount due</p><p className="text-2xl font-bold text-gray-900">₹9,999</p></div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="secondary">View Invoices</Button>
          <Button variant="secondary">Update Payment Method</Button>
          <Button>Upgrade Plan</Button>
        </div>
      </Card>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div><h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1><p className="text-gray-500">Manage {organization.name || 'your organization'}</p></div>
        </div>
        {(activeTab === 'general' || activeTab === 'branding' || activeTab === 'features') && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
          </Button>
        )}
      </div>
      
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"><div className="flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" />{error}</div><button onClick={() => setError('')}><X className="w-4 h-4 text-red-500" /></button></div>}
      {success && <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"><CheckCircle className="w-5 h-5" />{success}</div>}
      
      {renderTabs()}
      {activeTab === 'general' && renderGeneralTab()}
      {activeTab === 'branding' && renderBrandingTab()}
      {activeTab === 'features' && renderFeaturesTab()}
      {activeTab === 'members' && renderMembersTab()}
      {activeTab === 'api' && renderApiTab()}
      {activeTab === 'billing' && renderBillingTab()}

      {/* Invite Member Modal */}
      <Modal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invite Team Member">
        <div className="space-y-4">
          <Input label="Email Address *" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@organization.com" />
          <Select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} options={[
            { value: 'admin', label: 'Administrator' }, { value: 'manager', label: 'Project Manager' },
            { value: 'field_resource', label: 'Field Staff' }, { value: 'analyst', label: 'Analyst' },
          ]} />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowInviteModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleInviteMember} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate API Key Modal */}
      <Modal isOpen={showApiKeyModal} onClose={() => { setShowApiKeyModal(false); setNewKeyName(''); setGeneratedKey(''); setShowGeneratedKey(false); }} title="Generate API Key">
        {generatedKey ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 mb-2"><CheckCircle className="w-5 h-5" /><span className="font-medium">API Key Generated!</span></div>
              <p className="text-sm text-green-600 mb-3">Copy this key now. You won't be able to see it again.</p>
              <div className="relative">
                <input type={showGeneratedKey ? 'text' : 'password'} value={generatedKey} readOnly className="w-full px-4 py-2.5 pr-20 bg-white border border-green-300 rounded-lg font-mono text-sm" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => setShowGeneratedKey(!showGeneratedKey)} className="p-1.5 hover:bg-green-100 rounded">{showGeneratedKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                  <button onClick={() => { navigator.clipboard.writeText(generatedKey); setSuccess('API key copied to clipboard'); setTimeout(() => setSuccess(''), 2000); }} className="p-1.5 hover:bg-green-100 rounded"><Link2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => { setShowApiKeyModal(false); setNewKeyName(''); setGeneratedKey(''); setShowGeneratedKey(false); }}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Input label="Key Name *" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., Production API Key" />
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowApiKeyModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleGenerateApiKey} disabled={generatingKey || !newKeyName.trim()}>
                {generatingKey ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Key className="w-4 h-4" />Generate Key</>}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete API Key Modal */}
      <Modal isOpen={showDeleteKeyModal} onClose={() => { setShowDeleteKeyModal(false); setSelectedApiKey(null); }} title="Revoke API Key">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div><p className="font-medium text-red-800">This action cannot be undone</p><p className="text-sm text-red-700 mt-1">Revoking this API key will immediately disable all applications using it.</p></div>
            </div>
          </div>
          <p className="text-gray-600">Are you sure you want to revoke the API key <strong>"{selectedApiKey?.name}"</strong>?</p>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowDeleteKeyModal(false); setSelectedApiKey(null); }}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteApiKey}><Trash2 className="w-4 h-4" />Revoke Key</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationSettingsPage;