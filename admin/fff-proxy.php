<?php
/**
 * ASJ Espelette — Proxy FFF
 * Recupere les donnees du club depuis l'API officielle de la FFF
 * - Calendrier (API publique sites)
 * - Resultats et scores (API data/matches avec authentification par token)
 * - Classements (API data/classement_journees)
 * - Cache local pour eviter les requetes repetees
 */

define('CACHE_DIR', __DIR__ . '/../data/cache/');
// TTL long : on s'attend à ce qu'un cron (admin/fff-refresh.php) rafraichisse
// le cache 2x par jour. Le TTL agit en filet de sécurité si le cron n'a pas
// tourné. À 18h, ça garantit qu'au pire le cache a 18h d'ancienneté.
define('CACHE_TTL', 18 * 3600);
define('EQUIPES_CONFIG', __DIR__ . '/../data/equipes.json');
define('FFF_BASE', 'https://epreuves.fff.fr');

/**
 * Chemin du token de sécurité FFF (utilisé pour générer le hash X-Competition).
 * À fournir via la variable d'environnement FFF_TOKEN_PATH côté hébergeur.
 * Fallback en dur uniquement pour le dev local.
 */
define('FFF_TOKEN_PATH', getenv('FFF_TOKEN_PATH') ?: 'QpUOBjjSJN');

/**
 * Charge la config equipes/club depuis data/equipes.json
 * et retourne un dict indexe par key pour compat avec l'ancien format FFF_EQUIPES.
 */
function loadEquipesConfig() {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    if (!file_exists(EQUIPES_CONFIG)) {
        $cfg = ['club' => [], 'equipes' => []];
        return $cfg;
    }
    $raw = json_decode(file_get_contents(EQUIPES_CONFIG), true);
    if (!$raw) {
        $cfg = ['club' => [], 'equipes' => []];
        return $cfg;
    }
    // Indexe les equipes par key et trie par ordre
    $indexed = [];
    $list = $raw['equipes'] ?? [];
    usort($list, function ($a, $b) { return ($a['ordre'] ?? 99) - ($b['ordre'] ?? 99); });
    foreach ($list as $eq) {
        $indexed[$eq['key']] = [
            'id' => $eq['fff_id'],
            'label' => $eq['label_fr'],
            'label_eu' => $eq['label_eu'] ?? $eq['label_fr'],
            'key' => $eq['key'],
            'competition' => $eq['competition'] ?? true,
        ];
    }
    $cfg = [
        'club' => $raw['club'] ?? [],
        'equipes' => $indexed,
        'saison' => $raw['saison'] ?? '',
    ];
    return $cfg;
}

function getClubId()   { $c = loadEquipesConfig(); return $c['club']['id'] ?? 8748; }
function getClubCode() { $c = loadEquipesConfig(); return $c['club']['code'] ?? 523288; }
function getClubCdg()  { $c = loadEquipesConfig(); return $c['club']['cdg'] ?? 12; }
function getEquipes()  { $c = loadEquipesConfig(); return $c['equipes']; }
function getSaison()   { $c = loadEquipesConfig(); return $c['saison'] ?? ''; }

/**
 * Déduit les bornes ISO 8601 de la saison à partir de la config equipes.json.
 * Format saison attendu : "YYYY-YYYY" (ex: "2025-2026").
 * Saison FFF : 1er août → 31 juillet de l'année suivante.
 * Fallback : déduit l'année en cours si la saison n'est pas renseignée.
 */
function getSaisonBounds() {
    $saison = getSaison();
    if (preg_match('/^(\d{4})-(\d{4})$/', $saison, $m)) {
        $debut = $m[1] . '-08-01T00:00:00+00:00';
        $fin   = $m[2] . '-07-31T23:59:59+00:00';
        return [$debut, $fin];
    }
    // Fallback : on déduit la saison courante (août → juillet)
    $now = new DateTime();
    $year = (int)$now->format('Y');
    $startYear = ((int)$now->format('m') >= 8) ? $year : $year - 1;
    return [
        $startYear . '-08-01T00:00:00+00:00',
        ($startYear + 1) . '-07-31T23:59:59+00:00',
    ];
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('X-Content-Type-Options: nosniff');

// Creer le dossier cache si necessaire
if (!is_dir(CACHE_DIR)) {
    mkdir(CACHE_DIR, 0755, true);
}

$action = $_GET['action'] ?? '';

// --- CALENDRIER (API publique sites — pas de token necessaire) ---
if ($action === 'calendrier') {
    $moisAvant = intval($_GET['mois_avant'] ?? 0);
    $moisApres = intval($_GET['mois_apres'] ?? 2);

    $debut = date('Y-m-d', strtotime("-{$moisAvant} months", strtotime('first day of this month')));
    $fin = date('Y-m-d', strtotime("+{$moisApres} months", strtotime('first day of this month')));

    $cacheFile = CACHE_DIR . "calendrier_{$debut}_{$fin}.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        echo file_get_contents($cacheFile);
        exit;
    }

    $url = FFF_BASE . "/api/fal/cdg/" . getClubCdg() . "/club/" . getClubId()
         . "/sites?dateDebut={$debut}&dateFin={$fin}";

    $data = fetchUrl($url);
    if ($data) {
        $parsed = json_decode($data, true);
        if ($parsed) {
            $result = formatCalendrier($parsed);
            $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            file_put_contents($cacheFile, $json);
            echo $json;
            exit;
        }
    }

    http_response_code(502);
    echo json_encode(['error' => 'Impossible de recuperer le calendrier FFF']);
    exit;
}

