import type { World } from '../../../shared/schemas/oil-crisis.ts';

export interface PresidentName { readonly firstName: string; readonly lastName: string }

export function validatePresident(value: unknown): PresidentName {
  if (!value || typeof value !== 'object' || !('firstName' in value) || !('lastName' in value)) {
    throw Error('Enter the president’s first and last name.');
  }
  function name(part: unknown, label: string) {
    if (typeof part !== 'string' || /[<>\u0000-\u001f\u007f]/.test(part)) throw Error(`Enter a valid ${label}.`);
    const normalized = part.trim().normalize('NFC').replace(/\s+/g, ' ');
    if (!normalized || normalized.length > 60) throw Error(`The president’s ${label} must be between 1 and 60 characters.`);
    return normalized;
  }
  return Object.freeze({ firstName: name(value.firstName, 'first name'), lastName: name(value.lastName, 'last name') });
}

export function presidentFor(world: World): PresidentName | undefined {
  const campaign = world.events.find(event => event.campaign?.kind === 'launch')?.campaign;
  return campaign?.kind === 'launch' ? campaign.president : undefined;
}

export function presidentTitle(world: World) {
  const president = presidentFor(world);
  return president ? `President ${president.firstName} ${president.lastName}` : 'President';
}
