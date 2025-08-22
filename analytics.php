<?php
// Minimal privacy-friendly analytics endpoint in PHP
// Place in web root as analytics.php and route /analytics (POST) and /analytics/summary (GET) to it.

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$dir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
$file = $dir . DIRECTORY_SEPARATOR . 'events.ndjson';
if (!is_dir($dir)) { @mkdir($dir, 0775, true); }

function anonymize_ip($ip) {
  if (!$ip) return '';
  if ($ip === '::1') return '::1';
  $pure = str_replace('::ffff:', '', $ip);
  if (strpos($pure, ':') !== false) {
    $parts = explode(':', $pure);
    $parts = array_pad($parts, 8, '0');
    return implode(':', array_slice($parts, 0, 4)) . '::';
  }
  $seg = explode('.', $pure);
  if (count($seg) === 4) return $seg[0] . '.' . $seg[1] . '.' . $seg[2] . '.0';
  return '';
}

function get_json_input() {
  $raw = file_get_contents('php://input');
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

if ($method === 'POST' && $path === '/analytics') {
  $ip = '';
  if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
    $ip = trim($parts[0]);
  } else {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
  }
  $ip = anonymize_ip($ip);
  $country = $_SERVER['HTTP_CF_IPCOUNTRY'] ?? '';
  $city = $_SERVER['HTTP_CF_IPCITY'] ?? '';
  $in = get_json_input();
  $ev = [
    'ts' => time() * 1000,
    'ip' => $ip,
    'region' => ['country' => $country, 'city' => $city],
    't' => $in['t'] ?? null,
    'url' => $in['url'] ?? null,
    'ref' => $in['ref'] ?? '',
    'lang' => $in['lang'] ?? '',
    'tz' => $in['tz'] ?? '',
    'vp' => $in['vp'] ?? [],
    'dpr' => $in['dpr'] ?? 1,
    'theme' => $in['theme'] ?? '',
    'clicks' => isset($in['clicks']) ? intval($in['clicks']) : 0,
    'dwell' => isset($in['dwell']) ? intval($in['dwell']) : 0
  ];
  @file_put_contents($file, json_encode($ev) . "\n", FILE_APPEND | LOCK_EX);
  http_response_code(204);
  exit;
}

if ($method === 'GET' && $path === '/analytics/summary') {
  $total = 0; $themes = ['light' => 0, 'dark' => 0]; $totalClicks = 0; $totalDwell = 0; $byCountry = [];
  if (file_exists($file)) {
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
      $ev = json_decode($line, true);
      if (!is_array($ev)) continue;
      if (($ev['t'] ?? null) === 'view') $total++;
      $th = $ev['theme'] ?? '';
      if (isset($themes[$th])) $themes[$th]++;
      $totalClicks += intval($ev['clicks'] ?? 0);
      $totalDwell += intval($ev['dwell'] ?? 0);
      $c = $ev['region']['country'] ?? '';
      if ($c) $byCountry[$c] = ($byCountry[$c] ?? 0) + 1;
    }
  }
  header('Content-Type: application/json');
  echo json_encode([
    'total' => $total,
    'themePreference' => $themes,
    'avgClicks' => $total ? round($totalClicks / $total, 2) : 0,
    'avgDwellMs' => $total ? intval($totalDwell / $total) : 0,
    'byCountry' => $byCountry
  ]);
  exit;
}

http_response_code(404);
?>
