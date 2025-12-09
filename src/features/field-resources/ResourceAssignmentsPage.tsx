import React, { useState, useEffect } from 'react';
import { Plus, Users, Target, CheckCircle, Calendar } from 'lucide-react';
import api, { endpoints } from '../../api';
import { ResourceAssignment, Project, User, PaginatedResponse } from '../../types';
import { Card, Button, Input, Modal, Badge, DataTable, Select } from '../../components/ui';

export const ResourceAssignmentsPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    project: '',
    resource: '',
    search: '',
  });

  const [formData, setFormData] = useState({
    project: '',
    resource: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    assigned_districts: '',
    assigned_villages: '',
    target_interviews: '',
    daily_rate: '',
    total_days: '',
    instructions: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsData, projectsData, resourcesData] = await Promise.all([
        api.get<PaginatedResponse<ResourceAssignment>>(endpoints.assignments),
        api.get<PaginatedResponse<Project>>(endpoints.projects),
        api.get<User[]>(endpoints.availableResources),
      ]);
      
      setAssignments(assignmentsData.results || []);
      setProjects(projectsData.results || []);
      setResources(resourcesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.project) params.append('project', filters.project);
    if (filters.resource) params.append('resource', filters.resource);
    if (filters.search) params.append('search', filters.search);
    return params.toString();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        project: parseInt(formData.project),
        resource: parseInt(formData.resource),
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date,
        assigned_districts: formData.assigned_districts,
        assigned_villages: formData.assigned_villages,
        target_interviews: parseInt(formData.target_interviews),
        daily_rate: formData.daily_rate,
        total_days: parseInt(formData.total_days),
        instructions: formData.instructions,
        notes: formData.notes,
      };

      if (editingId) {
        await api.put(`${endpoints.assignments}${editingId}/`, payload);
      } else {
        await api.post(endpoints.assignments, payload);
      }
      
      resetForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save assignment');
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setFormData({
      project: '',
      resource: '',
      status: 'pending',
      start_date: '',
      end_date: '',
      assigned_districts: '',
      assigned_villages: '',
      target_interviews: '',
      daily_rate: '',
      total_days: '',
      instructions: '',
      notes: '',
    });
    setEditingId(null);
    setShowModal(false);
    setError('');
  };

  const handleEdit = (assignment: ResourceAssignment) => {
    setFormData({
      project: assignment.project.toString(),
      resource: assignment.resource.toString(),
      status: assignment.status,
      start_date: assignment.start_date || '',
      end_date: assignment.end_date || '',
      assigned_districts: assignment.assigned_districts,
      assigned_villages: assignment.assigned_villages,
      target_interviews: assignment.target_interviews.toString(),
      daily_rate: assignment.daily_rate?.toString() || '',
      total_days: assignment.total_days.toString(),
      instructions: assignment.instructions,
      notes: assignment.notes,
    });
    setEditingId(assignment.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      await api.delete(`${endpoints.assignments}${id}/`);
      loadData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      pending: 'warning',
      active: 'success',
      completed: 'default',
      cancelled: 'danger',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const columns = [
    { 
      key: 'resource_name' as const, 
      label: 'Resource',
      render: (_: unknown, row: ResourceAssignment) => (
        <div>
          <p className="font-medium">{row.resource_name}</p>
          <p className="text-sm text-gray-500">{row.resource_phone}</p>
        </div>
      )
    },
    { 
      key: 'project_code' as const, 
      label: 'Project',
      render: (_: unknown, row: ResourceAssignment) => (
        <div>
          <p className="font-medium">{row.project_code}</p>
          <p className="text-sm text-gray-500">{row.project_title}</p>
        </div>
      )
    },
    { 
      key: 'status' as const, 
      label: 'Status',
      render: (val: unknown) => getStatusBadge(val as string)
    },
    { 
      key: 'target_interviews' as const, 
      label: 'Progress',
      render: (_: unknown, row: ResourceAssignment) => (
        <div>
          <p className="text-sm font-medium">{row.completed_interviews} / {row.target_interviews}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-emerald-600 h-2 rounded-full" 
              style={{ width: `${row.completion_percentage}%` }}
            />
          </div>
        </div>
      )
    },
    { 
      key: 'start_date' as const, 
      label: 'Duration',
      render: (_: unknown, row: ResourceAssignment) => (
        <div className="text-sm">
          <p>{row.start_date}</p>
          <p className="text-gray-500">to {row.end_date}</p>
        </div>
      )
    },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (_: unknown, row: ResourceAssignment) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)}>Delete</Button>
        </div>
      )
    },
  ];

  const stats = {
    total: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    pending: assignments.filter(a => a.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Assignments</h1>
          <p className="text-gray-500 mt-1">Manage field resource assignments and track progress</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back to Resources
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> New Assignment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <DataTable columns={columns} data={assignments} loading={loading} />
      </Card>

      <Modal 
        isOpen={showModal} 
        onClose={resetForm} 
        title={editingId ? 'Edit Assignment' : 'New Assignment'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Project"
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              required
              options={[
                { value: '', label: 'Select Project' },
                ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
              ]}
            />
            <Select
              label="Resource"
              name="resource"
              value={formData.resource}
              onChange={handleInputChange}
              required
              options={[
                { value: '', label: 'Select Resource' },
                ...resources.map(r => ({ value: r.id.toString(), label: `${r.first_name} ${r.last_name}` }))
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Input
              label="Target Interviews"
              name="target_interviews"
              type="number"
              value={formData.target_interviews}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
            />
            <Input
              label="End Date"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <Input
            label="Assigned Districts"
            name="assigned_districts"
            value={formData.assigned_districts}
            onChange={handleInputChange}
            placeholder="e.g., Madhubani, Darbhanga"
            required
          />

          <Input
            label="Assigned Villages"
            name="assigned_villages"
            value={formData.assigned_villages}
            onChange={handleInputChange}
            placeholder="e.g., Rampur, Sitapur, Gopalpur"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Daily Rate (₹)"
              name="daily_rate"
              type="number"
              value={formData.daily_rate}
              onChange={handleInputChange}
            />
            <Input
              label="Total Days"
              name="total_days"
              type="number"
              value={formData.total_days}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={3}
              placeholder="Assignment instructions for the field resource..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={2}
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={resetForm} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'} Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResourceAssignmentsPage;
