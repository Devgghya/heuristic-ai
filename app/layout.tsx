import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UIXScore",
  description: "AI-powered UI/UX Audits",
  icons: {
    icon: "/uixscore-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}