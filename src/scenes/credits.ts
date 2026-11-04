/** Faux générique : noms inventés, rôles comiques. Aucune personne réelle, aucun auteur du jeu. */
type Line = ['title' | 'role' | 'name' | 'gap', string];
export const ROLL_SECONDS = 10;

const block = (role: string, ...names: string[]): Line[] => [['role', role], ...names.map((n): Line => ['name', n]), ['gap', '']];

export const CREDITS: Line[] = [
  ['title', 'ASHENBORN'],
  ['gap', ''],
  ...block('GRAND CHAMBELLAN DU PROJET', 'GONTRAN DE LA POÊLE'),
  ...block('SCÉNARIO SUR UNE SERVIETTE', 'EUDOXIE TARTEMPLON', 'BARNABÉ CROÛTON'),
  ...block('COIFFEUSE DE LA DAME D\'ARGENT', 'PHILOMÈNE GRATIN'),
  ...block('ÉLECTRICIENS DE LA CRYPTE', 'ODILON PÉTONCLE', 'THÉOBALD CORNICHON', 'FIRMIN BOUILLON'),
  ...block('DIÉTÉTICIEN DE MᶜKING (DÉMISSIONNAIRE)', 'ANSELME GROSBEC'),
  ...block('MAÎTRE DES BURGERS', 'URSULINE SAUCEBLANCHE', 'SIGISMOND LARDON'),
  ...block('COMPTABLE DES PIXELS', 'ARISTIDE POURPOINT'),
  ...block('TESTEURS DE CHUTES', 'GERTRUDE ESCALOPE', 'NESTOR PATATRAS', 'LÉOCADIE BOUGEOIR', 'ZÉPHYRIN CATAPLASME'),
  ...block('CHORÉGRAPHE DES MOUSTIQUES', 'BZZ-IGNACE TROMPELONGUE'),
  ...block('CONSEIL JURIDIQUE EN COURONNEMENT', 'HONORINE FRICASSÉE'),
  ...block('PORTEUR DE COUSSIN', 'ALCIDE VELOURS'),
  ...block('ASSISTANT DU PORTEUR DE COUSSIN', 'ALCIDE VELOURS JUNIOR'),
  ...block('ASSURANCE ESCALIERS', 'CASIMIR MARCHEBASSE'),
  ...block('FIGURANTS GOBELINS', 'GROBNAK LE FOURBE', 'SNIRK', 'SNIRK (UN AUTRE)', 'TANTE MORVELLE'),
  ...block('FIGURANTS TAUREAUX', 'MEUHRIEL CORNELAIT', 'BERTRAND DU PRÉ'),
  ...block('RESPONSABLE DES CONFETTIS', 'CUNÉGONDE PAILLETTE'),
  ...block('MÉTÉO DE L\'AUBE', 'LE COQ'),
  ['gap', ''],
  ['name', "AUCUN BURGER N'A ÉTÉ MALTRAITÉ"],
  ['name', 'PENDANT CE COMBAT.'],
  ['role', '(SI, BEAUCOUP.)'],
];
