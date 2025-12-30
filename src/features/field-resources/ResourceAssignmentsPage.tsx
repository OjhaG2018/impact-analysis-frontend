import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Target, CheckCircle, Calendar, ArrowLeft, Search, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import api, { endpoints } from '../../api';
import { ResourceAssignment, Project, User, PaginatedResponse } from '../../types';
import { Card, Button, Input, Modal, Badge, Select, LoadingSpinner } from '../../components/ui';

export const ResourceAssignmentsPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<User[]>([]);
  const [allResources, setAllResources] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ResourceAssignment | null>(null);
  
  // Get initial filter from URL
  const initialResourceFilter = searchParams.get('resource') || '';
  
  const [filters, setFilters] = useState({
    status: '',
    project: '',
    resource: initialResourceFilter,
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

  useEffect(() => {
    // Update URL when resource filter changes
    if (filters.resource) {
      searchParams.set('resource', filters.resource);
    } else {
      searchParams.delete('resource');
    }
    setSearchParams(searchParams);
    
    loadAssignments();
  }, [filters.status, filters.project, filters.resource]);

  const loadData = async () => {
    try {
      const [projectsData, resourcesData, allResourcesData] = await Promise.all([
        api.get<PaginatedResponse<Project>>(endpoints.projects),
        api.get<User[]>(endpoints.availableResources),
        api.get<User[] | { results: User[] }>(endpoints.fieldResources),
      ]);
      
      setProjects(projectsData.results || []);
      setResources(resourcesData || []);
      const allRes = Array.isArray(allResourcesData) ? allResourcesData : (allResourcesData.results || []);
      setAllResources(allRes);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.project) params.append('project', filters.project);
      if (filters.resource) params.append('resource', filters.resource);
      
      const query = params.toString();
      const data = await api.get<PaginatedResponse<ResourceAssignment>>(
        `${endpoints.assignments}${query ? `?${query}` : ''}`
      );
      setAssignments(data.results || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
        daily_rate: formData.daily_rate || null,
        total_days: parseInt(formData.total_days),
        instructions: formData.instructions,
        notes: formData.notes,
      };

      if (editingId) {
        await api.put(`${endpoints.assignments}${editingId}/`, payload);
        setSuccess('Assignment updated successfully!');
      } else {
        await api.post(endpoints.assignments, payload);
        setSuccess('Assignment created successfully!');
      }
      
      resetForm();
      loadAssignments();
      loadData(); // Refresh available resources
    } catch (err: any) {
      const errorMsg = err.response?.data?.error 
        || err.response?.data?.detail 
        || Object.values(err.response?.data || {}).flat().join(', ')
        || err.message 
        || 'Failed to save assignment';
      setError(errorMsg);
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

  const handleDelete = async (assignment: ResourceAssignment) => {
    try {
      await api.delete(`${endpoints.assignments}${assignment.id}/`);
      setSuccess('Assignment deleted successfully!');
      setDeleteConfirm(null);
      loadAssignments();
    } catch (error) {
      setError('Failed to delete assignment');
      console.error('Error deleting assignment:', error);
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', project: '', resource: '', search: '' });
    searchParams.delete('resource');
    setSearchParams(searchParams);
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

  const getResourceName = (resourceId: string): string => {
    const resource = allResources.find(r => r.id.toString() === resourceId);
    if (resource) {
      return `${resource.first_name || ''} ${resource.last_name || ''}`.trim() || resource.username || 'Unknown';
    }
    return '';
  };

  // Filter assignments locally by search
  const filteredAssignments = assignments.filter(a => {
    if (!filters.search) return true;
    const term = filters.search.toLowerCase();
    return (
      a.resource_name?.toLowerCase().includes(term) ||
      a.project_code?.toLowerCase().includes(term) ||
      a.project_title?.toLowerCase().includes(term) ||
      a.assigned_districts?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: assignments.length,
    active: assignments.filter(a => a.status === 'active').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    pending: assignments.filter(a => a.status === 'pending').length,
  };

  // Get filtered resource name for header
  const filteredResourceName = filters.resource ? getResourceName(filters.resource) : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {(onBack || filters.resource) && (
              <button
                onClick={() => {
                  if (filters.resource) {
                    navigate(`/resources/${filters.resource}`);
                  } else if (onBack) {
                    onBack();
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {filteredResourceName ? `${filteredResourceName}'s Assignments` : 'Resource Assignments'}
              </h1>
              <p className="text-gray-500 mt-1">Manage field resource assignments and track progress</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {filters.resource && (
            <Button variant="outline" onClick={clearFilters}>
              View All Assignments
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> New Assignment
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleFilterChange('status', '')}>
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
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleFilterChange('status', 'active')}>
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
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleFilterChange('status', 'completed')}>
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
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleFilterChange('status', 'pending')}>
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

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by resource, project, district..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={filters.project}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
            ))}
          </select>

          <select
            value={filters.resource}
            onChange={(e) => handleFilterChange('resource', e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Resources</option>
            {allResources.map(r => (
              <option key={r.id} value={r.id}>
                {`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username}
              </option>
            ))}
          </select>

          <Button variant="secondary" onClick={loadAssignments}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>

          {(filters.status || filters.project || filters.resource || filters.search) && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      {/* Assignments Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
            <p className="text-gray-500 mt-1">
              {filters.resource ? 'This resource has no assignments yet.' : 'Get started by creating a new assignment'}
            </p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4" /> Create Assignment
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Resource</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Progress</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <button
                          onClick={() => navigate(`/resources/${assignment.resource}`)}
                          className="font-medium text-gray-900 hover:text-indigo-600"
                        >
                          {assignment.resource_name}
                        </button>
                        <p className="text-sm text-gray-500">{assignment.resource_phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <button
                          onClick={() => navigate(`/projects/${assignment.project}`)}
                          className="font-medium text-gray-900 hover:text-emerald-600"
                        >
                          {assignment.project_code}
                        </button>
                        <p className="text-sm text-gray-500">{assignment.project_title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(assignment.status)}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium">{assignment.completed_interviews} / {assignment.target_interviews}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full transition-all" 
                            style={{ width: `${assignment.completion_percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{assignment.completion_percentage}%</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p>{assignment.start_date}</p>
                        <p className="text-gray-500">to {assignment.end_date}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(assignment)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(assignment)}
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

      {/* Create/Edit Modal */}
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
              label="Project *"
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
              label="Resource *"
              name="resource"
              value={formData.resource}
              onChange={handleInputChange}
              required
              options={[
                { value: '', label: 'Select Resource' },
                ...resources.map(r => ({ 
                  value: r.id.toString(), 
                  label: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username 
                }))
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
              label="Target Interviews *"
              name="target_interviews"
              type="number"
              value={formData.target_interviews}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleInputChange}
              required
            />
            <Input
              label="End Date *"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleInputChange}
              required
            />
          </div>

          <Input
            label="Assigned Districts *"
            name="assigned_districts"
            value={formData.assigned_districts}
            onChange={handleInputChange}
            placeholder="e.g., Madhubani, Darbhanga"
            required
          />

          <Input
            label="Assigned Villages *"
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
              label="Total Days *"
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

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={resetForm} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'} Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Assignment">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <Trash2 className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                Deleting this assignment will remove all associated data.
              </p>
            </div>
          </div>
          
          {deleteConfirm && (
            <p className="text-gray-600">
              Are you sure you want to delete the assignment for <strong>"{deleteConfirm.resource_name}"</strong> on project <strong>"{deleteConfirm.project_code}"</strong>?
            </p>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResourceAssignmentsPage;