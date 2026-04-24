<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/' || $uri === '') {
    header('Location: /fr/');
    exit;
}

if (preg_match('#^/(fr|eu)(/.*)?$#', $uri, $m)) {
    $sub = $m[2] ?: '/';
    if (substr($sub, -1) === '/') $sub .= 'index.html';
    $path = __DIR__ . '/public/' . $m[1] . $sub;
    if (is_file($path)) {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $types = [
            'html' => 'text/html; charset=utf-8',
            'css'  => 'text/css',
            'js'   => 'application/javascript',
            'json' => 'application/json',
            'jpg'  => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png'  => 'image/png',
            'ico'  => 'image/x-icon',
            'svg'  => 'image/svg+xml',
            'pdf'  => 'application/pdf',
        ];
        if (isset($types[$ext])) header('Content-Type: ' . $types[$ext]);
        readfile($path);
        return true;
    }
    http_response_code(404);
    echo "Not Found: $uri";
    return true;
}

return false;
