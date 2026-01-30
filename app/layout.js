import './globals.css';
import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'HDLA Executive Dashboard',
  description: 'Hodgson Douglas Landscape Architects Executive Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-hdla-bg">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