// --- RESULTATS (API data/matches avec token de securite) ---
if ($action === 'resultats') {
    $equipe = $_GET['equipe'] ?? 'senior1';
    $equipes = getEquipes();
    if (!isset($equipes[$equipe])) {
        http_response_code(400);
        echo json_encode(['error' => 'Equipe inconnue. Disponibles: ' . implode(', ', array_keys($equipes))]);
        exit;
    }

    $equipeId = $equipes[$equipe]['id'];
    $cacheFile = CACHE_DIR . "resultats_{$equipe}.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        echo file_get_contents($cacheFile);
        exit;
    }

    // Bornes saison déduites de data/equipes.json
    list($debut, $fin) = getSaisonBounds();

    $url = FFF_BASE . "/api/data/matches?idEquipe=" . urlencode($equipeId)
         . "&dateDebut=" . urlencode($debut)
         . "&dateFin=" . urlencode($fin)
         . "&itemsPerPage=50&pagination=true";

    $data = fetchFFFApi($url);
    if ($data) {
        $parsed = json_decode($data, true);
        if ($parsed && isset($parsed['hydra:member'])) {
            $matchs = formatMatchesList($parsed['hydra:member']);
            $result = [
                'equipe' => $equipes[$equipe],
                'matchs' => $matchs,
                'derniere_maj' => date('c'),
            ];
            $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            file_put_contents($cacheFile, $json);
            echo $json;
            exit;
        }
    }

    // Fallback: scraping SSR si l'API authentifiee echoue
    $result = fallbackScrapeResultats($equipe, $equipeId);
    if ($result) {
        $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        file_put_contents($cacheFile, $json);
        echo $json;
        exit;
    }

    http_response_code(502);
    echo json_encode(['error' => 'Impossible de recuperer les resultats FFF']);
    exit;
}

// --- TOUS LES RESULTATS ---
if ($action === 'tous-resultats') {
    $cacheFile = CACHE_DIR . "tous_resultats.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        echo file_get_contents($cacheFile);
        exit;
    }

    // Recuperer tous les matchs du club en une seule requete
    $debut = '2025-08-01T00:00:00+00:00';
    $fin = '2026-07-01T00:00:00+00:00';

    $url = FFF_BASE . "/api/data/matches?clNo=" . getClubId()
         . "&dateDebut=" . urlencode($debut)
         . "&dateFin=" . urlencode($fin)
         . "&itemsPerPage=100&pagination=true";

    $data = fetchFFFApi($url);
    if ($data) {
        $parsed = json_decode($data, true);
        if ($parsed && isset($parsed['hydra:member'])) {
            $allMatchs = formatMatchesList($parsed['hydra:member']);
            $result = [
                'club' => 'A.S.J. D\'ESPELETTE',
                'matchs' => $allMatchs,
                'derniere_maj' => date('c'),
            ];
            $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            file_put_contents($cacheFile, $json);
            echo $json;
            exit;
        }
    }

    http_response_code(502);
    echo json_encode(['error' => 'Impossible de recuperer les resultats FFF']);
    exit;
}

