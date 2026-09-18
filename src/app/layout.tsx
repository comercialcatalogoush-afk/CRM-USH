import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRM | Ush By Ushuaia',
  description: 'CRM comercial interno de Ush By Ushuaia: contactos, empresas, oportunidades y seguimiento.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}