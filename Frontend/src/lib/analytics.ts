import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- CONFIGURAÇÃO ---
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const STORAGE_KEY = "cookie_consent";

// --- TIPOS ---
type CookiePreferences = {
    essential: boolean; // Sempre true
    analytics: boolean;
    marketing: boolean;
};

type ConsentStatus = "granted" | "denied" | "pending" | "custom";

type EventParams = {
    event_category?: string;
    event_label?: string;
    value?: number;
    [key: string]: any;
};

// --- CORE ---

export const analytics = {
    /**
     * Inicializa o GA4 baseando-se nas preferências salvas.
     */
    initialize: () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        try {
            // Migração de versões antigas ("granted"/"denied")
            if (stored === "granted" || stored === "denied") {
                const isGranted = stored === "granted";
                analytics.setPreferences({
                    essential: true,
                    analytics: isGranted,
                    marketing: isGranted // Assume marketing together with analytics for migration
                });
                return;
            }

            const prefs = JSON.parse(stored) as CookiePreferences;
            if (prefs.analytics) {
                loadGAScript();
            }
        } catch (e) {
            console.error("Erro ao ler preferências de cookies:", e);
        }
    },

    /**
     * Define as preferências granulares do usuário.
     */
    setPreferences: (prefs: CookiePreferences) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

        // Aplica as escolhas imediatamente
        if (prefs.analytics) {
            loadGAScript();
            analytics.trackEvent("cookie_consent_update", { status: "custom", ...prefs });
        } else {
            // Nota: Desligar o GA4 após carregado requer reload da página, 
            // mas futuras navegações (SPA) serão bloqueadas pelo trackEvent check.
        }
    },

    /**
     * Atalho para "Aceitar Tudo"
     */
    optIn: () => {
        analytics.setPreferences({ essential: true, analytics: true, marketing: true });
    },

    /**
     * Atalho para "Rejeitar Tudo" (apenas essenciais)
     */
    optOut: () => {
        analytics.setPreferences({ essential: true, analytics: false, marketing: false });
    },

    /**
     * Retorna o status atual
     */
    getConsentStatus: (): ConsentStatus => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return "pending";
        if (stored === "granted") return "granted";
        if (stored === "denied") return "denied";
        // Verifica se é JSON
        try {
            JSON.parse(stored);
            return "custom";
        } catch {
            return "pending";
        }
    },

    /**
     * Retorna as preferências detalhadas (ou padrão segura se não existir)
     */
    getPreferences: (): CookiePreferences => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { essential: true, analytics: false, marketing: false };
        try {
            if (stored === "granted") return { essential: true, analytics: true, marketing: true };
            if (stored === "denied") return { essential: true, analytics: false, marketing: false };
            return JSON.parse(stored);
        } catch {
            return { essential: true, analytics: false, marketing: false };
        }
    },

    /**
     * Dispara evento se permitido.
     */
    trackEvent: (eventName: string, params?: EventParams) => {
        const prefs = analytics.getPreferences();

        // Safety Check 1: Permissão de Analytics
        if (!prefs.analytics) {
            if (import.meta.env.DEV) {
                // console.warn(`[Analytics Blocked] Event: ${eventName} (No Consent)`);
            }
            return;
        }

        // Safety Check 2: Script Carregado
        if (typeof window.gtag !== "function") {
            if (import.meta.env.DEV) {
                console.warn(`[Analytics Pending] Event: ${eventName} (Script not ready)`);
            }
            return;
        }

        // Fire!
        window.gtag("event", eventName, params);

        if (import.meta.env.DEV) {
            console.log(`[Analytics Sent] 📡 ${eventName}`, params);
        }
    },

    /**
     * Registra visualização de página (SPA)
     */
    pageView: (path: string) => {
        analytics.trackEvent("page_view", {
            page_path: path
        });
    }
};

// --- HELPER INTERNO ---
// Carrega o script do Google de forma assíncrona
function loadGAScript() {
    if (!GA_MEASUREMENT_ID) {
        console.error("❌ [Analytics] Erro: VITE_GA_MEASUREMENT_ID não definido no .env");
        return;
    }
    if (document.getElementById("ga-script")) return; // Já carregado

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.id = "ga-script";

    document.head.appendChild(script);

    const inlineScript = document.createElement("script");
    inlineScript.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new window.Date());
    gtag('config', '${GA_MEASUREMENT_ID}', { 'anonymize_ip': true });
  `;
    document.head.appendChild(inlineScript);

    console.log("✅ [Analytics] GA4 Script Injetado.");
}
