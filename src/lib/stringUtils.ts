/**
 * Normalizes a string for accent-insensitive comparison.
 * Removes accents and converts œ/æ to oe/ae.
 */
export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    // Replace œ and æ ligatures
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/Œ/g, 'oe')
    .replace(/Æ/g, 'ae')
    // Normalize unicode and remove diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Checks if a string contains another string, ignoring accents and ligatures.
 */
export const includesNormalized = (haystack: string, needle: string): boolean => {
  return normalizeString(haystack).includes(normalizeString(needle));
};
