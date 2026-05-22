import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  RiFileTextLine, RiCheckLine, RiUploadCloud2Line, RiChat3Line,
  RiArrowRightLine, RiBarChartLine, RiTimeLine, RiFileList3Line
} from 'react-icons/ri';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import clsx from 'clsx';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16'];

const fileTypeIcons = { pdf: '📄', docx: '📝', image: '🖼️', audio: '🎵', txt: '📃', csv: '📊', other: '📁' };

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/users/dashboard').then(r => r.data.dashboard)
  });

  const stats = data?.stats || {};
  const recentDocs = data?.recentDocuments || [];
  const categoryData = data?.categoryBreakdown || [];
  const activityData = data?.activityData || [];

  const statCards = [
    { label: 'Total Documents', value: stats.total || 0, icon: RiFileTextLine, color: 'from-primary-500 to-violet-600', change: '+12%' },
    { label: 'Processed', value: stats.completed || 0, icon: RiCheckLine, color: 'from-emerald-500 to-teal-600', change: '+8%' },
    { label: 'Total Words', value: (stats.totalWords || 0).toLocaleString(), icon: RiBarChartLine, color: 'from-blue-500 to-cyan-600', change: '+24%' },
    { label: 'Storage Used', value: `${((stats.totalSize || 0) / 1024 / 1024).toFixed(1)} MB`, icon: RiTimeLine, color: 'from-orange-500 to-amber-600', change: '+5%' },
  ];

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Good {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your documents.</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, change }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className="text-white text-xl" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            </div>
            <div className="ml-auto text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
              {change}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Upload Activity</h3>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                  tickFormatter={v => format(new Date(v), 'MMM d')} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                  labelFormatter={v => format(new Date(v), 'MMM d, yyyy')} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Upload documents to see activity" />
          )}
        </motion.div>

        {/* Category pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">By Category</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} dataKey="count" nameKey="_id" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 4).map(({ _id, count }, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{_id || 'Other'}</span>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart message="No categories yet" />
          )}
        </motion.div>
      </div>

      {/* Recent documents + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent docs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Documents</h3>
            <Link to="/documents" className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <RiArrowRightLine />
            </Link>
          </div>
          {recentDocs.length > 0 ? (
            <div className="space-y-3">
              {recentDocs.map((doc) => (
                <Link key={doc._id} to={`/documents/${doc._id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                  <div className="text-2xl">{fileTypeIcons[doc.fileType] || '📁'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {doc.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc['classification.category'] || doc.fileType?.toUpperCase()} · {format(new Date(doc.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <StatusBadge status={doc.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <RiFileList3Line className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">No documents yet</p>
              <Link to="/upload" className="btn-primary text-sm mt-3 inline-flex items-center gap-2">
                <RiUploadCloud2Line /> Upload your first document
              </Link>
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[
              { to: '/upload', icon: RiUploadCloud2Line, label: 'Upload Document', desc: 'PDF, image, audio & more', color: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' },
              { to: '/chat', icon: RiChat3Line, label: 'Chat with Docs', desc: 'Ask questions about your files', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
              { to: '/search', icon: RiBarChartLine, label: 'Semantic Search', desc: 'Find anything across documents', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
              { to: '/compare', icon: RiFileTextLine, label: 'Compare Docs', desc: 'Side-by-side AI comparison', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' },
            ].map(({ to, icon: Icon, label, desc, color }) => (
              <Link key={to} to={to}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="text-lg" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
                <RiArrowRightLine className="ml-auto text-slate-400 group-hover:text-primary-500 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    uploading: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return (
    <span className={clsx('badge text-xs', map[status] || map.uploading)}>
      {status}
    </span>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">{message}</div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
