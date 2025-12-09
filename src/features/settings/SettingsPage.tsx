import React from 'react';
import { Settings, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Input } from '../../components/ui';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card className="p-6 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4">Profile Information</h3>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" defaultValue={user?.first_name || ''} />
              <Input label="Last Name" defaultValue={user?.last_name || ''} />
            </div>
            <Input label="Email" type="email" defaultValue={user?.email || ''} />
            <Input label="Phone" type="tel" defaultValue={user?.phone || ''} />
            <Input label="Address" defaultValue={user?.address || ''} />
            <div className="grid grid-cols-3 gap-4">
              <Input label="City" defaultValue={user?.city || ''} />
              <Input label="State" defaultValue={user?.state || ''} />
              <Input label="Pincode" defaultValue={user?.pincode || ''} />
            </div>
            <Button className="mt-4">Save Changes</Button>
          </form>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4" /> Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="w-4 h-4" /> Export My Data
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Delete Account
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Account Info</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-500">Role</label>
                <p className="font-medium">{user?.role_display || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Organization</label>
                <p className="font-medium">{user?.organization_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Member Since</label>
                <p className="font-medium">{user?.date_joined?.split('T')[0] || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
