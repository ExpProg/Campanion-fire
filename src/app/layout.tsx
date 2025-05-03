
import type { Metadata } from 'next';
// Correctly import a font available from next/font/google, like Inter
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

// Initialize the Inter font
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Define a CSS variable for the font
});


export const metadata: Metadata = {
  title: 'Campanion - Find Your Perfect Camp',
  description: 'Discover and book the best camps with Campanion.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply the font variable to the body */}
      <body className={`${inter.variable} antialiased font-sans`}>
        <Providers>
            {children}
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
