#!/usr/bin/env node

/**
 * Generiert Analytics-Daten aus echten Server-Logs
 * Analysiert normale Website-Zugriffe und erstellt daraus Statistiken
 */

const fs = require('fs');
const zlib = require('zlib');
const { format, parseISO, startOfDay } = require('date-fns');

class RealAnalyticsGenerator {
    constructor() {
        this.outputFile = '../data/analytics.json';
        this.analytics = {
            lastUpdated: new Date().toISOString(),
            summary: {
                totalPageViews: 0,
                uniqueVisitors: 0,
                totalEvents: 0,
                avgSessionDuration: 120 // Geschätzt
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
        this.visitors = new Set();
    }
    
    // Log-Zeile parsen (Angepasst an IONOS Format)
    parseLogLine(line) {
        // Format: IP - - [timestamp] "METHOD /path HTTP/1.1" status size domain "referer" "user-agent"
        const logRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) ([^"]*)" (\d+) \S+ \S+ "([^"]*)" "([^"]*)"/;
        const match = line.match(logRegex);
        
        if (!match) return null;
        
        const [, ip, timestamp, method, url, status, referer, userAgent] = match;
        
        // Nur GET-Requests, aber auch 404s berücksichtigen (für vollständige Analyse)
        if (method !== 'GET') return null;
        
        // Statische Dateien ausschließen
        if (url.includes('.css') || url.includes('.js') || url.includes('.jpg') || 
            url.includes('.png') || url.includes('.ico') || url.includes('.gif') ||
            url.includes('.svg') || url.includes('.woff') || url.includes('.ttf')) return null;
        
        // Nur Spam-Requests ausschließen, normale Seiten zulassen
        if (url.includes('xmlrpc.php') || url.includes('wp-')) return null;
        
        // URL bereinigen (HTTP/1.1 entfernen)
        const cleanUrl = url.replace(' HTTP/1.1', '').replace(' HTTP/2.0', '');
        
        return {
            ip: this.hashIP(ip),
            timestamp: this.parseTimestamp(timestamp),
            url: cleanUrl,
            status: parseInt(status),
            referer: this.parseReferer(referer),
            userAgent: this.parseUserAgent(userAgent)
        };
    }
    
    // IP anonymisieren
    hashIP(ip) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(ip + 'salt').digest('hex').substring(0, 8);
    }
    
    // Timestamp parsen
    parseTimestamp(timestamp) {
        // Format: 25/Aug/2025:00:03:13 +0200
        const parts = timestamp.match(/(\d+)\/(\w+)\/(\d+):(\d+):(\d+):(\d+)/);
        if (!parts) return new Date();
        
        const [, day, month, year, hour, minute, second] = parts;
        const months = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        
        return new Date(year, months[month], day, hour, minute, second);
    }
    
    // Referrer parsen
    parseReferer(referer) {
        if (!referer || referer === '-' || referer === 'mrokon.de') return 'direct';
        
        try {
            const url = new URL(referer);
            if (url.hostname.includes('mrokon.de')) return 'internal';
            return url.hostname.replace('www.', '');
        } catch (e) {
            return 'direct';
        }
    }
    
    // User-Agent parsen
    parseUserAgent(userAgent) {
        if (userAgent.includes('Chrome')) return 'chrome';
        if (userAgent.includes('Firefox')) return 'firefox';
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'safari';
        if (userAgent.includes('Edge')) return 'edge';
        return 'other';
    }
    
    // Log-Eintrag verarbeiten
    processLogEntry(entry) {
        const { ip, timestamp, url, referer, userAgent } = entry;
        const dayKey = format(timestamp, 'yyyy-MM-dd');
        
        // Visitor tracking
        this.visitors.add(ip);
        
        // Page views
        this.analytics.summary.totalPageViews++;
        
        // Daily stats
        if (!this.analytics.dailyStats[dayKey]) {
            this.analytics.dailyStats[dayKey] = {
                pageViews: 0,
                visitors: new Set(),
                events: 0
            };
        }
        this.analytics.dailyStats[dayKey].pageViews++;
        this.analytics.dailyStats[dayKey].visitors.add(ip);
        
        // Pages
        if (!this.analytics.pages[url]) {
            this.analytics.pages[url] = { views: 0, visitors: new Set() };
        }
        this.analytics.pages[url].views++;
        this.analytics.pages[url].visitors.add(ip);
        
        // Referrers
        if (referer !== 'internal') {
            if (!this.analytics.referrers[referer]) {
                this.analytics.referrers[referer] = 0;
            }
            this.analytics.referrers[referer]++;
        }
        
        // Browsers
        const browser = this.parseUserAgent(userAgent);
        if (!this.analytics.browsers[browser]) {
            this.analytics.browsers[browser] = 0;
        }
        this.analytics.browsers[browser]++;
    }
    
    // Finale Berechnungen
    finalizeAnalytics() {
        // Unique visitors
        this.analytics.summary.uniqueVisitors = this.visitors.size;
        
        // Top pages
        this.analytics.topPages = Object.entries(this.analytics.pages)
            .map(([page, data]) => ({
                page,
                views: data.views,
                uniqueVisitors: data.visitors.size
            }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
        
        // Top referrers
        this.analytics.topReferrers = Object.entries(this.analytics.referrers)
            .map(([referrer, count]) => ({ referrer, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        
        // Daily stats bereinigen
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
    
    // Hauptverarbeitung
    async processRealLogs() {
        console.log('Generiere Analytics aus echten Server-Logs...');
        
        const logFile = 'logs/access.log.35.1.gz';
        
        try {
            const data = fs.readFileSync(logFile);
            const content = zlib.gunzipSync(data).toString('utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            console.log(`Verarbeite ${lines.length} Log-Einträge...`);
            
            let processedEntries = 0;
            for (const line of lines) {
                const entry = this.parseLogLine(line);
                if (entry) {
                    this.processLogEntry(entry);
                    processedEntries++;
                }
            }
            
            console.log(`${processedEntries} relevante Seitenaufrufe verarbeitet`);
            
            // Finale Berechnungen
            this.finalizeAnalytics();
            
            // Speichern
            this.saveAnalytics();
            
            console.log('Analytics-Generierung abgeschlossen:');
            console.log(`- Seitenaufrufe: ${this.analytics.summary.totalPageViews}`);
            console.log(`- Unique Visitors: ${this.analytics.summary.uniqueVisitors}`);
            console.log(`- Top-Seite: ${this.analytics.topPages[0]?.page || 'keine'} (${this.analytics.topPages[0]?.views || 0} Aufrufe)`);
            
        } catch (error) {
            console.error('Fehler beim Verarbeiten der Log-Datei:', error.message);
        }
    }
    
    // Analytics speichern
    saveAnalytics() {
        fs.writeFileSync(this.outputFile, JSON.stringify(this.analytics, null, 2));
        console.log(`Analytics-Daten gespeichert: ${this.outputFile}`);
    }
}

// Script ausführen
if (require.main === module) {
    const generator = new RealAnalyticsGenerator();
    generator.processRealLogs().catch(console.error);
}

module.exports = RealAnalyticsGenerator;