// --- PROCHAINS MATCHS (pour la page d'accueil) ---
if ($action === 'prochains-matchs') {
    $limit = intval($_GET['limit'] ?? 5);
    $cacheFile = CACHE_DIR . "prochains_matchs.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        echo file_get_contents($cacheFile);
        exit;
    }

    // Utilise l'API calendrier publique
    $debut = date('Y-m-d');
    $fin = date('Y-m-d', strtotime('+3 months'));

    $url = FFF_BASE . "/api/fal/cdg/" . getClubCdg() . "/club/" . getClubId()
         . "/sites?dateDebut={$debut}&dateFin={$fin}";

    $data = fetchUrl($url);
    if ($data) {
        $parsed = json_decode($data, true);
        if ($parsed) {
            $prochains = formatProchainsSites($parsed, $limit);
            $json = json_encode($prochains, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            file_put_contents($cacheFile, $json);
            echo $json;
            exit;
        }
    }

    http_response_code(502);
    echo json_encode(['error' => 'Impossible de recuperer les prochains matchs']);
    exit;
}

// --- CLASSEMENT (scraping SSR — tableau dans le HTML, pas besoin de token) ---
if ($action === 'classement') {
    $equipe = $_GET['equipe'] ?? 'senior1';
    $equipes = getEquipes();
    if (!isset($equipes[$equipe])) {
        http_response_code(400);
        echo json_encode(['error' => 'Equipe inconnue. Disponibles: ' . implode(', ', array_keys($equipes))]);
        exit;
    }

    $equipeId = $equipes[$equipe]['id'];
    $cacheFile = CACHE_DIR . "classement_{$equipe}.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        echo file_get_contents($cacheFile);
        exit;
    }

    $url = FFF_BASE . "/competition/club/" . getClubCode() . "-espelette/equipe/"
         . rawurlencode($equipeId) . "/classement";

    $html = fetchUrl($url);
    if ($html) {
        $rows = scrapeClassementHtml($html);
        if (!empty($rows)) {
            $result = [
                'equipe' => $equipes[$equipe],
                'rows' => $rows,
                'derniere_maj' => date('c'),
                'source' => 'scraping',
            ];
            $json = json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            file_put_contents($cacheFile, $json);
            echo $json;
            exit;
        }
    }

    http_response_code(502);
    echo json_encode(['error' => 'Impossible de recuperer le classement FFF']);
    exit;
}

// --- Fallback ---
$_equipes_keys = array_keys(getEquipes());
echo json_encode([
    'endpoints' => [
        'calendrier' => '?action=calendrier[&mois_avant=0&mois_apres=2]',
        'resultats' => '?action=resultats&equipe=' . implode('|', $_equipes_keys),
        'tous-resultats' => '?action=tous-resultats',
        'prochains-matchs' => '?action=prochains-matchs[&limit=5]',
        'classement' => '?action=classement&equipe=' . implode('|', $_equipes_keys),
    ],
    'equipes' => getEquipes(),
]);


// ========================================
// AUTHENTIFICATION FFF
// ========================================

/**
 * Obtient le token de securite FFF puis genere le hash X-Competition
 */
function getFFFSecurityHash() {
    $tokenCacheFile = CACHE_DIR . 'fff_token.json';
    $token = null;

    // Le token est cache 5 minutes
    if (file_exists($tokenCacheFile) && (time() - filemtime($tokenCacheFile)) < 300) {
        $cached = json_decode(file_get_contents($tokenCacheFile), true);
        $token = $cached['token'] ?? null;
    }

    if (!$token) {
        $url = FFF_BASE . "/api/app-security-token/" . FFF_TOKEN_PATH;
        $resp = fetchUrl($url);
        if ($resp) {
            $data = json_decode($resp, true);
            $token = $data['token'] ?? null;
            if ($token) {
                file_put_contents($tokenCacheFile, json_encode(['token' => $token]));
            }
        }
    }

    if (!$token) return null;

    // Generer le hash SHA-1 : sha1("{token}-{floor(time_ms / 10000)}")
    $timeComponent = intval(floor(microtime(true) * 1000 / 10000));
    $message = $token . '-' . $timeComponent;
    return sha1($message);
}

/**
 * Appel API FFF avec le header X-Competition
 */
function fetchFFFApi($url) {
    $hash = getFFFSecurityHash();
    if (!$hash) return null;

    $headers = "Accept: application/json\r\n"
             . "Content-Type: application/json\r\n"
             . "X-Competition: {$hash}\r\n"
             . "User-Agent: ASJEspelette-Website/1.0\r\n";

    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => $headers,
            'timeout' => 15,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);

    $result = @file_get_contents($url, false, $ctx);
    if ($result === false) return null;

    // Verifier que ce n'est pas un objet vide
    $decoded = json_decode($result, true);
    if ($decoded === null || $decoded === [] || $decoded === (object)[]) return null;

    return $result;
}


// ========================================
// FALLBACK : SCRAPING SSR (si l'API echoue)
// ========================================

