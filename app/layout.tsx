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
  title: {
    default: 'LineUp Gym - Gym & Fitness Center Prambanan',
    template: '%s | LineUp Gym'
  },
  description: 'LineUp Gym Prambanan - Pusat kebugaran dan angkat beban terbaik di Prambanan, Klaten. Be Strong, Be Healthy dengan fasilitas lengkap dan trainer profesional.',
  keywords: ['gym prambanan', 'fitness center klaten', 'tempat fitness prambanan', 'lineup gym', 'gym terbaik klaten', 'personal trainer prambanan'],
  authors: [{ name: 'LineUp Gym' }],
  creator: 'LineUp Gym',
  publisher: 'LineUp Gym',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'LineUp Gym - Be Strong Be Healthy',
    description: 'Pusat kebugaran terbaik di Prambanan dengan fasilitas lengkap dan komunitas yang solid.',
    url: 'https://lineupgym.com',
    siteName: 'LineUp Gym',
    images: [
      {
        url: '/logo.jpg',
        width: 800,
        height: 600,
      },
    ],
    locale: 'id_ID',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LineUp Gym - Be Strong Be Healthy',
    description: 'Pusat kebugaran terbaik di Prambanan.',
    images: ['/logo.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans text-foreground antialiased', dmSans.variable, bebasNeue.variable)}>
        <Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Gym',
                'name': 'LineUp Gym Prambanan',
                'image': 'https://lineupgym.com/logo.jpg',
                '@id': 'https://lineupgym.com',
                'url': 'https://lineupgym.com',
                'telephone': '+6285707678485',
                'address': {
                  '@type': 'PostalAddress',
                  'streetAddress': 'Banjarsari, Kb. Dalem Kidul Kec. Prambanan',
                  'addressLocality': 'Klaten',
                  'addressRegion': 'Jawa Tengah',
                  'postalCode': '57454',
                  'addressCountry': 'ID'
                },
                'geo': {
                  '@type': 'GeoCoordinates',
                  'latitude': -7.7483,
                  'longitude': 110.4912
                },
                'openingHoursSpecification': {
                  '@type': 'OpeningHoursSpecification',
                  'dayOfWeek': [
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday'
                  ],
                  'opens': '06:00',
                  'closes': '21:00'
                },
                'sameAs': [
                  'https://instagram.com/lineup.gym',
                  'https://www.tiktok.com/@lineupgymofficial'
                ]
              }),
            }}
          />
          {children}
          <Toaster richColors theme="dark" position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
