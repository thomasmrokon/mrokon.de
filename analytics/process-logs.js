#!/usr/bin/env node

/**
 * Analytics Log Processor
 * Verarbeitet IONOS Access-Logs und extrahiert Analytics-Daten
 * DSGVO-konform ohne personenbezogene Daten
 */

const fs = require('fs');
const path = require('path');
const { format, parseISO, startOfDay, subDays, isAfter } = require('date-fns');

class AnalyticsProcessor {
    constructor() {
        this.logsDir = path.join(__dirname, 'logs');
        this.outputFile = path.join(__dirname, '../data/analytics.json');
        this.processedDir = path.join(__dirname, 'processed');
        
        // Analytics-Daten Struktur
        this.analytics = {
            lastUpdated: new Date().toISOString(),
            summary: {
                totalPageViews: 0,
                uniqueVisitors: 0,
                totalEvents: 0,
                avgSessionDuration: 0
            },
            pages: {},
            referrers: {},
            browsers: {},
            languages: {},
            screenSizes: {},
            dailyStats: {},
            topPages: [],
            topReferrers: []
        };
        
        // Temporäre Daten für Berechnungen
        this.sessions = new Map();
        this.visitors = new Set();
    }
    
    // Log-Zeile parsen
    parseLogLine(line) {
        // Beispiel IONOS Access-Log Format:
        // IP - - [timestamp] "GET /analytics?t=pageview&ts=1234567890&p=/&r=direct HTTP/1.1" 404 size "referer" "user-agent"
        
        const logRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*)" (\d+) \S+ "([^"]*)" "([^"]*)"/;
        const match = line.match(logRegex);
        
        if (!match) return null;
        
        const [, ip, timestamp, method, url, status, referer, userAgent] = match;
        
        // Nur Analytics-Requests verarbeiten
        if (!url.includes('/analytics?')) return null;
        
