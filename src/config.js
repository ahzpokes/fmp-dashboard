/**
 * Configuration du dashboard.
 * Modifiez ces constantes pour adapter le dashboard à votre dépôt.
 */

export const GITHUB_USER = 'VOTRE_USERNAME';
export const GITHUB_REPO = 'eurocontrol-dashboard';
export const DATA_BRANCH = 'data';
export const DATA_PATH = 'data/traffic_data.json';

/**
 * URL jsDelivr pour récupérer les données à jour sans rebuild.
 * Cache 12h sur les branches, mais deploybase purge son edge cache à chaque deploy.
 */
export const DATA_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${DATA_BRANCH}/${DATA_PATH}`;