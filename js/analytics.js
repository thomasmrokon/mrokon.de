/**
 * DSGVO-freundliches Analytics-System
 * Sendet minimale Beacons ohne Cookies an interne URLs
 * Die 404-Requests landen automatisch in den IONOS Access-Logs
 */

(function() {
    'use strict';
    
    // Konfiguration
    const CONFIG = {
        endpoint: '/analytics',
        enabled: true,
        debug: false
    };
    
    // Hilfsfunktionen
    function log(message) {
        if (CONFIG.debug) {
            console.log('[Analytics]', message);
        }
    }
    
    function getTimestamp() {
        return Math.floor(Date.now() / 1000);
    }
    
    function getCurrentPage() {
        return window.location.pathname + window.location.search;
    }
    
    function getReferrer() {
        const ref = document.referrer;
        if (!ref) return 'direct';
        
        try {
            const refUrl = new URL(ref);
            const currentUrl = new URL(window.location.href);
            
            // Interner Referrer
            if (refUrl.hostname === currentUrl.hostname) {
                return 'internal';
            }
            
            // Externe Referrer (nur Domain)
            return refUrl.hostname;
        } catch (e) {
            return 'unknown';
        }
    }
    
    function getScreenInfo() {
        return {
            w: screen.width,
            h: screen.height
        };
    }
    
    function getUserAgent() {
        const ua = navigator.userAgent;
        
        // Vereinfachte Browser-Erkennung
        if (ua.includes('Chrome')) return 'chrome';
        if (ua.includes('Firefox')) return 'firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
        if (ua.includes('Edge')) return 'edge';
        
        return 'other';
    }
    
    function getLanguage() {
        return navigator.language || navigator.userLanguage || 'unknown';
    }
    
    // Beacon senden
    function sendBeacon(data) {
        if (!CONFIG.enabled) return;
        
        const params = new URLSearchParams(data);
        const url = CONFIG.endpoint + '?' + params.toString();
        
        log('Sending beacon:', url);
        
        // Verwende fetch mit no-cors um CORS-Probleme zu vermeiden
        // Der Request wird als 404 in den Access-Logs landen
        fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache'
        }).catch(() => {
            // Fehler sind erwartet (404), ignorieren
        });
    }
    
    // Seitenaufruf tracken
    function trackPageView() {
        const data = {
            t: 'pageview',
            ts: getTimestamp(),
            p: getCurrentPage(),
            r: getReferrer(),
            br: getUserAgent(),
            l: getLanguage(),
            sw: getScreenInfo().w,
            sh: getScreenInfo().h
        };
        
        sendBeacon(data);
        log('Page view tracked:', data);
    }
    
    // Event tracken (optional für spezielle Events)
    function trackEvent(category, action, label = '') {
        const data = {
            t: 'event',
            ts: getTimestamp(),
            p: getCurrentPage(),
            ec: category,
            ea: action,
            el: label
        };
        
        sendBeacon(data);
        log('Event tracked:', data);
    }
    
    // Session-Ende tracken (beim Verlassen der Seite)
    function trackSessionEnd() {
        const data = {
            t: 'session_end',
            ts: getTimestamp(),
            p: getCurrentPage()
        };
        
        // Verwende sendBeacon API für zuverlässige Übertragung beim Seitenverlassen
        if (navigator.sendBeacon) {
            const params = new URLSearchParams(data);
            navigator.sendBeacon(CONFIG.endpoint + '?' + params.toString());
        } else {
            sendBeacon(data);
        }
        
        log('Session end tracked:', data);
    }
    
    // Initialisierung
    function init() {
        log('Analytics initialized');
        
        // Seitenaufruf sofort tracken
        trackPageView();
        
        // Session-Ende beim Verlassen der Seite tracken
        window.addEventListener('beforeunload', trackSessionEnd);
        window.addEventListener('pagehide', trackSessionEnd);
        
        // Öffentliche API für manuelle Events
        window.analytics = {
            trackEvent: trackEvent,
            trackPageView: trackPageView
        };
    }
    
    // Warten bis DOM geladen ist
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
