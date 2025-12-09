import React, { useState, useEffect } from 'react';
import { Target, MapPin, Users, Calendar, UserPlus } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Beneficiary, PaginatedResponse } from '../../types';
import { Card, Button, Badge, Modal, Input } from '../../components/ui';

interface MyAssignment {
  id: number;
  project: number;
  project_code: string;
  project_title: string;
  project_sector: string;
  client_name: string;
  status: string;
  status_display: string;
  start_date: string;
  end_date: string;
  assigned_districts: string;
  assigned_villages: string;
  target_interviews: number;
  completed_interviews: number;
  completion_percentage: number;
  instructions: string;
  pending_beneficiaries: number;
}

export const MyAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<MyAssignment[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    loadAssignments();
  }, [statusFilter]);

  const loadAssignments = async () => {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const data = await api.get<MyAssignment[]>(`${endpoints.assignments}my_assignments/${query}`);
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
    setLoading(false);
  };

  const loadBeneficiaries = async (assignmentId: number) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) return;
      
      const data = await api.get<PaginatedResponse<Beneficiary>>(
        `${endpoints.beneficiaries}?project=${assignment.project}&is_sampled=true&is_interviewed=false`
      );
      setBeneficiaries(data.results || []);
      setSelectedAssignment(assignmentId);
      setShowBeneficiaryModal(true);
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
    }
  };

  const handleManualAssign = async () => {
    if (!selectedAssignment || selectedBeneficiaries.length === 0) return;
    
    try {
      await api.post(`${endpoints.assignments}${selectedAssignment}/assign_beneficiaries/`, {
        beneficiary_ids: selectedBeneficiaries
      });
      setShowBeneficiaryModal(false);
      setSelectedBeneficiaries([]);
      loadAssignments();
    } catch (error) {
      console.error('Error assigning beneficiaries:', error);
    }
  };

  const handleAutoAssign = async (assignmentId: number) => {
    try {
      await api.post(`${endpoints.assignments}${assignmentId}/auto_assign_beneficiaries/`, {});
      loadAssignments();
    } catch (error) {
      console.error('Error auto-assigning beneficiaries:', error);
    }
  };

  const toggleBeneficiary = (id: number) => {
    setSelectedBeneficiaries(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
          <p className="text-gray-500 mt-1">View and manage your field assignments</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No assignments found</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{assignment.project_code}</h3>
                    <Badge variant={assignment.status === 'active' ? 'success' : 'default'}>
                      {assignment.status_display}
                    </Badge>
                  </div>
                  <p className="text-gray-600">{assignment.project_title}</p>
                  <p className="text-sm text-gray-500">{assignment.client_name} • {assignment.project_sector}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-600">{assignment.completion_percentage}%</p>
                  <p className="text-sm text-gray-500">Complete</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Target</p>
                    <p className="font-semibold">{assignment.target_interviews}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="font-semibold">{assignment.completed_interviews}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Duration</p>
                    <p className="font-semibold text-sm">{assignment.start_date} to {assignment.end_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="font-semibold">{assignment.pending_beneficiaries}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-600 h-3 rounded-full transition-all" 
                    style={{ width: `${assignment.completion_percentage}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Assigned Areas</p>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Districts:</span> {assignment.assigned_districts}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Villages:</span> {assignment.assigned_villages}
                </p>
              </div>

              {assignment.instructions && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">Instructions</p>
                  <p className="text-sm text-blue-700">{assignment.instructions}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => loadBeneficiaries(assignment.id)}
                >
                  <UserPlus className="w-4 h-4" /> Assign Beneficiaries
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => handleAutoAssign(assignment.id)}
                >
                  Auto-Assign
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={showBeneficiaryModal}
        onClose={() => {
          setShowBeneficiaryModal(false);
          setSelectedBeneficiaries([]);
        }}
        title="Assign Beneficiaries"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select beneficiaries to assign to this assignment
          </p>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {beneficiaries.map((beneficiary) => (
              <label
                key={beneficiary.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedBeneficiaries.includes(beneficiary.id)}
                  onChange={() => toggleBeneficiary(beneficiary.id)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div className="flex-1">
                  <p className="font-medium">{beneficiary.name}</p>
                  <p className="text-sm text-gray-500">
                    {beneficiary.village}, {beneficiary.district}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowBeneficiaryModal(false);
                setSelectedBeneficiaries([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualAssign}
              disabled={selectedBeneficiaries.length === 0}
            >
              Assign {selectedBeneficiaries.length} Beneficiaries
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MyAssignmentsPage;
