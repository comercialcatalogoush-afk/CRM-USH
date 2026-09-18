import CrmClient from './CrmClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'CRM | Ush By Ushuaia',
  robots: { index: false, follow: false } as const,
};

export default function CrmPage() {
  return <CrmClient />;
}