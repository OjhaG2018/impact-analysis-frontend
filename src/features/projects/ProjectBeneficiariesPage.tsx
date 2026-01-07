import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Edit, Trash2, Users, ArrowLeft } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Input, Select, Modal, Badge, DataTable } from '../../components/ui';

interface Project {
  id: number;
  code: string;
  title: string;
}

interface Beneficiary {
  id: number;
  beneficiary_id: string;
  name: string;
  gender: string;
  age: number;
  phone: string;
  village: string;
  district: string;
  state: string;
  is_sampled: boolean;
  is_interviewed: boolean;
}

interface ProjectBeneficiariesPageProps {
  onBack?: () => void;
}

const ProjectBeneficiariesPage: React.FC<ProjectBeneficiariesPageProps> = ({ onBack }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
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
    grant_amount_received: '',
    grant_purpose: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectFilter) loadBeneficiaries();
  }, [projectFilter, genderFilter]);

  const loadProjects = async () => {
    try {
      const data = await api.get<{ results: Project[] }>(endpoints.projects);
      setProjects(data.results || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadBeneficiaries = async () => {
    if (!projectFilter) return;
    setLoading(true);
    try {
      let url = `${endpoints.beneficiaries}?project=${projectFilter}`;
      if (genderFilter) url += `&gender=${genderFilter}`;
      const data = await api.get<{ results: Beneficiary[] }>(url);
      setBeneficiaries(data.results || []);
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        project: parseInt(formData.project),
        age: formData.age ? parseInt(formData.age) : null,
        grant_amount_received: formData.grant_amount_received ? parseFloat(formData.grant_amount_received) : null,
      };
      await api.post(endpoints.beneficiaries, payload);
      resetForm();
      loadBeneficiaries();
    } catch (error) {
      alert('Failed to add beneficiary');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this beneficiary?')) return;
    try {
      await api.delete(`${endpoints.beneficiaries}${id}/`);
      loadBeneficiaries();
    } catch (error) {
      alert('Failed to delete beneficiary');
    }
  };

  const resetForm = () => {
    setFormData({
      project: projectFilter,
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
      grant_amount_received: '',
      grant_purpose: '',
    });
    setShowModal(false);
  };

  const filteredBeneficiaries = beneficiaries.filter(b =>
    searchTerm ? (
      b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.beneficiary_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true
  );

  const columns = [
    { key: 'beneficiary_id' as const, label: 'ID' },
    { key: 'name' as const, label: 'Name' },
    { 
      key: 'gender' as const, 
      label: 'Gender/Age',
      render: (_: unknown, row: Beneficiary) => `${row.gender}, ${row.age || '-'} yrs`
    },
    { key: 'phone' as const, label: 'Phone' },
    { 
      key: 'village' as const, 
      label: 'Location',
      render: (_: unknown, row: Beneficiary) => `${row.village}, ${row.district}`
    },
    {
      key: 'is_sampled' as const,
      label: 'Status',
      render: (_: unknown, row: Beneficiary) => (
        <div className="flex gap-1">
          <Badge variant={row.is_sampled ? 'success' : 'default'}>
            {row.is_sampled ? 'Sampled' : 'Not Sampled'}
          </Badge>
          {row.is_interviewed && <Badge variant="info">Interviewed</Badge>}
        </div>
      )
    },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (_: unknown, row: Beneficiary) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Beneficiaries</h1>
            <p className="text-gray-500 mt-1">Manage beneficiaries by project</p>
          </div>
        </div>
        <Button onClick={() => { setFormData({ ...formData, project: projectFilter }); setShowModal(true); }} disabled={!projectFilter} className="flex-shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Beneficiary</span>
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg w-full lg:w-auto"
          >
            <option value="">Select Project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
            ))}
          </select>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg w-full lg:w-auto"
            disabled={!projectFilter}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search beneficiaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              disabled={!projectFilter}
            />
          </div>
        </div>
      </Card>

      {!projectFilter ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Select a project to view beneficiaries</p>
        </Card>
      ) : (
        <Card className="p-2 sm:p-4 overflow-x-auto">
          <DataTable columns={columns} data={filteredBeneficiaries} loading={loading} />
        </Card>
      )}

      <Modal isOpen={showModal} onClose={resetForm} title="Add Beneficiary" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Beneficiary ID *"
              value={formData.beneficiary_id}
              onChange={(e) => setFormData({ ...formData, beneficiary_id: e.target.value })}
              required
            />
            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Father/Husband Name"
              value={formData.father_husband_name}
              onChange={(e) => setFormData({ ...formData, father_husband_name: e.target.value })}
            />
            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { value: '', label: 'Select Gender' },
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input
              label="Age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Village"
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
            />
            <Input
              label="Block"
              value={formData.block}
              onChange={(e) => setFormData({ ...formData, block: e.target.value })}
            />
            <Input
              label="District"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: '', label: 'Select Category' },
                { value: 'General', label: 'General' },
                { value: 'OBC', label: 'OBC' },
                { value: 'SC', label: 'SC' },
                { value: 'ST', label: 'ST' },
              ]}
            />
            <Input
              label="Occupation"
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
            />
            <Input
              label="Grant Amount"
              type="number"
              value={formData.grant_amount_received}
              onChange={(e) => setFormData({ ...formData, grant_amount_received: e.target.value })}
            />
            <div className="col-span-1 sm:col-span-2">
              <Input
                label="Grant Purpose"
                value={formData.grant_purpose}
                onChange={(e) => setFormData({ ...formData, grant_purpose: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.bpl_status}
                onChange={(e) => setFormData({ ...formData, bpl_status: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm">BPL Status</label>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={resetForm} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Adding...' : 'Add Beneficiary'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectBeneficiariesPage;
