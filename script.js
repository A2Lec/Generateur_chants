// 'DOMContentLoaded' garantit que le script s'exécute après le chargement du HTML.
// C'est l'équivalent de 'defer' sur la balise <script>.
document.addEventListener('DOMContentLoaded', () => {
    
    // Références aux éléments du DOM
    const btnGenerer = document.getElementById('btn-generer');
    const selectTemps = document.getElementById('select-temps');
    const resultsContainer = document.getElementById('results-container');
    const cardTemplate = document.getElementById('chant-card-template');

    // --- Fonctions d'aide pour l'UI ---

    /**
     * Met à jour le contenu d'une carte avec les données d'un chant.
     * @param {HTMLElement} card - L'élément DOM de la carte.
     * @param {Object} chant - L'objet chant (ex: { nom: "...", numero_carnet: "184", lien_partition: "..." }).
     */
    function updateCardContent(card, chant) {
        // Cache l'erreur et montre le contenu
        card.querySelector('.card-error').classList.add('hidden');
        card.querySelector('.card-content').classList.remove('hidden');

        const nomChant = card.querySelector('.chant-nom');

        // Si le chant est 'null' (pas trouvé)
        if (!chant) {
            card.querySelector('.card-error').classList.remove('hidden');
            card.querySelector('.card-content').classList.add('hidden');
            return;
        }

        // Remplit le nom du chant
        nomChant.textContent = chant.nom ? chant.nom : 'Nom non trouvé';
        
        // Mettre à jour le numéro du carnet (nouvelle colonne 'numero_carnet')
        const pageCarnet = card.querySelector('.page-carnet');
        pageCarnet.textContent = chant.numero_carnet ? `N° : ${chant.numero_carnet}` : 'N° : N/A';
        // On ré-ajoute l'icône qui était dans le texte
        pageCarnet.insertAdjacentHTML('afterbegin', '<i data-lucide="book-open" class="w-4 h-4 mr-2"></i>');


        // Mettre à jour le lien de la partition (nouvelle colonne 'lien_partition')
        const lienPartition = card.querySelector('.lien-partition');
        if (chant.lien_partition) {
            lienPartition.href = chant.lien_partition; // Définit le lien
            lienPartition.classList.remove('hidden'); // Rend l'icône visible
        } else {
            lienPartition.classList.add('hidden'); // Cache l'icône si pas de lien
        }
        
        // Redessine les icônes qu'on vient d'ajouter
        // 'lucide' est une variable globale chargée par le script dans le <head>
        lucide.createIcons();
    }

    /**
     * Affiche/Cache le spinner principal (sur le gros bouton).
     * @param {boolean} isLoading - État de chargement.
     */
    function setMainLoading(isLoading) {
        btnGenerer.disabled = isLoading;
        btnGenerer.textContent = isLoading ? 'Génération...' : 'Générer les propositions';
    }

    /**
     * Affiche/Cache le spinner d'une carte individuelle.
     * @param {HTMLElement} card - L'élément DOM de la carte.
     * @param {boolean} isLoading - État de chargement.
     */
    function setCardLoading(card, isLoading) {
        const spinner = card.querySelector('.card-spinner');
        const button = card.querySelector('.btn-relancer');
        spinner.classList.toggle('hidden', !isLoading);
        button.classList.toggle('hidden', isLoading);
    }

    /**
     * Crée les 5 cartes "vides" au début.
     */
    function createInitialCards() {
        resultsContainer.innerHTML = ''; // Vide le conteneur
        const types = [
            { key: 'Entree', label: 'Entrée' },
            { key: 'Ordinaire', label: 'Ordinaire' },
            { key: 'Offertoire', label: 'Offertoire' },
            { key: 'Communion', label: 'Communion' },
            { key: 'Sortie', label: 'Sortie' }
        ];

        for (const type of types) {
            const cardClone = cardTemplate.content.cloneNode(true);
            cardClone.querySelector('.card-title').textContent = type.label;
            cardClone.querySelector('.btn-relancer').dataset.type = type.key;
            
            // Masque le contenu et l'erreur, montre le "chargement"
            cardClone.querySelector('.card-content').classList.add('hidden');
            cardClone.querySelector('.card-error').classList.add('hidden');
            cardClone.querySelector('.chant-nom').textContent = '...';

            resultsContainer.appendChild(cardClone.firstElementChild);
        }
        // 'lucide' est une variable globale chargée par le script dans le <head>
        lucide.createIcons(); // Active les nouvelles icônes
    }

    // --- Fonctions d'API (Simulation) ---
    // La simulation est commentée, nous utilisons l'API réelle.
    /*
    const mockDB = { ... };
    async function mockFetchAPI(url) { ... }
    */

    // --- Logique Principale ---

    /**
     * Gère le clic sur "Générer les propositions" (les 5 cartes).
     */
    async function handleGenererPropositions() {
        setMainLoading(true);
        createInitialCards(); // Crée les 5 cartes

        const temps = selectTemps.value;
        const allCards = resultsContainer.querySelectorAll('.chant-card');

        try {
            // --- Appel API Réel (Décommenté) ---
            const response = await fetch(`/api/getChants?temps=${temps}`);
            const data = await response.json();
            
            if (data.propositions) {
                // Met à jour chaque carte avec les données reçues
                allCards.forEach(card => {
                    const cardType = card.querySelector('.btn-relancer').dataset.type;
                    const chantData = data.propositions[cardType];
                    updateCardContent(card, chantData);
                });
            }

        } catch (error) {
            console.error('Erreur lors de la génération :', error);
            resultsContainer.innerHTML = '<p class="text-red-600">Erreur de connexion avec l\'API.</p>';
        } finally {
            setMainLoading(false);
        }
    }

    /**
     * Gère le clic sur l'icône "Relancer" (une seule carte).
     */
    async function handleRelancerUnChant(event) {
        const btn = event.target.closest('.btn-relancer');
        
        if (btn) {
            const type = btn.dataset.type; // Récupère le type (ex: "Entree")
            const temps = selectTemps.value;
            const card = btn.closest('.chant-card'); // Trouve la carte parente
            
            setCardLoading(card, true); // Affiche le spinner de la carte

            // --- Appel API Réel (Décommenté) ---
            const response = await fetch(`/api/getChants?type=${type}&temps=${temps}`);
            const data = await response.json();

            if (data.chant) {
                updateCardContent(card, data.chant); // Met à jour la carte
            }
            
            setCardLoading(card, false); // Cache le spinner de la carte
        }
    }
    
    // Initialise les icônes une première fois au chargement
    // 'lucide' est une variable globale chargée par le script dans le <head>
    lucide.createIcons();

    // Attache les écouteurs d'événements
    btnGenerer.addEventListener('click', handleGenererPropositions);
    resultsContainer.addEventListener('click', handleRelancerUnChant);

    // Le message initial est déjà dans le HTML, pas besoin de le rajouter ici.
});