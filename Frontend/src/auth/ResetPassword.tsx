import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LockKeyhole, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function ResetPassword() {
    const { uid, token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }

        if (password.length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres.");
            return;
        }

        if (!uid || !token) {
            toast.error("Link inválido ou expirado.");
            return;
        }

        setIsLoading(true);

        try {
            await auth.confirmPasswordReset(uid, token, password);
            toast.success("Senha atualizada com sucesso!");
            navigate("/login");
        } catch {
            toast.error("Falha ao redefinir. O link pode ter expirado.");
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
                            <LockKeyhole className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-primary">
                        Nova Senha
                    </CardTitle>
                    <CardDescription className="text-center">
                        Crie uma senha forte para sua conta.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Nova Senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <Input
                                type="password"
                                placeholder="Confirmar Senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                                "Redefinir Senha"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
