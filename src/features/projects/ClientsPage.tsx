import React, { useState, useEffect } from 'react';
import { Plus, Building2, Edit, Trash2, ArrowLeft } from 'lucide-react';
import api, { endpoints } from '../../api';
import { Card, Button, Input, Modal, DataTable } from '../../components/ui';

interface Client {
  id: number;
  name: string;
  organization_type: string;
  description: string;
  logo: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  project_count: number;
}

interface ClientsPageProps {
  onBack?: () => void;
}

const ClientsPage: React.FC<ClientsPageProps> = ({ onBack }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    organization_type: 'NGO',
    description: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    website: '',
    is_active: true,
  });

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await api.get<{ results: Client[] }>(endpoints.clients);
      setClients(data.results || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        await api.put(`${endpoints.clients}${editingId}/`, formData);
      } else {
        await api.post(endpoints.clients, formData);
      }
      
      resetForm();
      loadClients();
    } catch (error) {
      alert('Failed to save client');
    }
    setSubmitting(false);
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      organization_type: client.organization_type,
      description: client.description || '',
      contact_person: client.contact_person,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || 'India',
      website: client.website || '',
      is_active: client.is_active,
    });
    setEditingId(client.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this client?')) return;
    
    try {
      await api.delete(`${endpoints.clients}${id}/`);
      loadClients();
    } catch (error) {
      alert('Failed to delete client');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      organization_type: 'NGO',
      description: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      website: '',
      is_active: true,
    });
    setEditingId(null);
    setShowModal(false);
  };

  const columns = [
    { 
      key: 'name' as const, 
      label: 'Client Name',
      render: (_: unknown, row: Client) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-gray-500">{row.organization_type}</p>
          </div>
        </div>
      )
    },
    { 
      key: 'contact_person' as const, 
      label: 'Contact Person',
      render: (_: unknown, row: Client) => (
        <div>
          <p className="font-medium">{row.contact_person}</p>
          <p className="text-sm text-gray-500">{row.contact_email}</p>
          <p className="text-sm text-gray-500">{row.contact_phone}</p>
        </div>
      )
    },
    { 
      key: 'city' as const, 
      label: 'Location',
      render: (_: unknown, row: Client) => (
        <div className="text-sm">
          <p>{row.city}, {row.state}</p>
          <p className="text-gray-500">{row.country}</p>
        </div>
      )
    },
    { key: 'project_count' as const, label: 'Projects' },
    {
      key: 'id' as const,
      label: 'Actions',
      render: (_: unknown, row: Client) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row)}>
            <Edit className="w-4 h-4" />
          </Button>
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
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">Manage client organizations</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="flex-shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Client</span>
        </Button>
      </div>

      <Card className="p-2 sm:p-4 overflow-x-auto">
        <DataTable columns={columns} data={clients} loading={loading} />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingId ? 'Edit Client' : 'Add Client'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Organization Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Organization Type"
              value={formData.organization_type}
              onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
              placeholder="e.g., NGO, Foundation"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Person *"
              value={formData.contact_person}
              onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              required
            />
            <Input
              label="Contact Email *"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Phone *"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              required
            />
            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button variant="secondary" type="button" onClick={resetForm} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'} Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