        try {
            const urlObj = new URL('http://example.com' + url);
            const params = urlObj.searchParams;
            
            return {
                ip: this.hashIP(ip), // IP anonymisieren
                timestamp: this.parseTimestamp(timestamp),
                method,
                status: parseInt(status),
                params: Object.fromEntries(params.entries()),
                referer,
                userAgent
            };
        } catch (e) {
            console.warn('Fehler beim Parsen der Log-Zeile:', e.message);
            return null;
        }
    }
    
    // IP-Adresse anonymisieren (Hash)
    hashIP(ip) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(ip + 'salt').digest('hex').substring(0, 8);
    }
    
    // Timestamp parsen
    parseTimestamp(timestamp) {
        // Format: 22/Aug/2025:12:30:45 +0200
        const parts = timestamp.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
        if (!parts) return new Date();
        
        const [, day, month, year, hour, minute, second] = parts;
        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        return new Date(year, months[month], day, hour, minute, second);
    }
    
    // Analytics-Event verarbeiten
    processEvent(logEntry) {
        const { params, timestamp, ip } = logEntry;
        const eventType = params.t;
        
        if (!eventType) return;
        
        const sessionId = `${ip}_${format(startOfDay(timestamp), 'yyyy-MM-dd')}`;
        const page = params.p || '/';
        const dayKey = format(timestamp, 'yyyy-MM-dd');
        
        // Session tracking
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                start: timestamp,
                end: timestamp,
                pages: new Set(),
                events: 0
            });
        }
        
        const session = this.sessions.get(sessionId);
        session.end = timestamp;
        session.events++;
        
        // Visitor tracking (anonymisiert)
        this.visitors.add(ip);
        
        // Daily stats initialisieren
        if (!this.analytics.dailyStats[dayKey]) {
            this.analytics.dailyStats[dayKey] = {
                pageViews: 0,
                visitors: new Set(),
                events: 0
            };
        }
        
        const dayStats = this.analytics.dailyStats[dayKey];
        dayStats.visitors.add(ip);
        
        // Event-spezifische Verarbeitung
        switch (eventType) {
            case 'pageview':
                this.processPageView(params, dayStats, session);
                break;
            case 'event':
                this.processCustomEvent(params, dayStats);
                break;
            case 'session_end':
                // Session-Ende bereits durch Timestamp-Update behandelt
                break;
        }
    }
    
    // Seitenaufruf verarbeiten
    processPageView(params, dayStats, session) {
        const page = params.p || '/';
        const referrer = params.r || 'direct';
        const browser = params.br || 'unknown';
        const language = params.l || 'unknown';
        const screenSize = `${params.sw || 0}x${params.sh || 0}`;
        
        // Zähler erhöhen
        this.analytics.summary.totalPageViews++;
        dayStats.pageViews++;
        
        // Session-Seiten
        session.pages.add(page);
        
        // Seiten-Statistiken
        if (!this.analytics.pages[page]) {
            this.analytics.pages[page] = { views: 0, visitors: new Set() };
        }
        this.analytics.pages[page].views++;
        this.analytics.pages[page].visitors.add(session);
        
        // Referrer-Statistiken
        if (referrer !== 'internal') {
            if (!this.analytics.referrers[referrer]) {
                this.analytics.referrers[referrer] = 0;
            }
            this.analytics.referrers[referrer]++;
        }
        
        // Browser-Statistiken
        if (!this.analytics.browsers[browser]) {
            this.analytics.browsers[browser] = 0;
        }
        this.analytics.browsers[browser]++;
        
        // Sprach-Statistiken
        if (!this.analytics.languages[language]) {
            this.analytics.languages[language] = 0;
        }
        this.analytics.languages[language]++;
        
        // Bildschirmgrößen
        if (screenSize !== '0x0') {
            if (!this.analytics.screenSizes[screenSize]) {
                this.analytics.screenSizes[screenSize] = 0;
            }
            this.analytics.screenSizes[screenSize]++;
        }
    }
    
    // Custom Event verarbeiten
    processCustomEvent(params, dayStats) {
        this.analytics.summary.totalEvents++;
        dayStats.events++;
        
        // Hier könnten spezifische Event-Kategorien ausgewertet werden
        // Aktuell nur Zählung
    }
    
    // Finale Berechnungen und Aggregationen
    finalizeAnalytics() {
        // Unique Visitors
        this.analytics.summary.uniqueVisitors = this.visitors.size;
        
        // Durchschnittliche Session-Dauer
        let totalDuration = 0;
        let validSessions = 0;
        
        for (const session of this.sessions.values()) {
            const duration = (session.end - session.start) / 1000; // Sekunden
            if (duration > 0 && duration < 3600) { // Max 1 Stunde
                totalDuration += duration;
                validSessions++;
            }
        }
        
        this.analytics.summary.avgSessionDuration = validSessions > 0 
            ? Math.round(totalDuration / validSessions) 
            : 0;
        
        // Top-Listen erstellen
        this.analytics.topPages = Object.entries(this.analytics.pages)
            .map(([page, data]) => ({
                page,
                views: data.views,
                uniqueVisitors: data.visitors.size
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        
        this.analytics.topReferrers = Object.entries(this.analytics.referrers)
            .map(([referrer, count]) => ({ referrer, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        // Daily Stats bereinigen (Sets zu Zahlen)
        for (const [day, stats] of Object.entries(this.analytics.dailyStats)) {
            this.analytics.dailyStats[day] = {
                pageViews: stats.pageViews,
                visitors: stats.visitors.size,
                events: stats.events
            };
        }
        
        // Page visitors bereinigen
        for (const page of Object.keys(this.analytics.pages)) {
            this.analytics.pages[page].uniqueVisitors = this.analytics.pages[page].visitors.size;
            delete this.analytics.pages[page].visitors;
        }
    }
    
    // Log-Dateien verarbeiten
    async processLogs() {
        console.log('Starte Analytics-Verarbeitung...');
        
        if (!fs.existsSync(this.logsDir)) {
            console.log('Logs-Verzeichnis nicht gefunden:', this.logsDir);
            return;
        }
        
        const logFiles = fs.readdirSync(this.logsDir)
            .filter(file => file.endsWith('.log') || file.endsWith('.txt'))
            .sort();
        
        if (logFiles.length === 0) {
            console.log('Keine Log-Dateien gefunden');
            return;
        }
        
        console.log(`Verarbeite ${logFiles.length} Log-Datei(en)...`);
        
        for (const logFile of logFiles) {
            const filePath = path.join(this.logsDir, logFile);
            console.log(`Verarbeite: ${logFile}`);
            
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            let processedLines = 0;
            for (const line of lines) {
                const logEntry = this.parseLogLine(line);
                if (logEntry) {
                    this.processEvent(logEntry);
                    processedLines++;
                }
            }
            
            console.log(`  ${processedLines} Analytics-Einträge verarbeitet`);
        }
        
        // Finale Berechnungen
        this.finalizeAnalytics();
        
        // Ausgabe speichern
        this.saveAnalytics();
        
        console.log('Analytics-Verarbeitung abgeschlossen');
        console.log(`Total Page Views: ${this.analytics.summary.totalPageViews}`);
        console.log(`Unique Visitors: ${this.analytics.summary.uniqueVisitors}`);
        console.log(`Avg Session Duration: ${this.analytics.summary.avgSessionDuration}s`);
    }
    
    // Analytics-Daten speichern
    saveAnalytics() {
        // Ausgabe-Verzeichnis erstellen
        const outputDir = path.dirname(this.outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // JSON speichern
        fs.writeFileSync(this.outputFile, JSON.stringify(this.analytics, null, 2));
        console.log(`Analytics-Daten gespeichert: ${this.outputFile}`);
    }
}

// Script ausführen
if (require.main === module) {
    const processor = new AnalyticsProcessor();
    processor.processLogs().catch(console.error);
}

module.exports = AnalyticsProcessor;
