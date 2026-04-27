<?php
/**
 * ASJ Espelette — API Admin
 * Mini-CMS : gestion articles + galerie via fichiers JSON
 * Compatible tout hebergement mutualise avec PHP
 */

// --- Configuration ---
// Identifiants admin lus depuis les variables d'environnement (recommandé en prod).
// Fallback : valeurs en dur pour dev local uniquement (le hash placeholder
// est volontairement invalide pour empêcher tout login si la prod n'est pas
// configurée correctement).
define('ADMIN_USER', getenv('ADMIN_USER') ?: 'admin');
define('ADMIN_PASS', getenv('ADMIN_PASS') ?: '$2y$10$INVALID_HASH_CONFIGURE_ADMIN_PASS_ENV_VAR');
define('DATA_DIR', __DIR__ . '/../data/');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('MAX_UPLOAD_SIZE', 5 * 1024 * 1024); // 5 Mo
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// --- Headers ---
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// --- Auth ---
session_start();

function isAuthenticated() {
    return isset($_SESSION['asje_admin']) && $_SESSION['asje_admin'] === true;
}

function requireAuth() {
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['error' => 'Non autorise']);
        exit;
    }
}

// --- Helpers ---
function readJson($file) {
    $path = DATA_DIR . $file;
    if (!file_exists($path)) return [];
    $content = file_get_contents($path);
    return json_decode($content, true) ?: [];
}

function writeJson($file, $data) {
    $path = DATA_DIR . $file;
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function sanitize($str) {
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

const ARTICLE_CATEGORIES = ['vie-club', 'evenements', 'partenariat'];

function sanitizeCategory($cat) {
    $cat = is_string($cat) ? trim($cat) : '';
    return in_array($cat, ARTICLE_CATEGORIES, true) ? $cat : 'vie-club';
}

// --- Routage ---
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// --- LOGIN ---
if ($action === 'login' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $user = $input['user'] ?? '';
    $pass = $input['pass'] ?? '';

    if ($user === ADMIN_USER && password_verify($pass, ADMIN_PASS)) {
        $_SESSION['asje_admin'] = true;
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'Identifiants incorrects']);
    }
    exit;
}

// --- LOGOUT ---
if ($action === 'logout') {
    session_destroy();
    echo json_encode(['ok' => true]);
    exit;
}

// --- CHECK AUTH ---
if ($action === 'check') {
    echo json_encode(['authenticated' => isAuthenticated()]);
    exit;
}

// ===========================
// ARTICLES
// ===========================

// GET articles (public — pas d'auth requise pour le front)
if ($action === 'articles' && $method === 'GET') {
    echo json_encode(readJson('articles.json'));
    exit;
}

// POST article (creation)
if ($action === 'article-create' && $method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    $articles = readJson('articles.json');

    $maxId = 0;
    foreach ($articles as $a) {
        if ($a['id'] > $maxId) $maxId = $a['id'];
    }

    $article = [
        'id' => $maxId + 1,
        'date' => sanitize($input['date'] ?? date('Y-m-d')),
        'category' => sanitizeCategory($input['category'] ?? 'vie-club'),
        'image' => sanitize($input['image'] ?? ''),
        'fr' => [
            'title' => sanitize($input['fr']['title'] ?? ''),
            'summary' => sanitize($input['fr']['summary'] ?? ''),
            'content' => sanitize($input['fr']['content'] ?? ''),
        ],
        'eu' => [
            'title' => sanitize($input['eu']['title'] ?? ''),
            'summary' => sanitize($input['eu']['summary'] ?? ''),
            'content' => sanitize($input['eu']['content'] ?? ''),
        ],
    ];

    array_unshift($articles, $article); // Plus recent en premier
    writeJson('articles.json', $articles);
    echo json_encode(['ok' => true, 'article' => $article]);
    exit;
}

