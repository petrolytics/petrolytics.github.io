/**
 * SOURCE FISCALE : BARÈMES ÉTATIQUE (TICPE, CEE, TVA) - FRANCE 2000-2026
 * ----------------------------------------------------------------------
 * Toute modification législative de taxation se fait ici.
 */

export const VAT_HISTORY = {
    2014: 0.20,
    2000: 0.196
};

export const TICPE_BARÈME = {
    Gazole: {
        2026: 0.6075,
        2023: 0.5940,
        2022: 0.4440, // Moyenne avec remise de l'État
        2018: 0.5940,
        2015: 0.4682,
        2014: 0.4284,
        2000: 0.3756
    },
    Essence: { // Moyenne SP95 / SP95-E10
        2026: 0.6829,
        2023: 0.6829,
        2022: 0.5329, // Moyenne avec remise
        2018: 0.6829,
        2015: 0.6239,
        2014: 0.6069,
        2000: 0.5641
    },
    GPL: {
        2026: 0.1250,
        2000: 0.0570
    }
};

export const CEE_BARÈME = {
    2026: 0.16,
    2022: 0.08,
    2018: 0.05,
    2014: 0.02,
    2000: 0.01
};
