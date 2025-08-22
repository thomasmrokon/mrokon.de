# DSGVO-freundliches Analytics-System

Dieses Repository enthält ein vollständig DSGVO-konformes Analytics-System für statische Websites, das ohne Cookies und externe Dienste auskommt.

## 🎯 Überblick

Das System besteht aus drei Hauptkomponenten:
1. **Frontend-Tracking**: Minimale JavaScript-Beacons ohne Cookies
2. **Log-Verarbeitung**: GitHub Actions zur Aggregation der IONOS Access-Logs
3. **Analytics-Widget**: Frontend-Dashboard zur Anzeige der Statistiken

## 🔒 DSGVO-Konformität

✅ **Keine Cookies oder lokale Speicherung**  
✅ **Keine externen Dienste (Google Analytics, etc.)**  
✅ **Anonymisierte IP-Adressen (gehashed)**  
✅ **Minimale Datenerfassung**  
✅ **Vollständige Kontrolle über alle Daten**  
✅ **Transparente Dokumentation**  

## 📁 Dateistruktur

```
├── js/
│   ├── analytics.js              # Frontend-Tracking-Script
│   └── analytics-widget.js       # Dashboard-Widget
├── analytics/
│   ├── package.json              # Node.js Dependencies
│   ├── process-logs.js           # Log-Verarbeitungs-Script
│   ├── logs/                     # Hochgeladene IONOS Access-Logs
│   └── processed/                # Archivierte verarbeitete Logs
├── .github/workflows/
│   └── analytics.yml             # GitHub Action für Log-Verarbeitung
├── data/
│   └── analytics.json            # Statische Analytics-Daten
└── .htaccess                     # URL-Routing für Analytics-Endpoints
```

## 🚀 Installation & Setup

### 1. Repository-Setup
Das System ist bereits vollständig in diesem Repository integriert.

### 2. IONOS Deploy Now Konfiguration
- Die `.htaccess` ist bereits konfiguriert
- Analytics-Requests werden automatisch als 404 in den Access-Logs erfasst

### 3. GitHub Actions aktivieren
Die GitHub Action ist bereits konfiguriert und läuft:
- **Automatisch**: Jeden Sonntag um 2:00 Uhr
- **Manuell**: Über "Actions" → "Analytics Log Processing" → "Run workflow"

## 📊 Verwendung

### Frontend-Integration
Das Analytics-System ist bereits in `index.html` integriert:

```html
<!-- Analytics Scripts -->
<script src="js/analytics.js"></script>
<script src="js/analytics-widget.js"></script>

<!-- Analytics Widget Container -->
<div id="analytics-widget"></div>
```

### Log-Upload und -Verarbeitung

#### Schritt 1: IONOS Access-Logs herunterladen
1. IONOS Control Panel öffnen
2. Website → Statistiken → Access-Logs herunterladen
3. Log-Dateien (meist `.log` oder `.txt` Format)

#### Schritt 2: Logs ins Repository hochladen
```bash
# Logs in das analytics/logs/ Verzeichnis kopieren
mkdir -p analytics/logs
cp access_log_2025-08-22.log analytics/logs/
```

#### Schritt 3: GitHub Action ausführen
1. GitHub Repository → "Actions" Tab
2. "Analytics Log Processing" Workflow auswählen
3. "Run workflow" klicken
4. Die Action verarbeitet automatisch alle Logs im `analytics/logs/` Verzeichnis

### Manuelle Verarbeitung (lokal)
```bash
cd analytics
npm install
node process-logs.js
```

## 📈 Analytics-Daten

### Erfasste Metriken
- **Seitenaufrufe**: Anzahl der Besuche pro Seite
- **Unique Visitors**: Anzahl eindeutiger Besucher (anonymisiert)
- **Referrer**: Herkunft der Besucher (nur Domain)
- **Browser**: Vereinfachte Browser-Erkennung
- **Bildschirmauflösung**: Für responsive Design-Optimierung
- **Sprache**: Browser-Spracheinstellung
- **Session-Dauer**: Durchschnittliche Verweildauer

### Datenformat (analytics.json)
```json
{
  "lastUpdated": "2025-08-22T12:34:48.000Z",
  "summary": {
    "totalPageViews": 1250,
    "uniqueVisitors": 890,
    "totalEvents": 45,
    "avgSessionDuration": 180
  },
  "pages": {
    "/": { "views": 650, "uniqueVisitors": 420 },
    "/impressum.html": { "views": 120, "uniqueVisitors": 95 }
  },
  "referrers": {
    "direct": 450,
    "google.com": 320,
    "linkedin.com": 180
  },
  "browsers": {
    "chrome": 680,
    "firefox": 290,
    "safari": 180
  },
  "topPages": [...],
  "topReferrers": [...]
}
```

## 🛠 Konfiguration

### Analytics-Script (js/analytics.js)
```javascript
const CONFIG = {
    endpoint: '/analytics',     // Analytics-Endpoint
    enabled: true,             // Analytics aktivieren/deaktivieren
    debug: false              // Debug-Modus
};
```

### Analytics-Widget (js/analytics-widget.js)
```javascript
const CONFIG = {
    dataUrl: '/data/analytics.json',  // Pfad zur Analytics-JSON
    refreshInterval: 300000,          // Aktualisierung alle 5 Minuten
    animationDuration: 1000,          // Animation der Zahlen
    debug: false                      // Debug-Modus
};
```

## 🔧 Anpassungen

### Neue Seiten hinzufügen
Das System erkennt automatisch neue Seiten. Für bessere Darstellung im Widget können Sie die `formatPageName()` Funktion in `js/analytics-widget.js` erweitern:

```javascript
formatPageName(page) {
    if (page === '/') return 'Startseite';
    if (page === '/neue-seite.html') return 'Neue Seite';
    // ...
}
```

### Custom Events tracken
```javascript
// Beispiel: Button-Klick tracken
document.getElementById('contact-button').addEventListener('click', () => {
    if (window.analytics) {
        window.analytics.trackEvent('contact', 'button_click', 'header');
    }
});
```

## 🐛 Troubleshooting

### Analytics-Widget zeigt keine Daten
1. Prüfen Sie, ob `data/analytics.json` existiert und gültige Daten enthält
2. Browser-Konsole auf JavaScript-Fehler prüfen
3. Netzwerk-Tab prüfen, ob die JSON-Datei geladen wird

### GitHub Action schlägt fehl
1. Prüfen Sie, ob Log-Dateien im `analytics/logs/` Verzeichnis vorhanden sind
2. Logs-Format prüfen (sollte Standard Apache/Nginx Access-Log Format sein)
3. Action-Logs in GitHub für detaillierte Fehlermeldungen prüfen

### Keine Analytics-Daten werden erfasst
1. Browser-Konsole auf JavaScript-Fehler prüfen
2. Netzwerk-Tab prüfen, ob Analytics-Requests gesendet werden
3. `.htaccess` Konfiguration prüfen

## 📝 Wartung

### Regelmäßige Aufgaben
- **Wöchentlich**: IONOS Access-Logs herunterladen und verarbeiten
- **Monatlich**: Alte Archive in `analytics/processed/` prüfen (werden automatisch nach 6 Monaten gelöscht)
- **Bei Bedarf**: Analytics-Konfiguration anpassen

### Log-Archivierung
Verarbeitete Logs werden automatisch in `analytics/processed/YYYY-MM/` archiviert und nach 6 Monaten gelöscht.

## 🔐 Sicherheit

- Alle Daten bleiben auf eigenen Servern
- IP-Adressen werden mit SHA-256 gehashed
- Keine Übertragung an externe Dienste
- Minimale Datenerfassung nach Privacy-by-Design Prinzip

## 📞 Support

Bei Fragen oder Problemen:
1. GitHub Issues erstellen
2. Dokumentation in diesem README prüfen
3. Code-Kommentare in den JavaScript-Dateien lesen

---

**Entwickelt für IONOS Deploy Now mit vollständiger DSGVO-Konformität** 🇪🇺
