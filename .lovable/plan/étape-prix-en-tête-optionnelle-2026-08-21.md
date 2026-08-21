# Étape « Prix en tête » (optionnelle)

Ajouter une 7e étape au parcours d'estimation, placée juste après la question sur l'horizon de cession, demandant si le propriétaire a déjà un prix en tête pour son actif.

## Ce que voit l'utilisateur

- Le parcours passe de 6 à 7 étapes (barre de progression mise à jour).
- Étape 7 : « Avez-vous déjà un prix en tête ? »
  - Un champ montant en euros, formaté à la française, entièrement facultatif.
  - Un texte rassurant : information confidentielle, sans influence sur le calcul de la fourchette.
  - Le bouton final reste actif même si le champ est vide (aucune validation bloquante).
- Sur la page de résultat : si un prix a été saisi, une ligne discrète le rappelle et indique s'il se situe en dessous, dans, ou au-dessus de la fourchette estimée.

## Détails techniques

1. Base de données : migration ajoutant `price_expectation_cents bigint null` à `public.estimation` (aucun changement de RLS ni de grants nécessaire).
2. Types : régénération des types Supabase.
3. `src/lib/estimation-storage.ts` : nouveau champ `priceExpectationCents?: number` dans `EstimationDraft` (persisté dans le brouillon localStorage).
4. `src/routes/estimation.tsx` :
   - `TOTAL_STEPS` passe à 7 ;
   - nouveau composant `Step7` avec saisie euro via `parseEuros` / `formatEuros` ;
   - `validateStep` case 7 : uniquement un contrôle de cohérence (montant positif et plafonné) si une valeur est saisie, sinon `null` ;
   - envoi du champ dans le payload de `submitEstimation`.
5. `src/lib/estimation.functions.ts` : ajout de `priceExpectationCents` (entier, optionnel, nullable) au schéma Zod et à l'insert. Le champ n'entre pas dans `computeValuation` — la valorisation reste inchangée.
6. `src/components/estimation-result-view.tsx` : affichage du positionnement du prix souhaité par rapport à la fourchette.
7. `src/routes/admin.rapports.tsx` : colonne « Prix souhaité » dans le tableau des leads et dans l'export CSV.
