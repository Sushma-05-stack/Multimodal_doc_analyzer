import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { RiBarChartLine, RiFileTextLine, RiEmotionHappyLine, RiPriceTag3Line } from 'react-icons/ri';
import api from '../lib/api';
import { format } from 'date-fns';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#84cc16'];

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/users/dashboard').then(r => r.data.dashboard)
  });

  const { data: docs } = useQuery({
    queryKey: ['docs-analytics'],
    queryFn: () => api.get('/documents', { params: { limit: 100 } }).then(r => r.data.documents)
  });

  if (isLoading) return <AnalyticsSkeleton />;

  const activityData = (data?.activityData || []).map(d => ({
    date: format(new Date(d._id), 'MMM d'),
    uploads: d.count
  }));

  const categoryData = data?.categoryBreakdown || [];

  // Sentiment breakdown from docs
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0, mixed: 0 };
  docs?.forEach(doc => {
    if (doc.sentiment?.overall) sentimentCounts[doc.sentiment.overall] = (sentimentCounts[doc.sentiment.overall] || 0) + 1;
  });
  const sentimentData = Object.entries(sentimentCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  // File type breakdown
  const typeCounts = {};
  docs?.forEach(doc => { typeCounts[doc.fileType] = (typeCounts[doc.fileType] || 0) + 1; });
  const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name: name.toUpperCase(), value }));

  // Language breakdown
  const langCounts = {};
  docs?.forEach(doc => { if (doc.language) langCounts[doc.language.toUpperCase()] = (langCounts[doc.language.toUpperCase()] || 0) + 1; });
  const langData = Object.entries(langCounts).map(([name, value]) => ({ name, value }));

  const stats = data?.stats || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Insights across your document library.</p>
      </motion.div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: stats.total || 0, icon: RiFileTextLine, color: 'from-primary-500 to-violet-600' },
          { label: 'Avg Words/Doc', value: stats.total ? Math.round((stats.totalWords || 0) / stats.total).toLocaleString() : 0, icon: RiBarChartLine, color: 'from-blue-500 to-cyan-600' },
          { label: 'Categories', value: categoryData.length, icon: RiPriceTag3Line, color: 'from-emerald-500 to-teal-600' },
          { label: 'Languages', value: langData.length, icon: RiEmotionHappyLine, color: 'from-orange-500 to-amber-600' },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="card p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
              <Icon className="text-white text-lg" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Upload activity */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Upload Activity (Last 30 Days)</h3>
        {activityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              <Area type="monotone" dataKey="uploads" stroke="#6366f1" strokeWidth={2.5} fill="url(#grad1)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </motion.div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Category bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Document Categories</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData.slice(0, 6)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </motion.div>

        {/* Sentiment pie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Sentiment Distribution</h3>
          {sentimentData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}>
                    {sentimentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {sentimentData.map(({ name, value }, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-400 capitalize">{name} ({value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyChart />}
        </motion.div>

        {/* File types */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">File Types</h3>
          {typeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} fontSize={10}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </>
          ) : <EmptyChart />}
        </motion.div>
      </div>

      {/* Language breakdown */}
      {langData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Languages Detected</h3>
          <div className="flex flex-wrap gap-3">
            {langData.map(({ name, value }, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-medium text-slate-900 dark:text-white text-sm">{name}</span>
                <span className="text-slate-400 text-sm">{value} doc{value > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function EmptyChart() {
  return <div className="h-[160px] flex items-center justify-center text-slate-400 dark:text-slate-600 text-sm">No data yet</div>;
}

function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
      </div>
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      <div className="grid grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i} className="h-56 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
      </div>
    </div>
  );
}
