// Importe le client Supabase
import { createClient } from '@supabase/supabase-js';

// Constantes pour les types de chants
const CHANT_TYPES = ['Entree', 'Ordinaire', 'Offertoire', 'Communion', 'Sortie'];

// Crée le client Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(request, response) {
  try {
    // 1. Récupère les paramètres de l'URL
    const { temps, type } = request.query;
    const tempsLiturgique = temps || 'Ordinaire';

    // 2. Scénario B : L'utilisateur "relance" UN SEUL chant
    if (type) {
      
      // === MODIFICATION ===
      // On appelle notre nouvelle fonction "get_random_chant"
      const { data, error } = await supabase.rpc('get_random_chant', {
        chant_type: type,
        chant_temps: tempsLiturgique
      }).single(); // .single() pour obtenir un objet unique

      if (error) throw error; // S'il y a une erreur, on l'arrête

      // Renvoie le chant trouvé
      return response.status(200).json({ chant: data });

    } 
    // 3. Scénario A : L'utilisateur génère les 5 chants
    else {
      
      // === MODIFICATION ===
      // On prépare 5 appels à notre nouvelle fonction
      const queries = CHANT_TYPES.map(chantType =>
        supabase.rpc('get_random_chant', {
          chant_type: chantType,
          chant_temps: tempsLiturgique
        }).single() // .single() pour chaque appel
      );

      // On exécute les 5 appels en parallèle
      const results = await Promise.all(queries);

      // On formate la réponse
      const propositions = {};
      results.forEach((result, index) => {
        const chantTypeKey = CHANT_TYPES[index];
        
        if (result.error) {
          // Si la fonction ne trouve rien, elle renvoie une erreur
          console.warn(`Pas de chant trouvé pour ${chantTypeKey} / ${tempsLiturgique}`, result.error.message);
          propositions[chantTypeKey] = null;
        } else {
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
