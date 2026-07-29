/**
 * Benchmarks marché — fourchettes de prix par chambre (en euros)
 * observées sur les transactions hôtelières françaises 2023-2025.
 *
 * Sources agrégées : rapports Christie & Co, In Extenso THL, MKG Consulting,
 * KPMG European Hotels Valuation Index, transactions publiques BODACC.
 *
 * Ce sont des ORDRES DE GRANDEUR indicatifs pour un hôtel "standard" de la
 * zone (30-60 chambres, occupation ~60%, sans options exceptionnelles).
 * Ils servent à calibrer les coefficients du moteur — pas à valider une
 * transaction réelle.
 *
 * Structure : { regionSlug, starRating, transactionType, lowPerRoom, highPerRoom, note }
 * Valeurs en EUROS (pas en centimes) pour lisibilité.
 */

import type { TransactionType } from "@/lib/supabase/types";

export interface Benchmark {
  regionSlug: string;
  starRating: number;
  transactionType: TransactionType;
  /** Prix par chambre attendu, borne basse (€) */
  lowPerRoomEuros: number;
  /** Prix par chambre attendu, borne haute (€) */
  highPerRoomEuros: number;
  /** Contexte court affiché à l'admin */
  note: string;
}

export const BENCHMARKS: Benchmark[] = [
  // ─── Île-de-France (Paris intra-muros dominant) ───
  { regionSlug: "ile-de-france", starRating: 2, transactionType: "murs_fonds",
    lowPerRoomEuros: 90_000, highPerRoomEuros: 160_000,
    note: "2★ Paris/petite couronne — transactions 2023-24" },
  { regionSlug: "ile-de-france", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 180_000, highPerRoomEuros: 300_000,
    note: "3★ Paris intra-muros — benchmark Christie & Co" },
  { regionSlug: "ile-de-france", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 350_000, highPerRoomEuros: 700_000,
    note: "4★ Paris — écart selon arrondissement" },
  { regionSlug: "ile-de-france", starRating: 5, transactionType: "murs_fonds",
    lowPerRoomEuros: 700_000, highPerRoomEuros: 1_500_000,
    note: "5★/palace Paris — segment ultra-prime" },
  { regionSlug: "ile-de-france", starRating: 3, transactionType: "fonds",
    lowPerRoomEuros: 45_000, highPerRoomEuros: 90_000,
    note: "Fonds seul 3★ Paris (bail long, ~30% M+F)" },
  { regionSlug: "ile-de-france", starRating: 3, transactionType: "murs",
    lowPerRoomEuros: 110_000, highPerRoomEuros: 200_000,
    note: "Murs seuls 3★ Paris (~60-65% M+F)" },

  // ─── Provence-Alpes-Côte d'Azur (littoral) ───
  { regionSlug: "provence-alpes-cote-d-azur", starRating: 2, transactionType: "murs_fonds",
    lowPerRoomEuros: 60_000, highPerRoomEuros: 120_000,
    note: "2★ PACA hors littoral" },
  { regionSlug: "provence-alpes-cote-d-azur", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 140_000, highPerRoomEuros: 260_000,
    note: "3★ PACA — littoral / arrière-pays" },
  { regionSlug: "provence-alpes-cote-d-azur", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 300_000, highPerRoomEuros: 550_000,
    note: "4★ Côte d'Azur / Cannes / Nice" },
  { regionSlug: "provence-alpes-cote-d-azur", starRating: 5, transactionType: "murs_fonds",
    lowPerRoomEuros: 600_000, highPerRoomEuros: 1_200_000,
    note: "5★ littoral — Saint-Tropez, Cap-Ferrat" },

  // ─── Auvergne-Rhône-Alpes (Alpes + Lyon) ───
  { regionSlug: "auvergne-rhone-alpes", starRating: 2, transactionType: "murs_fonds",
    lowPerRoomEuros: 45_000, highPerRoomEuros: 95_000,
    note: "2★ Lyon / villes moyennes" },
  { regionSlug: "auvergne-rhone-alpes", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 110_000, highPerRoomEuros: 220_000,
    note: "3★ Lyon / stations moyennes" },
  { regionSlug: "auvergne-rhone-alpes", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 260_000, highPerRoomEuros: 500_000,
    note: "4★ Lyon / grandes stations alpines" },

  // ─── Nouvelle-Aquitaine (Bordeaux + Biarritz) ───
  { regionSlug: "nouvelle-aquitaine", starRating: 2, transactionType: "murs_fonds",
    lowPerRoomEuros: 40_000, highPerRoomEuros: 85_000, note: "2★ villes moyennes" },
  { regionSlug: "nouvelle-aquitaine", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 100_000, highPerRoomEuros: 200_000,
    note: "3★ Bordeaux / Côte basque" },
  { regionSlug: "nouvelle-aquitaine", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 220_000, highPerRoomEuros: 450_000,
    note: "4★ Bordeaux / Biarritz" },

  // ─── Occitanie (Toulouse / Montpellier / littoral) ───
  { regionSlug: "occitanie", starRating: 2, transactionType: "murs_fonds",
    lowPerRoomEuros: 35_000, highPerRoomEuros: 80_000, note: "2★ province" },
  { regionSlug: "occitanie", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 90_000, highPerRoomEuros: 180_000,
    note: "3★ Toulouse / Montpellier" },
  { regionSlug: "occitanie", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 200_000, highPerRoomEuros: 380_000,
    note: "4★ Toulouse / littoral" },

  // ─── Grand Est (Strasbourg dominant) ───
  { regionSlug: "grand-est", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 85_000, highPerRoomEuros: 170_000, note: "3★ Strasbourg / Reims" },
  { regionSlug: "grand-est", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 180_000, highPerRoomEuros: 350_000, note: "4★ Strasbourg / Reims" },

  // ─── Hauts-de-France (Lille) ───
  { regionSlug: "hauts-de-france", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 80_000, highPerRoomEuros: 160_000, note: "3★ Lille / métropole" },
  { regionSlug: "hauts-de-france", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 170_000, highPerRoomEuros: 330_000, note: "4★ Lille" },

  // ─── Pays de la Loire (Nantes) ───
  { regionSlug: "pays-de-la-loire", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 85_000, highPerRoomEuros: 175_000, note: "3★ Nantes / Angers" },
  { regionSlug: "pays-de-la-loire", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 180_000, highPerRoomEuros: 350_000, note: "4★ Nantes / littoral" },

  // ─── Bretagne ───
  { regionSlug: "bretagne", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 75_000, highPerRoomEuros: 160_000, note: "3★ Rennes / littoral" },
  { regionSlug: "bretagne", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 170_000, highPerRoomEuros: 340_000, note: "4★ littoral breton" },

  // ─── Normandie (Deauville) ───
  { regionSlug: "normandie", starRating: 3, transactionType: "murs_fonds",
    lowPerRoomEuros: 80_000, highPerRoomEuros: 170_000, note: "3★ Caen / Rouen / Deauville" },
  { regionSlug: "normandie", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 200_000, highPerRoomEuros: 400_000,
    note: "4★ Deauville / littoral normand" },

  // ─── Centre-Val de Loire, Bourgogne-Franche-Comté, Corse (échantillon) ───
  { regionSlug: "corse", starRating: 4, transactionType: "murs_fonds",
    lowPerRoomEuros: 280_000, highPerRoomEuros: 550_000, note: "4★ Corse — saisonnalité forte" },
];
