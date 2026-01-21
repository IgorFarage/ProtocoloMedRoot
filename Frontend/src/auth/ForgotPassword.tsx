import { useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await auth.requestPasswordReset(email);
            // Sempre mostramos sucesso por segurança
            setIsSent(true);
            toast.success("Solicitação enviada!");
        } catch {
            toast.error("Erro ao enviar solicitação. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-primary">
                        Esqueceu sua senha?
                    </CardTitle>
                    <CardDescription className="text-center">
                        {!isSent
                            ? "Digite seu e-mail para receber um link de redefinição."
                            : "Verifique sua caixa de entrada."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSent ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Enviar Link de Redefinição"
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="bg-green-50 text-green-800 p-4 rounded-lg text-sm text-center mb-4">
                            Se o e-mail <strong>{email}</strong> estiver cadastrado, enviamos um link para você redefinir sua senha.
                            <br /><br />
                            Não esqueça de checar a caixa de Spam.
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
