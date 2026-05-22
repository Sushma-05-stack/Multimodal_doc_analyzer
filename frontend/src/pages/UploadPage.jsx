import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiUploadCloud2Line, RiFileTextLine, RiImageLine, RiFileMusicLine,
  RiCloseLine, RiCheckLine, RiLoader4Line, RiFileList3Line
} from 'react-icons/ri';
import { useDocumentStore } from '../store/documentStore';
import clsx from 'clsx';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/tiff': ['.tiff'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
};

const getFileIcon = (type) => {
  if (type.startsWith('image/')) return { icon: RiImageLine, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' };
  if (type.startsWith('audio/')) return { icon: RiFileMusicLine, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' };
  return { icon: RiFileTextLine, color: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' };
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const { uploadDocuments, isUploading } = useDocumentStore();
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    const newFiles = accepted.map(f => ({ file: f, id: Math.random().toString(36).slice(2), status: 'ready' }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxSize: 50 * 1024 * 1024,
    maxFiles: 10,
    onDropRejected: (rejected) => {
      rejected.forEach(({ errors }) => {
        errors.forEach(e => {
          if (e.code === 'file-too-large') alert('File too large. Max 50MB.');
          else if (e.code === 'file-invalid-type') alert('File type not supported.');
        });
      });
    }
  });

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  const handleUpload = async () => {
    if (files.length === 0) return;
    const rawFiles = files.map(f => f.file);
    const docs = await uploadDocuments(rawFiles, setProgress);
    if (docs.length > 0) {
      setTimeout(() => navigate('/documents'), 1500);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Upload up to 10 files at once. AI analysis starts automatically.</p>
      </motion.div>

      {/* Drop zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div
          {...getRootProps()}
          className={clsx(
            'relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300',
            isDragActive
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          )}
        >
          <input {...getInputProps()} />
          <motion.div animate={isDragActive ? { scale: 1.1 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div className={clsx(
              'w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all',
              isDragActive ? 'bg-primary-500 shadow-2xl shadow-primary-500/40' : 'bg-slate-100 dark:bg-slate-800'
            )}>
              <RiUploadCloud2Line className={clsx('text-4xl', isDragActive ? 'text-white' : 'text-slate-400 dark:text-slate-500')} />
            </div>
          </motion.div>
          {isDragActive ? (
            <p className="text-primary-600 dark:text-primary-400 font-semibold text-lg">Drop files here!</p>
          ) : (
            <>
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg mb-2">
                Drag & drop files here, or <span className="text-primary-600 dark:text-primary-400">browse</span>
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                PDF, DOCX, TXT, JPG, PNG, MP3, WAV, CSV · Max 50MB per file · Up to 10 files
              </p>
            </>
          )}
        </div>
      </motion.div>

      {/* Supported formats */}
      <div className="mt-4 flex flex-wrap gap-2">
        {['PDF', 'DOCX', 'TXT', 'JPG/PNG', 'MP3/WAV', 'CSV'].map(fmt => (
          <span key={fmt} className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs">{fmt}</span>
        ))}
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-6 card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <RiFileList3Line className="text-primary-500" />
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </h3>
              <button onClick={() => setFiles([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                Clear all
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin pr-1">
              {files.map(({ file, id, status }) => {
                const { icon: Icon, color } = getFileIcon(file.type);
                return (
                  <motion.div key={id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatSize(file.size)}</p>
                    </div>
                    {status === 'done' ? (
                      <RiCheckLine className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <button onClick={() => removeFile(id)}
                        className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <RiCloseLine />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Upload progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">Uploading...</span>
                  <span className="font-medium text-primary-600 dark:text-primary-400">{progress}%</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              className="btn-primary w-full mt-4 py-3 flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <><RiLoader4Line className="animate-spin" /> Processing...</>
              ) : (
                <><RiUploadCloud2Line /> Upload & Analyze {files.length} File{files.length > 1 ? 's' : ''}</>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'OCR Extraction', desc: 'Scanned images and handwritten notes are automatically processed with Tesseract OCR.' },
          { title: 'AI Analysis', desc: 'GPT-4o generates summaries, extracts entities, classifies documents, and detects sentiment.' },
          { title: 'Semantic Search', desc: 'Documents are vectorized for intelligent search across your entire library.' },
        ].map(({ title, desc }, i) => (
          <div key={i} className="card p-4">
            <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">{title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
