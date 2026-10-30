<?php
// Administrator input arrives over stdin, never argv/logs. Fresh independent site only.
ini_set('display_errors', '0');
$c = json_decode(stream_get_contents(STDIN), true, 16, JSON_THROW_ON_ERROR);
define('WP_INSTALLING', true);
define('WP_HOME', $c['url']);
define('WP_SITEURL', $c['url']);
$_SERVER['HTTP_HOST'] = parse_url($c['url'], PHP_URL_HOST);
$_SERVER['REQUEST_METHOD'] = 'GET';
require $c['root'].'/wp-load.php';
require_once ABSPATH.'wp-admin/includes/upgrade.php';
if (is_blog_installed()) { exit(12); }
$r = wp_install($c['title'], $c['username'], $c['email'], true, '', $c['password']);
if (is_wp_error($r) || empty($r['user_id'])) { exit(13); }
echo 'MHS_WORDPRESS_INSTALLED';
