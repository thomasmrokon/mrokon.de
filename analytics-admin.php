<?php
// Simple analytics admin dashboard (no external deps)
// Place in web root and add rewrite for /analytics/admin to this file if desired.

// Optional access protection: require key only if data/admin.key exists
$keyFile = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'admin.key';
if (is_file($keyFile)) {
  $ADMIN_PASS = trim(@file_get_contents($keyFile));
  if ($ADMIN_PASS !== '') {
    $ok = isset($_GET['key']) && hash_equals($ADMIN_PASS, $_GET['key']);
    if (!$ok) {
      http_response_code(403);
      echo 'Forbidden';
      exit;
    }
  }
}

$dataFile = __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'events.ndjson';
$events = [];
if (file_exists($dataFile)) {
  $lines = file($dataFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  foreach ($lines as $line) {
    $ev = json_decode($line, true);
    if (is_array($ev)) $events[] = $ev;
  }
}

$totalViews = 0;
$themes = ['light' => 0, 'dark' => 0];
$totalClicks = 0;
$totalDwell = 0;
$byCountry = [];
$pages = [];

foreach ($events as $ev) {
  if (($ev['t'] ?? '') === 'view') $totalViews++;
  $th = $ev['theme'] ?? '';
  if (isset($themes[$th])) $themes[$th]++;
  $totalClicks += intval($ev['clicks'] ?? 0);
  $totalDwell += intval($ev['dwell'] ?? 0);
  $country = $ev['region']['country'] ?? '';
  if ($country) $byCountry[$country] = ($byCountry[$country] ?? 0) + 1;
  $url = $ev['url'] ?? '';
  if ($url) $pages[$url] = ($pages[$url] ?? 0) + 1;
}

$avgClicks = $totalViews ? round($totalClicks / $totalViews, 2) : 0;
$avgDwell = $totalViews ? intval($totalDwell / $totalViews) : 0;

// Helpers for inline bar chart
function bar($value, $max, $label) {
  $w = $max > 0 ? intval(($value / $max) * 200) : 0;
  $w = max(1, $w);
  $safe = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
  return '<div style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0;">'
       . '<div style="width:210px;background:#eee;height:10px;border-radius:5px;overflow:hidden;"><div style="width:' . $w . 'px;height:10px;background:#8cc0b3;"></div></div>'
       . '<span style="font-family:system-ui, sans-serif;font-size:.9rem;">' . $safe . ' (' . intval($value) . ')</span>'
       . '</div>';
}

// Sort helpers
arsort($byCountry);
arsort($pages);

?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics – Admin</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; background:#fff; color:#222; margin:0; }
    .container { max-width: 900px; margin: 0 auto; padding: 1.5rem; }
    h1 { font-weight:600; font-size:1.4rem; margin:.5rem 0 1rem; }
    .kpis { display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: .8rem; }
    .card { border:1px solid #ddd; border-radius:8px; padding:1rem; background:#fafafa; }
    .label { color:#666; font-size:.85rem; }
    .value { font-size:1.3rem; font-weight:600; margin-top:.2rem; }
    h2 { font-size:1rem; margin:1.4rem 0 .6rem; }
    table { width:100%; border-collapse: collapse; }
    th, td { text-align:left; padding:.5rem; border-bottom:1px solid #eee; font-size:.92rem; }
    .muted { color:#666; }
    .row { display:flex; gap:2rem; flex-wrap:wrap; }
    .col { flex:1 1 280px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Analytics – Admin</h1>

    <div class="kpis">
      <div class="card">
        <div class="label">Seitenaufrufe gesamt</div>
        <div class="value"><?php echo number_format($totalViews, 0, ',', '.'); ?></div>
      </div>
      <div class="card">
        <div class="label">Ø Klicks pro Aufruf</div>
        <div class="value"><?php echo number_format($avgClicks, 2, ',', '.'); ?></div>
      </div>
      <div class="card">
        <div class="label">Ø Verweildauer (Sek.)</div>
        <div class="value"><?php echo number_format($avgDwell/1000, 1, ',', '.'); ?></div>
      </div>
      <div class="card">
        <div class="label">Theme‑Präferenz (Light/Dark)</div>
        <div class="value"><?php echo intval($themes['light']); ?>/<?php echo intval($themes['dark']); ?></div>
      </div>
    </div>

    <div class="row">
      <div class="col">
        <h2>Top‑Regionen (Land)</h2>
        <?php
          $max = empty($byCountry) ? 0 : max($byCountry);
          if ($max === 0) echo '<div class="muted">Keine Daten</div>';
          foreach ($byCountry as $c => $cnt) echo bar($cnt, $max, $c ?: '–');
        ?>
      </div>
      <div class="col">
        <h2>Top‑Seiten</h2>
        <?php
          $maxp = empty($pages) ? 0 : max($pages);
          if ($maxp === 0) echo '<div class="muted">Keine Daten</div>';
          foreach (array_slice($pages, 0, 10, true) as $p => $cnt) echo bar($cnt, $maxp, $p ?: '–');
        ?>
      </div>
    </div>

    <h2>Rohdaten (letzte 50)</h2>
    <table>
      <thead>
        <tr>
          <th>Zeit</th>
          <th>Typ</th>
          <th>URL</th>
          <th>Land</th>
          <th>Klicks</th>
          <th>Verweildauer (ms)</th>
          <th>Theme</th>
        </tr>
      </thead>
      <tbody>
        <?php
          $slice = array_slice($events, -50);
          foreach ($slice as $ev) {
            $time = isset($ev['ts']) ? date('Y-m-d H:i:s', intval($ev['ts']/1000)) : '';
            echo '<tr>';
            echo '<td class="muted">' . htmlspecialchars($time, ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($ev['t'] ?? '', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($ev['url'] ?? '', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . htmlspecialchars($ev['region']['country'] ?? '', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '<td>' . intval($ev['clicks'] ?? 0) . '</td>';
            echo '<td>' . intval($ev['dwell'] ?? 0) . '</td>';
            echo '<td>' . htmlspecialchars($ev['theme'] ?? '', ENT_QUOTES, 'UTF-8') . '</td>';
            echo '</tr>';
          }
        ?>
      </tbody>
    </table>

    <p class="muted" style="margin-top:1rem;">Hinweis: IPs sind anonymisiert. Daten ohne Cookies/Drittanbieter. DNT wird respektiert.</p>
  </div>
</body>
</html>


