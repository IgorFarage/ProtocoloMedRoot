
import React from 'react';
import { Construction } from 'lucide-react';

const UnderConstruction = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
            <div className="bg-white p-12 rounded-2xl shadow-xl w-full max-w-lg border border-gray-100 flex flex-col items-center animate-fade-in">

                {/* Ícone */}
                <div className="bg-blue-50 p-6 rounded-full mb-8">
                    <Construction className="w-16 h-16 text-primary" strokeWidth={1.5} />
                </div>

                {/* Título/Logo */}
                <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">
                    Protocolo<span className="text-primary">Med</span>
                </h1>

                {/* Mensagem */}
                <p className="text-gray-600 text-lg leading-relaxed mb-6 font-medium">
                    Estamos preparando algo incrível.
                </p>
                <p className="text-gray-500">
                    O ProtocoloMed estará disponível em breve.
                </p>

                {/* Footer Discreto */}
                <div className="mt-10 pt-6 border-t border-gray-100 w-full">
                    <span className="text-sm text-gray-400">© 2026 ProtocoloMed</span>
                </div>
            </div>
        </div>
    );
};

export default UnderConstruction;
