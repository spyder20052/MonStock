import {
    BookOpen, Search, Home, ShoppingCart, Package, Users, BarChart2,
    DollarSign, Settings, AlertTriangle, Clock, ChevronRight, ExternalLink,
    CheckCircle, Info, Lightbulb, Zap, Shield, TrendingUp, FileText, Utensils,
    Award
} from 'lucide-react';

export const helpContent = {
    introduction: {
        title: "Bienvenue sur MonStock",
        subtitle: "Votre manuel complet pour maîtriser l'application de gestion",
        sections: [
            {
                title: "Introduction Générale",
                icon: BookOpen,
                color: "indigo",
                content: "MonStock est bien plus qu'une simple caisse enregistreuse. C'est un véritable système d'exploitation pour votre commerce. Conçu pour centraliser toutes vos opérations, il vous permet de piloter votre activité en temps réel, que vous soyez au comptoir, dans l'arrière-boutique ou en déplacement."
            },
            {
                title: "Philosophie de l'Application",
                icon: Lightbulb,
                color: "amber",
                content: "L'application est construite autour de trois piliers fondamentaux :",
                items: [
                    "<strong>Simplicité & Rapidité</strong> : Chaque action (vente, ajout de stock) est conçue pour être faite en un minimum de clics.",
                    "<strong>Traçabilité Totale</strong> : Rien ne se perd. Chaque mouvement de stock, chaque centime encaissé est enregistré et consultable.",
                    "<strong>Collaboration Sécurisée</strong> : Des outils puissants pour travailler en équipe sans compromettre la sécurité des données sensibles."
                ]
            },
            {
                title: "Navigation dans l'interface",
                icon: Search,
                color: "blue",
                content: "L'interface est divisée en zones claires pour une prise en main immédiate :",
                items: [
                    "<strong>Barre Latérale (Menu)</strong> : Votre centre de navigation principal. Accédez à tous les modules (Caisse, Stock, etc.). Sur mobile, elle est accessible via le bouton menu en haut à gauche.",
                    "<strong>Zone Principale</strong> : C'est ici que vous travaillez. Que ce soit la grille de produits de la caisse ou les tableaux de statistiques.",
                    "<strong>Barre d'Actions</strong> : Souvent située en haut à droite des pages, elle contient les boutons pour créer, exporter ou filtrer les données."
                ]
            }
        ]
    },
    quickstart: {
        title: "Démarrage Rapide",
        subtitle: "Les étapes essentielles pour lancer votre commerce",
        sections: [
            {
                title: "1. Configuration de votre Espace de Travail",
                icon: Settings,
                color: "slate",
                content: "Avant de commencer à vendre, assurez-vous que les bases sont prêtes.",
                steps: [
                    "Accédez à votre <strong>Profil</strong> via le menu.",
                    "Vérifiez les informations de votre entreprise (Nom, Devise).",
                    "Si vous avez des employés, allez dans l'onglet <strong>Équipe</strong> pour les inviter (rôle Admin requis)."
                ],
                action: { label: "Configurer mon Profil", path: "/profile" }
            },
            {
                title: "2. Création de votre Catalogue",
                icon: Package,
                color: "indigo",
                content: "Votre stock est le cœur de votre activité. Prenez le temps de bien le structurer.",
                steps: [
                    "Allez dans <strong>Produits & QR</strong>.",
                    "Utilisez le bouton <strong>+ Nouveau Produit</strong>.",
                    "Pour un produit simple (ex: Bouteille d'eau), entrez le nom, le prix de vente, le coût d'achat et le stock initial.",
                    "Pour un produit transformé (ex: Sandwich), nous verrons plus tard comment utiliser les Ingrédients.",
                    "N'oubliez pas d'ajouter une catégorie pour organiser votre caisse."
                ],
                action: { label: "Créer un Produit", path: "/inventory" }
            },
            {
                title: "3. Réaliser votre Première Vente",
                icon: ShoppingCart,
                color: "purple",
                content: "Testez le flux de vente pour vous familiariser.",
                steps: [
                    "Ouvrez le module <strong>Caisse (Scan)</strong>.",
                    "Cliquez sur un produit pour l'ajouter au panier.",
                    "Modifiez la quantité si besoin avec les boutons + et -.",
                    "Cliquez sur le bouton <strong>Payer</strong> en bas.",
                    "Entrez le montant reçu du client et validez.",
                    "Un reçu s'affiche : félicitations, votre première vente est enregistrée !"
                ],
                action: { label: "Aller à la Caisse", path: "/pos" }
            }
        ]
    },
    dashboard: {
        title: "Tableau de Bord",
        subtitle: "Le cockpit de votre activité en temps réel",
        sections: [
            {
                title: "Indicateurs de Performance (KPIs)",
                icon: BarChart2,
                color: "blue",
                content: "En haut de page, quatre cartes vous donnent le pouls de votre commerce pour la journée :",
                items: [
                    "<strong>Chiffre d'Affaires</strong> : Le montant total des ventes validées aujourd'hui. C'est l'argent qui est censé être dans la caisse.",
                    "<strong>Bénéfice Net</strong> : Calculé en temps réel (Prix de vente - Coût d'achat). C'est votre indicateur de rentabilité immédiat.",
                    "<strong>Nombre de Ventes</strong> : Le volume d'activité (nombre de tickets générés).",
                    "<strong>Alertes Critiques</strong> : Un indicateur rouge si des produits nécessitent votre attention immédiate (rupture de stock)."
                ]
            },
            {
                title: "Alertes Intelligentes",
                icon: AlertTriangle,
                color: "amber",
                content: "Ne laissez jamais une rupture de stock vous surprendre. Le système surveille votre inventaire en permanence.",
                items: [
                    "<strong>Stock Bas</strong> : Apparaît quand un produit atteint son seuil de sécurité défini.",
                    "<strong>Rupture</strong> : Le stock est à 0. Impossible de vendre ce produit (sauf configuration contraire).",
                    "<strong>Ingrédients</strong> : Pour les restaurants, vous êtes alerté si un ingrédient (ex: Farine) manque, même si le produit fini (ex: Pain) n'est pas techniquement à 0."
                ]
            },
            {
                title: "Graphiques d'Activité",
                icon: TrendingUp,
                color: "emerald",
                content: "Visualisez les tendances.",
                items: [
                    "Le graphique principal montre l'évolution des ventes heure par heure.",
                    "Comparez la performance d'aujourd'hui avec celle d'hier pour savoir si vous êtes en avance ou en retard sur vos objectifs."
                ]
            }
        ]
    },
    pos: {
        title: "Caisse & Point de Vente",
        subtitle: "Le module de vente optimisé pour la rapidité",
        sections: [
            {
                title: "Trois Façons d'Ajouter des Produits",
                icon: Zap,
                color: "yellow",
                content: "Adaptez l'utilisation à votre matériel et vos préférences :",
                items: [
                    "<strong>1. Clic Rapide (Tactile)</strong> : Touchez simplement les cartes produits sur la grille. Idéal pour les tablettes.",
                    "<strong>2. Recherche Intelligente</strong> : Commencez à taper le nom d'un produit (ex: 'Coca') pour filtrer instantanément la liste.",
                    "<strong>3. Scan Code-Barres</strong> : Utilisez le bouton 'Scan' pour activer la caméra ou utilisez une douchette USB/Bluetooth. Reconnaissance instantanée."
                ]
            },
            {
                title: "Gestion Avancée du Panier",
                icon: ShoppingCart,
                color: "purple",
                content: "Le panier n'est pas juste une liste, c'est un outil de commande complet.",
                items: [
                    "Modifiez les quantités directement.",
                    "Supprimez une ligne en cas d'erreur avec la petite corbeille.",
                    "Le <strong>Total</strong> est toujours visible et mis à jour instantanément."
                ]
            },
            {
                title: "Sélection du Client",
                icon: Users,
                color: "pink",
                content: "En haut du panier, cliquez sur 'Sélectionner un client'. Vous pourrez rechercher un habitué ou créer une fiche à la volée.",
                tip: "Une fois un client sélectionné, la vente lui sera rattachée pour son historique et ses points de fidélité."
            },
            {
                title: "Le Paiement Flexible",
                icon: DollarSign,
                color: "emerald",
                content: "Au moment de payer, plusieurs scénarios sont gérés :",
                items: [
                    "<strong>Espèces</strong> : Entrez le montant tendu par le client. L'application calcule automatiquement la monnaie à rendre.",
                    "<strong>Crédit (Dette)</strong> : Si un client est sélectionné, vous pouvez choisir de ne pas encaisser tout de suite. Le montant s'ajoute à sa dette.",
                    "<strong>Offert</strong> : Permet de sortir du stock sans encaissement (fidélité, consommation interne). Tracé comme une vente à 0 FCFA."
                ]
            }
        ]
    },
    products: {
        title: "Gestion des Produits & Stock",
        subtitle: "Maîtrisez votre inventaire de A à Z",
        sections: [
            {
                title: "Fiche Produit Détaillée",
                icon: FileText,
                color: "indigo",
                content: "Chaque produit contient des informations cruciales pour la gestion :",
                fields: [
                    "<strong>Nom & Catégorie</strong> : Pour l'organisation et la recherche.",
                    "<strong>Prix de Vente</strong> : Ce que paie le client.",
                    "<strong>Coût d'Achat</strong> : Ce que vous coûte le produit. La différence constitue votre marge brute.",
                    "<strong>Stock Actuel</strong> : La quantité physique disponible.",
                    "<strong>Stock Minimum</strong> : Le seuil qui déclenchera une alerte de réapprovisionnement.",
                    "<strong>Code-Barres / QR</strong> : Identifiant unique pour le scan."
                ]
            },
            {
                title: "Produits Composés (Recettes)",
                icon: Utensils,
                color: "orange",
                content: "Pour les restaurants et artisans qui transforment des matières premières.",
                example: "Exemple : Un 'Sandwich Poulet' n'a pas de stock propre. Il est composé de : 0.5 Baguette + 100g Poulet + 10g Mayonnaise.",
                tip: "Cochez 'Produit Composé' à la création. L'application vous demandera les ingrédients. Lors de la vente du Sandwich, le stock de Baguette et Poulet sera automatiquement déduit."
            },
            {
                title: "Génération de QR Codes",
                icon: Package,
                color: "slate",
                content: "L'application génère un QR code unique pour chaque produit. Vous pouvez les imprimer sur des étiquettes autocollantes et les coller sur vos articles ou sur des fiches en caisse pour scanner plus vite.",
                action: { label: "Imprimer des Codes", path: "/inventory" }
            }
        ]
    },
    ingredients: {
        title: "Ingrédients & Matières Premières",
        subtitle: "Gérez ce qui compose vos produits finis",
        sections: [
            {
                title: "Pourquoi des Ingrédients ?",
                icon: Utensils,
                color: "orange",
                content: "Si vous vendez des plats, des jus ou des assemblages, vous achetez de la farine, des fruits, du sucre... pas le produit fini. Ce module permet de suivre le stock de ces matières premières invisibles pour le client mais vitales pour vous."
            },
            {
                title: "Unités de Mesure",
                icon: Settings,
                color: "slate",
                content: "Contrairement aux produits (vendus à l'unité), les ingrédients se gèrent en :",
                items: [
                    "<strong>Kilogrammes (kg) / Grammes (g)</strong> : Pour la farine, la viande...",
                    "<strong>Litres (L) / Millilitres (mL)</strong> : Pour l'huile, le lait, les boissons...",
                    "<strong>Unités</strong> : Pour les œufs, les emballages..."
                ]
            },
            {
                title: "Calcul de Coût de Revient",
                icon: DollarSign,
                color: "emerald",
                content: "En définissant le coût de vos ingrédients, l'application peut calculer combien vous coûte réellement la production d'un plat, vous aidant à fixer le bon prix de vente."
            }
        ]
    },
    customers: {
        title: "Gestion Clients & Fidélité",
        subtitle: "Transformez vos visiteurs en habitués",
        sections: [
            {
                title: "La Fiche Client 360°",
                icon: Users,
                color: "pink",
                content: "Tout savoir sur votre client en un coup d'œil :",
                items: [
                    "<strong>Coordonnées</strong> : Téléphone (essentiel pour les relances), Email, Adresse.",
                    "<strong>Solde (Dette)</strong> : Ce qu'il vous doit actuellement.",
                    "<strong>Total Dépensé</strong> : Chiffre d'affaires total généré par ce client (Valeur vie client).",
                    "<strong>Dernière Visite</strong> : Permet de repérer les clients perdus à relancer."
                ]
            },
            {
                title: "Système de Dette & Crédit",
                icon: BookOpen,
                color: "red",
                content: "Gérez le carnet de crédit numériquement.",
                steps: [
                    "Lors d'une vente, choisissez 'Crédit'. La somme s'ajoute au solde du client.",
                    "Quand le client passe payer, allez sur sa fiche et cliquez sur <strong>Rembourser</strong>.",
                    "Vous pouvez accepter des remboursements partiels. Le solde est mis à jour automatiquement."
                ]
            },
            {
                title: "Segmentation Automatique",
                icon: Award,
                color: "yellow",
                content: "L'application classe vos clients pour vous aider à mieux les traiter :",
                items: [
                    "🥉 <strong>Nouveau</strong> : À choyer pour les faire revenir.",
                    "🥈 <strong>Régulier</strong> : Venant fréquemment.",
                    "🥇 <strong>VIP</strong> : Vos meilleurs clients par chiffre d'affaires. Méritent une attention particulière."
                ]
            }
        ]
    },
    analytics: {
        title: "Analyses & Rapports",
        subtitle: "Prenez des décisions basées sur des données",
        sections: [
            {
                title: "Explorer le Temps",
                icon: Clock,
                color: "blue",
                content: "Ne vous limitez pas à aujourd'hui. Utilisez les filtres (7 jours, Ce mois, Cette année) pour voir les tendances. Est-ce que vos ventes augmentent ? Y a-t-il une saisonnalité ?"
            },
            {
                title: "Top Produits & Flops",
                icon: TrendingUp,
                color: "emerald",
                content: "Le classement des ventes vous montre :",
                items: [
                    "<strong>Les Best-Sellers</strong> : Vos vaches à lait. Assurez-vous de ne jamais être en rupture de stock sur eux.",
                    "<strong>Les Invendus</strong> : Les produits qui dorment en rayon et immobilisent votre trésorerie. Peut-être faut-il faire une promotion ?"
                ]
            },
            {
                title: "Export Comptable",
                icon: FileText,
                color: "slate",
                content: "Besoin de partager les chiffres ? Vous pouvez exporter les rapports de ventes pour votre comptable ou pour une analyse approfondie dans Excel."
            }
        ]
    },
    finance: {
        title: "Gestion Financière Complète",
        subtitle: "Maîtrisez vos flux de trésorerie",
        sections: [
            {
                title: "Au-delà des Ventes : Les Dépenses",
                icon: DollarSign,
                color: "red",
                content: "Le chiffre d'affaires n'est pas votre bénéfice. Pour connaître votre vraie rentabilité, il faut déduire les charges. Enregistrez ici : loyers, factures d'électricité, salaires, achats de matériel, frais de transport, etc.",
                action: { label: "Saisir une Dépense", path: "/expenses" }
            },
            {
                title: "Le Rapport P&L (Profits & Pertes)",
                icon: BarChart2,
                color: "green",
                content: "C'est le juge de paix de votre activité.",
                items: [
                    "<strong>Total Revenus</strong> (Ventes)",
                    "<strong>Moins Coût des Marchandises</strong> (Coût d'achat des produits vendus)",
                    "<strong>Moins Dépenses Opérationnelles</strong> (Loyer, Salaires...)",
                    "<strong>= Résultat Net</strong> : C'est ce que vous avez réellement gagné à la fin du mois."
                ]
            }
        ]
    },
    team: {
        title: "Administration & Équipe",
        subtitle: "Gérez vos collaborateurs et la sécurité",
        sections: [
            {
                title: "Les Rôles Utilisateurs",
                icon: Shield,
                color: "indigo",
                content: "Chaque membre a un accès adapté à sa fonction pour sécuriser votre commerce :",
                roles: [
                    { name: "Admin", permissions: ["Accès Total. configuration, suppression, vue financière complète."] },
                    { name: "Manager", permissions: ["Gestion quotidienne. Peut modifier stock, clients, voir les ventes. Pas de suppression critique sans approbation."] },
                    { name: "Employé", permissions: ["Vente uniquement. Accès caisse. Ne peut pas voir les rapports financiers ni modifier le stock."] }
                ]
            },
            {
                title: "Journal d'Activité (Audit Log)",
                icon: FileText,
                color: "slate",
                content: "La confiance n'exclut pas le contrôle. Chaque action sensible est enregistrée :",
                items: [
                    "Qui a supprimé une vente ?",
                    "Qui a modifié le stock manuellement ?",
                    "Qui a offert un produit ?",
                    "Tout est consultable avec l'heure et l'auteur de l'action."
                ]
            },
            {
                title: "Système d'Approbations",
                icon: CheckCircle,
                color: "green",
                content: "Pour les actions irréversibles (supprimer un gros client, supprimer un produit avec historique), un employé ne peut pas agir seul. Il fait une demande, et une notification apparaît chez l'Administrateur pour validation."
            }
        ]
    },
    faq: {
        title: "Foire Aux Questions",
        subtitle: "Solutions aux problèmes courants",
        sections: [
            {
                title: "Technique & Connexion",
                icon: Info,
                color: "blue",
                content: "Questions fréquentes sur l'accès et le réseau.",
                items: [
                    "<strong>Mot de passe perdu ?</strong> Utilisez le lien sur la page de connexion, vous recevrez un email.",
                    "<strong>Mode Hors Ligne ?</strong> L'application continue de fonctionner (Caisse) si internet coupe. Les données s'envoient dès que la connexion revient.",
                    "<strong>Plusieurs Appareils ?</strong> Oui, connectez-vous sur votre téléphone et votre ordinateur en même temps. Tout est synchronisé."
                ]
            },
            {
                title: "Données & Sécurité",
                icon: Shield,
                color: "emerald",
                content: "Questions sur la confidentialité et la protection des données.",
                items: [
                    "<strong>Mes données sont-elles sûres ?</strong> Oui, hébergées sur le cloud sécurisé de Google (Firebase).",
                    "<strong>Sauvegardes ?</strong> Elles sont automatiques et continues. Pas besoin de bouton 'Sauvegarder'.",
                    "<strong>Export ?</strong> Oui, vos données vous appartiennent. Export CSV disponible."
                ]
            }
        ]
    }
};
