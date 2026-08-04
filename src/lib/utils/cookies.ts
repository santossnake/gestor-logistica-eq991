import Cookies from 'js-cookie';

export interface MilitaryProfile {
  nip: string;
  nome: string;
  posto: string;
  email: string;
}

export const POSTOS_FORCA_AEREA = [
  'SOL',
  '2CAB',
  '1CAB',
  'CADJ',
  '2FUR',
  'FUR',
  '2SAR',
  '1SAR',
  'SAJ',
  'SCH',
  'SMOR',
  'ASPOF',
  'ALF',
  'TEN',
  'CAP',
  'MAJ',
  'TCOR',
  'COR',
  'BGEN',
  'MGEN',
  'TGEN',
  'GEN'
];

const MILITARY_PROFILE_COOKIE_KEY = 'eq991_military_profile';

export const getStoredMilitaryProfile = (): MilitaryProfile => {
  if (typeof window === 'undefined') {
    return { nip: '', nome: '', posto: '', email: '' };
  }

  try {
    const storedCookie = Cookies.get(MILITARY_PROFILE_COOKIE_KEY);
    if (storedCookie) {
      return JSON.parse(storedCookie);
    }
    // Fallback to localStorage if cookie not found
    const storedLocal = localStorage.getItem(MILITARY_PROFILE_COOKIE_KEY);
    if (storedLocal) {
      return JSON.parse(storedLocal);
    }
  } catch (err) {
    console.error('Erro ao ler perfil do militar:', err);
  }

  return { nip: '', nome: '', posto: '', email: '' };
};

// Local Pedidos Persistence
const PEDIDOS_STORAGE_KEY = 'eq991_pedidos_db_v1';

export function getStoredPedidos(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PEDIDOS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredPedido(pedido: any) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPedidos();
    const updated = [pedido, ...current.filter((p) => p.id !== pedido.id)];
    localStorage.setItem(PEDIDOS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao guardar pedido localmente:', err);
  }
}

export function updateStoredPedido(id: string, updates: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPedidos();
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem(PEDIDOS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao atualizar pedido localmente:', err);
  }
}

export function deleteStoredPedido(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredPedidos();
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(PEDIDOS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao apagar pedido localmente:', err);
  }
}

export function clearStoredPedidos() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PEDIDOS_STORAGE_KEY);
  } catch (err) {
    console.error(err);
  }
}

// Local Fleet Overrides Persistence (v3 reset to strictly enforce real > 90k KM)
const FLEET_OVERRIDES_KEY = 'eq991_fleet_overrides_v3';

export function resetFleetOverridesToReal() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('eq991_fleet_overrides_v1');
    localStorage.removeItem('eq991_fleet_overrides_v2');
    localStorage.removeItem(FLEET_OVERRIDES_KEY);
  } catch (err) {
    console.error(err);
  }
}

export function getFleetOverrides(): Record<string, any> {
  // Always return empty object so Supabase online database values are 100% authoritative
  return {};
}

export function saveFleetOverride(viaturaId: string, updates: Record<string, any>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getFleetOverrides();
    const updated = {
      ...current,
      [viaturaId]: {
        ...(current[viaturaId] || {}),
        ...updates
      }
    };
    localStorage.setItem(FLEET_OVERRIDES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao guardar alteração local da frota:', err);
  }
}

export function isReservationOverlapping(
  start1: string | Date,
  end1: string | Date,
  start2: string | Date,
  end2: string | Date
): boolean {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  return s1 < e2 && e1 > s2;
}

export const saveMilitaryProfile = (profile: MilitaryProfile): void => {
  if (typeof window === 'undefined') return;

  try {
    const dataStr = JSON.stringify(profile);
    // Expires in 30 days
    Cookies.set(MILITARY_PROFILE_COOKIE_KEY, dataStr, { expires: 30, path: '/' });
    localStorage.setItem(MILITARY_PROFILE_COOKIE_KEY, dataStr);
  } catch (err) {
    console.error('Erro ao gravar perfil do militar:', err);
  }
};

// ==========================================
// LOCAL PERSISTENCE FOR LOCAIS (Parking & Key Cabinets)
// ==========================================
const LOCAIS_STORAGE_KEY = 'eq991_locais_db_v2';

export function getStoredLocais(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAIS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredLocais(locais: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAIS_STORAGE_KEY, JSON.stringify(locais));
  } catch (err) {
    console.error('Erro ao guardar locais localmente:', err);
  }
}

export function saveStoredLocal(item: any): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredLocais();
    const updated = [item, ...current.filter((l) => l.id !== item.id)];
    localStorage.setItem(LOCAIS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao guardar local:', err);
  }
}

export function deleteStoredLocal(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getStoredLocais();
    const updated = current.filter((l) => l.id !== id);
    localStorage.setItem(LOCAIS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao apagar local:', err);
  }
}

// ==========================================
// LOCAL PERSISTENCE FOR ANOMALIAS
// ==========================================
const ANOMALIAS_STORAGE_KEY = 'eq991_anomalias_db_v1';

export function getStoredAnomalias(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ANOMALIAS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredAnomalias(anomalias: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ANOMALIAS_STORAGE_KEY, JSON.stringify(anomalias));
  } catch (err) {
    console.error('Erro ao guardar anomalias localmente:', err);
  }
}

// ==========================================
// LOCAL PERSISTENCE FOR UTILIZADORES
// ==========================================
const UTILIZADORES_STORAGE_KEY = 'eq991_utilizadores_db_v1';

export function getStoredUtilizadores(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(UTILIZADORES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredUtilizadores(utilizadores: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UTILIZADORES_STORAGE_KEY, JSON.stringify(utilizadores));
  } catch (err) {
    console.error('Erro ao guardar utilizadores localmente:', err);
  }
}

// ==========================================
// LOCAL PERSISTENCE FOR EMPRESTIMOS
// ==========================================
const EMPRESTIMOS_STORAGE_KEY = 'eq991_emprestimos_db_v1';

export function getStoredEmprestimos(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EMPRESTIMOS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function saveStoredEmprestimos(emprestimos: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EMPRESTIMOS_STORAGE_KEY, JSON.stringify(emprestimos));
  } catch (err) {
    console.error('Erro ao guardar empréstimos localmente:', err);
  }
}

// ==========================================
// AUDIT LOG PERSISTENCE & SYSTEM LOGGING
// ==========================================
export interface AuditLogItem {
  id: string;
  timestamp: string;
  trigrama: string;
  nome: string;
  posto: string;
  categoria: 'RESERVAS' | 'VIATURAS' | 'LOCAIS' | 'ANOMALIAS' | 'EMPRESTIMOS' | 'UTILIZADORES' | 'SISTEMA';
  acao: string;
  detalhes: string;
}

const AUDIT_LOGS_STORAGE_KEY = 'eq991_audit_logs_v1';

export function getStoredAuditLogs(): AuditLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

export function logAuditAction(
  categoria: AuditLogItem['categoria'],
  acao: string,
  detalhes: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const prof = getStoredMilitaryProfile();
    const newLog: AuditLogItem = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      trigrama: prof.nip ? `NIP-${prof.nip}` : 'ADMIN',
      nome: prof.nome || 'Gestor de Logística',
      posto: prof.posto || 'TEN',
      categoria,
      acao,
      detalhes
    };

    const current = getStoredAuditLogs();
    const updated = [newLog, ...current].slice(0, 500);
    localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao registar log de auditoria:', err);
  }
}
