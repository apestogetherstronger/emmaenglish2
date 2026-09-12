import { createAvatar } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';

export function avatarDataUri(profile) {
  const options = { seed: 'emma-english', size: 280, style: ['circle'], facialHairProbability: 0, eyebrows: ['defaultNatural'], clothingGraphic: ['diamond'], accessoriesProbability: profile.accessories === 'none' ? 0 : 100 };
  for (const field of ['top', 'clothing', 'eyes', 'mouth', 'skinColor', 'hairColor', 'clothesColor', 'hatColor', 'accessoriesColor', 'backgroundColor']) options[field] = [profile[field]];
  if (profile.accessories !== 'none') options.accessories = [profile.accessories];
  const svg = createAvatar(avataaars, options).toString();
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
