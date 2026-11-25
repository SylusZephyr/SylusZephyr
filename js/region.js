// Emergency numbers follow where the person actually is. Region comes from the prayer-time city
// they picked (or its UTC offset for custom coordinates), then from the app language.
// Only numbers from official sources are listed; when unsure, the general emergency line is used.
import * as S from './store.js';

export const REGIONS = {
  CN: { label: 'China', ambulance: '120', crisis: [
    { name: 'Emergency ambulance', num: '120' },
    { name: 'National mental health hotline', num: '12356' },
    { name: 'Beijing Psychological Crisis Center (24h)', num: '010-82951332' },
  ] },
  HK: { label: 'Hong Kong', ambulance: '999', crisis: [{ name: 'Emergency services', num: '999' }] },
  PK: { label: 'Pakistan', ambulance: '1122', crisis: [
    { name: 'Rescue emergency service', num: '1122' },
    { name: 'Edhi ambulance', num: '115' },
  ] },
};

export function regionCode() {
  const st = S.get(); const p = st?.prayer || {};
  if (p.city === 'hongkong') return 'HK';
  if (['lahore', 'karachi', 'islamabad'].includes(p.city)) return 'PK';
  if (p.city === 'custom' && Number.isFinite(+p.tz)) return +p.tz === 5 ? 'PK' : 'CN';
  if (p.city) return 'CN';
  return st?.settings?.locale === 'ur' ? 'PK' : 'CN';
}
export const region = () => REGIONS[regionCode()];
