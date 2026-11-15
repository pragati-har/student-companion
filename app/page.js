'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errorMessage';

export default function AuthPage() {
  const [tab, setTab]         = useState('login');
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, register } = useAuth();
  const router = useRouter();

  // Already logged in → redirect
  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (tab === 'register' && !form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    if (!form.password)     errs.password = 'Password is required.';
    if (tab === 'register' && form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      if (tab === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
      router.push('/dashboard');
    } catch (err) {
      setApiError(getErrorMessage(err, 'Could not sign in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setErrors({});
    setApiError('');
    setForm({ name: '', email: '', password: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-800/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📚</div>
          <h1 className="text-2xl font-bold text-white">Student Companion</h1>
          <p className="text-slate-400 text-sm mt-1">Manage subjects, assignments & attendance</p>
        </div>

        {/* Card */}
        <div className="card">
          {/* Tabs */}
          <div className="flex rounded-lg bg-surface p-1 mb-6">
            {['login', 'register'].map(t => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                  tab === t
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          {/* API Error */}
          {apiError && (
            <div className="alert-error mb-4" role="alert">{apiError}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {tab === 'register' && (
              <div>
                <label htmlFor="name" className="label">Full Name</label>
                <input
                  id="name" name="name" type="text"
                  placeholder="Your full name"
                  value={form.name} onChange={handleChange}
                  className={`input ${errors.name ? 'input-error' : ''}`}
                />
                {errors.name && <p className="field-error">{errors.name}</p>}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email" name="email" type="email"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange}
                className={`input ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password" name="password" type="password"
                placeholder={tab === 'register' ? 'At least 6 characters' : 'Your password'}
                value={form.password} onChange={handleChange}
                className={`input ${errors.password ? 'input-error' : ''}`}
              />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn w-full mt-2"
              id={tab === 'login' ? 'btn-login' : 'btn-register'}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {tab === 'login' ? 'Logging in...' : 'Creating account...'}
                </span>
              ) : (
                tab === 'login' ? 'Login' : 'Create Account'
              )}
            </button>
          </form>

          {/* Switch hint */}
          <p className="text-center text-xs text-slate-500 mt-4">
            {tab === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <button
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              {tab === 'login' ? 'Register here' : 'Login here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
