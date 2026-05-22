import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RiUser3Line, RiLockLine, RiPaletteLine, RiBellLine,
  RiSaveLine, RiCheckLine, RiSunLine, RiMoonLine, RiComputerLine
} from 'react-icons/ri';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSaving, setIsSaving] = useState(false);

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const { data } = await api.put('/auth/update-profile', { name: profile.name });
      updateUser(data.user);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setIsSaving(false); }
  };

  const changePassword = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error('Passwords do not match');
    if (passwords.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setIsSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to change password'); }
    finally { setIsSaving(false); }
  };

  const tabs = [
    { id: 'profile', icon: RiUser3Line, label: 'Profile' },
    { id: 'security', icon: RiLockLine, label: 'Security' },
    { id: 'appearance', icon: RiPaletteLine, label: 'Appearance' },
    { id: 'notifications', icon: RiBellLine, label: 'Notifications' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account and preferences.</p>
      </motion.div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0 space-y-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}>
              <Icon className="text-base" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === 'profile' && (
              <div className="card p-6 space-y-5">
                <h2 className="font-semibold text-slate-900 dark:text-white">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
                    <span className="badge bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs mt-1">
                      {user?.role} · {user?.plan}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                  <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                    className="input-field" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                  <input value={profile.email} disabled className="input-field opacity-60 cursor-not-allowed" />
                  <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
                </div>

                <button onClick={saveProfile} disabled={isSaving} className="btn-primary flex items-center gap-2">
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RiSaveLine />}
                  Save Changes
                </button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card p-6 space-y-5">
                <h2 className="font-semibold text-slate-900 dark:text-white">Change Password</h2>
                {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 capitalize">
                      {field.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input type="password" value={passwords[field]}
                      onChange={e => setPasswords({ ...passwords, [field]: e.target.value })}
                      className="input-field" placeholder="••••••••" />
                  </div>
                ))}
                <button onClick={changePassword} disabled={isSaving} className="btn-primary flex items-center gap-2">
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RiLockLine />}
                  Update Password
                </button>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="card p-6 space-y-5">
                <h2 className="font-semibold text-slate-900 dark:text-white">Appearance</h2>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', icon: RiSunLine, label: 'Light', preview: 'bg-white border-slate-200' },
                      { value: 'dark', icon: RiMoonLine, label: 'Dark', preview: 'bg-slate-900 border-slate-700' },
                      { value: 'system', icon: RiComputerLine, label: 'System', preview: 'bg-gradient-to-br from-white to-slate-900 border-slate-400' },
                    ].map(({ value, icon: Icon, label, preview }) => (
                      <button key={value} onClick={() => setTheme(value)}
                        className={clsx('relative p-4 rounded-xl border-2 transition-all text-center',
                          theme === value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        )}>
                        <div className={`w-full h-12 rounded-lg mb-2 border ${preview}`} />
                        <Icon className={clsx('text-lg mx-auto mb-1', theme === value ? 'text-primary-500' : 'text-slate-400')} />
                        <p className={clsx('text-xs font-medium', theme === value ? 'text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400')}>{label}</p>
                        {theme === value && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <RiCheckLine className="text-white text-xs" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card p-6 space-y-4">
                <h2 className="font-semibold text-slate-900 dark:text-white">Notification Preferences</h2>
                {[
                  { label: 'Document processing complete', desc: 'Get notified when AI analysis finishes', defaultOn: true },
                  { label: 'Processing failed', desc: 'Alert when document processing fails', defaultOn: true },
                  { label: 'Weekly summary', desc: 'Weekly digest of your document activity', defaultOn: false },
                  { label: 'New features', desc: 'Updates about new DocuMind AI features', defaultOn: false },
                ].map(({ label, desc, defaultOn }, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={defaultOn} className="sr-only peer" />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:ring-2 peer-focus:ring-primary-500/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-primary-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