// PUT article (modification)
if ($action === 'article-update' && $method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    $articles = readJson('articles.json');
    $id = intval($input['id'] ?? 0);

    foreach ($articles as &$a) {
        if ($a['id'] === $id) {
            if (isset($input['date'])) $a['date'] = sanitize($input['date']);
            if (isset($input['category'])) $a['category'] = sanitizeCategory($input['category']);
            if (isset($input['image'])) $a['image'] = sanitize($input['image']);
            if (isset($input['fr'])) {
                $a['fr']['title'] = sanitize($input['fr']['title'] ?? $a['fr']['title']);
                $a['fr']['summary'] = sanitize($input['fr']['summary'] ?? $a['fr']['summary']);
                $a['fr']['content'] = sanitize($input['fr']['content'] ?? $a['fr']['content']);
            }
            if (isset($input['eu'])) {
                $a['eu']['title'] = sanitize($input['eu']['title'] ?? $a['eu']['title']);
                $a['eu']['summary'] = sanitize($input['eu']['summary'] ?? $a['eu']['summary']);
                $a['eu']['content'] = sanitize($input['eu']['content'] ?? $a['eu']['content']);
            }
            break;
        }
    }
    unset($a);

    writeJson('articles.json', $articles);
    echo json_encode(['ok' => true]);
    exit;
}

// DELETE article
if ($action === 'article-delete' && $method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    $articles = readJson('articles.json');
    $articles = array_values(array_filter($articles, function($a) use ($id) {
        return $a['id'] !== $id;
    }));
    writeJson('articles.json', $articles);
    echo json_encode(['ok' => true]);
    exit;
}

// ===========================
// GALERIE
// ===========================

// GET galerie (public)
if ($action === 'galerie' && $method === 'GET') {
    echo json_encode(readJson('galerie.json'));
    exit;
}

