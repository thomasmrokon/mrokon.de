#!/usr/bin/env node

/**
 * IONOS Log Download Helper
 * Hilft beim organisierten Download und Upload der IONOS Access-Logs
 */

const fs = require('fs');
const path = require('path');

class LogDownloadHelper {
    constructor() {
        this.logsDir = path.join(__dirname, 'logs');
        this.downloadDir = path.join(require('os').homedir(), 'Downloads');
    }
    
    // Prüft Downloads-Ordner auf neue IONOS Log-Dateien
    checkForNewLogs() {
        console.log('🔍 Suche nach IONOS Log-Dateien im Downloads-Ordner...');
        
        if (!fs.existsSync(this.downloadDir)) {
            console.log('❌ Downloads-Ordner nicht gefunden');
            return [];
        }
        
        const files = fs.readdirSync(this.downloadDir);
        const logFiles = files.filter(file => {
            const lowerFile = file.toLowerCase();
            return (lowerFile.includes('access') || lowerFile.includes('log')) && 
                   (lowerFile.endsWith('.log') || lowerFile.endsWith('.txt') || lowerFile.endsWith('.gz'));
        });
        
        console.log(`📁 Gefundene Log-Dateien: ${logFiles.length}`);
        logFiles.forEach(file => console.log(`   - ${file}`));
        
        return logFiles;
    }
    
    // Verschiebt Log-Dateien vom Downloads-Ordner in den logs-Ordner
    moveLogsToAnalytics() {
        const logFiles = this.checkForNewLogs();
        
        if (logFiles.length === 0) {
            console.log('ℹ️  Keine neuen Log-Dateien gefunden');
            return false;
        }
        
        // Logs-Ordner erstellen falls nicht vorhanden
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
            console.log('📁 Logs-Ordner erstellt');
        }
        
        let movedFiles = 0;
        
        for (const file of logFiles) {
            const sourcePath = path.join(this.downloadDir, file);
            const targetPath = path.join(this.logsDir, file);
            
            try {
                // Prüfen ob Datei bereits existiert
                if (fs.existsSync(targetPath)) {
                    console.log(`⚠️  Datei bereits vorhanden: ${file}`);
                    continue;
                }
                
                // Datei verschieben
                fs.renameSync(sourcePath, targetPath);
                console.log(`✅ Verschoben: ${file}`);
                movedFiles++;
                
            } catch (error) {
                console.error(`❌ Fehler beim Verschieben von ${file}:`, error.message);
            }
        }
        
        console.log(`\n🎉 ${movedFiles} Dateien erfolgreich verschoben`);
        return movedFiles > 0;
    }
    
    // Zeigt Anleitung für manuellen Download
    showDownloadInstructions() {
        console.log('\n📋 IONOS Log-Download Anleitung:');
        console.log('1. IONOS Control Panel öffnen');
        console.log('2. Ihre Website auswählen');
        console.log('3. Statistiken → Access-Logs');
        console.log('4. Neueste Log-Dateien herunterladen');
        console.log('5. Dieses Script erneut ausführen: npm run download-helper');
        console.log('6. GitHub Action ausführen: Actions → "Analytics Log Processing" → "Run workflow"');
    }
    
    // Hauptfunktion
    run() {
        console.log('🚀 IONOS Log Download Helper\n');
        
        const moved = this.moveLogsToAnalytics();
        
        if (moved) {
            console.log('\n✨ Nächste Schritte:');
            console.log('1. Git commit und push der neuen Log-Dateien');
            console.log('2. GitHub Action ausführen');
            console.log('3. Analytics-Widget auf der Website prüfen');
        } else {
            this.showDownloadInstructions();
        }
    }
}

// Script ausführen
if (require.main === module) {
    const helper = new LogDownloadHelper();
    helper.run();
}

module.exports = LogDownloadHelper;
