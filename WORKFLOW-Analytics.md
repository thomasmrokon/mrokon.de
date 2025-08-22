# Analytics Workflow - Schritt-für-Schritt Anleitung

## 📊 Auswertungen einsehen

### 1. **Live auf der Website**
- Besuchen Sie: `https://mrokon.de`
- Scrollen Sie nach unten zum **"📊 Besucherstatistiken"** Widget
- Klicken Sie auf den Pfeil (▼) um die Statistiken ein-/auszublenden
- Das Widget aktualisiert sich automatisch alle 5 Minuten

### 2. **Rohdaten (JSON)**
- Direkt im Browser: `https://mrokon.de/data/analytics.json`
- Oder im Repository: `data/analytics.json`

### 3. **GitHub Action Logs**
- GitHub Repository → Actions → "Analytics Log Processing"
- Hier sehen Sie Zusammenfassungen und Status jeder Verarbeitung

## 🔄 Regelmäßiger Workflow (Empfohlen: Wöchentlich)

### Schritt 1: IONOS Logs herunterladen
1. **IONOS Control Panel** öffnen
2. **Ihre Website** auswählen
3. **Statistiken** → **Access-Logs**
4. **Neueste Log-Dateien herunterladen** (meist `.log` oder `.txt`)
5. Dateien landen automatisch im **Downloads-Ordner**

### Schritt 2: Download-Helper verwenden (Neu! 🎉)
```bash
cd analytics
npm run download-helper
```

**Was passiert:**
- ✅ Sucht automatisch nach Log-Dateien im Downloads-Ordner
- ✅ Verschiebt sie in den `analytics/logs/` Ordner
- ✅ Vermeidet Duplikate
- ✅ Zeigt nächste Schritte an

### Schritt 3: Logs ins Repository committen
```bash
git add analytics/logs/
git commit -m "Analytics: Add new IONOS logs $(date +'%Y-%m-%d')"
git push
```

### Schritt 4: GitHub Action ausführen
1. **GitHub Repository** → **Actions** Tab
2. **"Analytics Log Processing"** auswählen
3. **"Run workflow"** klicken
4. **"Run workflow"** bestätigen

### Schritt 5: Ergebnisse prüfen
- **Website besuchen** und Analytics-Widget prüfen
- **GitHub Action Logs** für Zusammenfassung ansehen

## 🤖 Automatisierung

### Was ist automatisiert:
✅ **Log-Verarbeitung**: GitHub Action jeden Sonntag um 2:00 Uhr  
✅ **Daten-Aggregation**: Automatische Statistik-Generierung  
✅ **Archivierung**: Alte Logs werden automatisch archiviert  
✅ **Widget-Update**: Frontend aktualisiert sich automatisch  
✅ **Download-Helper**: Vereinfacht Log-Upload erheblich  

### Was bleibt manuell:
❌ **IONOS Login**: Keine API verfügbar  
❌ **Log-Download**: Muss im IONOS Control Panel erfolgen  
❌ **GitHub Action Trigger**: Manueller Start nach Log-Upload  

## 🚀 Optimierter Workflow mit Download-Helper

### Einmalige Einrichtung:
```bash
cd analytics
npm install
```

### Wöchentliche Routine (nur 2 Minuten!):
1. **IONOS Logs herunterladen** (30 Sekunden)
2. **Download-Helper ausführen**: `npm run download-helper` (10 Sekunden)
3. **Git commit & push** (30 Sekunden)
4. **GitHub Action starten** (30 Sekunden)

## 📈 Was Sie in den Analytics sehen

### Hauptmetriken:
- **Seitenaufrufe**: Gesamtzahl aller Besuche
- **Unique Visitors**: Anzahl eindeutiger Besucher (anonymisiert)
- **Ø Verweildauer**: Durchschnittliche Session-Dauer

### Detailanalysen:
- **Beliebte Seiten**: Top-Seiten mit Aufrufzahlen
- **Herkunft**: Referrer-Domains (Google, LinkedIn, etc.)
- **Browser**: Verteilung der verwendeten Browser
- **Zeitliche Trends**: Tägliche Statistiken

### Beispiel-Daten:
```json
{
  "summary": {
    "totalPageViews": 1250,
    "uniqueVisitors": 890,
    "avgSessionDuration": 180
  },
  "topPages": [
    { "page": "Startseite", "views": 650 },
    { "page": "Projekte", "views": 320 }
  ],
  "topReferrers": [
    { "referrer": "google.com", "count": 450 },
    { "referrer": "linkedin.com", "count": 180 }
  ]
}
```

## 🔧 Erweiterte Konfiguration

### Analytics-Tracking anpassen:
Bearbeiten Sie `js/analytics.js`:
```javascript
const CONFIG = {
    endpoint: '/analytics',
    enabled: true,        // Analytics ein/aus
    debug: false         // Debug-Modus
};
```

### Widget-Verhalten anpassen:
Bearbeiten Sie `js/analytics-widget.js`:
```javascript
const CONFIG = {
    refreshInterval: 300000,  // 5 Minuten
    animationDuration: 1000,  // 1 Sekunde
    debug: false
};
```

## 🐛 Troubleshooting

### "Keine Daten im Widget"
1. Prüfen Sie `data/analytics.json` - existiert die Datei?
2. Browser-Konsole auf JavaScript-Fehler prüfen
3. GitHub Action Logs prüfen

### "Download-Helper findet keine Dateien"
1. Prüfen Sie den Downloads-Ordner
2. Stellen Sie sicher, dass Dateien "access" oder "log" im Namen haben
3. Unterstützte Formate: `.log`, `.txt`, `.gz`

### "GitHub Action schlägt fehl"
1. Prüfen Sie, ob Dateien in `analytics/logs/` vorhanden sind
2. Action-Logs für detaillierte Fehlermeldungen prüfen
3. Stellen Sie sicher, dass Sie Push-Berechtigung haben

## 📞 Support

Bei Fragen:
1. **README-Analytics.md** lesen
2. **GitHub Issues** erstellen
3. **Code-Kommentare** in den Scripts prüfen

---

**💡 Tipp**: Richten Sie sich eine wöchentliche Erinnerung ein, um den Workflow regelmäßig durchzuführen. Mit dem Download-Helper dauert es nur noch 2 Minuten!
