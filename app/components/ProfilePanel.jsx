import React, { useState } from 'react';
import { Card } from './ui/card';
import { User, Shield, Settings, Bell, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import axios from 'axios';

const ProfilePanel = () => {
  const [name, setName] = useState('Demo User');
  const [saving, setSaving] = useState(false);
  const [userId] = useState('demo_user');

  const saveName = async () => {
    try {
      setSaving(true);
      await axios.put('/api/users/profile', { user_id: userId, name });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-[600px] z-20 fade-in" data-testid="profile-panel">
      <Card className="glass-panel p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <User className="text-blue-600" size={28} />
          <h2 className="text-2xl font-bold text-slate-800">Profile</h2>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={40} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-56" />
              <Button onClick={saveName} className="rounded-full" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-sm text-slate-600">demo@saferoute.com</p>
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-3">
          <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer" data-testid="profile-safety-btn" onClick={() => alert('Safety Preferences clicked')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Shield size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Safety Preferences</h4>
                  <p className="text-sm text-slate-500">Customize your safety settings</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer" data-testid="profile-notifications-btn" onClick={() => alert('Notifications clicked')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bell size={24} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Notifications</h4>
                  <p className="text-sm text-slate-500">Manage alert preferences</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer" data-testid="profile-locations-btn" onClick={() => alert('Saved Locations clicked')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <MapPin size={24} className="text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Saved Locations</h4>
                  <p className="text-sm text-slate-500">Home, work, and favorites</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white border border-slate-200 hover:shadow-md transition-all cursor-pointer" data-testid="profile-settings-btn" onClick={() => alert('General Settings clicked')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  <Settings size={24} className="text-slate-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">General Settings</h4>
                  <p className="text-sm text-slate-500">App preferences and account</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* App Info */}
        <div className="mt-6 pt-6 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-600">
            SafeRoute v1.0<br />
            Your safety companion
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePanel;
