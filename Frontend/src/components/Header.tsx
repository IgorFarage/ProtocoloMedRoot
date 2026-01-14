import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, UserCircle } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Importar a imagem do logo como um módulo. Garanta que o arquivo esteja em src/assets/
import Logo from "/LOGO.png";

export const Header = () => {
  const { user, logout } = useAuth();
  return (
    // posicionamento absoluto do logo
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50 relative">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">

        {/* Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-10 w-10" />
              <span className="sr-only">Menu de navegação</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-48">
            {/* Opções de navegação do Menu */}
            {!user ? (
              <>
                <DropdownMenuItem asChild className="md:hidden">
                  <Link to="/login">Entrar</Link>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem asChild className="md:hidden">
                <span className="font-semibold text-green-600">Olá, {user.full_name?.split(' ')[0]}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild>
              <Link to="/">Home</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/questionario">Avaliação</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/sobre-nos">Sobre Nós</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/produtos">Produtos</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/contato">Contato</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/login" className="hidden md:block text-sm text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Logo Posicionamento Absoluto */}
        <Link
          to="/"
          // Classes para centralização absoluta (50% do pai, depois -50% do próprio tamanho)
          className="flex items-center absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <img
            src={Logo}
            alt="Logo ProtocoloMED"
            className="h-12 md:h-20 w-auto"
          />
        </Link>

        {/* Bloco de Ações/Login (Direita) */}
        <div className="flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-gray-700 max-w-[100px] truncate hidden md:block">
                    Olá, {user.full_name?.split(' ')[0] || "Cliente"}
                  </span>
                  <UserCircle className="w-8 h-8 text-green-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.role === 'doctor' && (
                  <DropdownMenuItem asChild>
                    <Link to="/DoctorDashboard">Área do Médico</Link>
                  </DropdownMenuItem>
                )}
                {user.role === 'patient' && (
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Minha Área</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Link to="/login" className="hidden md:block text-sm text-muted-foreground hover:text-foreground">
                Entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};