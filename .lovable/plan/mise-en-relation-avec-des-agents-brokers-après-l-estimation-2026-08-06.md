# Mise en relation avec des agents / brokers après l'estimation

Objectif : transformer une estimation en lead qualifié pour un brokage, en proposant au propriétaire une mise en relation avec des agents spécialisés hôtellerie.

## Parcours cible

```text
Estimation (6 étapes) -> Résultat de valorisation
        -> CTA "Être mis en relation avec un expert"
        -> /mise-en-relation/:token  (formulaire de qualification court)
        -> Confirmation + email au propriétaire + notification interne
        -> Admin : file de leads brokerage, attribution à un agent
```

## Ce qui sera construit

### 1. Page de mise en relation (`/mise-en-relation/$token`)
Accessible via le lien sécurisé de l'estimation (même mécanisme que le rapport).
- Rappel synthétique de l'hôtel et de la fourchette de valorisation.
- Formulaire de qualification en une page :
  - Intention : vendre sous 6 mois / 6-18 mois / explorer / céder le fonds seul.
  - Type d'opération souhaitée : murs + fonds, fonds seul, bail.
  - Mandat déjà signé avec une agence : oui / non.
  - Confidentialité souhaitée (vente discrète) : oui / non.
  - Disponibilités pour un échange + téléphone.
  - Consentement RGPD explicite pour le partage des coordonnées avec un agent.
- Bandeau de confiance : nombre de transactions, délai de réponse, discrétion.

### 2. Page publique « Nos experts » (`/experts`)
- Présentation des agents partenaires : zone géographique, segments, langues, transactions.
- Filtrage par région, lien vers la mise en relation.
- SEO : head() dédié, contenu indexable.

### 3. Matching agent
Règle déterministe, pas d'IA :
- filtre par région (puis départements limitrophes en repli),
- filtre par segment (catégorie étoiles, taille en chambres, type d'opération),
- tri par capacité disponible puis par ancienneté du dernier lead reçu (répartition équitable).
Si aucun agent ne correspond : le lead part en file « à attribuer manuellement » côté admin.

### 4. Admin
- Nouvel onglet `Agents` : CRUD agents (nom, société, email, régions, segments, capacité, actif).
- Nouvel onglet `Mise en relation` : liste des demandes avec statut
  (`nouveau`, `attribué`, `contacté`, `mandat`, `perdu`), agent assigné, notes,
  réattribution manuelle, export CSV.
- KPI ajoutés au dashboard : taux estimation -> demande de mise en relation,
  délai moyen d'attribution, taux de conversion en mandat.

### 5. Emails
Via le système d'emails Lovable, avec les templates existants :
- au propriétaire : confirmation, nom de l'agent, prochaine étape.
- à l'agent : brief du lead (hôtel, valorisation, intention, coordonnées).
- relance interne si un lead reste non attribué au-delà de 48 h.

### 6. Points d'entrée dans le site
- CTA principal sur la page de résultat d'estimation.
- Bloc en bas du rapport email.
- Lien discret dans les pages guides et prix par région.

## Détails techniques

- Tables : `broker_agent` (profil, régions, segments, capacité, actif),
  `brokerage_lead` (estimation_id, réponses de qualification, statut, agent_id,
  horodatages), `brokerage_lead_event` (audit d'attribution/changement de statut).
- RLS : lecture/écriture réservée aux admins ; insertion du lead effectuée
  côté serveur via server function avec le token d'estimation, jamais directement
  depuis le client. GRANT explicites sur chaque table.
- Server functions : `submitBrokerageRequest`, `assignAgent`, `updateLeadStatus`,
  `listBrokerageLeads` (admin).
- Anti-abus : réutilisation du contrôle de token + limitation d'une demande
  active par estimation.
- Validation Zod partagée client/serveur, messages d'erreur contextuels comme
  sur le funnel d'estimation.
- Tests : matching agent (région, repli, segment, capacité), unicité de la
  demande par estimation, transitions de statut.

## Hors périmètre pour cette étape
- Espace de connexion dédié aux agents (les agents reçoivent les leads par email).
- Signature électronique de mandat.
- Commissionnement et facturation.