// POST upload photo
if ($action === 'photo-upload' && $method === 'POST') {
    requireAuth();

    if (!isset($_FILES['photo'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Aucun fichier']);
        exit;
    }

    $file = $_FILES['photo'];

    if ($file['size'] > MAX_UPLOAD_SIZE) {
        http_response_code(400);
        echo json_encode(['error' => 'Fichier trop volumineux (max 5 Mo)']);
        exit;
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, ALLOWED_TYPES)) {
        http_response_code(400);
        echo json_encode(['error' => 'Type de fichier non autorise (JPG, PNG, WebP, GIF uniquement)']);
        exit;
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = date('Y-m-d') . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
    $dest = UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        http_response_code(500);
        echo json_encode(['error' => 'Erreur lors de l\'upload']);
        exit;
    }

    // Ajouter a la galerie
    $galerie = readJson('galerie.json');
    $category = sanitize($_POST['category'] ?? 'evenements');
    $labelFr = sanitize($_POST['label_fr'] ?? '');
    $labelEu = sanitize($_POST['label_eu'] ?? '');

    $maxId = 0;
    foreach ($galerie as $g) {
        if ($g['id'] > $maxId) $maxId = $g['id'];
    }

    $entry = [
        'id' => $maxId + 1,
        'filename' => $filename,
        'category' => $category,
        'date' => date('Y-m-d'),
        'fr' => ['label' => $labelFr],
        'eu' => ['label' => $labelEu],
    ];

    array_unshift($galerie, $entry);
    writeJson('galerie.json', $galerie);

    echo json_encode(['ok' => true, 'photo' => $entry]);
    exit;
}

// DELETE photo
if ($action === 'photo-delete' && $method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    $id = intval($input['id'] ?? 0);
    $galerie = readJson('galerie.json');

    $toDelete = null;
    foreach ($galerie as $g) {
        if ($g['id'] === $id) { $toDelete = $g; break; }
    }

    if ($toDelete && !empty($toDelete['filename'])) {
        $filepath = UPLOAD_DIR . $toDelete['filename'];
        if (file_exists($filepath)) unlink($filepath);
    }

    $galerie = array_values(array_filter($galerie, function($g) use ($id) {
        return $g['id'] !== $id;
    }));
    writeJson('galerie.json', $galerie);
    echo json_encode(['ok' => true]);
    exit;
}

// ===========================
// EQUIPES (configuration FFF)
// ===========================

// GET equipes (public — le front a besoin des labels FR/EU)
if ($action === 'equipes' && $method === 'GET') {
    echo json_encode(readJson('equipes.json'));
    exit;
}

// POST equipes-save (remplacement complet du fichier — auth requise)
if ($action === 'equipes-save' && $method === 'POST') {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || !isset($input['equipes']) || !is_array($input['equipes'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Payload invalide (attendu: { saison, club, equipes[] })']);
        exit;
    }

    // Si la saison change, archive l'ancienne config
    $current = readJson('equipes.json');
    $oldSaison = $current['saison'] ?? null;
    $newSaison = trim($input['saison'] ?? '');
    if ($oldSaison && $newSaison && $oldSaison !== $newSaison) {
        $archiveDir = DATA_DIR . 'equipes-archive/';
        if (!is_dir($archiveDir)) mkdir($archiveDir, 0755, true);
        $archivePath = $archiveDir . $oldSaison . '.json';
        // N'écrase pas un archive existant (cas où on rebascule deux fois la même saison)
        if (!file_exists($archivePath)) {
            file_put_contents(
                $archivePath,
                json_encode($current, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );
        }
    }

    // Validation des équipes : key unique, fff_id non vide, label_fr non vide
    $seenKeys = [];
    $cleaned = [];
    foreach ($input['equipes'] as $i => $eq) {
        $key = trim($eq['key'] ?? '');
        if (!$key || !preg_match('/^[a-z0-9_]+$/i', $key)) {
            http_response_code(400);
            echo json_encode(['error' => "Clé d'équipe invalide ligne " . ($i+1) . " (caractères autorisés: a-z, 0-9, _)"]);
            exit;
        }
        if (isset($seenKeys[$key])) {
            http_response_code(400);
            echo json_encode(['error' => "Clé '{$key}' en doublon"]);
            exit;
        }
        $seenKeys[$key] = true;

        $fffId = trim($eq['fff_id'] ?? '');
        if (!$fffId) {
            http_response_code(400);
            echo json_encode(['error' => "ID FFF manquant pour '{$key}'"]);
            exit;
        }

        $cleaned[] = [
            'key' => $key,
            'fff_id' => $fffId,
            'label_fr' => sanitize($eq['label_fr'] ?? $key),
            'label_eu' => sanitize($eq['label_eu'] ?? $eq['label_fr'] ?? $key),
            'competition' => !empty($eq['competition']),
            'ordre' => intval($eq['ordre'] ?? ($i + 1)),
        ];
    }

    $config = [
        'saison' => sanitize($input['saison'] ?? date('Y') . '-' . (date('Y')+1)),
        'club' => [
            'id' => intval($input['club']['id'] ?? 8748),
            'code' => intval($input['club']['code'] ?? 523288),
            'nom' => sanitize($input['club']['nom'] ?? 'A.S.J. D\'ESPELETTE'),
            'cdg' => intval($input['club']['cdg'] ?? 12),
        ],
        'equipes' => $cleaned,
        'derniere_maj' => date('Y-m-d'),
    ];

    writeJson('equipes.json', $config);

    // Invalider le cache FFF lié aux équipes (classement + resultats)
    $cacheDir = DATA_DIR . 'cache/';
    if (is_dir($cacheDir)) {
        foreach (glob($cacheDir . 'classement_*.json') as $f) @unlink($f);
        foreach (glob($cacheDir . 'resultats_*.json') as $f) @unlink($f);
    }

    echo json_encode(['ok' => true, 'config' => $config]);
    exit;
}

// --- Fallback ---
http_response_code(404);
echo json_encode(['error' => 'Action inconnue']);
