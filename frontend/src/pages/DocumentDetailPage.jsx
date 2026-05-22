import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import {
  RiArrowLeftLine, RiDownloadLine, RiRefreshLine, RiDeleteBin6Line,
  RiChat3Line, RiFileTextLine, RiShieldCheckLine, RiUser3Line,
  RiLightbulbLine, RiTranslate2, RiTimeLine, RiCheckLine, RiAlertLine
} from 'react-icons/ri';
import { useDocumentStore } from '../store/documentStore';
import { useSocketStore } from '../store/socketStore';
import { format } from 'date-fns';
import clsx from 'clsx';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SENTIMENT_COLORS = { positive: '#10b981', negative: '#ef4444', neutral: '#94a3b8', mixed: '#f59e0b' };
const ENTITY_COLORS = { PERSON: '#6366f1', ORGANIZATION: '#06b6d4', LOCATION: '#10b981', DATE: '#f59e0b', MONEY: '#ec4899', default: '#94a3b8' };

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [flashcards, setFlashcards] = useState([]);
  const [flippedCard, setFlippedCard] = useState(null);
  const { currentDocument: doc, fetchDocument, deleteDocument, reanalyzeDocument, isLoading } = useDocumentStore();
  const { joinDocument, leaveDocument } = useSocketStore();

  useEffect(() => {
    fetchDocument(id);
    joinDocument(id);
    return () => leaveDocument(id);
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this document?')) return;
    await deleteDocument(id);
    navigate('/documents');
  };

  const loadFlashcards = async () => {
    try {
      const { data } = await api.get(`/analysis/flashcards/${id}`);
      setFlashcards(data.flashcards);
      setActiveTab('flashcards');
    } catch { toast.error('Failed to load flashcards'); }
  };

  if (isLoading || !doc) return <DetailSkeleton />;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'entities', label: `Entities (${doc.entities?.length || 0})` },
    { id: 'topics', label: 'Topics' },
    { id: 'text', label: 'Extracted Text' },
    { id: 'flashcards', label: 'Flashcards' },
    ...(doc.resumeScore?.overall ? [{ id: 'resume', label: 'Resume Score' }] : []),
    ...(doc.fraudAnalysis?.riskLevel ? [{ id: 'fraud', label: 'Fraud Analysis' }] : []),
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors mt-1">
          <RiArrowLeftLine className="text-xl" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1">
            <span className="text-sm text-slate-500 dark:text-slate-400">{doc.fileType?.toUpperCase()}</span>
            {doc.language && <span className="text-sm text-slate-500 dark:text-slate-400">· {doc.language.toUpperCase()}</span>}
            {doc.wordCount > 0 && <span className="text-sm text-slate-500 dark:text-slate-400">· {doc.wordCount.toLocaleString()} words</span>}
            <span className="text-sm text-slate-500 dark:text-slate-400">· {format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
            <StatusBadge status={doc.status} />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link to={`/chat?doc=${id}`} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RiChat3Line /> Chat
          </Link>
          <a href={`/api/export/${id}/pdf`} target="_blank" rel="noreferrer"
            className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RiDownloadLine /> Export
          </a>
          <button onClick={() => reanalyzeDocument(id)} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RiRefreshLine />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
            <RiDeleteBin6Line />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 overflow-x-auto scrollbar-thin">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => tab.id === 'flashcards' ? loadFlashcards() : setActiveTab(tab.id)}
            className={clsx('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'overview' && <OverviewTab doc={doc} />}
        {activeTab === 'entities' && <EntitiesTab entities={doc.entities || []} />}
        {activeTab === 'topics' && <TopicsTab topics={doc.topics || []} keywords={doc.keywords || []} />}
        {activeTab === 'text' && <TextTab text={doc.extractedText} />}
        {activeTab === 'flashcards' && <FlashcardsTab flashcards={flashcards} flippedCard={flippedCard} setFlippedCard={setFlippedCard} />}
        {activeTab === 'resume' && <ResumeTab score={doc.resumeScore} />}
        {activeTab === 'fraud' && <FraudTab analysis={doc.fraudAnalysis} />}
      </motion.div>
    </div>
  );
}

function OverviewTab({ doc }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Summary */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <RiLightbulbLine className="text-primary-500" /> AI Summary
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
            {doc.summary || 'No summary available. Try reanalyzing the document.'}
          </p>
        </div>

        {/* Classification */}
        {doc.classification?.category && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <RiFileTextLine className="text-blue-500" /> Classification
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-slate-900 dark:text-white">{doc.classification.category}</p>
                {doc.classification.subcategory && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{doc.classification.subcategory}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {Math.round((doc.classification.confidence || 0) * 100)}%
                </p>
                <p className="text-xs text-slate-500">confidence</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Sentiment */}
        {doc.sentiment?.overall && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Sentiment</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${SENTIMENT_COLORS[doc.sentiment.overall]}20` }}>
                {doc.sentiment.overall === 'positive' ? '😊' : doc.sentiment.overall === 'negative' ? '😟' : '😐'}
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white capitalize">{doc.sentiment.overall}</p>
                <p className="text-sm text-slate-500">Score: {doc.sentiment.score?.toFixed(2)}</p>
              </div>
            </div>
            {doc.sentiment.breakdown && (
              <div className="space-y-2">
                {Object.entries(doc.sentiment.breakdown).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 capitalize">{key}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{Math.round((val || 0) * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(val || 0) * 100}%`, background: SENTIMENT_COLORS[key] || '#94a3b8' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Document Stats</h3>
          <div className="space-y-2">
            {[
              { label: 'Words', value: doc.wordCount?.toLocaleString() || '—' },
              { label: 'Pages', value: doc.pageCount || '—' },
              { label: 'OCR Confidence', value: doc.ocrConfidence ? `${doc.ocrConfidence}%` : '—' },
              { label: 'Processing Time', value: doc.processingTime ? `${(doc.processingTime / 1000).toFixed(1)}s` : '—' },
              { label: 'Language', value: doc.language?.toUpperCase() || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{label}</span>
                <span className="font-medium text-slate-900 dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EntitiesTab({ entities }) {
  const grouped = entities.reduce((acc, e) => {
    if (!acc[e.type]) acc[e.type] = [];
    acc[e.type].push(e);
    return acc;
  }, {});

  if (entities.length === 0) return <EmptyTabState message="No entities extracted" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ background: ENTITY_COLORS[type] || ENTITY_COLORS.default }} />
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{type}</h4>
            <span className="ml-auto text-xs text-slate-400">{items.length}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.slice(0, 12).map((e, i) => (
              <span key={i} className="px-2 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${ENTITY_COLORS[type] || ENTITY_COLORS.default}15`, color: ENTITY_COLORS[type] || ENTITY_COLORS.default }}>
                {e.text}
              </span>
            ))}
            {items.length > 12 && <span className="text-xs text-slate-400">+{items.length - 12} more</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopicsTab({ topics, keywords }) {
  const keywordData = keywords.slice(0, 10).map(k => ({ name: k.word, value: k.relevance * 100 }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Main Topics</h3>
        {topics.length > 0 ? (
          <div className="space-y-3">
            {topics.map((topic, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-900 dark:text-white">{topic.name}</span>
                  <span className="text-slate-500">{Math.round(topic.confidence * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                    style={{ width: `${topic.confidence * 100}%` }} />
                </div>
                {topic.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {topic.keywords.slice(0, 4).map((kw, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">{kw}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <EmptyTabState message="No topics extracted" />}
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Top Keywords</h3>
        {keywordData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={keywordData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {keywordData.map((_, i) => <Cell key={i} fill={`hsl(${240 + i * 15}, 70%, 60%)`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyTabState message="No keywords extracted" />}
      </div>
    </div>
  );
}

function TextTab({ text }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <RiFileTextLine className="text-primary-500" /> Extracted Text
      </h3>
      {text ? (
        <pre className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-sans leading-relaxed max-h-[600px] overflow-y-auto scrollbar-thin">
          {text}
        </pre>
      ) : <EmptyTabState message="No text extracted" />}
    </div>
  );
}

function FlashcardsTab({ flashcards, flippedCard, setFlippedCard }) {
  if (flashcards.length === 0) return (
    <div className="text-center py-12">
      <RiLightbulbLine className="text-4xl text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-slate-500 dark:text-slate-400">Click "Flashcards" tab to generate study cards from this document.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {flashcards.map((card, i) => (
        <motion.div key={i} className="cursor-pointer" style={{ perspective: 1000 }}
          onClick={() => setFlippedCard(flippedCard === i ? null : i)}>
          <motion.div
            animate={{ rotateY: flippedCard === i ? 180 : 0 }}
            transition={{ duration: 0.4 }}
            style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: '140px' }}
          >
            {/* Front */}
            <div className="card p-5 absolute inset-0 flex flex-col justify-between" style={{ backfaceVisibility: 'hidden' }}>
              <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">Question</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">{card.question}</p>
              <span className="text-xs text-slate-400 mt-2">Click to reveal answer</span>
            </div>
            {/* Back */}
            <div className="card p-5 absolute inset-0 flex flex-col justify-between bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Answer</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{card.answer}</p>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

function ResumeTab({ score }) {
  if (!score) return <EmptyTabState message="No resume analysis available" />;
  const sections = Object.entries(score.sections || {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <RiUser3Line className="text-primary-500" /> Resume Score
        </h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${score.overall} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{score.overall}</span>
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 dark:text-white">Overall Score</p>
            <p className="text-sm text-slate-500">ATS Score: {score.atsScore || 'N/A'}</p>
            <p className="text-sm text-slate-500 capitalize">Level: {score.experienceLevel || 'N/A'}</p>
          </div>
        </div>
        <div className="space-y-3">
          {sections.map(([key, val]) => (
            <div key={key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize text-slate-600 dark:text-slate-400">{key}</span>
                <span className="font-medium text-slate-900 dark:text-white">{val.score}/100</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-violet-500" style={{ width: `${val.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Suggestions</h3>
        <div className="space-y-2">
          {(score.suggestions || []).map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
              <RiCheckLine className="text-emerald-500 flex-shrink-0 mt-0.5" /> {s}
            </div>
          ))}
        </div>
        {score.strengths?.length > 0 && (
          <>
            <h4 className="font-semibold text-slate-900 dark:text-white mt-4 mb-2">Strengths</h4>
            {score.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <RiCheckLine className="text-primary-500 flex-shrink-0 mt-0.5" /> {s}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function FraudTab({ analysis }) {
  if (!analysis) return <EmptyTabState message="No fraud analysis available" />;
  const riskColors = { low: 'text-emerald-500', medium: 'text-yellow-500', high: 'text-orange-500', critical: 'text-red-500' };
  const riskBg = { low: 'bg-emerald-50 dark:bg-emerald-900/20', medium: 'bg-yellow-50 dark:bg-yellow-900/20', high: 'bg-orange-50 dark:bg-orange-900/20', critical: 'bg-red-50 dark:bg-red-900/20' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className={`card p-5 ${riskBg[analysis.riskLevel]}`}>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <RiShieldCheckLine className={riskColors[analysis.riskLevel]} /> Fraud Risk Assessment
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-5xl font-black uppercase ${riskColors[analysis.riskLevel]}`}>{analysis.riskLevel}</div>
          <div>
            <p className="text-sm text-slate-500">Confidence: {Math.round((analysis.confidence || 0) * 100)}%</p>
          </div>
        </div>
        {analysis.flags?.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Flags Detected:</p>
            {analysis.flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <RiAlertLine className="text-orange-500 flex-shrink-0 mt-0.5" /> {flag}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Analysis Breakdown</h3>
        {analysis.analysis && Object.entries(analysis.analysis).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className={`text-sm font-medium ${val ? 'text-red-500' : 'text-emerald-500'}`}>
              {val ? '⚠ Detected' : '✓ Clear'}
            </span>
          </div>
        ))}
        {analysis.recommendation && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return <span className={clsx('badge', map[status] || map.processing)}>{status}</span>;
}

function EmptyTabState({ message }) {
  return <div className="text-center py-12 text-slate-400 dark:text-slate-600">{message}</div>;
}

function DetailSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-pulse space-y-6">
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/2" />
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => <div key={i} className="h-9 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    </div>
  );
}
