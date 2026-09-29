import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Button, Input } from '../components/ui';
import { User, Lock, Save } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.updateMe({ full_name: fullName });
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await authApi.updateMe({ current_password: currentPassword, new_password: newPassword });
      toast.success('Password changed!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Profile" subtitle="Manage your account information" />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-4 h-4" /> Personal Information</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith" />
            <Input label="Email Address" value={user?.email || ''} disabled className="opacity-50 cursor-not-allowed" />
            <p className="text-xs text-gray-500">Account created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
            <Button type="submit" loading={loading}><Save className="w-4 h-4" /> Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required placeholder="Your current password" />
            <Input label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="At least 8 characters" minLength={8} />
            <Button type="submit" loading={loading}><Lock className="w-4 h-4" /> Change Password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
