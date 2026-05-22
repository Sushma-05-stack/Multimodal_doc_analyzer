import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiSearchLine, RiFilterLine, RiGridLine, RiListCheck, RiUploadCloud2Line,
  RiDeleteBin6Line, RiEyeLine, RiRefreshLine, RiDownloadLine, RiMoreLine,
  RiFileTextLine, RiImageLine, RiFileMusicLine, RiFileList3Line
} from 'react-icons/ri';
import { useDocumentStore } from '../store/documentStore';
import { format } from 'date-fns';
import clsx from 'clsx';

const fileTypeIcons = {
  pdf: { icon: RiFileTextLine, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  docx: { icon: RiFileTextLine, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
  image: { icon: RiImageLine, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  audio: { icon: RiFileMusicLine, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  txt: { icon: RiFileTextLine, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
  csv: { icon: RiFileList3Line, color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' },
  other: { icon: RiFileTextLine, color: 'text-slate-500 bg-slate-100 dark:bg-slate-800' },
};

const statusColors = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  uploading: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export default function DocumentsPage() {
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const { documents, isLoading, pagination, fetchDocuments, deleteDocument, reanalyzeDocument, filters, setFilters } = useDocumentStore();

  useEffect(() => { fetchDocuments(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ search });
    fetchDocuments({ search, page: 1 });
  };

  const handleFilterType = (type) => {
    setFilterType(type);
    setFilters({ fileType: type });
    fetchDocuments({ fileType: type, page: 1 });
  };

  const handlePage = (page) => fetchDocuments({ page });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{pagination.total} total documents</p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <RiUploadCloud2Line /> Upload New
        </Link>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="input-field pl-10 pr-4"
          />
        </form>

        <div className="flex items-center gap-2">
          {/* Type filter */}
          <select
            value={filterType}
            onChange={e => handleFilterType(e.target.value)}
            className="input-field py-2.5 pr-8 text-sm w-auto"
          >
            <option value="">All Types</option>
            {['pdf', 'docx', 'image', 'audio', 'txt', 'csv'].map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            onChange={e => { setFilters({ sortBy: e.target.value }); fetchDocuments({ sortBy: e.target.value }); }}
            className="input-field py-2.5 pr-8 text-sm w-auto"
          >
            <option value="createdAt">Newest</option>
            <option value="title">Name</option>
            <option value="fileSize">Size</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button onClick={() => setView('grid')} className={clsx('p-2 rounded-lg transition-all', view === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400')}>
              <RiGridLine />
            </button>
            <button onClick={() => setView('list')} className={clsx('p-2 rounded-lg transition-all', view === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600' : 'text-slate-400')}>
              <RiListCheck />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <DocumentsSkeleton view={view} />
      ) : documents.length === 0 ? (
        <EmptyState />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc, i) => (
            <DocumentCard key={doc._id} doc={doc} index={i}
              onDelete={() => deleteDocument(doc._id)}
              onReanalyze={() => reanalyzeDocument(doc._id)}
              openMenu={openMenu} setOpenMenu={setOpenMenu}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {['Document', 'Type', 'Category', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documents.map((doc) => (
                <DocumentRow key={doc._id} doc={doc}
                  onDelete={() => deleteDocument(doc._id)}
                  onReanalyze={() => reanalyzeDocument(doc._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {[...Array(pagination.pages)].map((_, i) => (
            <button key={i} onClick={() => handlePage(i + 1)}
              className={clsx('w-9 h-9 rounded-xl text-sm font-medium transition-all',
                pagination.page === i + 1
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              )}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc, index, onDelete, onReanalyze, openMenu, setOpenMenu }) {
  const { icon: Icon, color } = fileTypeIcons[doc.fileType] || fileTypeIcons.other;
  const isMenuOpen = openMenu === doc._id;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="card p-4 group relative">
      {/* Processing overlay */}
      {doc.status === 'processing' && (
        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 rounded-2xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Analyzing...</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="text-lg" />
        </div>
        <div className="relative">
          <button onClick={() => setOpenMenu(isMenuOpen ? null : doc._id)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            <RiMoreLine />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-8 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                <Link to={`/documents/${doc._id}`} onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <RiEyeLine /> View Details
                </Link>
                <button onClick={() => { onReanalyze(); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <RiRefreshLine /> Reanalyze
                </button>
                <a href={`/api/export/${doc._id}/pdf`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <RiDownloadLine /> Export PDF
                </a>
                <button onClick={() => { onDelete(); setOpenMenu(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <RiDeleteBin6Line /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Link to={`/documents/${doc._id}`} className="block">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {doc.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {doc.wordCount ? `${doc.wordCount.toLocaleString()} words · ` : ''}{format(new Date(doc.createdAt), 'MMM d, yyyy')}
        </p>
      </Link>

      <div className="flex items-center justify-between">
        <span className={clsx('badge text-xs', statusColors[doc.status] || statusColors.uploading)}>
          {doc.status}
        </span>
        {doc.classification?.category && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[100px]">
            {doc.classification.category}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function DocumentRow({ doc, onDelete, onReanalyze }) {
  const { icon: Icon, color } = fileTypeIcons[doc.fileType] || fileTypeIcons.other;
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="text-sm" />
          </div>
          <Link to={`/documents/${doc._id}`} className="font-medium text-slate-900 dark:text-white text-sm hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate max-w-[200px]">
            {doc.title}
          </Link>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 uppercase">{doc.fileType}</td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{doc.classification?.category || '—'}</td>
      <td className="px-4 py-3">
        <span className={clsx('badge text-xs', statusColors[doc.status] || statusColors.uploading)}>{doc.status}</span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{format(new Date(doc.createdAt), 'MMM d, yyyy')}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link to={`/documents/${doc._id}`} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors">
            <RiEyeLine className="text-sm" />
          </Link>
          <button onClick={onReanalyze} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors">
            <RiRefreshLine className="text-sm" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
            <RiDeleteBin6Line className="text-sm" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
        <RiFileList3Line className="text-4xl text-slate-400 dark:text-slate-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No documents yet</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">Upload your first document to get started with AI analysis.</p>
      <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
        <RiUploadCloud2Line /> Upload Document
      </Link>
    </div>
  );
}

function DocumentsSkeleton({ view }) {
  return view === 'grid' ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl mb-3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
      ))}
    </div>
  ) : (
    <div className="card p-4 animate-pulse space-y-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />)}
    </div>
  );
}
