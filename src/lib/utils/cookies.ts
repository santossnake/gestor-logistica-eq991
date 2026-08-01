import Cookies from 'js-cookie';

export interface MilitaryProfile {
  nip: string;
  nome: string;
  posto: string;
  email: string;
}

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
