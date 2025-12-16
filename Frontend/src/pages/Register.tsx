import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api'; // O cliente axios que configuramos
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const Register = () => {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Estados do formulário
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validação básica de senha
        if (formData.password !== formData.confirmPassword) {
            toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
            return;
        }

        setLoading(true);

        // 1. Recupera as respostas do questionário do sessionStorage
        const pendingQuestionnaire = sessionStorage.getItem('pending_questionnaire');
        const questionnaireData = pendingQuestionnaire ? JSON.parse(pendingQuestionnaire) : {};

        try {
            // 2. Envia para o endpoint do Django
            const response = await api.post('/accounts/register/', {
                email: formData.email,
                password: formData.password,
                full_name: formData.fullName,
                questionnaire_data: questionnaireData // O Serializer do Django espera este campo
            });

            if (response.status === 201) {
                toast({ title: "Sucesso!", description: "Conta criada. Agora você pode fazer login." });

                // 3. Limpa o storage pois os dados já foram salvos no banco
                sessionStorage.removeItem('pending_questionnaire');

                // Redireciona para o login
                navigate('/login');
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.email?.[0] || "Erro ao criar conta. Tente novamente.";
            toast({ title: "Erro no cadastro", description: errorMsg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Crie sua conta</CardTitle>
                    <p className="text-center text-sm text-muted-foreground">
                        Seus dados são necessários para gerar sua prescrição.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input id="fullName" placeholder="Ex: João Silva" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" type="email" placeholder="seu@email.com" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input id="password" type="password" required onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                            <Input id="confirmPassword" type="password" required onChange={handleChange} />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Processando..." : "Finalizar Cadastro"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-sm">
                        Já tem uma conta? <Link to="/login" className="text-primary hover:underline">Entre aqui</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Register;