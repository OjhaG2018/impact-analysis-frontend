import React, { useState, useEffect } from 'react';
import { Plus, Search, Download, Edit, Eye, Trash2, Building2, Users } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Project, PaginatedResponse, ProjectStatus, ProjectSector } from '../../types';
import { Card, Button, Input, Select, Modal, Badge, ProgressBar, DataTable, Textarea } from '../../components/ui';

import ClientsPage from './ClientsPage';
import ProjectBeneficiariesPage from './ProjectBeneficiariesPage';

const ProjectsPage: React.FC = () => {
  const [view, setView] = useState<'projects' | 'clients' | 'beneficiaries'>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Filter state
  const [filters, setFilters] = useState({
    sector: '',
    status: '',
  });
  
  // Form state
  const [formData, setFormData] = useState({
    id: null as number | null,
    client: '',
    code: '',
    title: '',
    description: '',
    objectives: '',
    sector: 'education' as ProjectSector,
    status: 'draft' as ProjectStatus,
    states: '',
    districts: '',
    total_beneficiaries: '',
    sample_percentage: '15',
    beneficiary_type: '',
    grant_start_date: '',
    grant_end_date: '',
    assessment_start_date: '',
    assessment_end_date: '',
    grant_amount: '',
    assessment_budget: '',
  });

  // Sector options
  const sectorOptions = [
    { value: 'education', label: 'Education' },
    { value: 'health', label: 'Health' },
    { value: 'livelihood', label: 'Livelihood' },
    { value: 'agriculture', label: 'Agriculture' },
    { value: 'nutrition', label: 'Nutrition' },
    { value: 'water_sanitation', label: 'Water & Sanitation' },
    { value: 'housing', label: 'Housing' },
    { value: 'skills_training', label: 'Skills Training' },
    { value: 'women_empowerment', label: 'Women Empowerment' },
    { value: 'child_welfare', label: 'Child Welfare' },
    { value: 'other', label: 'Other' },
  ];

  // Status options
  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'planning', label: 'Planning' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'data_collection', label: 'Data Collection' },
    { value: 'analysis', label: 'Analysis' },
    { value: 'reporting', label: 'Reporting' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
  ];

  useEffect(() => {
    loadProjects();
    loadClients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [projects, searchTerm, filters]);

  const loadProjects = async () => {
    try {
      const data = await api.get<PaginatedResponse<Project> | Project[]>(endpoints.projects);
      const projectList = Array.isArray(data) ? data : data.results;
      setProjects(projectList);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    setLoading(false);
  };

  const loadClients = async () => {
    try {
      const data = await api.get<{ results: any[] }>(endpoints.clients);
      setClients(data.results || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...projects];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sector filter
    if (filters.sector) {
      filtered = filtered.filter(p => p.sector === filters.sector);
    }
    
    // Status filter
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    setFilteredProjects(filtered);
  };

  const clearFilters = () => {
    setFilters({ sector: '', status: '' });
    setSearchTerm('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      id: null,
      client: '',
      code: '',
      title: '',
      description: '',
      objectives: '',
      sector: 'education',
      status: 'draft',
      states: '',
      districts: '',
      total_beneficiaries: '',
      sample_percentage: '15',
      beneficiary_type: '',
      grant_start_date: '',
      grant_end_date: '',
      assessment_start_date: '',
      assessment_end_date: '',
      grant_amount: '',
      assessment_budget: '',
    });
    setIsEditMode(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const total = parseInt(formData.total_beneficiaries) || 0;
      const percentage = parseInt(formData.sample_percentage) || 15;
      const sample_size = Math.ceil((total * percentage) / 100);

      const payload: any = {
        code: formData.code,
        title: formData.title,
        client: formData.client ? parseInt(formData.client) : undefined,
        sector: formData.sector,
        status: formData.status,
        total_beneficiaries: total,
        sample_size: sample_size,
        sample_percentage: percentage,
      };

      // Add optional fields if provided
      if (formData.description) payload.description = formData.description;
      if (formData.objectives) payload.objectives = formData.objectives;
      if (formData.states) payload.states = formData.states;
      if (formData.districts) payload.districts = formData.districts;
      if (formData.beneficiary_type) payload.beneficiary_type = formData.beneficiary_type;
      if (formData.grant_start_date) payload.grant_start_date = formData.grant_start_date;
      if (formData.grant_end_date) payload.grant_end_date = formData.grant_end_date;
      if (formData.assessment_start_date) payload.assessment_start_date = formData.assessment_start_date;
      if (formData.assessment_end_date) payload.assessment_end_date = formData.assessment_end_date;
      if (formData.grant_amount) payload.grant_amount = parseFloat(formData.grant_amount);
      if (formData.assessment_budget) payload.assessment_budget = parseFloat(formData.assessment_budget);

      if (isEditMode && formData.id) {
        // Update existing project
        await api.patch(`${endpoints.projects}${formData.id}/`, payload);
      } else {
        // Create new project
        await api.post(endpoints.projects, payload);
      }
      
      resetForm();
      setShowCreateModal(false);
      loadProjects();
    } catch (err: any) {
      console.error('Error saving project:', err);
      const errorMessage = err.response?.data?.detail 
        || err.response?.data?.error 
        || Object.values(err.response?.data || {}).flat().join(', ')
        || err.message 
        || 'Failed to save project';
      setError(errorMessage);
    }
    setSubmitting(false);
  };

  const handleEdit = (project: Project) => {
    setFormData({
      id: project.id,
      client: project.client?.toString() || '',
      code: project.code || '',
      title: project.title || '',
      description: project.description || '',
      objectives: project.objectives || '',
      sector: (project.sector || 'education') as ProjectSector,
      status: (project.status || 'draft') as ProjectStatus,
      states: project.states || '',
      districts: project.districts || '',
      total_beneficiaries: project.total_beneficiaries?.toString() || '',
      sample_percentage: project.sample_percentage?.toString() || '15',
      beneficiary_type: project.beneficiary_type || '',
      grant_start_date: project.grant_start_date || '',
      grant_end_date: project.grant_end_date || '',
      assessment_start_date: project.assessment_start_date || '',
      assessment_end_date: project.assessment_end_date || '',
      grant_amount: project.grant_amount?.toString() || '',
      assessment_budget: project.assessment_budget?.toString() || '',
    });
    setIsEditMode(true);
    setShowCreateModal(true);
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Are you sure you want to delete project "${project.title}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    try {
      await api.delete(`${endpoints.projects}${project.id}/`);
      loadProjects();
    } catch (error) {
      alert('Failed to delete project');
      console.error('Error deleting project:', error);
    }
  };

  const handleExport = () => {
    const headers = ['Code', 'Title', 'Sector', 'Status', 'Total Beneficiaries', 'Sample Size', 'Progress'];
    const rows = filteredProjects.map(p => [
      p.code,
      p.title,
      p.sector_display || p.sector,
      p.status_display || p.status,
      p.total_beneficiaries,
      p.sample_size,
      `${p.completion_percentage || 0}%`
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: ProjectStatus): React.ReactNode => {
    const variants: Record<ProjectStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
      draft: 'default',
      planning: 'info',
      in_progress: 'warning',
      data_collection: 'info',
      analysis: 'info',
      reporting: 'info',
      completed: 'success',
      on_hold: 'danger'
    };
    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  const columns = [
    { key: 'code' as const, label: 'Code' },
    { key: 'title' as const, label: 'Project Title' },
    { key: 'client_name' as const, label: 'Client' },
    { key: 'sector_display' as const, label: 'Sector' },
    { 
      key: 'status' as const, 
      label: 'Status',
      render: (val: unknown) => getStatusBadge(val as ProjectStatus)
    },
    { 
      key: 'completion_percentage' as const, 
      label: 'Progress',
      render: (val: unknown) => (
        <div className="w-24">
          <ProgressBar value={(val as number) || 0} max={100} />
          <span className="text-xs text-gray-500">{(val || 0).toString()}%</span>
        </div>
      )
    },
    { key: 'sample_size' as const, label: 'Sample Size' },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (_: unknown, row: Project) => (
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedProject(row);
              setShowViewModal(true);
            }}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEdit(row)}
            className="text-emerald-600 hover:text-emerald-800 p-1"
            title="Edit Project"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete Project"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (view === 'clients') {
    return <ClientsPage onBack={() => setView('projects')} />;
  }

  if (view === 'beneficiaries') {
    return <ProjectBeneficiariesPage onBack={() => setView('projects')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Manage impact assessment projects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('clients')}>
            <Building2 className="w-4 h-4" /> Clients
          </Button>
          <Button variant="outline" onClick={() => setView('beneficiaries')}>
            <Users className="w-4 h-4" /> Beneficiaries
          </Button>
          <Button onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}>
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select
            name="sector"
            value={filters.sector}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Sectors' },
              ...sectorOptions
            ]}
            className="w-48"
          />
          
          <Select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={[
              { value: '', label: 'All Statuses' },
              ...statusOptions
            ]}
            className="w-48"
          />
          
          {(filters.sector || filters.status || searchTerm) && (
            <Button variant="secondary" onClick={clearFilters}>
              Clear
            </Button>
          )}
          
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </Card>

      {/* Projects Table */}
      <Card className="p-4">
        <DataTable columns={columns} data={filteredProjects} loading={loading} />
      </Card>

      {/* View Project Modal */}
      {selectedProject && showViewModal && (
        <Modal isOpen={showViewModal} onClose={() => {
          setShowViewModal(false);
          setSelectedProject(null);
        }} title="Project Details">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Project Code</label>
                <p className="font-medium">{selectedProject.code}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <div className="mt-1">{getStatusBadge(selectedProject.status)}</div>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-500">Title</label>
              <p className="font-medium">{selectedProject.title}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Sector</label>
                <p className="font-medium">{selectedProject.sector_display || selectedProject.sector}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Client</label>
                <p className="font-medium">{selectedProject.client_name || 'N/A'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Total Beneficiaries</label>
                <p className="font-medium">{selectedProject.total_beneficiaries}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Sample Size</label>
                <p className="font-medium">{selectedProject.sample_size}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-500">Progress</label>
              <div className="mt-2">
                <ProgressBar value={selectedProject.completion_percentage || 0} max={100} />
                <p className="text-sm text-gray-600 mt-1">
                  {selectedProject.completion_percentage || 0}% completed
                </p>
              </div>
            </div>

            {selectedProject.description && (
              <div>
                <label className="text-sm text-gray-500">Description</label>
                <p className="text-gray-700 mt-1">{selectedProject.description}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => {
                setShowViewModal(false);
                setSelectedProject(null);
              }}>
                Close
              </Button>
              <Button onClick={() => {
                setShowViewModal(false);
                handleEdit(selectedProject);
              }}>
                <Edit className="w-4 h-4" /> Edit Project
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create/Edit Project Modal */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }} 
        title={isEditMode ? "Edit Project" : "Create New Project"}
      >
        <form className="space-y-6 max-h-[70vh] overflow-y-auto pr-2" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
            
            <Select 
              label="Client"
              name="client"
              value={formData.client}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Select Client (Optional)' },
                ...clients.map(c => ({ value: c.id.toString(), label: c.name }))
              ]}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Project Code *" 
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="e.g., EDU-2025-001" 
                required 
                disabled={isEditMode}
              />
              <Input 
                label="Title *" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Project title" 
                required 
              />
            </div>
            
            <Textarea 
              label="Description" 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Brief description of the project"
              rows={2}
            />
            
            <Textarea 
              label="Objectives" 
              name="objectives"
              value={formData.objectives}
              onChange={handleInputChange}
              placeholder="Project objectives and goals"
              rows={2}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Select 
                label="Sector *"
                name="sector"
                value={formData.sector}
                onChange={handleInputChange}
                options={sectorOptions}
              />
              <Select 
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                options={statusOptions}
              />
            </div>
          </div>

          {/* Geographic Coverage */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Geographic Coverage</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="States" 
                name="states"
                value={formData.states}
                onChange={handleInputChange}
                placeholder="e.g., Bihar, Jharkhand"
              />
              <Input 
                label="Districts" 
                name="districts"
                value={formData.districts}
                onChange={handleInputChange}
                placeholder="e.g., Patna, Gaya, Ranchi"
              />
            </div>
          </div>

          {/* Beneficiary Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Beneficiary Details</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <Input 
                label="Total Beneficiaries *" 
                name="total_beneficiaries"
                type="number" 
                value={formData.total_beneficiaries}
                onChange={handleInputChange}
                placeholder="100" 
                required
                min="1"
              />
              <Input 
                label="Sample Size (%)*" 
                name="sample_percentage"
                type="number" 
                value={formData.sample_percentage}
                onChange={handleInputChange}
                placeholder="15" 
                min="10"
                max="100"
                required
              />
              <Input 
                label="Beneficiary Type" 
                name="beneficiary_type"
                value={formData.beneficiary_type}
                onChange={handleInputChange}
                placeholder="e.g., Students, Farmers"
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
              Sample Size: {Math.ceil((parseInt(formData.total_beneficiaries) || 0) * (parseInt(formData.sample_percentage) || 15) / 100)} interviews will be conducted
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Timeline</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Grant Start Date" 
                name="grant_start_date"
                type="date"
                value={formData.grant_start_date}
                onChange={handleInputChange}
              />
              <Input 
                label="Grant End Date" 
                name="grant_end_date"
                type="date"
                value={formData.grant_end_date}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Assessment Start Date" 
                name="assessment_start_date"
                type="date"
                value={formData.assessment_start_date}
                onChange={handleInputChange}
              />
              <Input 
                label="Assessment End Date" 
                name="assessment_end_date"
                type="date"
                value={formData.assessment_end_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 border-b pb-2">Budget</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Input 
                label="Grant Amount (₹)" 
                name="grant_amount"
                type="number"
                value={formData.grant_amount}
                onChange={handleInputChange}
                placeholder="1000000"
                min="0"
              />
              <Input 
                label="Assessment Budget (₹)" 
                name="assessment_budget"
                type="number"
                value={formData.assessment_budget}
                onChange={handleInputChange}
                placeholder="100000"
                min="0"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Project' : 'Create Project')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
