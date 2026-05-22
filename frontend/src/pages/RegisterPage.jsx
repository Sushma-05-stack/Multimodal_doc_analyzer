import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RiBrainLine, RiUser3Line, RiMailLine, RiLockLine, RiEyeLine, RiEyeOffLine, RiArrowRightLine, RiCheckLine } from 'react-icons/ri';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const perks = ['Free OCR & AI analysis', 'Semantic document search', 'Export to PDF & Excel', 'No credit card required'];

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    const result = await register(form.name, form.email, form.password);
    if (result.success) {
      toast.success('Account created! Welcome to DocuMind AI.');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary-500/30">
              <RiBrainLine className="text-white text-2xl" />
            </div>
            <span className="text-2xl font-black text-white">DocuMind AI</span>
          </Link>
          <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
          <p className="text-slate-400">Start analyzing documents for free</p>
        </div>

        {/* Perks */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {perks.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
              <RiCheckLine className="text-emerald-400 flex-shrink-0" /> {p}
            </div>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <RiUser3Line className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <RiMailLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <RiLockLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-12 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-slate-700'}`} />
                    ))}
                  </div>
                  <span className={`text-xs ${strength === 3 ? 'text-emerald-400' : strength === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {strengthLabels[strength]}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><span>Create Account</span><RiArrowRightLine /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
