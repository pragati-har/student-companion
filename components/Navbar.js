'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/lib/errorMessage';

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Dashboard',   icon: '🏠' },
  { href: '/subjects',    label: 'Subjects',     icon: '📚' },
  { href: '/assignments', label: 'Assignments',  icon: '📝' },
  { href: '/attendance',  label: 'Attendance',   icon: '✅' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/notifications');
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not load notifications.');
        if (active) {
          setNotifications(result.data.notifications);
          setUnreadCount(result.data.unreadCount);
          setNotificationError('');
        }
      } catch (error) {
        if (active) setNotificationError(getErrorMessage(error, 'Could not load notifications.'));
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user]);

  const markRead = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not update notification.');
      setNotifications(current => current.map(item => item._id === id ? result.data : item));
      setUnreadCount(current => Math.max(0, current - 1));
      setNotificationError('');
    } catch (error) {
      setNotificationError(getErrorMessage(error, 'Could not update notification.'));
    }
  };

  const dismissNotification = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not dismiss notification.');
      setNotifications(current => current.filter(item => item._id !== id));
      if (!result.data.read) setUnreadCount(current => Math.max(0, current - 1));
      setNotificationError('');
    } catch (error) {
      setNotificationError(getErrorMessage(error, 'Could not dismiss notification.'));
    }
  };

  const openNotification = async (notification) => {
    if (!notification.read) await markRead(notification._id);
    setNotificationsOpen(false);
    window.location.href = notification.type === 'attendance' ? '/attendance' : '/assignments';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white text-base shrink-0">
          <span className="text-xl">📚</span>
          <span className="hidden sm:block">Student Companion</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_LINKS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link shrink-0 ${pathname === href ? 'nav-link-active' : ''}`}
            >
              <span className="text-base">{icon}</span>
              <span className="hidden sm:block">{label}</span>
            </Link>
          ))}
        </div>

        {/* Notifications + User + Logout */}
        {user && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen(open => !open)}
                className="btn-ghost btn-sm btn relative"
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={notificationsOpen}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-surface-border bg-surface shadow-xl z-50">
                  <div className="p-3 border-b border-surface-border font-semibold text-sm text-slate-100">Notifications</div>
                  {notificationError && <p className="p-3 text-xs text-red-300">{notificationError}</p>}
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-slate-400">You’re all caught up.</p>
                  ) : notifications.map(notification => (
                    <div key={notification._id} className={`p-3 border-b border-surface-border/60 ${notification.read ? '' : 'bg-primary-900/20'}`}>
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className="block w-full text-left"
                      >
                        <span className="block text-sm font-medium text-slate-100">{notification.title}</span>
                        <span className="block mt-1 text-xs text-slate-300">{notification.message}</span>
                        <time className="block mt-1 text-[11px] text-slate-500" dateTime={notification.createdAt}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </time>
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissNotification(notification._id)}
                        className="mt-2 text-xs text-slate-400 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="hidden md:block text-xs text-slate-400 max-w-[120px] truncate">
              {user.name}
            </span>
            <button onClick={logout} className="btn-ghost btn-sm btn">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
