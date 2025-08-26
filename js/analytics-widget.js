/**
 * Analytics Widget
 * Zeigt DSGVO-freundliche Besucherstatistiken an
 * Lädt Daten aus statischen JSON-Dateien
 */

(function() {
    'use strict';
    
    // Konfiguration
    const CONFIG = {
        dataUrl: '/data/analytics.json',
        refreshInterval: 300000, // 5 Minuten
        animationDuration: 1000,
        debug: false
    };
    
    // Widget-Klasse
    class AnalyticsWidget {
        constructor(containerId) {
            this.container = document.getElementById(containerId);
            this.data = null;
            this.isVisible = false;
            
            if (!this.container) {
                console.warn('Analytics Widget: Container nicht gefunden:', containerId);
                return;
            }
            
            this.init();
        }
        
        // Widget initialisieren
        init() {
            this.createWidget();
            this.loadData();
            
            // Automatische Aktualisierung
            setInterval(() => this.loadData(), CONFIG.refreshInterval);
            
            this.log('Analytics Widget initialisiert');
        }
        
        // Widget HTML erstellen
        createWidget() {
            this.container.innerHTML = `
                <div class="analytics-widget">
                    <div class="analytics-header">
                        <h3>📊 Besucherstatistiken der letzten Woche</h3>
                        <button class="analytics-toggle" title="Ein-/Ausblenden">
                            <span class="toggle-icon">▼</span>
                        </button>
                    </div>
                    <div class="analytics-content">
                        <div class="analytics-loading">
                            <div class="loading-spinner"></div>
                            <p>Lade Statistiken...</p>
                        </div>
                        <div class="analytics-data" style="display: none;">
                            <div class="analytics-summary">
                                <div class="stat-item">
                                    <span class="stat-value" id="total-views">-</span>
                                    <span class="stat-label">Seitenaufrufe</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value" id="unique-visitors">-</span>
                                    <span class="stat-label">Besucher</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-value" id="avg-duration">-</span>
                                    <span class="stat-label">Ø Verweildauer</span>
                                </div>
                            </div>
                            
                            <div class="analytics-details">
                                <div class="analytics-section">
                                    <h4>Beliebte Seiten</h4>
                                    <div class="top-pages" id="top-pages"></div>
                                </div>
                                
                                <div class="analytics-section">
                                    <h4>Herkunft</h4>
                                    <div class="top-referrers" id="top-referrers"></div>
                                </div>
                                
                                <div class="analytics-section">
                                    <h4>Browser</h4>
                                    <div class="browser-stats" id="browser-stats"></div>
                                </div>
                            </div>
                            
                            <div class="analytics-message" id="analytics-message" style="display: none;">
                                <div class="message-content">
                                    <h4>📊 Analytics-System aktiviert</h4>
                                    <p>Das Besuchertracking wurde gerade aktiviert. Erste Statistiken werden nach den nächsten Webseitenbesuchen verfügbar sein.</p>
                                    <p><strong>So funktioniert es:</strong></p>
                                    <ul>
                                        <li>DSGVO-konform ohne Cookies</li>
                                        <li>Keine personenbezogenen Daten</li>
                                        <li>Daten werden aus Server-Logs generiert</li>
                                        <li>Automatische Aktualisierung alle 5 Minuten</li>
                                    </ul>
                                </div>
                            </div>
                            
                            <div class="analytics-footer">
                                <p class="last-updated">Letzte Aktualisierung: <span id="last-updated">-</span></p>
                                <p class="privacy-note">🔒 DSGVO-konform, keine Cookies, keine personenbezogenen Daten</p>
                            </div>
                        </div>
                        <div class="analytics-error" style="display: none;">
                            <p>⚠️ Statistiken konnten nicht geladen werden</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Event-Listener für Toggle
            const toggleBtn = this.container.querySelector('.analytics-toggle');
            const content = this.container.querySelector('.analytics-content');
            const toggleIcon = this.container.querySelector('.toggle-icon');
            
            toggleBtn.addEventListener('click', () => {
                this.isVisible = !this.isVisible;
                content.style.display = this.isVisible ? 'block' : 'none';
                toggleIcon.textContent = this.isVisible ? '▲' : '▼';
                
                // Speichere Zustand
                localStorage.setItem('analytics-widget-visible', this.isVisible);
            });
            
            // Gespeicherten Zustand wiederherstellen
            const savedState = localStorage.getItem('analytics-widget-visible');
            if (savedState === 'true') {
                toggleBtn.click();
            }
        }
        
        // Daten laden
        async loadData() {
            try {
                // Versuche verschiedene Pfade für lokale und Online-Verwendung
                const urls = [
                    CONFIG.dataUrl + '?t=' + Date.now(),
                    './data/analytics.json?t=' + Date.now(),
                    'data/analytics.json?t=' + Date.now()
                ];
                
                let data = null;
                let lastError = null;
                
                for (const url of urls) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            data = await response.json();
                            break;
                        }
                    } catch (err) {
                        lastError = err;
                        continue;
                    }
                }
                
                // Fallback: Demo-Daten verwenden wenn keine JSON geladen werden kann
                if (!data) {
                    console.warn('Analytics Widget: Verwende Demo-Daten, da JSON nicht geladen werden konnte:', lastError);
                    data = this.getDemoData();
                }
                
                // Validierung der Datenstruktur
                if (!data || typeof data !== 'object') {
                    throw new Error('Ungültige Datenstruktur');
                }
                
                if (!data.summary || !data.topPages || !data.topReferrers) {
                    throw new Error('Unvollständige Datenstruktur');
                }
                
                this.data = data;
                this.renderData();
                this.showContent('data');
                
                this.log('Daten erfolgreich geladen');
                
            } catch (error) {
                console.warn('Analytics Widget: Fehler beim Laden der Daten:', error);
                this.showContent('error');
            }
        }
        
        // Demo-Daten für Fallback - zeigt "Keine Daten" wenn System gerade aktiviert wurde
        getDemoData() {
            return {
                "lastUpdated": new Date().toISOString(),
                "summary": {
                    "totalPageViews": 0,
                    "uniqueVisitors": 0,
                    "totalEvents": 0,
                    "avgSessionDuration": 0
                },
                "pages": {},
                "referrers": {},
                "browsers": {},
                "topPages": [],
                "topReferrers": [],
                "message": "Analytics-System wurde gerade aktiviert. Erste Daten werden nach den nächsten Webseitenbesuchen verfügbar sein."
            };
        }
        
        // Daten rendern
        renderData() {
            if (!this.data) return;
            
            const { summary, topPages, topReferrers, browsers, lastUpdated } = this.data;
            
            // Prüfen ob Daten vorhanden sind
            const hasData = summary.totalPageViews > 0 || summary.uniqueVisitors > 0;
            
            if (!hasData) {
                // Zeige Nachricht wenn keine Daten vorhanden
                document.getElementById('analytics-message').style.display = 'block';
                // Verstecke Details-Bereiche
                document.querySelector('.analytics-details').style.display = 'none';
            } else {
                // Zeige normale Daten
                document.getElementById('analytics-message').style.display = 'none';
                document.querySelector('.analytics-details').style.display = 'grid';
            }
            
            // Summary-Statistiken
            this.animateValue('total-views', summary.totalPageViews);
            this.animateValue('unique-visitors', summary.uniqueVisitors);
            
            // Durchschnittliche Verweildauer formatieren
            const avgDuration = this.formatDuration(summary.avgSessionDuration);
            document.getElementById('avg-duration').textContent = avgDuration;
            
            // Top-Seiten
            this.renderTopPages(topPages);
            
            // Top-Referrer
            this.renderTopReferrers(topReferrers);
            
            // Browser-Statistiken
            this.renderBrowserStats(browsers);
            
            // Letzte Aktualisierung
            const updateTime = new Date(lastUpdated).toLocaleString('de-DE');
            document.getElementById('last-updated').textContent = updateTime;
        }
        
        // Animierte Zahlen-Anzeige
        animateValue(elementId, targetValue) {
            const element = document.getElementById(elementId);
            const startValue = parseInt(element.textContent) || 0;
            const duration = CONFIG.animationDuration;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing-Funktion
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);
                
                element.textContent = currentValue.toLocaleString('de-DE');
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };
            
            requestAnimationFrame(animate);
        }
        
        // Verweildauer formatieren
        formatDuration(seconds) {
            if (seconds < 60) return `${seconds}s`;
            if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
            return `${Math.round(seconds / 3600)}h`;
        }
        
        // Top-Seiten rendern
        renderTopPages(topPages) {
            const container = document.getElementById('top-pages');
            
            if (!topPages || topPages.length === 0) {
                container.innerHTML = '<p class="no-data">Keine Daten verfügbar</p>';
                return;
            }
            
            const maxViews = topPages[0]?.views || 1;
            
            container.innerHTML = topPages.slice(0, 5).map(page => {
                const percentage = (page.views / maxViews) * 100;
                const pageName = this.formatPageName(page.page);
                
                return `
                    <div class="stat-bar">
                        <div class="stat-bar-label">
                            <span class="page-name">${pageName}</span>
                            <span class="page-views">${page.views}</span>
                        </div>
                        <div class="stat-bar-bg">
                            <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Top-Referrer rendern
        renderTopReferrers(topReferrers) {
            const container = document.getElementById('top-referrers');
            
            if (!topReferrers || topReferrers.length === 0) {
                container.innerHTML = '<p class="no-data">Keine Daten verfügbar</p>';
                return;
            }
            
            const maxCount = topReferrers[0]?.count || 1;
            
            container.innerHTML = topReferrers.slice(0, 5).map(ref => {
                const percentage = (ref.count / maxCount) * 100;
                const referrerName = this.formatReferrerName(ref.referrer);
                
                return `
                    <div class="stat-bar">
                        <div class="stat-bar-label">
                            <span class="referrer-name">${referrerName}</span>
                            <span class="referrer-count">${ref.count}</span>
                        </div>
                        <div class="stat-bar-bg">
                            <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Browser-Statistiken rendern
        renderBrowserStats(browsers) {
            const container = document.getElementById('browser-stats');
            
            if (!browsers || Object.keys(browsers).length === 0) {
                container.innerHTML = '<p class="no-data">Keine Daten verfügbar</p>';
                return;
            }
            
            const sortedBrowsers = Object.entries(browsers)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 4);
            
            const total = sortedBrowsers.reduce((sum, [,count]) => sum + count, 0);
            
            container.innerHTML = sortedBrowsers.map(([browser, count]) => {
                const percentage = Math.round((count / total) * 100);
                const browserName = this.formatBrowserName(browser);
                
                return `
                    <div class="browser-item">
                        <span class="browser-name">${browserName}</span>
                        <span class="browser-percentage">${percentage}%</span>
                    </div>
                `;
            }).join('');
        }
        
        // Hilfsfunktionen für Formatierung
        formatPageName(page) {
            if (page === '/') return 'Startseite';
            if (page === '/impressum.html') return 'Impressum';
            if (page === '/datenschutz.html') return 'Datenschutz';
            return page.replace(/\.html$/, '').replace(/^\//, '');
        }
        
        formatReferrerName(referrer) {
            if (referrer === 'direct') return 'Direktaufruf';
            if (referrer === 'internal') return 'Intern';
            return referrer.replace(/^www\./, '');
        }
        
        formatBrowserName(browser) {
            const names = {
                'chrome': 'Chrome',
                'firefox': 'Firefox',
                'safari': 'Safari',
                'edge': 'Edge',
                'other': 'Andere'
            };
            return names[browser] || browser;
        }
        
        // Content-Bereiche anzeigen/verstecken
        showContent(type) {
            const loading = this.container.querySelector('.analytics-loading');
            const data = this.container.querySelector('.analytics-data');
            const error = this.container.querySelector('.analytics-error');
            
            loading.style.display = type === 'loading' ? 'block' : 'none';
            data.style.display = type === 'data' ? 'block' : 'none';
            error.style.display = type === 'error' ? 'block' : 'none';
        }
        
        // Debug-Logging
        log(message) {
            if (CONFIG.debug) {
                console.log('[Analytics Widget]', message);
            }
        }
    }
    
    // Widget-Styles hinzufügen
    function addStyles() {
        if (document.getElementById('analytics-widget-styles')) return;
        
        const styles = `
            <style id="analytics-widget-styles">
                .analytics-widget {
                    background: var(--bg-box-dark);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    margin: 2rem 0;
                    font-size: 0.9rem;
                    color: var(--text-light);
                }
                
                .analytics-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                    cursor: pointer;
                }
                
                .analytics-header h3 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: var(--accent-green-light);
                }
                
                .analytics-toggle {
                    background: none;
                    border: none;
                    color: var(--accent-pink-light);
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0.25rem;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .analytics-toggle:hover {
                    background: rgba(255,255,255,0.1);
                }
                
                .analytics-content {
                    display: none;
                    padding: 1.5rem;
                }
                
                .analytics-loading {
                    text-align: center;
                    padding: 2rem;
                }
                
                .loading-spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid var(--border-color);
                    border-top: 2px solid var(--accent-green-light);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 1rem;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .analytics-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .stat-item {
                    text-align: center;
                    padding: 1rem;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                }
                
                .stat-value {
                    display: block;
                    font-size: 1.8rem;
                    font-weight: bold;
                    color: var(--accent-green-light);
                    margin-bottom: 0.25rem;
                }
                
                .stat-label {
                    font-size: 0.8rem;
                    color: var(--text-grey-light);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .analytics-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 2rem;
                    margin-bottom: 2rem;
                }
                
                .analytics-section h4 {
                    margin: 0 0 1rem 0;
                    font-size: 1rem;
                    color: var(--accent-pink-light);
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 0.5rem;
                }
                
                .stat-bar {
                    margin-bottom: 0.75rem;
                }
                
                .stat-bar-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 0.25rem;
                    font-size: 0.85rem;
                }
                
                .stat-bar-bg {
                    height: 6px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 3px;
                    overflow: hidden;
                }
                
                .stat-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--accent-green-light), var(--accent-pink-light));
                    border-radius: 3px;
                    transition: width 0.8s ease-out;
                }
                
                .browser-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                
                .browser-item:last-child {
                    border-bottom: none;
                }
                
                .browser-percentage {
                    color: var(--accent-green-light);
                    font-weight: bold;
                }
                
                .analytics-footer {
                    border-top: 1px solid var(--border-color);
                    padding-top: 1rem;
                    text-align: center;
                }
                
                .last-updated {
                    font-size: 0.8rem;
                    color: var(--text-grey-light);
                    margin-bottom: 0.5rem;
                }
                
                .privacy-note {
                    font-size: 0.75rem;
                    color: var(--accent-green-light);
                    margin: 0;
                }
                
                .no-data {
                    color: var(--text-grey-light);
                    font-style: italic;
                    text-align: center;
                    margin: 1rem 0;
                }
                
                .analytics-error {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-grey-light);
                }
                
                .analytics-message {
                    background: rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    border-left: 4px solid var(--accent-green-light);
                }
                
                .analytics-message h4 {
                    color: var(--accent-green-light);
                    margin: 0 0 1rem 0;
                    font-size: 1.1rem;
                }
                
                .analytics-message p {
                    color: var(--text-grey-light);
                    margin-bottom: 1rem;
                    line-height: 1.6;
                }
                
                .analytics-message ul {
                    color: var(--text-grey-light);
                    margin: 0.5rem 0 0 1.5rem;
                    line-height: 1.6;
                }
                
                .analytics-message li {
                    margin-bottom: 0.5rem;
                }
                
                /* Light Mode */
                body.light-mode .analytics-widget {
                    background: var(--bg-box-light);
                    color: var(--text-dark);
                }
                
                body.light-mode .analytics-header h3 {
                    color: var(--accent-green-dark);
                }
                
                body.light-mode .analytics-toggle {
                    color: var(--accent-pink-dark);
                }
                
                body.light-mode .stat-value {
                    color: var(--accent-green-dark);
                }
                
                body.light-mode .analytics-section h4 {
                    color: var(--accent-pink-dark);
                }
                
                body.light-mode .browser-percentage {
                    color: var(--accent-green-dark);
                }
                
                body.light-mode .privacy-note {
                    color: var(--accent-green-dark);
                }
                
                /* Responsive */
                @media (max-width: 600px) {
                    .analytics-summary {
                        grid-template-columns: 1fr;
                    }
                    
                    .analytics-details {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                    
                    .analytics-content {
                        padding: 1rem;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // Auto-Initialisierung
    function autoInit() {
        // Styles hinzufügen
        addStyles();
        
        // Widget initialisieren wenn Container vorhanden
        const container = document.getElementById('analytics-widget');
        if (container) {
            new AnalyticsWidget('analytics-widget');
        }
    }
    
    // Warten bis DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
    
    // Öffentliche API
    window.AnalyticsWidget = AnalyticsWidget;
    
})();
