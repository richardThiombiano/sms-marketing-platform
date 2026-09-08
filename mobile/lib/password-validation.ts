/**
 * Validation de la force du mot de passe côté client.
 * Mêmes règles que le backend pour éviter les allers-retours inutiles.
 */

export function validatePassword(password: string): { valid: boolean; error: string | null } {
  if (password.length < 8) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre majuscule' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre minuscule' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  return { valid: true, error: null };
}