function fallbackScrapeResultats($equipe, $equipeId) {
    $url = FFF_BASE . "/competition/club/" . getClubCode()
         . "-espelette/equipe/{$equipeId}/resultat-calendrier";

    $html = fetchUrl($url);
    if (!$html) return null;

    // Extraire le JSON du tag <script id="ng-state">
    if (!preg_match('/<script\s+id="ng-state"[^>]*>(.*?)<\/script>/s', $html, $m)) {
        return null;
    }

    $state = json_decode($m[1], true);
    if (!$state) return null;

    $allMatches = [];
    foreach ($state as $key => $value) {
        if (strpos($key, '/api/data/matches') === false) continue;
        if (!isset($value['body']['hydra:member'])) continue;

        $allMatches = array_merge($allMatches, formatMatchesList($value['body']['hydra:member']));
    }

    // Dedupliquer par ID
    $unique = [];
    foreach ($allMatches as $m) {
        $unique[$m['id']] = $m;
    }

    usort($unique, function ($a, $b) {
        return strcmp($a['date'] ?? '', $b['date'] ?? '');
    });

    $equipes = getEquipes();
    return [
        'equipe' => $equipes[$equipe] ?? ['key' => $equipe, 'id' => $equipeId],
        'matchs' => array_values($unique),
        'derniere_maj' => date('c'),
        'source' => 'scraping',
    ];
}


// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function fetchUrl($url) {
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json, text/html\r\n"
                      . "User-Agent: ASJEspelette-Website/1.0\r\n",
            'timeout' => 15,
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ],
    ]);

    $result = @file_get_contents($url, false, $ctx);
    return $result !== false ? $result : null;
}

function formatMatchesList($members) {
    $matches = [];
    foreach ($members as $match) {
        $df = $match['donneesFormatees'] ?? null;
        if (!$df) continue;

        $matches[] = [
            'id' => $df['maNo'] ?? null,
            'date' => $df['date'] ?? null,
            'statut' => $df['maStatutLib'] ?? null,
            'joue' => ($df['maStatutLib'] ?? '') === 'joué' || ($df['maStatutLib'] ?? '') === 'joue' || ($df['joue'] ?? false),
            'competition' => $df['competition']['donneesFormatees']['nom'] ?? '',
            'categorie' => $df['competition']['donneesFormatees']['lcLib'] ?? '',
            'journee' => $df['journee']['pjNo'] ?? '',
            'domicile' => [
                'nom' => $df['recevant']['club']['nom'] ?? '',
                'logo' => $df['recevant']['club']['logo'] ?? '',
                'code' => $df['recevant']['club']['clCod'] ?? '',
                'buts' => $df['recevant']['buts'] ?? null,
                'resultat' => $df['recevant']['resu'] ?? null,
            ],
            'exterieur' => [
                'nom' => $df['visiteur']['club']['nom'] ?? '',
                'logo' => $df['visiteur']['club']['logo'] ?? '',
                'code' => $df['visiteur']['club']['clCod'] ?? '',
                'buts' => $df['visiteur']['buts'] ?? null,
                'resultat' => $df['visiteur']['resu'] ?? null,
            ],
        ];
    }
    return $matches;
}

function formatCalendrier($data) {
    $result = [
        'club' => [
            'nom' => $data['clNom'] ?? 'A.S.J. D\'ESPELETTE',
            'logo' => $data['logo'] ?? '',
            'code' => $data['clCod'] ?? getClubCode(),
        ],
        'epreuves' => [],
        'sites' => [],
    ];

    foreach ($data['epreuves'] ?? [] as $ep) {
        $result['epreuves'][] = [
            'nom' => $ep['epNom'] ?? '',
            'categorie' => $ep['caCod'] ?? '',
        ];
    }

    foreach ($data['sites'] ?? [] as $site) {
        $entry = [
            'date' => $site['date'] ?? null,
            'annule' => $site['isCancelled'] ?? false,
            'organisateur' => $site['organisateur']['clNom'] ?? '',
            'terrain' => null,
            'equipes' => [],
        ];

        if (isset($site['terrain'])) {
            $t = $site['terrain'];
            $entry['terrain'] = [
                'nom' => $t['teNom'] ?? '',
                'adresse' => $t['adresse'] ?? '',
                'latitude' => $t['latitude'] ?? null,
                'longitude' => $t['longitude'] ?? null,
            ];
        }

        foreach ($site['clubs'] ?? [] as $club) {
            $entry['equipes'][] = [
                'nom' => $club['clNom'] ?? '',
                'logo' => $club['logo'] ?? '',
            ];
        }

        $result['sites'][] = $entry;
    }

    return $result;
}

