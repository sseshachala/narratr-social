import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Social Integrations App',
  description: 'Facebook, Instagram and Twitter integrations starter',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
