/**
 * Client GraphQL pour interroger la base Nhost.
 *
 * On utilise fetch directement (pas @nhost/nhost-js) car on a seulement
 * besoin de lire des données publiques, sans authentification.
 *
 * Toutes les requêtes vont sur l'endpoint Hasura qui expose la table
 * daily_acc_data avec une permission select publique.
 */

const GRAPHQL_URL =
  'https://hjsvawbaeqyjrdwmaole.hasura.eu-central-1.nhost.run/v1/graphql';

/**
 * Effectue une requête GraphQL POST et retourne les données.
 *
 * @param query - La requête GraphQL (chaîne)
 * @param variables - Les variables optionnelles de la requête
 * @throws Error si la réponse contient des erreurs GraphQL
 */
export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Erreur HTTP ${res.status} lors de la requête GraphQL`);
  }

  const json = await res.json();

  if (json.errors && json.errors.length > 0) {
    const firstError = json.errors[0]?.message ?? 'Erreur GraphQL inconnue';
    throw new Error(firstError);
  }

  return json.data as T;
}