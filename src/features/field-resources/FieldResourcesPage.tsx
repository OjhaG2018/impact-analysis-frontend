import React, { useState, useEffect } from 'react';
import { Plus, Users, UserCheck, Clock, DollarSign } from 'lucide-react';
import api, { endpoints } from '../../api';
import { User } from '../../types';
import { Card, Button, Input, Modal, Badge, DataTable, Select } from '../../components/ui';
import ResourceAssignmentsPage from './ResourceAssignmentsPage';
import AttendancePage from './AttendancePage';
import ExpensesPage from './ExpensesPage';

// ============== RESOURCES PAGE ==============
export const ResourcesPage: React.FC = () => {
  const [view, setView] = useState<'resources' | 'assignments' | 'attendance' | 'expenses'>('resources');
  const [resources, setResources] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
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
    try {
      const data = await api.get<User[] | { results: User[] }>(endpoints.fieldResources);
      const resourceList = Array.isArray(data) ? data : (data.results || []);
      setResources(resourceList);
    } catch (error) {
      console.error('Error loading resources:', error);
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
      
      // Reload resources
      loadResources();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create resource');
    }
    setSubmitting(false);
  };

  const columns = [
    { 
      key: 'first_name' as const, 
      label: 'Name',
      render: (_: unknown, row: User) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
            <span className="text-emerald-700 font-semibold">
              {row.first_name?.[0] || row.username?.[0]}
            </span>
          </div>
          <div>
            <p className="font-medium">{row.first_name} {row.last_name}</p>
            <p className="text-sm text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'phone' as const, label: 'Phone' },
    { key: 'city' as const, label: 'Location' },
    { key: 'languages_known' as const, label: 'Languages' },
    { 
      key: 'is_available' as const, 
      label: 'Status',
      render: (val: unknown) => (
        <Badge variant={val ? 'success' : 'danger'}>
          {val ? 'Available' : 'Occupied'}
        </Badge>
      )
    },
    { key: 'experience_years' as const, label: 'Experience (yrs)' },
  ];

  const availableCount = resources.filter(r => r.is_available).length;
  const occupiedCount = resources.filter(r => !r.is_available).length;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Resources</h1>
          <p className="text-gray-500 mt-1">Manage interviewers and field staff</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setView('assignments')}>
            Assignments
          </Button>
          <Button variant="outline" onClick={() => setView('attendance')}>
            <Clock className="w-4 h-4" /> Attendance
          </Button>
          <Button variant="outline" onClick={() => setView('expenses')}>
            <DollarSign className="w-4 h-4" /> Expenses
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" /> Add Resource
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <Card className="p-4">
        <DataTable columns={columns} data={resources} loading={loading} />
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Field Resource">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Phone" 
              name="phone"
              type="tel" 
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+91-9876543210"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="grid grid-cols-2 gap-4">
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
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="secondary" 
              type="button" 
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResourcesPage;