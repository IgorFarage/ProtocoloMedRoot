import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth(); // Nossa função que conecta com o Django
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 1. Tenta fazer login
      await login(email, password);

      // 2. Se não der erro, o AuthProvider já salvou o usuario e token.
      // Vamos verificar o role para redirecionar corretamente (embora o AuthProvider já atualize o estado)
      // Como o estado 'user' pode demorar um milissegundo para atualizar, 
      // podemos confiar que se o login passou, podemos redirecionar.

      // Pequeno timeout para garantir que o estado global atualizou ou redirecionar baseado na lógica padrão
      // Uma abordagem melhor seria ler o token decodificado aqui, mas vamos simplificar:
      // O App.tsx vai redirecionar se o usuário tentar acessar a rota protegida.

      navigate("/dashboard"); // Manda para o Dashboard do Cliente por padrão

    } catch (err: any) {
      console.error(err);
      // Tratamento de erros comuns do Django SimpleJWT
      if (err.response?.status === 401) {
        setError("E-mail ou senha incorretos.");
      } else {
        setError("Erro ao conectar com o servidor. Tente novamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Acesse sua conta</CardTitle>
            <CardDescription className="text-center">
              Entre para acompanhar seu protocolo e entregas
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Exibe erro se houver */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/recuperar-senha"
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-sm text-muted-foreground">
              Ainda não tem conta?{" "}
              <Link to="/questionnaire" className="text-primary hover:underline font-medium">
                Fazer avaliação gratuita
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Login;