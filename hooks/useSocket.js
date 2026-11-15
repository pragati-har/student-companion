'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { subjectAdded, subjectUpdated, subjectDeleted } from '@/store/subjectsSlice';
import { assignmentAdded, assignmentUpdated, assignmentDeleted } from '@/store/assignmentsSlice';
import { attendanceUpdated } from '@/store/attendanceSlice';
import { fetchAttendanceSummary } from '@/store/attendanceSlice';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/**
 * Custom hook that manages the Socket.IO connection for an authenticated student.
 * - Connects with the JWT token for server-side authentication
 * - Joins the student's private room (handled server-side)
 * - Dispatches Redux actions on incoming real-time events
 * - Cleans up on unmount or when userId changes
 *
 * @param {string|null} token — JWT access token from a cookie-reading endpoint or passed in
 */
export function useSocket(token) {
  const dispatch  = useDispatch();
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth:             { token },
      transports:       ['websocket'],
      reconnection:     true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // ── Subject events ──────────────────────────────────────────────────
    socket.on('subject:created', (subject) => dispatch(subjectAdded(subject)));
    socket.on('subject:updated', (subject) => dispatch(subjectUpdated(subject)));
    socket.on('subject:deleted', ({ id })  => dispatch(subjectDeleted(id)));

    // ── Assignment events ───────────────────────────────────────────────
    socket.on('assignment:created', (assignment) => dispatch(assignmentAdded(assignment)));
    socket.on('assignment:updated', (assignment) => dispatch(assignmentUpdated(assignment)));
    socket.on('assignment:deleted', ({ id })     => dispatch(assignmentDeleted(id)));

    // ── Attendance events ───────────────────────────────────────────────
    socket.on('attendance:updated', (record) => {
      dispatch(attendanceUpdated(record));
      dispatch(fetchAttendanceSummary()); // refresh overall stats
    });

    // ── Dashboard refresh ───────────────────────────────────────────────
    socket.on('dashboard:refresh', () => {
      dispatch(fetchAttendanceSummary());
    });

    // ── Reminder notification ───────────────────────────────────────────
    socket.on('assignment:reminder', ({ title }) => {
      // Browser notification if permission granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('📚 Student Companion', {
          body: `Reminder: "${title}" is due soon!`,
          icon: '/favicon.ico',
        });
      }
    });

    socket.on('connect',           () => console.log('[socket] Connected'));
    socket.on('disconnect',        (reason) => console.log('[socket] Disconnected:', reason));
    socket.on('connect_error',     (err)    => console.warn('[socket] Connection error:', err.message));

    socketRef.current = socket;
  }, [token, dispatch]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return socketRef;
}
