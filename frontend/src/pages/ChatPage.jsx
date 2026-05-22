import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiChat3Line, RiSendPlane2Line, RiAddLine, RiDeleteBin6Line,
  RiBrainLine, RiUser3Line, RiFileTextLine, RiMicLine, RiStopLine,
  RiLoader4Line, RiAttachmentLine
} from 'react-icons/ri';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useDocumentStore } from '../store/documentStore';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const [searchParams] = useSearchParams();
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const qc = useQueryClient();

  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions').then(r => r.data.sessions)
  });

  const { data: docs = [] } = useQuery({
    queryKey: ['documents-list'],
    queryFn: () => api.get('/documents', { params: { limit: 50 } }).then(r => r.data.documents)
  });

  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId) setSelectedDocs([docId]);
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const createSession = async () => {
    const { data } = await api.post('/chat/sessions', { documentIds: selectedDocs });
    setActiveSession(data.session);
    setMessages([]);
    refetchSessions();
    return data.session;
  };

  const loadSession = async (session) => {
    const { data } = await api.get(`/chat/sessions/${session._id}`);
    setActiveSession(data.session);
    setMessages(data.session.messages || []);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    let session = activeSession;
    if (!session) {
      session = await createSession();
    }

    const userMsg = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await api.post(`/chat/sessions/${session._id}/message`, { message: input });
      setMessages(prev => [...prev, data.message]);
      if (data.session?.title !== session.title) {
        setActiveSession(prev => ({ ...prev, title: data.session.title }));
        refetchSessions();
      }
    } catch (error) {
      toast.error('Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsTyping(false);
    }
  };

  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    await api.delete(`/chat/sessions/${sessionId}`);
    if (activeSession?._id === sessionId) {
      setActiveSession(null);
      setMessages([]);
    }
    refetchSessions();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    'Summarize this document in 3 bullet points',
    'What are the key entities mentioned?',
    'What is the main conclusion?',
    'List all dates and deadlines mentioned',
    'What action items are required?',
  ];

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <button onClick={createSession} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm">
            <RiAddLine /> New Chat
          </button>
        </div>

        {/* Document selector */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Documents</p>
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {docs.filter(d => d.status === 'completed').map(doc => (
              <label key={doc._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                <input type="checkbox" checked={selectedDocs.includes(doc._id)}
                  onChange={e => setSelectedDocs(prev => e.target.checked ? [...prev, doc._id] : prev.filter(id => id !== doc._id))}
                  className="rounded text-primary-500 focus:ring-primary-500" />
                <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{doc.title}</span>
              </label>
            ))}
            {docs.filter(d => d.status === 'completed').length === 0 && (
              <p className="text-xs text-slate-400 px-1.5">No completed documents</p>
            )}
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 mb-2">History</p>
          {sessions.map(session => (
            <button key={session._id} onClick={() => loadSession(session)}
              className={clsx(
                'w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all group',
                activeSession?._id === session._id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              )}>
              <RiChat3Line className="flex-shrink-0 text-sm" />
              <span className="text-xs truncate flex-1">{session.title}</span>
              <button onClick={(e) => deleteSession(session._id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-all">
                <RiDeleteBin6Line className="text-xs" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 gap-3 bg-white dark:bg-slate-900 flex-shrink-0">
          <RiBrainLine className="text-primary-500 text-xl" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white text-sm">
              {activeSession?.title || 'AI Document Assistant'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDocs.length > 0 ? `${selectedDocs.length} document(s) selected` : 'Select documents to chat about'}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center mb-4 shadow-2xl shadow-primary-500/30">
                <RiBrainLine className="text-white text-3xl" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ask anything about your documents</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 max-w-md">
                Select documents from the sidebar, then ask questions, request summaries, or explore insights.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 text-sm text-slate-600 dark:text-slate-400 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <RiBrainLine className="text-white text-sm" />
                  </div>
                )}
                <div className={clsx(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                )}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  {msg.sources?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-xs text-slate-400 mb-1">Sources:</p>
                      {msg.sources.slice(0, 2).map((s, j) => (
                        <p key={j} className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          📄 {s.excerpt?.substring(0, 80)}...
                        </p>
                      ))}
                    </div>
                  )}
                  <p className={clsx('text-xs mt-1', msg.role === 'user' ? 'text-primary-200' : 'text-slate-400')}>
                    {format(new Date(msg.timestamp || Date.now()), 'HH:mm')}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <RiUser3Line className="text-slate-600 dark:text-slate-400 text-sm" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <RiBrainLine className="text-white text-sm" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 focus-within:border-primary-400 dark:focus-within:border-primary-600 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              rows={1}
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm resize-none focus:outline-none max-h-32 scrollbar-thin"
              style={{ minHeight: '24px' }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || isTyping}
              className="w-9 h-9 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all flex-shrink-0">
              {isTyping ? <RiLoader4Line className="animate-spin text-sm" /> : <RiSendPlane2Line className="text-sm" />}
            </button>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-600 text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
