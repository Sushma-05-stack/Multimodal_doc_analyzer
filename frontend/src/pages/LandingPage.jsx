import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RiBrainLine, RiFileTextLine, RiSearchLine, RiChat3Line,
  RiShieldCheckLine, RiTranslate2, RiBarChartLine, RiArrowRightLine,
  RiCheckLine, RiStarFill, RiUploadCloud2Line, RiMagicLine
} from 'react-icons/ri';

const features = [
  { icon: RiBrainLine, title: 'AI-Powered Analysis', desc: 'GPT-4o & Gemini extract insights, summaries, and entities from any document type.', color: 'from-violet-500 to-purple-600' },
  { icon: RiFileTextLine, title: 'OCR Extraction', desc: 'Tesseract & Google Vision API handle scanned images, handwritten notes, and PDFs.', color: 'from-blue-500 to-cyan-600' },
  { icon: RiSearchLine, title: 'Semantic Search', desc: 'Vector embeddings power intelligent search across your entire document library.', color: 'from-emerald-500 to-teal-600' },
  { icon: RiChat3Line, title: 'Document Q&A', desc: 'Chat with your documents using an AI assistant that cites sources.', color: 'from-orange-500 to-amber-600' },
  { icon: RiShieldCheckLine, title: 'Fraud Detection', desc: 'AI flags suspicious invoices and documents with risk scoring.', color: 'from-red-500 to-rose-600' },
  { icon: RiTranslate2, title: 'Multilingual', desc: 'Process and analyze documents in 12+ languages with auto-detection.', color: 'from-pink-500 to-fuchsia-600' },
  { icon: RiBarChartLine, title: 'Rich Analytics', desc: 'Visual dashboards with sentiment, topics, entities, and keyword charts.', color: 'from-indigo-500 to-primary-600' },
  { icon: RiMagicLine, title: 'Smart Flashcards', desc: 'Auto-generate study flashcards from research papers and notes.', color: 'from-yellow-500 to-orange-600' },
];

const stats = [
  { value: '50+', label: 'File Formats' },
  { value: '12+', label: 'Languages' },
  { value: '<5s', label: 'Processing Time' },
  { value: '99%', label: 'OCR Accuracy' },
];

const plans = [
  { name: 'Free', price: '$0', features: ['10 documents/month', 'Basic OCR', 'AI summaries', 'PDF export'], cta: 'Get Started', highlight: false },
  { name: 'Pro', price: '$19', features: ['Unlimited documents', 'Advanced AI analysis', 'Semantic search', 'All export formats', 'Priority processing', 'API access'], cta: 'Start Free Trial', highlight: true },
  { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'Custom AI models', 'SSO & RBAC', 'Dedicated support', 'SLA guarantee', 'On-premise option'], cta: 'Contact Sales', highlight: false },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <RiBrainLine className="text-white text-lg" />
            </div>
            <span className="font-bold text-lg">DocuMind AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#stats" className="hover:text-white transition-colors">Stats</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-5">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-8">
              <RiMagicLine className="text-base" />
              Powered by GPT-4o & Google Gemini
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Understand Any
              <span className="block bg-gradient-to-r from-primary-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Document Instantly
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Upload PDFs, images, invoices, resumes, or audio. Our AI extracts text, summarizes content,
              detects entities, and answers your questions — in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 shadow-2xl shadow-primary-500/30">
                Start Analyzing Free <RiArrowRightLine />
              </Link>
              <Link to="/login" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-base px-6 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500">
                <RiUploadCloud2Line /> View Demo
              </Link>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 bg-slate-800 rounded-lg h-6 ml-2" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-3">
                  {['Invoice_Q4.pdf', 'Resume_John.docx', 'Contract.pdf', 'Notes_scan.jpg'].map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
                      <div className="w-6 h-6 rounded bg-primary-500/20 flex items-center justify-center">
                        <RiFileTextLine className="text-primary-400 text-xs" />
                      </div>
                      <span className="text-xs text-slate-400 truncate">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="col-span-2 bg-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-medium">Analysis Complete</span>
                  </div>
                  <div className="space-y-2">
                    {['Summary generated', 'Entities extracted', 'Sentiment: Positive', 'Category: Invoice', 'Fraud Risk: Low'].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <RiCheckLine className="text-emerald-400 flex-shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 border-y border-slate-800">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="text-center">
              <div className="text-4xl font-black gradient-text mb-1">{value}</div>
              <div className="text-slate-400 text-sm">{label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Everything You Need</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">A complete AI document intelligence platform built for professionals.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc, color }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 group hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="text-white text-xl" />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Simple Pricing</h2>
            <p className="text-slate-400 text-lg">Start free, scale as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map(({ name, price, features: planFeatures, cta, highlight }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 border ${highlight
                  ? 'bg-gradient-to-b from-primary-600/20 to-violet-600/10 border-primary-500/50 shadow-2xl shadow-primary-500/20 scale-105'
                  : 'bg-slate-900 border-slate-800'}`}
              >
                {highlight && <div className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-3">Most Popular</div>}
                <h3 className="text-xl font-bold mb-1">{name}</h3>
                <div className="text-4xl font-black mb-1">{price}</div>
                <div className="text-slate-400 text-sm mb-6">{price !== 'Custom' ? '/month' : 'contact us'}</div>
                <ul className="space-y-3 mb-8">
                  {planFeatures.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-300">
                      <RiCheckLine className="text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className={`block text-center py-3 rounded-xl font-semibold transition-all ${highlight ? 'btn-primary' : 'border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white'}`}>
                  {cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-4">Ready to Analyze Smarter?</h2>
          <p className="text-slate-400 text-lg mb-8">Join thousands of professionals using DocuMind AI to understand their documents faster.</p>
          <Link to="/register" className="btn-primary text-base px-10 py-4 inline-flex items-center gap-2 shadow-2xl shadow-primary-500/30">
            Get Started Free <RiArrowRightLine />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center">
              <RiBrainLine className="text-white text-sm" />
            </div>
            <span className="font-bold text-sm">DocuMind AI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2025 DocuMind AI. Built with React, Node.js & GPT-4o.</p>
        </div>
      </footer>
    </div>
  );
}
