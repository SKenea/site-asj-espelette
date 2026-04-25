<?php
/**
 * ASJ Espelette — Rafraîchissement programmé du cache FFF
 *
 * Appelé par un cron 2× par jour (matin + soir) pour pré-charger les données
 * FFF de façon transparente : les visiteurs lisent toujours un cache à jour
 * sans jamais déclencher d'appel à la FFF dans leur parcours.
 *
 * Sécurité : nécessite une clé partagée fournie soit via la variable
 * d'environnement FFF_REFRESH_KEY (recommandé en prod), soit via le fichier
 * admin/.fff-refresh-key (fallback).
 *
 * Usage cron Alwaysdata / OVH / o2switch :
 *   curl -fsS "https://asj-espelette.fr/admin/fff-refresh.php?key=XXXX"
 *
 * Stratégie : on appelle le proxy via HTTP local (self-call) pour réutiliser
 * toute sa logique. En cas d'échec FFF, on restaure le mtime de l'ancien cache
 * pour le préserver (le proxy le re-servira au prochain cache-miss).
 */

define('CACHE_DIR', __DIR__ . '/../data/cache/');
define('EQUIPES_CONFIG', __DIR__ . '/../data/equipes.json');

// --- Auth ---
$expectedKey = getenv('FFF_REFRESH_KEY') ?: null;
if (!$expectedKey && is_file(__DIR__ . '/.fff-refresh-key')) {
    $expectedKey = trim(file_get_contents(__DIR__ . '/.fff-refresh-key'));
}

$isCli = php_sapi_name() === 'cli';
if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
    if (!$expectedKey) {
        http_response_code(503);
        echo "FFF_REFRESH_KEY non configurée (variable d'env ou fichier admin/.fff-refresh-key).\n";
        exit;
    }
    if (!hash_equals($expectedKey, $_GET['key'] ?? '')) {
        http_response_code(403);
        echo "Clé invalide.\n";
        exit;
    }
}

// --- Helpers locaux (mini-duplication du proxy) ---
function loadEquipesKeys() {
    if (!file_exists(EQUIPES_CONFIG)) return [];
    $cfg = json_decode(file_get_contents(EQUIPES_CONFIG), true);
    if (!$cfg) return [];
    $list = $cfg['equipes'] ?? [];
    usort($list, function ($a, $b) { return ($a['ordre'] ?? 99) - ($b['ordre'] ?? 99); });
    return array_map(function ($e) { return $e['key']; }, $list);
}

function fetchUrlSimple($url, $timeout = 20) {
    $ctx = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: ASJEspelette-Cron/1.0\r\n",
            'timeout' => $timeout,
            'ignore_errors' => true,
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $r = @file_get_contents($url, false, $ctx);
    return $r !== false ? $r : null;
}

function cacheFileFor($action, $params) {
    if ($action === 'calendrier') {
        $avant = intval($params['mois_avant'] ?? 0);
        $apres = intval($params['mois_apres'] ?? 3);
        $debut = date('Y-m-d', strtotime("-{$avant} months", strtotime('first day of this month')));
        $fin = date('Y-m-d', strtotime("+{$apres} months", strtotime('first day of this month')));
        return CACHE_DIR . "calendrier_{$debut}_{$fin}.json";
    }
    if ($action === 'prochains-matchs') return CACHE_DIR . "prochains_matchs.json";
    if ($action === 'resultats' || $action === 'classement') {
        $eq = $params['equipe'] ?? 'senior1';
        return CACHE_DIR . $action . "_{$eq}.json";
    }
    return CACHE_DIR . $action . ".json";
}

// --- Boucle principale ---
$started = microtime(true);

// Base URL pour self-call vers le proxy
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1:8765';
$base = $isCli ? 'http://127.0.0.1:8765' : "{$scheme}://{$host}";
$proxy = $base . '/admin/fff-proxy.php';

$equipeKeys = loadEquipesKeys();

$targets = [
    ['action' => 'calendrier', 'params' => ['mois_avant' => 0, 'mois_apres' => 3]],
    ['action' => 'prochains-matchs', 'params' => ['limit' => 5]],
];
foreach ($equipeKeys as $key) {
    $targets[] = ['action' => 'resultats', 'params' => ['equipe' => $key]];
    $targets[] = ['action' => 'classement', 'params' => ['equipe' => $key]];
}

$ok = 0; $kept = 0; $fail = 0; $lines = [];

foreach ($targets as $t) {
    $cacheFile = cacheFileFor($t['action'], $t['params']);
    $oldMtime = file_exists($cacheFile) ? filemtime($cacheFile) : 0;

    // Force expiration du cache pour que le proxy refetch
    if ($oldMtime) touch($cacheFile, time() - 86400 * 365);

    $url = $proxy . '?action=' . urlencode($t['action']);
    foreach ($t['params'] as $k => $v) $url .= '&' . urlencode($k) . '=' . urlencode($v);

    $tStart = microtime(true);
    $resp = fetchUrlSimple($url);
    $ms = round((microtime(true) - $tStart) * 1000);
    $isErr = !$resp || strpos($resp, '"error"') !== false;

    if (!$isErr) {
        $ok++;
        $lines[] = sprintf("[OK]   %-18s %-30s %dms", $t['action'], json_encode($t['params']), $ms);
    } elseif ($oldMtime) {
        touch($cacheFile, $oldMtime);
        $kept++;
        $lines[] = sprintf("[KEEP] %-18s %-30s (FFF KO, ancien cache préservé)", $t['action'], json_encode($t['params']));
    } else {
        $fail++;
        $lines[] = sprintf("[FAIL] %-18s %-30s (FFF KO, aucun cache)", $t['action'], json_encode($t['params']));
    }
}

$total = round(microtime(true) - $started, 2);
$now = date('Y-m-d H:i:s');

echo sprintf("[%s] FFF refresh : %d ok, %d kept, %d fail, %ss total\n", $now, $ok, $kept, $fail, $total);
foreach ($lines as $l) echo "  " . $l . "\n";