function formatProchainsSites($data, $limit) {
    $now = time();
    $upcoming = [];

    foreach ($data['sites'] ?? [] as $site) {
        $date = $site['date'] ?? null;
        if (!$date) continue;

        $ts = strtotime($date);
        if ($ts < $now) continue;
        if ($site['isCancelled'] ?? false) continue;

        $equipes = [];
        foreach ($site['clubs'] ?? [] as $club) {
            $equipes[] = [
                'nom' => $club['clNom'] ?? '',
                'logo' => $club['logo'] ?? '',
            ];
        }

        $terrain = null;
        if (isset($site['terrain'])) {
            $t = $site['terrain'];
            $terrain = [
                'nom' => $t['teNom'] ?? '',
                'adresse' => $t['adresse'] ?? '',
            ];
        }

        $upcoming[] = [
            'date' => $date,
            'organisateur' => $site['organisateur']['clNom'] ?? '',
            'terrain' => $terrain,
            'equipes' => $equipes,
        ];
    }

    usort($upcoming, function ($a, $b) {
        return strcmp($a['date'], $b['date']);
    });

    return [
        'prochains_matchs' => array_slice($upcoming, 0, $limit),
        'derniere_maj' => date('c'),
    ];
}

/**
 * Parse le tableau de classement rendu en HTML par la FFF.
 * Le tableau suit l'ordre : Pos | (decision) | Equipe | Pts | J | G | N | P | F | P/Bo | Bp | Bc | Diff
 */
function scrapeClassementHtml($html) {
    if (!preg_match_all('/<tr[^>]*>(.*?)<\/tr>/s', $html, $matches)) return [];

    $rows = [];
    foreach ($matches[1] as $trHtml) {
        // Extraire logo (si <img src=...>) avant de cleaner
        $logo = null;
        if (preg_match('/<img[^>]+src="([^"]+)"/i', $trHtml, $logoM)) {
            $logo = $logoM[1];
        }

        // Clean tags et normaliser espaces
        $text = preg_replace('/<[^>]+>/', ' ', $trHtml);
        $text = preg_replace('/\s+/', ' ', html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = trim($text);

        // Exclure la ligne d'en-tete
        if (stripos($text, 'Pts') !== false && stripos($text, 'Diff') !== false) continue;
        if (strlen($text) < 10) continue;

        // Regex : position au debut, puis optionnellement un chiffre de decision, puis nom, puis 9 ou 10 nombres
        // On capture position + reste
        if (!preg_match('/^(\d+)\s+(.+)$/', $text, $m)) continue;
        $position = intval($m[1]);
        $reste = $m[2];

        // Extraire les 9 derniers nombres (Pts, J, G, N, P, F, P/Bo, Bp, Bc, Diff)
        // On cherche les nombres en fin de chaine
        if (!preg_match('/^(.+?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)$/', $reste, $n)) {
            // Essai avec 9 nombres (sans P/Bo)
            if (!preg_match('/^(.+?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)$/', $reste, $n)) {
                continue;
            }
            $nom = trim($n[1]);
            $pts = intval($n[2]); $joues = intval($n[3]);
            $g = intval($n[4]); $nl = intval($n[5]); $p = intval($n[6]);
            $f = intval($n[7]);
            $bp = intval($n[8]); $bc = intval($n[9]); $diff = intval($n[10]);
            $pbo = null;
        } else {
            $nom = trim($n[1]);
            $pts = intval($n[2]); $joues = intval($n[3]);
            $g = intval($n[4]); $nl = intval($n[5]); $p = intval($n[6]);
            $f = intval($n[7]); $pbo = intval($n[8]);
            $bp = intval($n[9]); $bc = intval($n[10]); $diff = intval($n[11]);
        }

        // Certains rangs ont un chiffre de decision inséré entre position et nom (ex: "9 1 ST PALAIS")
        // On détecte : si le nom commence par un seul chiffre + espace suivi de lettres
        if (preg_match('/^(\d+)\s+([A-ZÀ-ÿ].*)$/u', $nom, $nn)) {
            $nom = trim($nn[2]);
        }

        $rows[] = [
            'position' => $position,
            'club' => [
                'nom' => $nom,
                'logo' => $logo,
            ],
            'points' => $pts,
            'joues' => $joues,
            'gagnes' => $g,
            'nuls' => $nl,
            'perdus' => $p,
            'forfaits' => $f,
            'buts_pour' => $bp,
            'buts_contre' => $bc,
            'difference' => $diff,
        ];
    }

    usort($rows, function ($a, $b) { return $a['position'] - $b['position']; });
    return $rows;
}
