// Importe le client Supabase
import { createClient } from '@supabase/supabase-js';

// Constantes pour les types de chants (doivent correspondre à index.html)
const CHANT_TYPES = ['Entree', 'Ordinaire', 'Offertoire', 'Communion', 'Sortie'];

// Crée le client Supabase en utilisant les variables d'environnement
// C'est sécurisé : ces clés ne sont jamais visibles par l'utilisateur
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Utilise la clé "service_role" pour le backend
);

// La fonction "handler" est le point d'entrée de la fonction serverless Vercel
export default async function handler(request, response) {
  try {
    // 1. Récupère les paramètres de l'URL (ex: /api/getChants?temps=Avent&type=Entree)
    const { temps, type } = request.query;

    // Définit le temps liturgique (par défaut 'Ordinaire' si non fourni)
    const tempsLiturgique = temps || 'Ordinaire';

    // 2. Scénario B : L'utilisateur "relance" UN SEUL chant
    if (type) {
      
      // Requête pour un seul chant aléatoire d'un type et temps spécifiques
      const { data, error } = await supabase
        .from('chants')                          // Depuis la table 'chants'
        .select('*')                             // Sélectionne toutes les colonnes
        .eq('type', type)                        // Où le type correspond (ex: 'Entree')
        .eq('temps_liturgique', tempsLiturgique) // Et le temps correspond
        .order('random()')                       // Trié aléatoirement (magie de PostgreSQL)
        .limit(1)                                // Prends-en un seul
        .single();                               // Renvoie un objet (pas un tableau)

      // Gère les erreurs de la requête
      if (error) {
        // Si 'single()' ne trouve rien, il renvoie une erreur "PGRST116"
        // Ce n'est pas une "vraie" erreur, c'est juste qu'il n'y a pas de chant
        if (error.code === 'PGRST116') {
          return response.status(200).json({ chant: null }); // Renvoie null si aucun chant trouvé
        }
        // Pour les autres erreurs, on les renvoie
        throw error;
      }

      // Renvoie le chant trouvé (format attendu par index.html : { chant: {...} })
      return response.status(200).json({ chant: data });

    } 
    // 3. Scénario A : L'utilisateur génère les 5 chants
    else {
      
      // On crée 5 promesses de requêtes (une pour chaque type)
      const queries = CHANT_TYPES.map(chantType =>
        supabase
          .from('chants')
          .select('*')
          .eq('type', chantType)
          .eq('temps_liturgique', tempsLiturgique)
          .order('random()')
          .limit(1)
          .single() // On veut un seul objet par type
      );

      // On exécute les 5 requêtes en parallèle pour être plus rapide
      const results = await Promise.all(queries);

      // On formate la réponse comme attendu par index.html
      // { propositions: { Entree: {...}, Ordinaire: {...}, ... } }
      const propositions = {};
      
      results.forEach((result, index) => {
        const chantTypeKey = CHANT_TYPES[index];
        
        if (result.error) {
          // Si une requête échoue (ex: pas de chant 'Sortie' pour 'Avent')
          console.warn(`Pas de chant trouvé pour ${chantTypeKey} / ${tempsLiturgique}`);
          propositions[chantTypeKey] = null; // On envoie null
        } else {
          propositions[chantTypeKey] = result.data; // On envoie le chant
        }
      });

      // Renvoie l'objet complet des propositions
      return response.status(200).json({ propositions });
    }

  } catch (error) {
    // 4. Gestion globale des erreurs
    console.error('Erreur dans l\'API getChants:', error.message);
    return response.status(500).json({ 
      error: 'Erreur lors de la récupération des chants', 
      details: error.message 
    });
  }
}


