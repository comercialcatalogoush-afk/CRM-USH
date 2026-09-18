export type CrmCompany = {
  id: string;
  name: string;
  nit: string | null;
  industry: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmContact = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  city: string | null;
  company: string | null;
  company_id: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string | null;
};

export type DealStage = 'new' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const DEAL_STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'new',         label: 'Nuevo',        color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'proposal',    label: 'Cotización',    color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { key: 'negotiation', label: 'Negociación',   color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { key: 'won',         label: 'Ganado',        color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { key: 'lost',        label: 'Perdido',       color: 'bg-red-100 text-red-800 border-red-200' },
];

export type CrmDeal = {
  id: string;
  contact_id: string;
  title: string;
  value_cop: number;
  stage: DealStage;
  probability: number;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  contact_name?: string;
};

export type ActivityType = 'nota' | 'llamada' | 'correo' | 'whatsapp' | 'reunion';

export const ACTIVITY_TYPES: { key: ActivityType; label: string; color: string }[] = [
  { key: 'nota',     label: 'Nota',     color: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
  { key: 'llamada',  label: 'Llamada',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { key: 'correo',   label: 'Correo',   color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { key: 'whatsapp', label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { key: 'reunion',  label: 'Reunión',  color: 'bg-purple-100 text-purple-800 border-purple-200' },
];

export type CrmActivity = {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  type: ActivityType;
  subject: string;
  content: string | null;
  happened_at: string;
  created_at: string;
};

export type CrmTask = {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  done: boolean;
  created_at: string;
  completed_at: string | null;
  // Joined
  contact_name?: string;
  deal_title?: string;
};
