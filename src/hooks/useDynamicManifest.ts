import { useEffect } from 'react';

// Mapping slug ↔ nom court affiché sous l'icône PWA (iOS & Android)
const ACC_SHORT_NAMES: Record<string, string> = {
  brest: 'Brest',
  reims: 'Reims',
  bordeaux: 'Bordeaux',
  marseille: 'Marseille',
  paris: 'Paris',
};

// Slug utilisé par défaut si le pathname ne correspond à aucun ACC connu
const DEFAULT_SLUG = 'reims';

/**
 * Extrait le slug d'ACC depuis le pathname.
 * Ex : '/brest' → 'brest', '/' → null, '/inconnu' → null
 */
function slugFromPathname(pathname: string): string | null {
  const cleaned = pathname.replace(/^\/|\/$/g, '').toLowerCase();
  return cleaned in ACC_SHORT_NAMES ? cleaned : null;
}

/**
 * Hook useDynamicManifest
 *
 * S'exécute une seule fois au montage. Il :
 *  1. Lit window.location.pathname pour identifier l'ACC courant.
 *  2. Met à jour le <link id="pwa-manifest"> vers manifest-<acc>.json.
 *  3. Met à jour <meta name="apple-mobile-web-app-title"> pour iOS.
 *  4. Met à jour <title> pour la cohérence dans le gestionnaire de tâches.
 *
 * Aucune dépendance tableau : le pathname ne change pas après le premier
 * rendu (le routage utilise history.replaceState, pas une navigation complète).
 */
export function useDynamicManifest(): void {
  useEffect(() => {
    // Identifie l'ACC depuis l'URL, ou utilise le fallback
    const slug = slugFromPathname(window.location.pathname) ?? DEFAULT_SLUG;
    const shortName = ACC_SHORT_NAMES[slug];

    // ── 1. Mise à jour du manifest pour Chrome / Android ──────────────────
    const manifestLink = document.getElementById('pwa-manifest') as HTMLLinkElement | null;
    if (manifestLink) {
      manifestLink.href = `/manifest-${slug}.json`;
    }

    // ── 2. Mise à jour du titre iOS (apple-mobile-web-app-title) ──────────
    // Safari lit cette balise au moment du "Add to Home Screen" ;
    // on la met à jour avant que l'utilisateur ne déclenche cette action.
    const appleTitle = document.getElementById('apple-mobile-title') as HTMLMetaElement | null;
    if (appleTitle) {
      appleTitle.content = shortName;
    }

    // ── 3. Mise à jour du <title> de la page ──────────────────────────────
    document.title = `DSNA Delay Dashboard - ${shortName}`;
  }, []); // Tableau vide : s'exécute une seule fois au montage
}
