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
define('CACHE_TTL', 6 * 3600); // 6 heures
define('FFF_CLUB_ID', 8748);
define('FFF_CLUB_CODE', 523288);
define('FFF_CDG', 12); // District Pyrenees Atlantiques
define('FFF_BASE', 'https://epreuves.fff.fr');
define('FFF_TOKEN_PATH', '***REMOVED***'); // Chemin statique pour le token

// IDs des equipes en competition (saison en cours)
// Format: saison_clubId_categorie_eqNo
// ATTENTION: les eqNo ne commencent pas forcement a 1 pour chaque categorie
// IDs verifies via l'API FFF le 17/02/2026
define('FFF_EQUIPES', [
    'senior1' => ['id' => '2025_8748_SEM_1', 'label' => 'Senior 1'],
    'u13_1'   => ['id' => '2025_8748_U13_2', 'label' => 'U13-U12 1'],
    'u13_2'   => ['id' => '2025_8748_U13_3', 'label' => 'U13-U12 2'],
    'u13_3'   => ['id' => '2025_8748_U13_4', 'label' => 'U13-U12 3'],
]);

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

    $url = FFF_BASE . "/api/fal/cdg/" . FFF_CDG . "/club/" . FFF_CLUB_ID
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
    if (!isset(FFF_EQUIPES[$equipe])) {
        http_response_code(400);
        echo json_encode(['error' => 'Equipe inconnue. Disponibles: ' . implode(', ', array_keys(FFF_EQUIPES))]);
        exit;
    }

    $equipeId = FFF_EQUIPES[$equipe]['id'];
    $cacheFile = CACHE_DIR . "resultats_{$equipe}.json";

    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
        echo file_get_contents($cacheFile);
        exit;
    }

    // Recuperer les matchs de la saison en cours
    $debut = '2025-08-01T00:00:00+00:00';
    $fin = '2026-07-01T00:00:00+00:00';

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
                'equipe' => FFF_EQUIPES[$equipe],
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

    $url = FFF_BASE . "/api/data/matches?clNo=" . FFF_CLUB_ID
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

    $url = FFF_BASE . "/api/fal/cdg/" . FFF_CDG . "/club/" . FFF_CLUB_ID
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

// --- Fallback ---
echo json_encode([
    'endpoints' => [
        'calendrier' => '?action=calendrier[&mois_avant=0&mois_apres=2]',
        'resultats' => '?action=resultats&equipe=senior1|u13_1|u13_2|u13_3',
        'tous-resultats' => '?action=tous-resultats',
        'prochains-matchs' => '?action=prochains-matchs[&limit=5]',
    ],
    'equipes' => FFF_EQUIPES,
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
    $url = FFF_BASE . "/competition/club/" . FFF_CLUB_CODE
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

    return [
        'equipe' => FFF_EQUIPES[$equipe],
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
            'code' => $data['clCod'] ?? FFF_CLUB_CODE,
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
