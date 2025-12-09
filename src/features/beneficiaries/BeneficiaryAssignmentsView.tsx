import React, { useState, useEffect } from 'react';
import { Calendar, User, MapPin, Phone, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Badge, Modal, Input, Select } from '../../components/ui';

interface BeneficiaryAssignment {
  id: number;
  assignment: number;
  beneficiary: number;
  beneficiary_name: string;
  beneficiary_id: string;
  beneficiary_phone: string;
  beneficiary_village: string;
  beneficiary_district: string;
  resource_name: string;
  status: string;
  status_display: string;
  scheduled_date: string | null;
  completed_date: string | null;
  attempts: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const BeneficiaryAssignmentsView: React.FC = () => {
  const [assignments, setAssignments] = useState<BeneficiaryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<BeneficiaryAssignment | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [statusForm, setStatusForm] = useState({
    status: '',
    notes: '',
  });

  useEffect(() => {
    loadAssignments();
  }, [statusFilter]);

  const loadAssignments = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      const query = params.toString();
      
      const data = await api.get<{ results: BeneficiaryAssignment[] }>(
        `${endpoints.beneficiaryAssignments}${query ? `?${query}` : ''}`
      );
      setAssignments(data.results || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async () => {
    if (!selectedAssignment) return;
    
    try {
      await api.post(`${endpoints.beneficiaryAssignments}${selectedAssignment.id}/update_status/`, statusForm);
      setShowStatusModal(false);
      setStatusForm({ status: '', notes: '' });
      loadAssignments();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openStatusModal = (assignment: BeneficiaryAssignment) => {
    setSelectedAssignment(assignment);
    setStatusForm({ status: assignment.status, notes: assignment.notes });
    setShowStatusModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger'; icon: any }> = {
      pending: { variant: 'warning', icon: Clock },
      in_progress: { variant: 'default', icon: RefreshCw },
      completed: { variant: 'success', icon: CheckCircle },
      unable_to_contact: { variant: 'danger', icon: XCircle },
      refused: { variant: 'danger', icon: XCircle },
      rescheduled: { variant: 'warning', icon: Calendar },
    };
    const config = variants[status] || { variant: 'default' as const, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const filteredAssignments = assignments.filter(a => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.beneficiary_name.toLowerCase().includes(term) ||
        a.beneficiary_id.toLowerCase().includes(term) ||
        a.beneficiary_village.toLowerCase().includes(term) ||
        a.resource_name.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Beneficiary Assignments</h2>
          <p className="text-sm text-gray-500">Track individual beneficiary interview assignments</p>
        </div>
        <Button variant="secondary" onClick={loadAssignments}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <User className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-amber-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold">{stats.in_progress}</p>
            </div>
            <RefreshCw className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">{stats.completed}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-emerald-500 opacity-50" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search by name, ID, village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="unable_to_contact">Unable to Contact</option>
            <option value="refused">Refused</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No assignments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{assignment.beneficiary_name}</h4>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <User className="w-4 h-4" />
                        {assignment.beneficiary_id}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {assignment.beneficiary_phone || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {assignment.beneficiary_village}, {assignment.beneficiary_district}
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {assignment.scheduled_date || 'Not scheduled'}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Resource:</span>{' '}
                      <span className="font-medium">{assignment.resource_name}</span>
                      <span className="text-gray-500 ml-4">Attempts:</span>{' '}
                      <span className="font-medium">{assignment.attempts}</span>
                    </div>
                    {assignment.notes && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                        {assignment.notes}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openStatusModal(assignment)}>
                    Update Status
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Assignment Status"
      >
        {selectedAssignment && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-medium">{selectedAssignment.beneficiary_name}</p>
              <p className="text-sm text-gray-500">{selectedAssignment.beneficiary_id}</p>
            </div>

            <Select
              label="Status"
              name="status"
              value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'unable_to_contact', label: 'Unable to Contact' },
                { value: 'refused', label: 'Refused' },
                { value: 'rescheduled', label: 'Rescheduled' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={statusForm.notes}
                onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                rows={4}
                placeholder="Add notes about this assignment..."
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowStatusModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus}>
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BeneficiaryAssignmentsView;
