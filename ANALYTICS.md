# Besucherstatistik: selbst gehostetes GoatCounter

Die Website nutzt [GoatCounter](https://www.goatcounter.com) — quelloffen unter EUPL-1.2,
ohne Cookies, ohne Einwilligungsbanner, betrieben auf einem eigenen Server.

Die Website selbst bleibt statisch. Eingebunden sind nur wenige Zeilen JavaScript;
sämtliche Daten liegen auf dem eigenen GoatCounter-Server, nicht bei einem Dritten.

## Was im Repository steckt

| Datei | Zweck |
|---|---|
| `index.html`, `impressum.html`, `Datenschutz.html` | Zähl-Snippet vor `</body>` |
| `Datenschutz.html`, Abschnitte 2 + 3 | Datenschutzerklärung zu GoatCounter |
| `deploy/goatcounter/goatcounter.service` | systemd-Unit für den Server |

`presse.html` ist bewusst **nicht** eingebunden — die Seite leitet per
`<meta http-equiv="refresh" content="0; …">` sofort weiter, ein Zählaufruf käme
dort nicht zuverlässig zustande.

## Das Snippet

```html
<script>
window.goatcounter = {
    no_onload: navigator.doNotTrack === '1'
            || window.doNotTrack === '1'
            || navigator.globalPrivacyControl === true
};
</script>
<script data-goatcounter="https://stats.mrokon.de/count"
        async src="https://stats.mrokon.de/count.js"></script>
```

Der erste Block ist eine bewusste Ergänzung: GoatCounter wertet „Do Not Track“
[von sich aus nicht aus](https://www.goatcounter.com/help/faq). Da die
Datenschutzerklärung DNT und Global Privacy Control als Widerspruchsmöglichkeit
nennt, wird die Zählung hier selbst unterdrückt, sobald eines der Signale gesetzt ist.

Aus demselben Grund gibt es **keinen** `<noscript>`-Zählpixel: sonst wäre das
Blockieren von JavaScript kein wirksamer Widerspruch mehr.

## Server einrichten

Vorausgesetzt wird ein kleiner Linux-Server (Debian/Ubuntu, 1 GB RAM genügt) mit
öffentlicher IP und erreichbaren Ports 80 und 443.

Konkret läuft GoatCounter auf dem netcup-VPS, der auch Nextcloud bedient. Dort sind
80 und 443 bereits vom **Nginx Proxy Manager** (Docker) belegt. GoatCounter bringt
zwar eigenes TLS mit automatischen Let's-Encrypt-Zertifikaten mit, kann diese Ports
aber nicht bekommen — es läuft deshalb ohne eigenes TLS hinter dem vorhandenen
Reverse Proxy:

```
Internet ──443──▶ Nginx Proxy Manager ──▶ 100.107.88.64:8090 ──▶ goatcounter
                  (TLS, Let's Encrypt)
```

`100.107.88.64` ist die Tailscale-Adresse des Hosts. GoatCounter bindet
ausschließlich daran und ist damit aus dem Internet nicht direkt erreichbar,
für den Proxy-Container aber schon. Nicht an `0.0.0.0` binden — die Firewall
dieses Servers filtert nur teilweise.

### 1. DNS

Einen A-Record (und bei IPv6 zusätzlich AAAA) setzen:

```
stats.mrokon.de.  A     <IP-des-Servers>
stats.mrokon.de.  AAAA  <IPv6-des-Servers>
```

Erst weitermachen, wenn `dig +short stats.mrokon.de` die IP zurückgibt — sonst
schlägt die Zertifikatsausstellung fehl.

### 2. Binary installieren

Aktuelle Version von <https://github.com/arp242/goatcounter/releases> holen
(statisch gelinkt, keine Abhängigkeiten):

Die Release-Dateien tragen die Versionsnummer im Namen — eine `latest/download/`-URL
ohne Version läuft ins Leere. Aktuelle Version und exakten Dateinamen vorher auf der
[Releases-Seite](https://github.com/arp242/goatcounter/releases) prüfen:

```bash
cd /tmp
curl -fsSLO https://github.com/arp242/goatcounter/releases/download/v2.7.0/goatcounter-v2.7.0-linux-amd64.gz
gunzip -f goatcounter-v2.7.0-linux-amd64.gz
sudo install -m 755 goatcounter-v2.7.0-linux-amd64 /usr/local/bin/goatcounter
goatcounter version
```

### 3. Benutzer und Datenverzeichnis

```bash
useradd --system --home /var/lib/goatcounter --shell /usr/sbin/nologin goatcounter
mkdir -p /var/lib/goatcounter
chown goatcounter:goatcounter /var/lib/goatcounter
```

### 4. Site anlegen

```bash
sudo -u goatcounter /usr/local/bin/goatcounter db create site \
    -createdb \
    -vhost stats.mrokon.de \
    -user.email <deine-login-adresse> \
    -db 'sqlite+/var/lib/goatcounter/db.sqlite3'
```

`-createdb` ist beim allerersten Aufruf nötig; ohne das Flag bricht GoatCounter ab,
solange die SQLite-Datei noch nicht existiert. Bei späteren Sites weglassen.

Das Kommando fragt interaktiv nach einem Passwort. Es lässt sich alternativ per
`-password` mitgeben — dann steht es allerdings in der Shell-History.

Läuft der Dienst bereits, vorher `systemctl stop goatcounter`: das vermeidet
SQLite-Sperren, und GoatCounter hält die Site-Liste im Speicher, würde eine neu
angelegte Site ohne Neustart also gar nicht kennen.

### 5. Dienst starten

```bash
cp deploy/goatcounter/goatcounter.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now goatcounter
systemctl status goatcounter
```

Prüfen, ob der Dienst antwortet — noch ohne TLS, direkt auf der Tailscale-Adresse:

```bash
curl -sSf http://100.107.88.64:8090/status
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Host: stats.mrokon.de' http://100.107.88.64:8090/
```

Der zweite Aufruf sollte **303** liefern (Weiterleitung zur Login-Seite). Ein
**404** hieße, dass der vhost nicht angelegt ist — dann Schritt 4 nachholen.

### 6. Reverse Proxy eintragen

Im Nginx Proxy Manager unter **Hosts → Proxy Hosts → Add Proxy Host**:

| Feld | Wert |
|---|---|
| Domain Names | `stats.mrokon.de` |
| Scheme | `http` |
| Forward Hostname / IP | `100.107.88.64` |
| Forward Port | `8090` |
| Block Common Exploits | an |
| Websockets Support | an — das Dashboard aktualisiert sich per WebSocket |
| Cache Assets | aus |

Im Reiter *SSL*: *Request a new SSL Certificate*, dazu *Force SSL* und
*HTTP/2 Support* aktivieren.

Dazu muss die Firewall den Weg vom Proxy-Container zum Dienst freigeben. `ufw`
steht auf `default deny (incoming)`, und die vorhandene Regel
`Anywhere on tailscale0 ALLOW IN` greift **nicht**: sie gilt für Pakete, die auf
dem Interface `tailscale0` ankommen: die des Containers kommen über die
Docker-Bridge herein und sind nur *an* die Tailscale-Adresse gerichtet. Ohne
die folgende Regel antwortet der Proxy mit `504 Gateway Time-out`:

```bash
ufw allow proto tcp from 172.18.0.0/16 to 100.107.88.64 port 8090 \
    comment 'GoatCounter via Nginx Proxy Manager'
```

`172.18.0.0/16` ist das Bridge-Netz `npm_default`
(`docker network inspect npm_default`).

Kein AAAA-Record setzen: der Nginx Proxy Manager veröffentlicht seine Ports per
Docker nur auf IPv4, auf IPv6 lauscht nichts. Ein AAAA-Eintrag führt dazu, dass
Besucher mit IPv6 in einen Timeout laufen.

Danach ist das Dashboard unter <https://stats.mrokon.de> mit der in Schritt 4
angelegten E-Mail-Adresse erreichbar.

Den `X-Forwarded-For`-Header setzt der Nginx Proxy Manager von sich aus; GoatCounter
wertet ihn aus und kann so Länder zuordnen. Ein eigenes Flag dafür gibt es nicht.

> **Hinweis zum Deployment:** Die Website läuft auf **GitHub Pages**
> (`Server: GitHub.com`, A-Records auf `185.199.108–111.153`, `CNAME`-Datei im
> Repo-Wurzelverzeichnis). GitHub Pages liefert den Repository-Inhalt unverändert
> aus — geprüft: `mrokon.de/README-Analytics.md` und `mrokon.de/js/analytics.js`
> antworteten mit HTTP 200. Diese Datei und `deploy/` sind damit nach dem Push
> unter `mrokon.de/ANALYTICS.md` bzw. `mrokon.de/deploy/…` öffentlich abrufbar.
> Wer das vermeiden will, legt im Repo-Wurzelverzeichnis eine `_config.yml` an:
>
> ```yaml
> exclude:
>   - ANALYTICS.md
>   - deploy/
> ```
>
> Die drei IONOS-Deploy-Now-Workflows unter `.github/workflows/` spielen für die
> Auslieferung keine Rolle mehr.

### 7. Website ausrollen

Das Snippet ist bereits eingebaut. Sobald die geänderten HTML-Dateien in den
GitHub-Pages-Branch gepusht sind, sollten die ersten Aufrufe im Dashboard
auftauchen.

## Betrieb

**Backup** — die gesamte Datenbank ist eine einzelne SQLite-Datei. Täglich per
Cron sichern:

```bash
sqlite3 /var/lib/goatcounter/db.sqlite3 ".backup '/var/backups/goatcounter-$(date +\%F).sqlite3'"
```

**Update** — Binary austauschen und neu starten; `-automigrate` in der Unit
übernimmt anstehende Schema-Migrationen:

```bash
systemctl stop goatcounter
# neues Binary nach /usr/local/bin/goatcounter kopieren
systemctl start goatcounter
```

**Logs** — `journalctl -u goatcounter -f`

## Fehlersuche

*Keine Zugriffe im Dashboard:*
1. Im Browser-Netzwerktab prüfen, ob `count.js` von `stats.mrokon.de` geladen wird.
2. Adblocker testweise deaktivieren — manche Listen blockieren GoatCounter.
3. Prüfen, ob im Browser DNT/GPC aktiv ist; dann unterdrückt das Snippet die
   Zählung absichtlich.

*Zertifikatsfehler:* DNS-Eintrag und Erreichbarkeit von Port 80 prüfen — ohne
Port 80 schlägt die ACME-Challenge fehl. Das Zertifikat verwaltet der Nginx Proxy
Manager, nicht GoatCounter; Fehlermeldungen stehen dort unter *SSL Certificates*.

*502 Bad Gateway:* der Proxy erreicht GoatCounter nicht. Prüfen, ob der Dienst
läuft (`systemctl status goatcounter`) und ob er tatsächlich auf `100.107.88.64:8090`
lauscht (`ss -tlnp | grep 8090`). Nach einem Neustart des Hosts kann die
Tailscale-Adresse später kommen als der Dienst — die Unit startet dann per
`Restart=on-failure` erneut.

*504 Gateway Time-out:* der Weg vom Container zum Dienst ist blockiert. Erst vom
Host prüfen, dann aus dem Container:

```bash
curl -sS -m 5 -o /dev/null -w '%{http_code}\n' http://100.107.88.64:8090/status
docker exec npm-app-1 sh -lc \
  'curl -sS -m 5 -o /dev/null -w "%{http_code}\n" http://100.107.88.64:8090/status'
```

Antwortet der Host mit 200 und der Container gar nicht, fehlt die ufw-Regel aus
Schritt 6.

*Timeout im Browser, obwohl der Server antwortet:* auf einen AAAA-Record prüfen —
`Resolve-DnsName stats.mrokon.de -Type AAAA` bzw. `dig AAAA stats.mrokon.de`.

## Vorgängersystem

Das frühere selbstgebaute Log-Auswertungssystem (`js/analytics.js`,
`js/analytics-widget.js`, `analytics/`, `data/analytics.json`, die GitHub Action
`analytics.yml` sowie die `.htaccess`-Weiterleitungen) wurde vollständig entfernt.

Es war zuletzt deaktiviert und das Tracking-Script syntaktisch defekt. Vor allem
aber konnte sein Grundprinzip auf dieser Website nie funktionieren: Es setzte auf
Apache-Access-Logs, die man im IONOS-Control-Panel herunterlädt — die Seite läuft
jedoch auf GitHub Pages, wo es weder Zugriff auf Access-Logs noch eine Auswertung
von `.htaccess` gibt.
