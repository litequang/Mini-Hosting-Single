<?php
// Only invoked through the authenticated MHS FastCGI adapter. Never a vhost file.
declare(strict_types=1);
ini_set('display_errors', '0');
ini_set('log_errors', '0');
$data = $_SERVER['MHS_DATA'] ?? '';
$slug = $_SERVER['MHS_SITE'] ?? '';
$proof = $_SERVER['MHS_AUTH_PROOF'] ?? '';
$prefix = '/api/sites/' . $slug . '/database-admin';
if (!preg_match('/^[a-z][a-z0-9-]{1,30}$/D', $slug) || !$data || !is_file($data . '/adminer-key')) { http_response_code(403); exit('MHS_DB_DENIED'); }
$key = file_get_contents($data . '/adminer-key');
$expiry = $_SERVER['MHS_AUTH_EXPIRY'] ?? '';
$principal = $_SERVER['MHS_PRINCIPAL'] ?? '';
if (!ctype_digit($expiry) || (int)$expiry < time() || (int)$expiry > time()+90 || !hash_equals(hash_hmac('sha256', $slug . ':' . $expiry . ':' . $principal, $key), $proof)) { http_response_code(403); exit('MHS_DB_DENIED'); }
$marker = json_decode(file_get_contents($data . '/mhs.json'), true);
$registry = json_decode(file_get_contents($data . '/sites.json'), true);
$site = null;
foreach (($registry['sites'] ?? []) as $candidate) { if (($candidate['slug'] ?? '') === $slug) $site = $candidate; }
$db = $site['database'] ?? '';
if (($marker['project'] ?? '') !== 'MHS' || ($site['managedBy'] ?? '') !== 'MHS' || !$db || isset($site['lease']) || isset($site['clusterId'])) { http_response_code(403); exit('MHS_DB_DENIED'); }
$meta = json_decode(file_get_contents($data . '/databases.json'), true);
$credentials = $meta[$db] ?? null;
if (!$credentials || !preg_match('/^mhs_[a-f0-9]{12}$/D', $credentials['user']) || empty($credentials['password'])) { http_response_code(403); exit('MHS_DB_USER_REQUIRED'); }
foreach (['db' => $db, 'username' => $credentials['user'], 'server' => 'localhost'] as $field => $expected) {
    if (isset($_GET[$field]) && $_GET[$field] !== $expected) { http_response_code(403); exit('MHS_DB_SCOPE_DENIED'); }
    $_GET[$field] = $expected;
}
if (isset($_POST['auth']) || isset($_POST['logout'])) { http_response_code(403); exit('Use MHS Panel login/logout.'); }
unset($_POST['_mhs_csrf']);
ini_set('mysqli.default_socket', $data . '/mysql/mysql.sock');
ini_set('session.use_strict_mode', '1');
$sessions = $data . '/adminer-sessions';
if (!is_dir($sessions)) mkdir($sessions, 0700, true);
session_save_path($sessions);
session_name('mhsdb_' . substr(hash('sha256', $slug . ':' . $principal), 0, 16));
session_set_cookie_params(['lifetime'=>0,'path'=>$prefix,'secure'=>($_SERVER['HTTPS'] ?? '')==='on','httponly'=>true,'samesite'=>'Strict']);
session_start();
$_SESSION['pwds']['server']['localhost'][$credentials['user']] = $credentials['password'];
function adminer_object() {
    class MhsAdminer extends Adminer\Adminer {
        function name() { return 'MHS Database'; }
        function credentials() { global $credentials; return ['localhost', $credentials['user'], $credentials['password']]; }
        function database() { global $db; return $db; }
        function databases($flush = true) { global $db; return [$db]; }
        function login($login, $password) { global $credentials; return hash_equals($credentials['user'], (string)$login); }
        function verifyVersion() { return false; }
        function serviceWorker() { }
        function manifest() { return []; }
        function csp(array $policies) { foreach ($policies as &$policy) { $policy['frame-ancestors'] = "'self'"; $policy['connect-src'] = "'self'"; $policy['frame-src'] = "'self'"; } return $policies; }
        function afterConnect() { Adminer\connection()->query('SET SESSION max_statement_time=30'); }
    }
    return new MhsAdminer;
}
require __DIR__ . '/../vendor/adminer-6.2.0-mysql-en.php';
