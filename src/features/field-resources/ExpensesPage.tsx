import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, CheckCircle, XCircle, Calendar, Filter } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Badge, Modal, Input, Select } from '../../components/ui';

interface Expense {
  id: number;
  assignment: number;
  resource_name: string;
  project_code: string;
  expense_type: string;
  expense_type_display: string;
  date: string;
  amount: string;
  description: string;
  receipt: string | null;
  is_approved: boolean;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  created_at: string;
}

interface Assignment {
  id: number;
  project_code: string;
  project_title: string;
  resource_name: string;
}

const EXPENSE_TYPES = [
  { value: 'travel', label: 'Travel' },
  { value: 'food', label: 'Food/Meals' },
  { value: 'communication', label: 'Communication' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'materials', label: 'Materials' },
  { value: 'other', label: 'Other' },
];

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  
  const [formData, setFormData] = useState({
    assignment: '',
    expense_type: '',
    date: '',
    amount: '',
    description: '',
  });

  useEffect(() => {
    loadExpenses();
    loadAssignments();
  }, [typeFilter, approvalFilter]);

  const loadExpenses = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('expense_type', typeFilter);
      if (approvalFilter) params.append('is_approved', approvalFilter);
      const query = params.toString();
      
      const data = await api.get<{ results: Expense[] }>(`${endpoints.expenses}${query ? `?${query}` : ''}`);
      setExpenses(data.results || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
    setLoading(false);
  };

  const loadAssignments = async () => {
    try {
      const data = await api.get<{ results: Assignment[] }>(endpoints.assignments);
      setAssignments(data.results || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        assignment: parseInt(formData.assignment),
        amount: formData.amount,
      };

      if (editingId) {
        await api.put(`${endpoints.expenses}${editingId}/`, payload);
      } else {
        await api.post(endpoints.expenses, payload);
      }
      
      resetForm();
      loadExpenses();
    } catch (error) {
      alert('Failed to save expense');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`${endpoints.expenses}${id}/approve/`, {});
      loadExpenses();
    } catch (error) {
      alert('Failed to approve expense');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    
    try {
      await api.delete(`${endpoints.expenses}${id}/`);
      loadExpenses();
    } catch (error) {
      alert('Failed to delete expense');
    }
  };

  const openEditModal = (expense: Expense) => {
    setFormData({
      assignment: expense.assignment?.toString() || '',
      expense_type: expense.expense_type || '',
      date: expense.date || '',
      amount: expense.amount || '',
      description: expense.description || '',
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ assignment: '', expense_type: '', date: '', amount: '', description: '' });
    setEditingId(null);
    setShowModal(false);
  };

  const stats = {
    total: expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
    approved: expenses.filter(e => e.is_approved).reduce((sum, e) => sum + parseFloat(e.amount), 0),
    pending: expenses.filter(e => !e.is_approved).reduce((sum, e) => sum + parseFloat(e.amount), 0),
    count: expenses.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold">₹{stats.total.toFixed(2)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-emerald-600">₹{stats.approved.toFixed(2)}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-emerald-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600">₹{stats.pending.toFixed(2)}</p>
            </div>
            <XCircle className="w-10 h-10 text-amber-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-2xl font-bold">{stats.count}</p>
            </div>
            <Calendar className="w-10 h-10 text-gray-500 opacity-50" />
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Types</option>
            {EXPENSE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="true">Approved</option>
            <option value="false">Pending</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Resource</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-4">{expense.date}</td>
                    <td className="px-4 py-4 font-medium">{expense.resource_name}</td>
                    <td className="px-4 py-4">{expense.project_code}</td>
                    <td className="px-4 py-4">
                      <Badge variant="default">{expense.expense_type_display}</Badge>
                    </td>
                    <td className="px-4 py-4 font-semibold">₹{expense.amount}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{expense.description}</td>
                    <td className="px-4 py-4">
                      {expense.is_approved ? (
                        <Badge variant="success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {!expense.is_approved && (
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(expense.id)}>
                            Approve
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(expense)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(expense.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? 'Edit Expense' : 'Add Expense'}
      >
        <div className="space-y-4">
          <Select
            label="Assignment"
            value={formData.assignment}
            onChange={(e) => setFormData({ ...formData, assignment: e.target.value })}
            options={[
              { value: '', label: 'Select Assignment' },
              ...assignments.map(a => ({ 
                value: a.id.toString(), 
                label: `${a.project_code} - ${a.resource_name}` 
              }))
            ]}
            required
          />
          <Select
            label="Expense Type"
            value={formData.expense_type}
            onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
            options={[
              { value: '', label: 'Select Type' },
              ...EXPENSE_TYPES
            ]}
            required
          />
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Amount (₹)"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg"
              rows={3}
              required
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingId ? 'Update' : 'Create'} Expense</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpensesPage;
