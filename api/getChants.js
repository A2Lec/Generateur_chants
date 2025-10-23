// Importe le client Supabase
import { createClient } from '@supabase/supabase-js';

// Constantes pour les types de chants (doivent correspondre à index.html)
const CHANT_TYPES = ['Entree', 'Ordinaire', 'Offertoire', 'Communion', 'Sortie'];

// Crée le client Supabase en utilisant les variables d'environnement
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Utilise la clé "service_role" pour le backend
);

// La fonction "handler" est le point d'entrée de la fonction serverless Vercel
export default async function handler(request, response) {
  try {
    // 1. Récupère les paramètres de l'URL
    const { temps, type } = request.query;

    // 2. Scénario B : L'utilisateur "relance" UN SEUL chant
    if (type) {
      
      // Requête pour un seul chant aléatoire d'un type
      // TEST: Nous avons retiré le filtre "temps_liturgique"
      const { data, error } = await supabase
        .from('chants')                          // Depuis la table 'chants'
        .select('*')                             // Sélectionne toutes les colonnes
        .eq('type', type)                        // Où le type correspond (ex: 'Entree')
        // .eq('temps_liturgique', tempsLiturgique) // LIGNE SUPPRIMÉE POUR LE TEST
        .order('random()')                       // Trié aléatoirement
        .limit(1)                                // Prends-en un seul
        .single();                               // Renvoie un objet

      // Gère les erreurs de la requête
      if (error) {
        if (error.code === 'PGRST116') {
          return response.status(200).json({ chant: null }); 
        }
        throw error;
      }

      // Renvoie le chant trouvé
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
          // .eq('temps_liturgique', tempsLiturgique) // LIGNE SUPPRIMÉE POUR LE TEST
          .order('random()')
          .limit(1)
          .single()
      );

      // On exécute les 5 requêtes en parallèle
      const results = await Promise.all(queries);

      // On formate la réponse
      const propositions = {};
      
      results.forEach((result, index) => {
        const chantTypeKey = CHANT_TYPES[index];
        
        // CORRECTION DE LOGIQUE : On vérifie si l'erreur EST PGRST116
        // Si c'est le cas (0 résultat), ce n'est pas une "vraie" erreur.
        if (result.error && result.error.code !== 'PGRST116') {
           // C'est une vraie erreur (ex: connexion)
           console.error(`Erreur Supabase pour ${chantTypeKey}:`, result.error.message);
           propositions[chantTypeKey] = null;
        }
        else if (result.error && result.error.code === 'PGRST116') {
            // Pas de chant trouvé, on le logue
            console.warn(`Pas de chant trouvé pour ${chantTypeKey} (sans filtre de temps)`);
            propositions[chantTypeKey] = null;
        }
        else {
          // Tout va bien, on envoie la donnée
          propositions[chantTypeKey] = result.data; 
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
