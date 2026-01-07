import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, UserCheck, Clock, DollarSign, Eye, Edit, Trash2, Search, RefreshCw } from 'lucide-react';
import api, { endpoints } from '../../api';
import { User } from '../../types';
import { Card, Button, Input, Modal, Badge, Select, LoadingSpinner } from '../../components/ui';
import ResourceAssignmentsPage from './ResourceAssignmentsPage';
import AttendancePage from './AttendancePage';
import ExpensesPage from './ExpensesPage';

export const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'resources' | 'assignments' | 'attendance' | 'expenses'>('resources');
  const [resources, setResources] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone: '',
    city: '',
    state: '',
    languages_known: '',
    experience_years: '',
    daily_rate: '',
    education: '',
    is_available: true,
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setLoading(true);
    try {
      const data = await api.get<User[] | { results: User[] }>(endpoints.fieldResources);
      const resourceList = Array.isArray(data) ? data : (data.results || []);
      setResources(resourceList);
    } catch (error) {
      console.error('Error loading resources:', error);
      setError('Failed to load resources');
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: 'field_resource',
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        languages_known: formData.languages_known,
        experience_years: parseInt(formData.experience_years) || 0,
        daily_rate: parseFloat(formData.daily_rate) || null,
        education: formData.education,
        is_available: formData.is_available,
      };

      await api.post(endpoints.users, payload);
      
      // Reset form and close modal
      setFormData({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        first_name: '',
        last_name: '',
        phone: '',
        city: '',
        state: '',
        languages_known: '',
        experience_years: '',
        daily_rate: '',
        education: '',
        is_available: true,
      });
      setShowModal(false);
      setSuccess('Resource added successfully!');
      
      // Reload resources
      loadResources();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail 
        || Object.values(err.response?.data || {}).flat().join(', ')
        || err.message 
        || 'Failed to create resource';
      setError(errorMsg);
    }
    setSubmitting(false);
  };

  const handleDelete = async (resource: User) => {
    try {
      await api.delete(`${endpoints.users}${resource.id}/`);
      setSuccess('Resource deleted successfully!');
      setDeleteConfirm(null);
      loadResources();
    } catch (err) {
      setError('Failed to delete resource');
    }
  };

  const getFullName = (resource: User): string => {
    const name = `${resource.first_name || ''} ${resource.last_name || ''}`.trim();
    return name || resource.username || 'Unknown';
  };

  const getInitials = (resource: User): string => {
    if (resource.first_name && resource.last_name) {
      return `${resource.first_name[0]}${resource.last_name[0]}`.toUpperCase();
    }
    return (resource.username?.[0] || resource.email?.[0] || 'U').toUpperCase();
  };

  // Filter resources
  const filteredResources = resources.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.first_name?.toLowerCase().includes(term) ||
      r.last_name?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.username?.toLowerCase().includes(term) ||
      r.phone?.toLowerCase().includes(term) ||
      r.city?.toLowerCase().includes(term)
    );
  });

  const availableCount = resources.filter(r => r.is_available).length;
  const occupiedCount = resources.filter(r => !r.is_available).length;

  // View switch handlers
  if (view === 'assignments') {
    return <ResourceAssignmentsPage onBack={() => setView('resources')} />;
  }

  if (view === 'attendance') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="text-gray-500 mt-1">Track field resource attendance</p>
          </div>
          <Button variant="outline" onClick={() => setView('resources')}>
            Back to Resources
          </Button>
        </div>
        <AttendancePage />
      </div>
    );
  }

  if (view === 'expenses') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 mt-1">Manage field resource expenses</p>
          </div>
          <Button variant="outline" onClick={() => setView('resources')}>
            Back to Resources
          </Button>
        </div>
        <ExpensesPage />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Resources</h1>
          <p className="text-gray-500 mt-1">Manage interviewers and field staff</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setView('assignments')} className="flex-shrink-0">
            <span className="hidden sm:inline">Assignments</span>
            <span className="sm:hidden">Assign</span>
          </Button>
          <Button variant="outline" onClick={() => setView('attendance')} className="flex-shrink-0">
            <Clock className="w-4 h-4" /> <span className="hidden sm:inline">Attendance</span>
          </Button>
          <Button variant="outline" onClick={() => setView('expenses')} className="flex-shrink-0">
            <DollarSign className="w-4 h-4" /> <span className="hidden sm:inline">Expenses</span>
          </Button>
          <Button onClick={() => setShowModal(true)} className="flex-shrink-0">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Resource</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{resources.length}</p>
              <p className="text-sm text-gray-500">Total Resources</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{availableCount}</p>
              <p className="text-sm text-gray-500">Available</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{occupiedCount}</p>
              <p className="text-sm text-gray-500">On Assignment</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <Button variant="secondary" onClick={loadResources} className="flex-shrink-0">
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </Card>

      {/* Resources Table */}
      <Card className="p-2 sm:p-4 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No resources found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm ? 'Try a different search term' : 'Get started by adding a field resource'}
            </p>
            {!searchTerm && (
              <Button className="mt-4" onClick={() => setShowModal(true)}>
                <Plus className="w-4 h-4" /> Add Resource
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600">Name</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden sm:table-cell">Phone</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden lg:table-cell">Location</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden lg:table-cell">Languages</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">Experience</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((resource) => (
                  <tr key={resource.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-4">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-emerald-700 font-semibold text-xs sm:text-sm">
                            {getInitials(resource)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/resources/${resource.id}`)}
                            className="font-medium text-gray-900 hover:text-indigo-600 text-sm sm:text-base truncate block"
                          >
                            {getFullName(resource)}
                          </button>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">{resource.email}</p>
                          <div className="sm:hidden text-xs text-gray-500 mt-1">
                            {resource.phone && <div>{resource.phone}</div>}
                            {resource.city && <div>{resource.city}{resource.state ? `, ${resource.state}` : ''}</div>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-4 text-gray-600 text-sm hidden sm:table-cell">{resource.phone || '-'}</td>
                    <td className="px-2 sm:px-4 py-4 text-gray-600 text-sm hidden lg:table-cell">
                      {resource.city ? `${resource.city}${resource.state ? `, ${resource.state}` : ''}` : '-'}
                    </td>
                    <td className="px-2 sm:px-4 py-4 text-gray-600 text-sm hidden lg:table-cell">{resource.languages_known || '-'}</td>
                    <td className="px-2 sm:px-4 py-4">
                      <Badge variant={resource.is_available ? 'success' : 'warning'}>
                        <span className="hidden sm:inline text-xs">{resource.is_available ? 'Available' : 'Occupied'}</span>
                        <span className="sm:hidden text-xs">{resource.is_available ? 'Avail' : 'Busy'}</span>
                      </Badge>
                    </td>
                    <td className="px-2 sm:px-4 py-4 text-gray-600 text-sm hidden md:table-cell">{resource.experience_years || 0} yrs</td>
                    <td className="px-2 sm:px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/resources/${resource.id}`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/resources/${resource.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(resource)}
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

      {/* Add Resource Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Field Resource" size="lg">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="First Name" 
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              required 
            />
            <Input 
              label="Last Name" 
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Username" 
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required 
              placeholder="e.g., john_doe"
            />
            <Input 
              label="Email" 
              name="email"
              type="email" 
              value={formData.email}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Password" 
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required 
              placeholder="Min 8 characters"
            />
            <Input 
              label="Confirm Password" 
              name="confirm_password"
              type="password"
              value={formData.confirm_password}
              onChange={handleInputChange}
              required 
              placeholder="Re-enter password"
            />
          </div>
          
          <Input 
            label="Phone" 
            name="phone"
            type="tel" 
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+91-9876543210"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="City" 
              name="city"
              value={formData.city}
              onChange={handleInputChange}
            />
            <Input 
              label="State" 
              name="state"
              value={formData.state}
              onChange={handleInputChange}
            />
          </div>
          
          <Input 
            label="Languages Known" 
            name="languages_known"
            value={formData.languages_known}
            onChange={handleInputChange}
            placeholder="Hindi, English, Marathi" 
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input 
              label="Experience (years)" 
              name="experience_years"
              type="number" 
              value={formData.experience_years}
              onChange={handleInputChange}
            />
            <Input 
              label="Daily Rate (₹)" 
              name="daily_rate"
              type="number" 
              value={formData.daily_rate}
              onChange={handleInputChange}
            />
          </div>
          
          <Select
            label="Education"
            name="education"
            value={formData.education}
            onChange={handleInputChange}
            options={[
              { value: '', label: 'Select Education' },
              { value: '10th Pass', label: '10th Pass' },
              { value: '12th Pass', label: '12th Pass' },
              { value: 'Graduate', label: 'Graduate' },
              { value: 'Post Graduate', label: 'Post Graduate' },
            ]}
          />
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_available"
              name="is_available"
              checked={formData.is_available}
              onChange={handleInputChange}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <label htmlFor="is_available" className="text-sm text-gray-700">
              Available for assignments
            </label>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => setShowModal(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Adding...' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Field Resource">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <Trash2 className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                Deleting this resource will remove their account and all associated data.
              </p>
            </div>
          </div>
          
          {deleteConfirm && (
            <p className="text-gray-600">
              Are you sure you want to delete <strong>"{getFullName(deleteConfirm)}"</strong>?
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
            >
              Delete Resource
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ResourcesPage;