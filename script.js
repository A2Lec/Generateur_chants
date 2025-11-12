document.addEventListener('DOMContentLoaded', () => {
            
    // Références aux éléments du DOM
    const btnGenerer = document.getElementById('btn-generer');
    const selectTemps = document.getElementById('select-temps');
    const resultsContainer = document.getElementById('results-container');
    const cardTemplate = document.getElementById('chant-card-template');
    const body = document.body;

    // --- NOUVEAU : Logique de Thème ---
    
    /**
     * Applique la classe de thème au body en fct du temps liturgique.
     * @param {string} temps - La valeur du sélecteur (ex: "Avent").
     */
    function applyTheme(temps) {
        // Retire toutes les classes de thème possibles
        body.classList.remove('theme-Ordinaire', 'theme-Avent', 'theme-Careme', 'theme-Noel', 'theme-Paques');
        // Ajoute la classe de thème actuelle
        body.classList.add(`theme-${temps}`);
    }

    // --- Fonctions d'aide pour l'UI ---

    function updateCardContent(card, chant) {
        card.querySelector('.card-error').classList.add('hidden');
        card.querySelector('.card-content').classList.remove('hidden');

        const nomChant = card.querySelector('.chant-nom');

        if (!chant) {
            card.querySelector('.card-error').classList.remove('hidden');
            card.querySelector('.card-content').classList.add('hidden');
            return;
        }

        nomChant.textContent = chant.nom ? chant.nom : 'Nom non trouvé';
        
        const pageCarnet = card.querySelector('.page-carnet');
        pageCarnet.textContent = chant.numero_carnet ? `N° : ${chant.numero_carnet}` : 'N° : N/A';
        pageCarnet.insertAdjacentHTML('afterbegin', '<i data-lucide="book-open" class="w-4 h-4 mr-2 text-gray-400"></i>');

        const lienPartition = card.querySelector('.lien-partition');
        if (chant.lien_partition) {
            lienPartition.href = chant.lien_partition;
            lienPartition.classList.remove('hidden');
        } else {
            lienPartition.classList.add('hidden');
        }
        
        lucide.createIcons();
    }

    function setMainLoading(isLoading) {
        btnGenerer.disabled = isLoading;
        if(isLoading) {
            // Remplace le texte par un spinner
            btnGenerer.innerHTML = '<span class="spinner w-5 h-5 border-white mx-auto"></span>';
        } else {
            btnGenerer.textContent = 'Générer les propositions';
        }
    }

    function setCardLoading(card, isLoading) {
        const spinner = card.querySelector('.card-spinner');
        const button = card.querySelector('.btn-relancer');
        spinner.classList.toggle('hidden', !isLoading);
        button.classList.toggle('hidden', isLoading);
    }

    function createInitialCards() {
        resultsContainer.innerHTML = '';
        const types = [
            { key: 'Entree', label: 'Entrée' },
            { key: 'Ordinaire', label: 'Ordinaire' },
            { key: 'Offertoire', label: 'Offertoire' },
            { key: 'Communion', label: 'Communion' },
            { key: 'Sortie', label: 'Sortie' }
        ];

        types.forEach((type, index) => {
            const cardClone = cardTemplate.content.cloneNode(true);
            const cardElement = cardClone.firstElementChild;
            
            cardElement.querySelector('.card-title-text').textContent = type.label;
            cardElement.querySelector('.btn-relancer').dataset.type = type.key;
            
            cardElement.querySelector('.card-content').classList.add('hidden');
            cardElement.querySelector('.card-error').classList.add('hidden');
            cardElement.querySelector('.chant-nom').textContent = '...';
            
            // Applique un délai d'animation (défini dans style.css)
            cardElement.style.animationDelay = `${index * 50}ms`;

            resultsContainer.appendChild(cardElement);
        });
        lucide.createIcons();
    }

    // --- Logique Principale ---

    async function handleGenererPropositions() {
        setMainLoading(true);
        createInitialCards(); 

        const temps = selectTemps.value;
        const allCards = resultsContainer.querySelectorAll('.chant-card');

        try {
            // Appel API Réel
            const response = await fetch(`/api/getChants?temps=${temps}`);
            if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
            const data = await response.json();
            
            if (data.propositions) {
                allCards.forEach(card => {
                    const cardType = card.querySelector('.btn-relancer').dataset.type;
                    const chantData = data.propositions[cardType];
                    updateCardContent(card, chantData);
                });
            }

        } catch (error) {
            console.error('Erreur lors de la génération :', error);
            resultsContainer.innerHTML = `<p class="text-red-600 col-span-2 text-center">Erreur de connexion avec l'API. (${error.message})</p>`;
        } finally {
            setMainLoading(false);
        }
    }

    async function handleRelancerUnChant(event) {
        const btn = event.target.closest('.btn-relancer');
        
        if (btn) {
            const type = btn.dataset.type;
            const temps = selectTemps.value;
            const card = btn.closest('.chant-card');
            
            setCardLoading(card, true); 

            try {
                const response = await fetch(`/api/getChants?type=${type}&temps=${temps}`);
                if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
                const data = await response.json();

                if (data.chant) {
                    updateCardContent(card, data.chant);
                } else {
                    // S'assure que même si la data est 'null', on l'affiche
                    updateCardContent(card, null);
                }
            } catch (error) {
                 console.error('Erreur lors du relancement :', error);
                 updateCardContent(card, null); // Affiche l'erreur sur la carte
            } finally {
                setCardLoading(card, false);
            }
        }
    }
    
    // Initialise les icônes et le thème
    lucide.createIcons();
    applyTheme(selectTemps.value); // Applique le thème au chargement

    // Attache les écouteurs d'événements
    btnGenerer.addEventListener('click', handleGenererPropositions);
    resultsContainer.addEventListener('click', handleRelancerUnChant);
    
    // NOUVEAU : Change le thème quand le sélecteur change
    selectTemps.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });

});