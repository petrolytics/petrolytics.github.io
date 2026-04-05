// Pointeur vers la version active des prix à la pompe — INSEE/BDM.
// Pour rollback : modifier l'import ci-dessous et committer.
//
// Versions disponibles dans data/sources/ :
//   InseeFuelHistory.2000-01-01.js
//   InseeFuelHistory.2026-04-03.js
//   InseeFuelHistory.2026-04-04.js
//   InseeFuelHistory.2026-04-05.js

export { FUEL_PRICE_HISTORY } from './sources/InseeFuelHistory.2026-04-05.js';