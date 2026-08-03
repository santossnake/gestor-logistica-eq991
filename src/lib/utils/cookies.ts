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
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(FLEET_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);

    // Auto-clean any stale entry with odometers lower than real baselines
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(parsed)) {
      const entry = val as any;
      if (entry && typeof entry === 'object' && entry.km_atuais) {
        if (entry.matricula === 'AM-96-11' && entry.km_atuais < 98620) continue;
        if (entry.matricula === 'AM-96-12' && entry.km_atuais < 105888) continue;
        if (entry.matricula === 'AM-96-13' && entry.km_atuais < 102614) continue;
        if (entry.km_atuais < 90000) continue;
      }
      cleaned[key] = val;
    }
    return cleaned;
  } catch (err) {
    return {};
  }
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
