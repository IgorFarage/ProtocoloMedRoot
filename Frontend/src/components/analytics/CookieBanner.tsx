import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { analytics } from "@/lib/analytics";
import { Cookie, ShieldCheck, Settings } from "lucide-react";

export const CookieBanner = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Preferências locais do modal
    const [prefs, setPrefs] = useState({
        analytics: false,
        marketing: false
    });

    useEffect(() => {
        // Só mostra se o user nunca decidiu (pending)
        const status = analytics.getConsentStatus();
        if (status === "pending") {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAcceptAll = () => {
        analytics.optIn();
        setIsVisible(false);
    };

    const handleDeclineAll = () => {
        analytics.optOut();
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        analytics.setPreferences({
            essential: true,
            analytics: prefs.analytics,
            marketing: prefs.marketing
        });
        setIsVisible(false);
        setShowDetails(false);
    };

    const openDetails = () => {
        setShowDetails(true);
        // Reseta para padrão safe ao abrir, ou ler atual se existisse (mas aqui é 1st visit)
        setPrefs({ analytics: true, marketing: false });
    };

    if (!isVisible) return null;

    return (
        <>
            {/* --- BANNER PRINCIPAL --- */}
            <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-xl animate-in slide-in-from-bottom-5 fade-in duration-500">
                <Card className="shadow-2xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-start gap-4">
                            <div className="p-2 bg-primary/10 rounded-full shrink-0 hidden md:block">
                                <Cookie className="w-6 h-6 text-primary" />
                            </div>
                            <div className="space-y-3 w-full">
                                <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                    <Cookie className="w-5 h-5 text-primary md:hidden" />
                                    Sua privacidade importa
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Nós usamos cookies para melhorar sua experiência. Você pode aceitar todos ou personalizar suas escolhas.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <Button
                                        onClick={handleAcceptAll}
                                        className="flex-1 font-medium"
                                    >
                                        Aceitar Tudo
                                    </Button>
                                    <Button
                                        onClick={openDetails}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        <Settings className="w-4 h-4 mr-2" />
                                        Personalizar
                                    </Button>
                                    <Button
                                        onClick={handleDeclineAll}
                                        variant="ghost"
                                        className="flex-none text-muted-foreground hover:text-destructive"
                                    >
                                        Recusar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- MODAL DE DETALHES --- */}
            <Dialog open={showDetails} onOpenChange={setShowDetails}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Preferências de Cookies
                        </DialogTitle>
                        <DialogDescription>
                            Gerencie suas preferências de privacidade.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {/* 1. Essenciais */}
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-1">
                                <Label htmlFor="essential" className="font-medium text-base">Essenciais</Label>
                                <p className="text-sm text-muted-foreground">Necessários para o site funcionar (Login, Segurança).</p>
                            </div>
                            <Switch id="essential" checked={true} disabled />
                        </div>

                        {/* 2. Analytics */}
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-1">
                                <Label htmlFor="analytics" className="font-medium text-base">Análise e Desempenho</Label>
                                <p className="text-sm text-muted-foreground">Nos ajuda a entender como você usa o site (Google Analytics).</p>
                            </div>
                            <Switch
                                id="analytics"
                                checked={prefs.analytics}
                                onCheckedChange={(c) => setPrefs(prev => ({ ...prev, analytics: c }))}
                            />
                        </div>

                        {/* 3. Marketing */}
                        <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-1">
                                <Label htmlFor="marketing" className="font-medium text-base">Marketing</Label>
                                <p className="text-sm text-muted-foreground">Para anúncios personalizados (Futuro).</p>
                            </div>
                            <Switch
                                id="marketing"
                                checked={prefs.marketing}
                                onCheckedChange={(c) => setPrefs(prev => ({ ...prev, marketing: c }))}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowDetails(false)}>Cancelar</Button>
                        <Button onClick={handleSavePreferences}>Salvar Preferências</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
