'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { fetchSubjects } from '@/store/subjectsSlice';
import { fetchAssignments } from '@/store/assignmentsSlice';
import { fetchAttendanceSummary } from '@/store/attendanceSlice';
import ProtectedLayout from '@/components/ProtectedLayout';
import Link from 'next/link';

function ProgressBar({ value, className = '' }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className={`progress-bar ${className}`}>
      <div className={`progress-fill ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { user }          = useAuth();
  const subjects          = useSelector(s => s.subjects.items);
  const assignments       = useSelector(s => s.assignments.items);
  const summary           = useSelector(s => s.attendance.summary);
  const summaryLoading    = useSelector(s => s.attendance.summaryLoading);

  // Initialise Socket.IO (reads token from cookie via a server call)
  // We pass a simple signal here; the actual token is in the HTTP-only cookie
  // The socket server reads it from auth.token on the handshake
  useSocket(user ? 'authenticated' : null);

  useEffect(() => {
    if (!user) return;
    dispatch(fetchSubjects());
    dispatch(fetchAssignments({ status: 'upcoming', limit: 5 }));
    dispatch(fetchAttendanceSummary());
  }, [dispatch, user]);

  const now = new Date();
  const upcomingAssignments = assignments
    .filter(a => a.status === 'pending' && new Date(a.deadline) > now)
    .slice(0, 5);
  const overdueAssignments = assignments.filter(a => a.status === 'pending' && new Date(a.deadline) <= now);

  const overallPercent = summary?.overallPercent ?? 0;

  return (
    <ProtectedLayout>
      {/* Greeting */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
          <span className="text-primary-400">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon bg-primary-900/50 text-primary-400">📚</div>
          <div>
            <p className="text-2xl font-bold text-white">{subjects.length}</p>
            <p className="text-xs text-slate-400">Subjects</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-amber-900/50 text-amber-400">📝</div>
          <div>
            <p className="text-2xl font-bold text-white">{upcomingAssignments.length}</p>
            <p className="text-xs text-slate-400">Upcoming</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-red-900/50 text-red-400">⚠️</div>
          <div>
            <p className="text-2xl font-bold text-white">{overdueAssignments.length}</p>
            <p className="text-xs text-slate-400">Overdue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-emerald-900/50 text-emerald-400">✅</div>
          <div>
            <p className="text-2xl font-bold text-white">{overallPercent}%</p>
            <p className="text-xs text-slate-400">Attendance</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Assignments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100">📝 Upcoming Assignments</h2>
            <Link href="/assignments" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>
          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No upcoming assignments 🎉</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map(a => {
                const deadline = new Date(a.deadline);
                const diff = deadline - now;
                const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
                return (
                  <div key={a._id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-surface border border-surface-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{a.title}</p>
                      <p className="text-xs text-slate-500 truncate">{a.subjectId?.name || 'Unknown'}</p>
                    </div>
                    <div className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                      daysLeft <= 1 ? 'bg-red-900/50 text-red-300' :
                      daysLeft <= 3 ? 'bg-amber-900/50 text-amber-300' :
                                       'bg-emerald-900/50 text-emerald-300'
                    }`}>
                      {daysLeft <= 0 ? 'Today' : `${daysLeft}d left`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Attendance Overview */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100">✅ Attendance Overview</h2>
            <Link href="/attendance" className="text-xs text-primary-400 hover:text-primary-300">View all →</Link>
          </div>

          {summaryLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary?.subjects?.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No attendance recorded yet</p>
          ) : (
            <>
              {/* Overall */}
              <div className="mb-4 p-3 rounded-lg bg-surface border border-surface-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-300 font-medium">Overall</span>
                  <span className={`text-sm font-bold ${overallPercent >= 75 ? 'text-emerald-400' : overallPercent >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {overallPercent}%
                  </span>
                </div>
                <ProgressBar value={overallPercent} />
              </div>

              {/* Per subject */}
              <div className="space-y-3">
                {(summary?.subjects || []).slice(0, 4).map(s => (
                  <div key={s.subject._id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-400 truncate">{s.subject.name}</span>
                      <span className="text-xs text-slate-400 shrink-0 ml-2">
                        {s.present}/{s.total} · {s.percent}%
                      </span>
                    </div>
                    <ProgressBar value={s.percent} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
