import './globals.css';
import { Suspense } from 'react';

export const metadata = {
  title: 'kanban-driven-agent',
  description: 'Todos implemented by Claude, gated behind URL feature flags',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  );
}
