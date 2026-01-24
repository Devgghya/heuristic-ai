import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ClerkThemeWrapper } from '@/components/clerk-theme-wrapper';

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
          <ClerkThemeWrapper>
            {children}
          </ClerkThemeWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}