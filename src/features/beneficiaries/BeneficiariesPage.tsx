import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Download, Upload, Eye, Edit, Trash2, 
  Users, MapPin, Phone, User, Filter, RefreshCw,
  CheckCircle, XCircle, FileSpreadsheet, AlertCircle,
  ChevronDown, MoreVertical, Check
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Badge, Modal, Input, Select, Textarea, LoadingSpinner } from '../../components/ui';

// Types
interface Project {
  id: number;
  code: string;
  title: string;
  total_beneficiaries: number;
  sample_size: number;
}

interface Beneficiary {
  id: number;
  project: number;
  project_code?: string;
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
  grant_amount_received: number | null;
  grant_received_date: string | null;
  grant_purpose: string;
  is_sampled: boolean;
  is_interviewed: boolean;
  additional_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

const emptyBeneficiary = {
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
};

import BeneficiaryAssignmentsView from './BeneficiaryAssignmentsView';

const BeneficiariesPage: React.FC = () => {
  const navigate = useNavigate();
  // State
  const [view, setView] = useState<'beneficiaries' | 'assignments'>('beneficiaries');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sampledFilter, setSampledFilter] = useState('');
  const [interviewedFilter, setInterviewedFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState(emptyBeneficiary);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProject, setImportProject] = useState('');
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sampling state
  const [sampleProject, setSampleProject] = useState('');
  const [sampleSize, setSampleSize] = useState('');

