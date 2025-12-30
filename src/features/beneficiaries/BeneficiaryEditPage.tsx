import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  UserCircle,
  Home,
  Building2,
  Globe,
  Hash,
  Shield,
  CreditCard,
  Target,
  Heart,
  Loader2
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Input, Select, Textarea, LoadingSpinner } from '../../components/ui';

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
  annual_income: number | string | null;
  grant_amount_received: string | number | null;
  grant_received_date: string | null;
  grant_purpose: string;
  is_sampled: boolean;
  is_interviewed: boolean;
  additional_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  code: string;
  title: string;
}

// Form data type
interface FormData {
  project: string;
  beneficiary_id: string;
  name: string;
  father_husband_name: string;
  gender: string;
  age: string;
  phone: string;
  village: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
  category: string;
  bpl_status: boolean;
  occupation: string;
  annual_income: string;
  grant_amount_received: string;
  grant_received_date: string;
  grant_purpose: string;
  is_sampled: boolean;
  is_interviewed: boolean;
}

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Select Category' },
  { value: 'General', label: 'General' },
  { value: 'OBC', label: 'OBC' },
  { value: 'SC', label: 'SC' },
  { value: 'ST', label: 'ST' },
  { value: 'EWS', label: 'EWS' },
  { value: 'Other', label: 'Other' },
];

// Section Header Component
interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  description?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
    <div className="p-2 bg-emerald-50 rounded-lg">
      <Icon className="h-5 w-5 text-emerald-600" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  </div>
);

const BeneficiaryEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [originalData, setOriginalData] = useState<BeneficiaryDetails | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    project: '',
    beneficiary_id: '',
    name: '',
    father_husband_name: '',
    gender: '',
    age: '',
    phone: '',
    village: '',
    block: '',
    district: '',
    state: '',
    pincode: '',
    category: '',
    bpl_status: false,
    occupation: '',
    annual_income: '',
    grant_amount_received: '',
    grant_received_date: '',
    grant_purpose: '',
    is_sampled: false,
    is_interviewed: false,
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Load projects for dropdown
      const projectsData = await api.get<any>(endpoints.projects);
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData.results || []);

      // Load beneficiary data
      if (id) {
        const data = await api.get<BeneficiaryDetails>(`${endpoints.beneficiaries}${id}/`);
        setOriginalData(data);
        
        // Populate form
        setFormData({
          project: data.project?.toString() || '',
          beneficiary_id: data.beneficiary_id || '',
          name: data.name || '',
          father_husband_name: data.father_husband_name || '',
          gender: data.gender || '',
          age: data.age?.toString() || '',
          phone: data.phone || '',
          village: data.village || '',
          block: data.block || '',
          district: data.district || '',
          state: data.state || '',
          pincode: data.pincode || '',
          category: data.category || '',
          bpl_status: data.bpl_status || false,
          occupation: data.occupation || '',
          annual_income: data.annual_income?.toString() || '',
          grant_amount_received: data.grant_amount_received?.toString() || '',
          grant_received_date: data.grant_received_date || '',
          grant_purpose: data.grant_purpose || '',
          is_sampled: data.is_sampled || false,
          is_interviewed: data.is_interviewed || false,
        });
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load beneficiary data');
    }
    setLoading(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear messages when user starts editing
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.beneficiary_id.trim()) {
      setError('Beneficiary ID is required');
      return;
    }
    if (!formData.project) {
      setError('Project is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Build payload with only changed/valid fields
      const payload: Record<string, any> = {
        project: parseInt(formData.project),
        beneficiary_id: formData.beneficiary_id,
        name: formData.name,
        father_husband_name: formData.father_husband_name || '',
        gender: formData.gender || null,
        phone: formData.phone || '',
        village: formData.village || '',
        block: formData.block || '',
        district: formData.district || '',
        state: formData.state || '',
        pincode: formData.pincode || '',
        category: formData.category || '',
        bpl_status: formData.bpl_status,
        occupation: formData.occupation || '',
        grant_purpose: formData.grant_purpose || '',
        is_sampled: formData.is_sampled,
        is_interviewed: formData.is_interviewed,
      };

      // Add numeric fields only if they have values
      if (formData.age) {
        payload.age = parseInt(formData.age);
      } else {
        payload.age = null;
      }

      if (formData.annual_income) {
        payload.annual_income = parseFloat(formData.annual_income);
      } else {
        payload.annual_income = null;
      }

      if (formData.grant_amount_received) {
        payload.grant_amount_received = parseFloat(formData.grant_amount_received);
      } else {
        payload.grant_amount_received = null;
      }

      if (formData.grant_received_date) {
        payload.grant_received_date = formData.grant_received_date;
      } else {
        payload.grant_received_date = null;
      }

      await api.patch(`${endpoints.beneficiaries}${id}/`, payload);
      
      setSuccess('Beneficiary updated successfully!');
      
      // Navigate back to profile after short delay
      setTimeout(() => {
        navigate(`/beneficiaries/${id}`);
      }, 1500);
      
    } catch (err: any) {
      console.error('Error updating beneficiary:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || Object.values(err.response?.data || {}).flat().join(', ')
        || err.message 
        || 'Failed to update beneficiary';
      setError(errorMessage);
    }
    
    setSaving(false);
  };

  const handleCancel = () => {
    navigate(`/beneficiaries/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!originalData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Beneficiary Not Found</h2>
        <p className="text-gray-500 mb-4">The beneficiary you're trying to edit doesn't exist.</p>
        <Button onClick={() => navigate('/beneficiaries')}>
          <ArrowLeft className="h-4 w-4" /> Back to Beneficiaries
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <button
          onClick={() => navigate(`/beneficiaries/${id}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </button>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <UserCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Beneficiary</h1>
            <p className="text-gray-500 mt-1">
              {originalData.name} • {originalData.beneficiary_id}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card className="p-6">
          <SectionHeader 
            icon={User} 
            title="Personal Information" 
            description="Basic details about the beneficiary"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Project *"
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Select Project' },
                ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
              ]}
              required
            />
            
            <Input
              label="Beneficiary ID *"
              name="beneficiary_id"
              value={formData.beneficiary_id}
              onChange={handleInputChange}
              placeholder="e.g., BEN-001"
              required
            />
            
            <Input
              label="Full Name *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter full name"
              required
            />
            
            <Input
              label="Father/Husband Name"
              name="father_husband_name"
              value={formData.father_husband_name}
              onChange={handleInputChange}
              placeholder="Enter guardian name"
            />
            
            <Select
              label="Gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              options={GENDER_OPTIONS}
            />
            
            <Input
              label="Age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleInputChange}
              placeholder="Enter age"
              min="0"
              max="120"
            />
            
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter phone number"
              maxLength={15}
            />
            
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              options={CATEGORY_OPTIONS}
            />
          </div>
        </Card>

        {/* Location Information */}
        <Card className="p-6">
          <SectionHeader 
            icon={MapPin} 
            title="Location Details" 
            description="Address and location information"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Village"
              name="village"
              value={formData.village}
              onChange={handleInputChange}
              placeholder="Enter village name"
            />
            
            <Input
              label="Block/Tehsil"
              name="block"
              value={formData.block}
              onChange={handleInputChange}
              placeholder="Enter block or tehsil"
            />
            
            <Input
              label="District"
              name="district"
              value={formData.district}
              onChange={handleInputChange}
              placeholder="Enter district"
            />
            
            <Input
              label="State"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="Enter state"
            />
            
            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleInputChange}
              placeholder="Enter pincode"
              maxLength={6}
            />
          </div>
        </Card>

        {/* Economic Information */}
        <Card className="p-6">
          <SectionHeader 
            icon={Briefcase} 
            title="Economic Details" 
            description="Occupation and income information"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Occupation"
              name="occupation"
              value={formData.occupation}
              onChange={handleInputChange}
              placeholder="Enter occupation"
            />
            
            <Input
              label="Annual Income (₹)"
              name="annual_income"
              type="number"
              value={formData.annual_income}
              onChange={handleInputChange}
              placeholder="Enter annual income"
              min="0"
            />
            
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="bpl_status"
                name="bpl_status"
                checked={formData.bpl_status}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="bpl_status" className="text-sm font-medium text-gray-700">
                Below Poverty Line (BPL)
              </label>
            </div>
          </div>
        </Card>

        {/* Grant Information */}
        <Card className="p-6">
          <SectionHeader 
            icon={IndianRupee} 
            title="Grant Information" 
            description="Details about grants received"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Grant Amount Received (₹)"
              name="grant_amount_received"
              type="number"
              value={formData.grant_amount_received}
              onChange={handleInputChange}
              placeholder="Enter amount"
              min="0"
            />
            
            <Input
              label="Grant Received Date"
              name="grant_received_date"
              type="date"
              value={formData.grant_received_date}
              onChange={handleInputChange}
            />
            
            <div className="md:col-span-2 lg:col-span-1">
              <Textarea
                label="Grant Purpose"
                name="grant_purpose"
                value={formData.grant_purpose}
                onChange={handleInputChange}
                rows={2}
                placeholder="Purpose for which grant was received"
              />
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6">
          <SectionHeader 
            icon={Target} 
            title="Status & Tracking" 
            description="Sample and interview status"
          />
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_sampled"
                name="is_sampled"
                checked={formData.is_sampled}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="is_sampled" className="text-sm font-medium text-gray-700">
                Marked for Sampling
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_interviewed"
                name="is_interviewed"
                checked={formData.is_interviewed}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="is_interviewed" className="text-sm font-medium text-gray-700">
                Interview Completed
              </label>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <p className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </p>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default BeneficiaryEditPage;