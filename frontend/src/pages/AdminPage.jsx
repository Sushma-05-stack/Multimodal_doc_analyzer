import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RiShieldUserLine, RiUserLine, RiDeleteBin6Line, RiEditLine,
  RiCheckLine, RiCloseLine, RiSearchLine
} from 'react-icons/ri';
import api from '../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdminPage() {
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/users').then(r => r.data)
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }) => api.put(`/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Role updated'); }
  });

  const deleteUser = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('User deleted'); }
  });

  const users = (data?.users || []).filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    analyst: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    user: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <RiShieldUserLine className="text-2xl text-primary-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
        </div>
        <p className="text-slate-500 dark:text-slate-400">Manage users and system settings.</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: data?.pagination?.total || 0 },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length },
          { label: 'Analysts', value: users.filter(u => u.role === 'analyst').length },
          { label: 'Active', value: users.filter(u => u.isActive).length },
        ].map(({ label, value }, i) => (
          <div key={i} className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users..." className="input-field pl-9 py-2 text-sm" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {['User', 'Role', 'Plan', 'Joined', 'Last Login', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select value={user.role}
                        onChange={e => updateRole.mutate({ id: user._id, role: e.target.value })}
                        className={clsx('badge text-xs border-0 cursor-pointer', roleColors[user.role])}>
                        <option value="user">user</option>
                        <option value="analyst">analyst</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs capitalize">{user.plan}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {user.lastLogin ? format(new Date(user.lastLogin), 'MMM d') : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge text-xs', user.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { if (confirm(`Delete ${user.name}?`)) deleteUser.mutate(user._id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                        <RiDeleteBin6Line className="text-sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
