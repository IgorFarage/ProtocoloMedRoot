import os
import subprocess

def run_command(command, description):
    print(f"\n🚀 [EXEC] {description}...")
    try:
        # Pega o caminho absoluto do Python na venv local atrelado ao projeto
        venv_python = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".venv", "Scripts", "python.exe")
        full_command = f"{venv_python} {command}"
        
        result = subprocess.run(
            full_command,
            cwd=os.path.join(os.path.dirname(os.path.abspath(__file__)), "Backend"),
            shell=True,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print(f"✅ SUCESSO:")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ ERRO:")
        print(e.stderr)
        return False

def main():
    print("🧹 Iniciando Script de Limpeza de Banco de Dados (ProtocoloMedRootASAAS)")
    print("Este script gerará as migrações automáticas para remover as colunas legadas e as aplicará.")
    print("Aviso: As colunas removidas incluem `mercado_pago_id`, `daily_room_name`, etc.\n")

    # 1. Gerar Migrations
    success = run_command("manage.py makemigrations", "Gerando arquivos de migração (makemigrations)")
    
    if success:
        # 2. Aplicar Migrations
        confirm = input("⚠️ Deseja APLICAR as migrações (python manage.py migrate)? [s/N]: ")
        if confirm.lower() == 's':
            run_command("manage.py migrate", "Aplicando migrações ao Banco de Dados")
        else:
            print("🛑 Migração cancelada pelo usuário. O código e arquivos de migração já foram atualizados, mas o banco de dados permanece intacto.")
    else:
        print("🛑 Erro ao gerar migrações. O processo foi abortado.")

if __name__ == "__main__":
    main()
