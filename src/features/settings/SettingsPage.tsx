// src/features/settings/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  User, Lock, Download, Trash2, Shield, CheckCircle, AlertCircle,
  X, Loader2, Eye, EyeOff, Building2, Mail, Phone, MapPin
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, endpoints } from '../../api';
import { Card, Button, Input, Modal, Badge, LoadingSpinner } from '../../components/ui';

// ============== TYPES ==============
interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

interface PasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// ============== MAIN COMPONENT ==============
const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '', last_name: '', email: '', phone: '',
    address: '', city: '', state: '', pincode: '',
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  
  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordData>({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Export data modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => { loadProfile(); }, []);
  
  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await api.get<any>(endpoints.currentUser);
      setProfile({
        first_name: response.first_name || '',
        last_name: response.last_name || '',
        email: response.email || '',
        phone: response.phone || '',
        address: response.address || '',
        city: response.city || '',
        state: response.state || '',
        pincode: response.pincode || '',
      });
    } catch (err: any) {
      setProfileError(err.message || 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };
  
  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      await api.patch(endpoints.currentUser, {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
      });
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };
  
  // Password strength calculator
  const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    const levels = [
      { label: 'Very Weak', color: 'bg-red-500' },
      { label: 'Weak', color: 'bg-red-500' },
      { label: 'Fair', color: 'bg-orange-500' },
      { label: 'Good', color: 'bg-yellow-500' },
      { label: 'Strong', color: 'bg-green-500' },
      { label: 'Very Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...levels[score] };
  };
  
  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    if (!passwordData.current_password) {
      setPasswordError('Current password is required');
      return;
    }
    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordData.current_password === passwordData.new_password) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setPasswordSaving(true);
    try {
      await api.post('/core/password/change/', {
        old_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setPasswordSuccess('');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.old_password ||
                          err.response?.data?.new_password?.[0] ||
                          err.message || 
                          'Failed to change password';
      setPasswordError(errorMessage);
    } finally {
      setPasswordSaving(false);
    }
  };
  
  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await api.get<any>('/core/me/export/');
      
      // Create download link
      const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowExportModal(false);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    
    setDeleting(true);
    try {
      await api.delete('/core/me/');
      // Logout and redirect
      window.location.href = '/login';
    } catch (err: any) {
      setProfileError(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  };
  
  const passwordStrength = calculatePasswordStrength(passwordData.new_password);
  const passwordsMatch = passwordData.new_password && passwordData.confirm_password && 
                        passwordData.new_password === passwordData.confirm_password;
  const passwordsMismatch = passwordData.confirm_password && 
                           passwordData.new_password !== passwordData.confirm_password;
  
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account and preferences</p>
        </div>
      </div>
      
      {/* Alerts */}
      {profileError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {profileError}
          </div>
          <button onClick={() => setProfileError('')}>
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}
      {profileSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {profileSuccess}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Profile Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={profile.first_name}
                onChange={(e) => setProfile(p => ({ ...p, first_name: e.target.value }))}
                placeholder="Enter first name"
              />
              <Input
                label="Last Name"
                value={profile.last_name}
                onChange={(e) => setProfile(p => ({ ...p, last_name: e.target.value }))}
                placeholder="Enter last name"
              />
              <Input
                label="Email"
                type="email"
                value={profile.email}
                disabled
                className="bg-gray-50"
              />
              <Input
                label="Phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
              <div className="md:col-span-2">
                <Input
                  label="Address"
                  value={profile.address}
                  onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                  placeholder="Enter street address"
                />
              </div>
              <Input
                label="City"
                value={profile.city}
                onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                placeholder="Mumbai"
              />
              <Input
                label="State"
                value={profile.state}
                onChange={(e) => setProfile(p => ({ ...p, state: e.target.value }))}
                placeholder="Maharashtra"
              />
              <Input
                label="Pincode"
                value={profile.pincode}
                onChange={(e) => setProfile(p => ({ ...p, pincode: e.target.value }))}
                placeholder="400001"
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleProfileSave} disabled={profileSaving}>
                {profileSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </Card>
          
          {/* Security */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-800">Password</p>
                    <p className="text-sm text-gray-500">Last changed: Unknown</p>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </Button>
              </div>
            </div>
          </Card>
          
          {/* Data & Privacy */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              Data & Privacy
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Export My Data</p>
                  <p className="text-sm text-gray-500">Download all your data in JSON format</p>
                </div>
                <Button variant="secondary" onClick={() => setShowExportModal(true)}>
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="font-medium text-red-800">Delete Account</p>
                  <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="text-red-600 hover:bg-red-100"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Info */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-700">
                    {(profile.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {profile.first_name} {profile.last_name}
                  </p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
              </div>
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Role</span>
                  <Badge variant="info">{user?.role || 'User'}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Organization</span>
                  <span className="text-gray-900">{(user as any)?.organization_name || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Member Since</span>
                  <span className="text-gray-900">
                    {(user as any)?.date_joined ? new Date((user as any).date_joined).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Security Status */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Security Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email Verified</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Password Set</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">2FA Enabled</span>
                <span className="text-xs text-gray-400">Coming Soon</span>
              </div>
            </div>
          </Card>
          
          {/* Organization Settings Link */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Organization</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Manage organization settings, members, and billing.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => window.location.href = '/settings/organization'}>
              Organization Settings
            </Button>
          </Card>
        </div>
      </div>
      
      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
          setPasswordError('');
          setPasswordSuccess('');
        }}
        title="Change Password"
      >
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {passwordSuccess}
            </div>
          )}
          
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordData.current_password}
                onChange={(e) => setPasswordData(p => ({ ...p, current_password: e.target.value }))}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(p => ({ ...p, new_password: e.target.value }))}
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordData.new_password && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Password Strength</span>
                  <span className={`font-medium ${passwordStrength.score >= 4 ? 'text-green-600' : passwordStrength.score >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${passwordStrength.color} transition-all duration-300`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))}
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  passwordsMismatch ? 'border-red-300 bg-red-50' : 
                  passwordsMatch ? 'border-green-300 bg-green-50' : 'border-gray-300'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordsMismatch && (
              <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Passwords match
              </p>
            )}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                setPasswordError('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handlePasswordChange}
              disabled={passwordSaving || !passwordData.current_password || !passwordData.new_password || !passwordsMatch}
            >
              {passwordSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Changing...</>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Export Data Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export My Data"
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Your data export will include:
            </p>
            <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
              <li>Profile information</li>
              <li>Account settings</li>
              <li>Activity history</li>
              <li>Associated data records</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setShowExportModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleExportData}
              disabled={exporting}
            >
              {exporting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Exporting...</>
              ) : (
                <><Download className="w-4 h-4" />Download</>
              )}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation('');
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">This action cannot be undone</p>
                <p className="text-sm text-red-700 mt-1">
                  Deleting your account will permanently remove:
                </p>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  <li>Your profile and settings</li>
                  <li>All interview data</li>
                  <li>Activity history</li>
                  <li>All associated files</li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="font-bold">DELETE</span> to confirm
            </label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deleting}
            >
              {deleting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Deleting...</>
              ) : (
                <><Trash2 className="w-4 h-4" />Delete Account</>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;