import type { World, WorldEvent } from '../shared/schemas/oil-crisis.ts';

export const mapCountries = [
  { id: 'freedoma', name: 'Freedoma', counterpart: 'United States', location: [-101, 39], color: '#6fa98c', flag: '#4b826b', panel: 'briefing' },
  { id: 'petrovia', name: 'Petrovia', counterpart: 'Russia', location: [98, 61], color: '#cfb579', flag: '#ad7256', panel: 'phone' },
  { id: 'karmenia', name: 'Karmenia', counterpart: 'Israel', location: [35.1, 32.1], color: '#94b7ce', flag: '#718fbe', panel: 'voss' },
  { id: 'lydian', name: 'Lydian Strip', counterpart: 'Gaza Strip', location: [34.36, 31.42], color: '#acb789', flag: '#789271', panel: 'voss' },
  { id: 'bellara', name: 'Bellara', counterpart: 'Ukraine', location: [31, 49], color: '#c8bd87', flag: '#b79858', panel: 'news' },
  { id: 'northhaven', name: 'Northhaven', counterpart: 'Belarus', location: [28, 54], color: '#b0a2c7', flag: '#8d729e', panel: 'news' },
  { id: 'eastmere', name: 'Eastmere', counterpart: 'Poland', location: [19, 52], color: '#8aacb4', flag: '#578b97', panel: 'news' },
] as const;
export type MapCountryId = typeof mapCountries[number]['id'];

export function worldMapProjection(world: World) {
  const borderEvent = world.events.findLast(event => event.news?.kind === 'border_dispute');
  const response = borderEvent && world.events.findLast(event => event.newsResponse?.newsId === borderEvent.news!.id);
  // The security crisis is part of the existing scenario. None of the current
  // responses records a ceasefire, so offering monitors must not erase it.
  const security = world.events.findLast(event => event.security)?.security;
  const securityReason = security?.reply === 'international_monitor' || security?.reply === 'humanitarian_corridor'
    ? 'Civilian safeguards proposed; the territorial conflict remains unresolved.'
    : 'Karmenia is seeking support against the Lydian Strip. Territorial conflict remains unresolved.';
  return {
    countries: mapCountries.map(country => {
      const securityConflict = country.id === 'karmenia' || country.id === 'lydian';
      const borderConflict = !!borderEvent && (country.id === 'bellara' || country.id === 'northhaven');
      return { ...country, conflict: securityConflict || borderConflict,
        reason: securityConflict ? securityReason : borderConflict
          ? `Disputed border crossing closed.${response ? ' Freedoma has responded; no settlement is recorded.' : ' PNN reports stalled talks.'}`
          : 'No active territorial conflict recorded.' };
    }),
    ties: [
      { a: 'bellara', b: 'northhaven', label: borderEvent ? 'Disputed crossing' : 'Shared border', conflict: !!borderEvent },
      { a: 'bellara', b: 'eastmere', label: 'Shared border', conflict: false },
      { a: 'karmenia', b: 'lydian', label: 'Territorial conflict', conflict: true },
    ],
  };
}

export function countryForMapEvent(event?: WorldEvent): MapCountryId {
  if (event?.security) return 'karmenia';
  if (event?.diplomacy) return 'petrovia';
  if (event?.news) return event.news.kind === 'shipping' ? 'eastmere' : event.news.kind === 'currency_talks' ? 'petrovia' : 'bellara';
  return 'freedoma';
}
