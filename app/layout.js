import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ReduxProvider } from '@/components/ReduxProvider';

export const metadata = {
  title: 'Student Companion — Subjects, Assignments & Attendance',
  description: 'Manage your subjects, track assignment deadlines, and record daily attendance all in one place.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ReduxProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
