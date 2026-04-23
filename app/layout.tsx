import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import Providers from '@/components/providers';
import { Toaster } from 'sonner';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-heading',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Line Up Gym - Admin Dashboard',
  description: 'Be Strong Be Healthy',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={cn('min-h-screen bg-background font-sans text-foreground antialiased', dmSans.variable, bebasNeue.variable)}>
        <Providers>
          {children}
          <Toaster richColors theme="dark" position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
