import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, User, Phone, MapPin, Calendar, Briefcase, IndianRupee,
  AlertCircle, CheckCircle, UserCircle, Mail, Globe, GraduationCap,
  Building2, CreditCard, Hash, Shield, Wallet, Loader2
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Input, Select, LoadingSpinner } from '../../components/ui';

interface FieldResource {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
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
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  aadhar_number: string;
  bank_account: string;
  ifsc_code: string;
  daily_rate: string;
  education: string;
  languages_known: string;
  experience_years: string;
  is_available: boolean;
  is_active: boolean;
}

const EDUCATION_OPTIONS = [
  { value: '', label: 'Select Education' },
  { value: '10th Pass', label: '10th Pass' },
  { value: '12th Pass', label: '12th Pass' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Post Graduate', label: 'Post Graduate' },
  { value: 'PhD', label: 'PhD' },
];

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  description?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, description }) => (
  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
    <div className="p-2 bg-indigo-50 rounded-lg">
      <Icon className="h-5 w-5 text-indigo-600" />
    </div>
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  </div>
);

const FieldResourceEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [originalData, setOriginalData] = useState<FieldResource | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    aadhar_number: '',
    bank_account: '',
    ifsc_code: '',
    daily_rate: '',
    education: '',
    languages_known: '',
    experience_years: '',
    is_available: true,
    is_active: true,
  });

  useEffect(() => {
    if (id) loadResource();
  }, [id]);

  const loadResource = async () => {
    try {
      const data = await api.get<FieldResource>(`${endpoints.users}${id}/`);
      setOriginalData(data);
      
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        aadhar_number: data.aadhar_number || '',
        bank_account: data.bank_account || '',
        ifsc_code: data.ifsc_code || '',
        daily_rate: data.daily_rate?.toString() || '',
        education: data.education || '',
        languages_known: data.languages_known || '',
        experience_years: data.experience_years?.toString() || '',
        is_available: data.is_available ?? true,
        is_active: data.is_active ?? true,
      });
    } catch (err) {
      console.error('Error loading resource:', err);
      setError('Failed to load resource data');
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload: Record<string, any> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        aadhar_number: formData.aadhar_number,
        bank_account: formData.bank_account,
        ifsc_code: formData.ifsc_code,
        education: formData.education,
        languages_known: formData.languages_known,
        is_available: formData.is_available,
        is_active: formData.is_active,
      };

      if (formData.daily_rate) {
        payload.daily_rate = parseFloat(formData.daily_rate);
      } else {
        payload.daily_rate = null;
      }

      if (formData.experience_years) {
        payload.experience_years = parseInt(formData.experience_years);
      } else {
        payload.experience_years = 0;
      }

      await api.patch(`${endpoints.users}${id}/`, payload);
      
      setSuccess('Resource updated successfully!');
      
      setTimeout(() => {
        navigate(`/resources/${id}`);
      }, 1500);
      
    } catch (err: any) {
      console.error('Error updating resource:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || Object.values(err.response?.data || {}).flat().join(', ')
        || err.message 
        || 'Failed to update resource';
      setError(errorMessage);
    }
    
    setSaving(false);
  };

  const handleCancel = () => {
    navigate(`/resources/${id}`);
  };

  const getFullName = (): string => {
    if (originalData) {
      const name = `${originalData.first_name || ''} ${originalData.last_name || ''}`.trim();
      return name || originalData.username || 'Unknown';
    }
    return 'Unknown';
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Resource Not Found</h2>
        <p className="text-gray-500 mb-4">The resource you're trying to edit doesn't exist.</p>
        <Button onClick={() => navigate('/resources')}>
          <ArrowLeft className="h-4 w-4" /> Back to Resources
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <button
          onClick={() => navigate(`/resources/${id}`)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </button>
        
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <UserCircle className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Field Resource</h1>
            <p className="text-gray-500 mt-1">{getFullName()} • {originalData.username}</p>
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
            description="Basic details about the resource"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              placeholder="Enter first name"
            />
            
            <Input
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              placeholder="Enter last name"
            />
            
            <Input
              label="Email *"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter email"
              required
            />
            
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+91-9876543210"
              maxLength={15}
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
            <div className="md:col-span-2 lg:col-span-3">
              <Input
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
              />
            </div>
            
            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Enter city"
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

        {/* Professional Information */}
        <Card className="p-6">
          <SectionHeader 
            icon={Briefcase} 
            title="Professional Details" 
            description="Education, experience and compensation"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="Education"
              name="education"
              value={formData.education}
              onChange={handleInputChange}
              options={EDUCATION_OPTIONS}
            />
            
            <Input
              label="Languages Known"
              name="languages_known"
              value={formData.languages_known}
              onChange={handleInputChange}
              placeholder="Hindi, English, Marathi"
            />
            
            <Input
              label="Experience (years)"
              name="experience_years"
              type="number"
              value={formData.experience_years}
              onChange={handleInputChange}
              placeholder="Enter years"
              min="0"
              max="50"
            />
            
            <Input
              label="Daily Rate (₹)"
              name="daily_rate"
              type="number"
              value={formData.daily_rate}
              onChange={handleInputChange}
              placeholder="Enter daily rate"
              min="0"
            />
          </div>
        </Card>

        {/* Bank & ID Information */}
        <Card className="p-6">
          <SectionHeader 
            icon={Wallet} 
            title="Bank & ID Details" 
            description="Identity and payment information"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Aadhar Number"
              name="aadhar_number"
              value={formData.aadhar_number}
              onChange={handleInputChange}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={12}
            />
            
            <Input
              label="Bank Account Number"
              name="bank_account"
              value={formData.bank_account}
              onChange={handleInputChange}
              placeholder="Enter account number"
            />
            
            <Input
              label="IFSC Code"
              name="ifsc_code"
              value={formData.ifsc_code}
              onChange={handleInputChange}
              placeholder="e.g., SBIN0001234"
              maxLength={11}
            />
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6">
          <SectionHeader 
            icon={Shield} 
            title="Status & Availability" 
            description="Account and availability settings"
          />
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_available"
                name="is_available"
                checked={formData.is_available}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_available" className="text-sm font-medium text-gray-700">
                Available for Assignments
              </label>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active Account
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

export default FieldResourceEditPage;