  // Selection state for bulk operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Load data
  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadBeneficiaries();
  }, [projectFilter, genderFilter, sampledFilter, interviewedFilter]);

  const loadProjects = async () => {
    try {
      const data = await api.get<any>(endpoints.projects);
      setProjects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadBeneficiaries = async () => {
    setLoading(true);
    try {
      let url = endpoints.beneficiaries;
      const params = new URLSearchParams();
      
      if (projectFilter) params.append('project', projectFilter);
      if (genderFilter) params.append('gender', genderFilter);
      if (sampledFilter) params.append('is_sampled', sampledFilter);
      if (interviewedFilter) params.append('is_interviewed', interviewedFilter);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const data = await api.get<any>(url);
      setBeneficiaries(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      console.error('Error loading beneficiaries:', err);
      setError('Failed to load beneficiaries');
    }
    setLoading(false);
  };

  // Filter beneficiaries locally
  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !b.name?.toLowerCase().includes(term) &&
        !b.beneficiary_id?.toLowerCase().includes(term) &&
        !b.phone?.toLowerCase().includes(term) &&
        !b.village?.toLowerCase().includes(term) &&
        !b.district?.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCreateBeneficiary = async () => {
    if (!formData.project || !formData.name || !formData.beneficiary_id) {
      setError('Please fill in required fields: Project, Name, and Beneficiary ID');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        project: parseInt(formData.project),
        age: formData.age ? parseInt(formData.age) : null,
        annual_income: formData.annual_income ? parseFloat(formData.annual_income) : null,
        grant_amount_received: formData.grant_amount_received ? parseFloat(formData.grant_amount_received) : null,
      };

      await api.post(endpoints.beneficiaries, payload);
      setSuccess('Beneficiary created successfully');
      setShowCreateModal(false);
      setFormData(emptyBeneficiary);
      loadBeneficiaries();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 
        Object.values(err.response?.data || {}).flat().join(', ') ||
        'Failed to create beneficiary';
      setError(errorMsg);
    }
    setSubmitting(false);
  };

  const handleDeleteBeneficiary = async (beneficiary: Beneficiary) => {
    if (!window.confirm(`Are you sure you want to delete ${beneficiary.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`${endpoints.beneficiaries}${beneficiary.id}/`);
      setSuccess('Beneficiary deleted successfully');
      loadBeneficiaries();
    } catch (err: any) {
      setError('Failed to delete beneficiary');
    }
  };

  const openViewModal = (beneficiary: Beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setShowViewModal(true);
  };

  // Import handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile || !importProject) {
      setError('Please select a project and file');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('project', importProject);

      const result = await api.uploadFile<any>(`${endpoints.beneficiaries}import_data/`, formData);
      setImportResult(result);
      setSuccess(`Import completed: ${result.created} created, ${result.updated} updated`);
      loadBeneficiaries();
      loadProjects(); // Refresh project counts
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    }
    setSubmitting(false);
  };

  // Sampling handler
  const handleRandomSample = async () => {
    if (!sampleProject || !sampleSize) {
      setError('Please select a project and enter sample size');
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post<any>(`${endpoints.projects}${sampleProject}/random_sample/`, {
        sample_size: parseInt(sampleSize)
      });
      setSuccess(result.message);
      setShowSampleModal(false);
      loadBeneficiaries();
    } catch (err: any) {
      setError('Failed to perform random sampling');
    }
    setSubmitting(false);
  };

  // Toggle sampled status
  const toggleSampledStatus = async (beneficiary: Beneficiary) => {
    try {
      await api.patch(`${endpoints.beneficiaries}${beneficiary.id}/`, {
        is_sampled: !beneficiary.is_sampled
      });
      loadBeneficiaries();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  // Bulk selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBeneficiaries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBeneficiaries.map(b => b.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Bulk mark as sampled
  const bulkMarkSampled = async (sampled: boolean) => {
    if (selectedIds.length === 0) return;
    
    try {
      await Promise.all(
        selectedIds.map(id => 
          api.patch(`${endpoints.beneficiaries}${id}/`, { is_sampled: sampled })
        )
      );
      setSuccess(`${selectedIds.length} beneficiaries ${sampled ? 'marked as sampled' : 'unmarked'}`);
      setSelectedIds([]);
      loadBeneficiaries();
    } catch (err) {
      setError('Failed to update beneficiaries');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Gender', 'Age', 'Phone', 'Village', 'District', 'State', 'Category', 'Sampled', 'Interviewed'];
    const rows = filteredBeneficiaries.map(b => [
      b.beneficiary_id,
      b.name,
      b.gender,
      b.age || '',
      b.phone,
      b.village,
      b.district,
      b.state,
      b.category,
      b.is_sampled ? 'Yes' : 'No',
      b.is_interviewed ? 'Yes' : 'No'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beneficiaries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Stats
  const stats = {
    total: beneficiaries.length,
    sampled: beneficiaries.filter(b => b.is_sampled).length,
    interviewed: beneficiaries.filter(b => b.is_interviewed).length,
    pending: beneficiaries.filter(b => b.is_sampled && !b.is_interviewed).length,
  };

  if (view === 'assignments') {
    return <BeneficiaryAssignmentsView />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Users className="w-8 h-8 text-emerald-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
            <p className="text-sm text-gray-500">Manage beneficiary data and sampling</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('assignments')}>
            View Assignments
          </Button>
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="secondary" onClick={() => setShowSampleModal(true)}>
            <Users className="w-4 h-4 mr-2" />
            Random Sample
          </Button>
          <Button onClick={() => { setFormData(emptyBeneficiary); setShowCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSampledFilter(''); setInterviewedFilter(''); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSampledFilter('true'); setInterviewedFilter(''); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sampled</p>
              <p className="text-2xl font-bold">{stats.sampled}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-emerald-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSampledFilter(''); setInterviewedFilter('true'); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Interviewed</p>
              <p className="text-2xl font-bold">{stats.interviewed}</p>
            </div>
            <User className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setSampledFilter('true'); setInterviewedFilter('false'); }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Interview</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-amber-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, phone, village..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <select
            value={sampledFilter}
            onChange={(e) => setSampledFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Sampled Status</option>
            <option value="true">Sampled</option>
            <option value="false">Not Sampled</option>
          </select>

          <select
            value={interviewedFilter}
            onChange={(e) => setInterviewedFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Interview Status</option>
            <option value="true">Interviewed</option>
            <option value="false">Not Interviewed</option>
          </select>

          <Button variant="secondary" onClick={loadBeneficiaries}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>

          <Button variant="secondary" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm text-gray-600">{selectedIds.length} selected</span>
            <Button size="sm" variant="secondary" onClick={() => bulkMarkSampled(true)}>
              Mark as Sampled
            </Button>
            <Button size="sm" variant="secondary" onClick={() => bulkMarkSampled(false)}>
              Unmark Sampled
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
              Clear Selection
            </Button>
          </div>
        )}
      </Card>

      {/* Beneficiaries Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredBeneficiaries.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No beneficiaries found</h3>
            <p className="text-gray-500 mt-1">
              {projectFilter ? 'Try selecting a different project or' : 'Get started by'} adding beneficiaries
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import from Excel
              </Button>
              <Button onClick={() => { setFormData(emptyBeneficiary); setShowCreateModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredBeneficiaries.length && filteredBeneficiaries.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Beneficiary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Details</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBeneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(beneficiary.id)}
                        onChange={() => toggleSelect(beneficiary.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{beneficiary.name}</div>
                        <div className="text-sm text-gray-500">{beneficiary.beneficiary_id}</div>
                        {beneficiary.phone && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {beneficiary.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        {beneficiary.village && <div>{beneficiary.village}</div>}
                        <div className="text-gray-500">
                          {[beneficiary.district, beneficiary.state].filter(Boolean).join(', ')}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <div>{beneficiary.gender_display || beneficiary.gender}{beneficiary.age ? `, ${beneficiary.age} yrs` : ''}</div>
                        {beneficiary.category && <div className="text-gray-500">{beneficiary.category}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={beneficiary.is_sampled ? 'success' : 'default'}>
                          {beneficiary.is_sampled ? 'Sampled' : 'Not Sampled'}
                        </Badge>
                        {beneficiary.is_interviewed && (
                          <Badge variant="info">Interviewed</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/beneficiaries/${beneficiary.id}`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleSampledStatus(beneficiary)}
                          className={`p-1.5 rounded ${
                            beneficiary.is_sampled 
                              ? 'text-emerald-600 hover:bg-emerald-50' 
                              : 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={beneficiary.is_sampled ? 'Remove from Sample' : 'Add to Sample'}
                        >
                          {beneficiary.is_sampled ? <CheckCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteBeneficiary(beneficiary)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
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
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title="Add New Beneficiary"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          />
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Enter phone number"
          />
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            options={CATEGORY_OPTIONS}
          />
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
            placeholder="Enter block/tehsil"
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
          />
          <Input
            label="Occupation"
            name="occupation"
            value={formData.occupation}
            onChange={handleInputChange}
            placeholder="Enter occupation"
          />
          <Input
            label="Annual Income"
            name="annual_income"
            type="number"
            value={formData.annual_income}
            onChange={handleInputChange}
            placeholder="Enter annual income"
          />
          <Input
            label="Grant Amount Received"
            name="grant_amount_received"
            type="number"
            value={formData.grant_amount_received}
            onChange={handleInputChange}
            placeholder="Enter amount"
          />
          <Input
            label="Grant Received Date"
            name="grant_received_date"
            type="date"
            value={formData.grant_received_date}
            onChange={handleInputChange}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bpl_status"
              name="bpl_status"
              checked={formData.bpl_status as boolean}
              onChange={handleInputChange}
              className="rounded border-gray-300"
            />
            <label htmlFor="bpl_status" className="text-sm font-medium text-gray-700">BPL Status</label>
          </div>
          <div className="md:col-span-2">
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
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateBeneficiary} disabled={submitting}>
            {submitting ? 'Saving...' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Beneficiary Details">
        {selectedBeneficiary && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{selectedBeneficiary.name}</h3>
                <p className="text-gray-500">{selectedBeneficiary.beneficiary_id}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedBeneficiary.is_sampled ? 'success' : 'default'}>
                    {selectedBeneficiary.is_sampled ? 'Sampled' : 'Not Sampled'}
                  </Badge>
                  {selectedBeneficiary.is_interviewed && <Badge variant="info">Interviewed</Badge>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Gender</p>
                <p className="font-medium">{selectedBeneficiary.gender_display || selectedBeneficiary.gender || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-medium">{selectedBeneficiary.age || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedBeneficiary.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{selectedBeneficiary.category || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Village</p>
                <p className="font-medium">{selectedBeneficiary.village || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">District</p>
                <p className="font-medium">{selectedBeneficiary.district || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">State</p>
                <p className="font-medium">{selectedBeneficiary.state || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Occupation</p>
                <p className="font-medium">{selectedBeneficiary.occupation || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Annual Income</p>
                <p className="font-medium">{selectedBeneficiary.annual_income ? `₹${selectedBeneficiary.annual_income.toLocaleString()}` : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Grant Received</p>
                <p className="font-medium">{selectedBeneficiary.grant_amount_received ? `₹${selectedBeneficiary.grant_amount_received.toLocaleString()}` : '-'}</p>
              </div>
              {selectedBeneficiary.grant_purpose && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Grant Purpose</p>
                  <p className="font-medium">{selectedBeneficiary.grant_purpose}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>
                Close
                </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportResult(null); }} title="Import Beneficiaries">
        <div className="space-y-4">
          <Select
            label="Project *"
            name="importProject"
            value={importProject}
            onChange={(e) => setImportProject(e.target.value)}
            options={[
              { value: '', label: 'Select Project' },
              ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
            ]}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Excel/CSV File *</label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              {importFile ? (
                <p className="text-emerald-600 font-medium">{importFile.name}</p>
              ) : (
                <>
                  <p className="text-gray-600">Click to select file or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-1">Supports .xlsx, .xls, .csv</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-800 mb-2">Expected Columns:</p>
            <p className="text-blue-700">
              beneficiary_id, name, gender, age, phone, village, block, district, state, pincode, category, occupation, annual_income, grant_amount_received
            </p>
          </div>

          {importResult && (
            <div className={`border rounded-lg p-4 ${importResult.total_errors > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
              <p className="font-medium">Import Results:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>✓ Created: {importResult.created}</li>
                <li>↻ Updated: {importResult.updated}</li>
                {importResult.total_errors > 0 && <li className="text-red-600">✗ Errors: {importResult.total_errors}</li>}
              </ul>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  {importResult.errors.slice(0, 5).map((err: string, i: number) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={submitting || !importFile || !importProject}>
              {submitting ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Random Sample Modal */}
      <Modal isOpen={showSampleModal} onClose={() => setShowSampleModal(false)} title="Random Sampling">
        <div className="space-y-4">
          <p className="text-gray-600">
            Randomly select beneficiaries for interview sampling. This will reset any existing sample selection for the project.
          </p>

          <Select
            label="Project *"
            name="sampleProject"
            value={sampleProject}
            onChange={(e) => {
              setSampleProject(e.target.value);
              const project = projects.find(p => p.id.toString() === e.target.value);
              if (project) {
                setSampleSize(project.sample_size?.toString() || '');
              }
            }}
            options={[
              { value: '', label: 'Select Project' },
              ...projects.map(p => ({ 
                value: p.id.toString(), 
                label: `${p.code} - ${p.title} (${p.total_beneficiaries} beneficiaries)` 
              }))
            ]}
            required
          />

          <Input
            label="Sample Size *"
            name="sampleSize"
            type="number"
            value={sampleSize}
            onChange={(e) => setSampleSize(e.target.value)}
            placeholder="Enter number of beneficiaries to sample"
            required
          />

          {sampleProject && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p>Total beneficiaries: {projects.find(p => p.id.toString() === sampleProject)?.total_beneficiaries || 0}</p>
              <p>Recommended sample (10%): {Math.ceil((projects.find(p => p.id.toString() === sampleProject)?.total_beneficiaries || 0) * 0.1)}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowSampleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRandomSample} disabled={submitting || !sampleProject || !sampleSize}>
              {submitting ? 'Sampling...' : 'Run Random Sample'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BeneficiariesPage;
