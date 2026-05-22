import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiContrastLine, RiLoader4Line, RiCheckLine, RiCloseLine, RiFileTextLine } from 'react-icons/ri';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ComparePage() {
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [result, setResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ['docs-compare'],
    queryFn: () => api.get('/documents', { params: { limit: 50 } }).then(r => r.data.documents.filter(d => d.status === 'completed'))
  });

  const handleCompare = async () => {
    if (!doc1 || !doc2) return toast.error('Select two documents to compare');
    if (doc1 === doc2) return toast.error('Select two different documents');
    setIsComparing(true);
    try {
      const { data } = await api.post('/analysis/compare', { docId1: doc1, docId2: doc2 });
      setResult(data);
    } catch { toast.error('Comparison failed'); }
    finally { setIsComparing(false); }
  };

  const doc1Info = docs.find(d => d._id === doc1);
  const doc2Info = docs.find(d => d._id === doc2);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Document Comparison</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">AI-powered side-by-side analysis of two documents.</p>
      </motion.div>

      {/* Document selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Document A', value: doc1, onChange: setDoc1, info: doc1Info },
          { label: 'Document B', value: doc2, onChange: setDoc2, info: doc2Info },
        ].map(({ label, value, onChange, info }, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="card p-5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}
              className="input-field mb-3">
              <option value="">Select a document...</option>
              {docs.map(doc => (
                <option key={doc._id} value={doc._id}>{doc.title}</option>
              ))}
            </select>
            {info && (
              <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <RiFileTextLine className="text-primary-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{info.title}</p>
                  <p className="text-xs text-slate-500">{info.fileType?.toUpperCase()} · {info.wordCount?.toLocaleString()} words</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Compare button */}
      <div className="flex justify-center mb-8">
        <button onClick={handleCompare} disabled={isComparing || !doc1 || !doc2}
          className="btn-primary px-10 py-3.5 flex items-center gap-3 text-base">
          {isComparing ? (
            <><RiLoader4Line className="animate-spin text-xl" /> Comparing with AI...</>
          ) : (
            <><RiContrastLine className="text-xl" /> Compare Documents</>
          )}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Similarity score */}
            <div className="card p-6 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Similarity Score</p>
              <div className="text-6xl font-black gradient-text mb-2">{result.comparison.similarity}%</div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 max-w-xs mx-auto">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.comparison.similarity}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-3 bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Common themes */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <RiCheckLine className="text-emerald-500" /> Common Themes
                </h3>
                {result.comparison.commonThemes?.length > 0 ? (
                  <ul className="space-y-2">
                    {result.comparison.commonThemes.map((theme, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                        {theme}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-400">No common themes found</p>}
              </div>

              {/* Key differences */}
              <div className="card p-5">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <RiCloseLine className="text-red-500" /> Key Differences
                </h3>
                {result.comparison.differences?.length > 0 ? (
                  <ul className="space-y-2">
                    {result.comparison.differences.map((diff, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">{i + 1}</span>
                        {diff}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-slate-400">No significant differences</p>}
              </div>

              {/* Unique to doc 1 */}
              {result.comparison.uniqueToDoc1?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                    Unique to "{result.documents?.[0]?.title?.substring(0, 30)}"
                  </h3>
                  <ul className="space-y-1.5">
                    {result.comparison.uniqueToDoc1.map((item, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <span className="text-primary-500 mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Unique to doc 2 */}
              {result.comparison.uniqueToDoc2?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                    Unique to "{result.documents?.[1]?.title?.substring(0, 30)}"
                  </h3>
                  <ul className="space-y-1.5">
                    {result.comparison.uniqueToDoc2.map((item, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <span className="text-violet-500 mt-0.5">•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendation */}
            {result.comparison.recommendation && (
              <div className="card p-5 bg-primary-50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-800">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">AI Recommendation</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{result.comparison.recommendation}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
