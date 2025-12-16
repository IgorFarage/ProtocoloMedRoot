import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def drop_all_tables():
    with connection.cursor() as cursor:
        print("Limpando tabelas do banco de dados...")
        # Este comando gera o SQL para deletar todas as tabelas
        cursor.execute("""
            DO $$ DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        """)
        print("Todas as tabelas foram removidas com sucesso.")

if __name__ == "__main__":
    drop_all_tables()
    print("Todas as tabelas foram removidas com sucesso.")
    