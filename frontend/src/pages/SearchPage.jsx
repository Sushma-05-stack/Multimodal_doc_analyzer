import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RiSearchLine, RiBrainLine, RiFileTextLine, RiTimeLine, RiFilterLine } from 'react-icons/ri';
import api from '../lib/api';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState('semantic');
  const [hasSearched, setHasSearched] = useState(false);
  const [suggestions, setSuggestions] = useState({ documents: [], keywords: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setShowSuggestions(false);
    try {
      const { data } = await api.get('/search', { params: { q: query, type: searchType } });
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        try {
          const { data } = await api.get('/search/suggestions', { params: { q: val } });
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        } catch {}
      }, 300);
    } else {
      setShowSuggestions(false);
    }
  };

  const exampleQueries = [
    'financial reports Q4 2024',
    'employee contracts termination clause',
    'invoice payment terms',
    'research methodology section',
    'contact information phone email',
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Semantic Search</h1>
        <p className="text-slate-500 dark:text-slate-400">Search across all your documents using AI-powered semantic understanding.</p>
      </motion.div>

      {/* Search bar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <form onSubmit={handleSearch} className="relative">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input
                value={query}
                onChange={e => handleInputChange(e.target.value)}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search documents by meaning, not just keywords..."
                className="input-field pl-12 pr-4 py-4 text-base"
              />

              {/* Suggestions dropdown */}
              <AnimatePresence>
                {showSuggestions && (suggestions.documents.length > 0 || suggestions.keywords.length > 0) && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                    {suggestions.documents.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">Documents</p>
                        {suggestions.documents.map(doc => (
                          <button key={doc._id} type="button" onClick={() => { setQuery(doc.title); setShowSuggestions(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-left transition-colors">
                            <RiFileTextLine className="text-slate-400 flex-shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{doc.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {suggestions.keywords.length > 0 && (
                      <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">Keywords</p>
                        <div className="flex flex-wrap gap-1.5 px-2">
                          {suggestions.keywords.map((kw, i) => (
                            <button key={i} type="button" onClick={() => { setQuery(kw); setShowSuggestions(false); }}
                              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full text-xs hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                              {kw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search type toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
              <button type="button" onClick={() => setSearchType('semantic')}
                className={clsx('px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                  searchType === 'semantic' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500')}>
                <RiBrainLine /> Semantic
              </button>
              <button type="button" onClick={() => setSearchType('fulltext')}
                className={clsx('px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5',
                  searchType === 'fulltext' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500')}>
                <RiFilterLine /> Exact
              </button>
            </div>

            <button type="submit" disabled={isSearching || !query.trim()} className="btn-primary px-6 py-3 flex items-center gap-2">
              {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RiSearchLine />}
              Search
            </button>
          </div>
        </form>

        {/* Search type info */}
        <p className="text-xs text-slate-400 dark:text-slate-600 mt-2 ml-1">
          {searchType === 'semantic'
            ? '🧠 Semantic search finds conceptually related content even without exact keyword matches'
            : '🔍 Exact search finds documents containing the specific words you typed'}
        </p>
      </motion.div>

      {/* Example queries */}
      {!hasSearched && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-8">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((q, i) => (
              <button key={i} onClick={() => { setQuery(q); }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors border border-slate-200 dark:border-slate-700">
                {q}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {hasSearched && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isSearching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`}
              </p>
            </div>

            {isSearching ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card p-5 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-1" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-16">
                <RiSearchLine className="text-5xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No results found</p>
                <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">Try different keywords or switch search type</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(({ document: doc, score, excerpt }, i) => (
                  <motion.div key={doc._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/documents/${doc._id}`} className="card p-5 block hover:border-primary-300 dark:hover:border-primary-700 transition-all group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                              {doc.title}
                            </h3>
                            <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs flex-shrink-0">
                              {doc.fileType?.toUpperCase()}
                            </span>
                          </div>
                          {doc.classification?.category && (
                            <p className="text-xs text-slate-400 mb-2">{doc.classification.category}</p>
                          )}
                          {excerpt && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              ...{excerpt}...
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <RiTimeLine />
                            {format(new Date(doc.createdAt), 'MMM d')}
                          </div>
                          {searchType === 'semantic' && (
                            <div className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full">
                              {Math.round(score * 100)}% match
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
