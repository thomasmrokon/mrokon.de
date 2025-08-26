const fs = require('fs');
const zlib = require('zlib');

console.log('=== Log-Dateien Analyse ===\n');

const logFiles = fs.readdirSync('logs').filter(f => f.endsWith('.gz'));
console.log(`Gefundene Log-Dateien: ${logFiles.length}`);

// Überprüfe die neueste Log-Datei
const latestLog = logFiles.sort().pop();
console.log(`\nAnalysiere neueste Datei: ${latestLog}`);

try {
    const data = fs.readFileSync(`logs/${latestLog}`);
    const content = zlib.gunzipSync(data).toString('utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    console.log(`Gesamte Zeilen: ${lines.length}`);
    console.log('\nErste 3 Zeilen:');
    lines.slice(0, 3).forEach((line, i) => {
        console.log(`${i+1}: ${line.substring(0, 100)}...`);
    });
    
    // Suche nach Analytics-Requests
    const analyticsLines = lines.filter(line => line.includes('/analytics'));
    console.log(`\nAnalytics-Requests gefunden: ${analyticsLines.length}`);
    
    if (analyticsLines.length > 0) {
        console.log('Beispiel Analytics-Request:');
        console.log(analyticsLines[0]);
    } else {
        console.log('Keine Analytics-Requests in dieser Datei gefunden.');
        console.log('Das ist normal, da das Analytics-System erst kürzlich aktiviert wurde.');
    }
    
} catch (error) {
    console.error('Fehler beim Lesen der Log-Datei:', error.message);
}
