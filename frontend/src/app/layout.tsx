import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Solar CRM',
  description: 'After-Sales Service Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
