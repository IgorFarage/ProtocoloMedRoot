import React from 'react';

interface PrintablePrescriptionProps {
    prescriptionList: {
        id: string | number;
        name: string;
        description: string;
        dose?: string;
        posology?: string;
    }[];
    patientName?: string;
    doctorName?: string;
    doctorCrm?: string;
}

export const PrintablePrescription = React.forwardRef<HTMLDivElement, PrintablePrescriptionProps>(
    ({ prescriptionList, patientName = "______________________________________________________", doctorName = "Dr(a). [Equipe Médica]", doctorCrm = "______" }, ref) => {

        const dateNow = new Date().toLocaleDateString('pt-BR');

        // Tratamento do CRM para extrair Número e UF (ex: "12345 - SP" ou "12345/DF")
        const formatCrm = (crmString: string) => {
            if (!crmString || crmString === "______" || crmString === "Não Informado") return { number: "______", uf: "DF" };
            const parts = crmString.split(/[-/]/).map(s => s.trim());
            if (parts.length > 1) {
                return { number: parts[0], uf: parts[parts.length - 1] };
            }
            return { number: crmString, uf: "DF" };
        };
        const { number: crmNumber, uf: crmUf } = formatCrm(doctorCrm);

        return (
            <div ref={ref} className="bg-white text-black font-sans leading-normal">
                {/* 
                    A4 dimensions optimization in Tailwind. 
                    - w-[210mm] min-h-[297mm]
                    - p-12 ensures space for hardware printer margins
                */}
                <div className="w-[210mm] min-h-[297mm] p-12 mx-auto flex flex-col relative bg-white">

                    {/* ===== CABEÇALHO ===== */}
                    <div className="flex justify-between items-start mb-8 relative">
                        <h1 className="text-2xl font-black uppercase tracking-wider mx-auto text-center mt-2">
                            Receituário Simples
                        </h1>

                        <div className="absolute right-0 top-0 border-2 border-slate-800 p-2 text-center w-40">
                            <p className="font-bold text-sm leading-tight mb-1">VIA DIGITAL</p>
                            <p className="text-[10px] leading-tight text-slate-600">
                                VALIDAR EM:<br />
                                https://assinaturadigital.iti.gov.br
                            </p>
                        </div>
                    </div>

                    {/* ===== INFORMAÇÕES DO PACIENTE ===== */}
                    <div className="flex bg-[#EBF0F6] px-2 py-1 mb-2">
                        <span className="font-bold text-sm mr-2 w-24">PACIENTE:</span>
                        <span className="flex-1 text-sm">{patientName}</span>
                    </div>

                    <div className="flex bg-[#EBF0F6] px-2 py-1 mb-4">
                        <span className="font-bold text-sm w-24">PRESCRIÇÃO:</span>
                        <span className="flex-1"></span>
                    </div>

                    {/* ===== ÁREA CENTRAL: MEDICAMENTOS ===== */}
                    {/* Equivalente à caixa gigante azul/acinzentada da imagem base */}
                    <div className="flex-1 bg-[#EBF0F6] p-6 mb-8 flex flex-col gap-6">
                        {prescriptionList.length === 0 ? (
                            <p className="text-center text-slate-400 italic text-sm mt-10">
                                Nenhuma prescrição adicionada ao prontuário no momento.
                            </p>
                        ) : (
                            prescriptionList.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start pb-3 border-b border-slate-200">
                                    <span className="font-bold text-base min-w-[24px]">
                                        {index + 1}.
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-extrabold text-base uppercase text-slate-900">
                                            {item.name}
                                        </p>
                                        {(item.dose || item.posology) && (
                                            <div className="flex gap-6 mt-1 text-[13px] text-slate-800">
                                                {item.dose && (
                                                    <p>
                                                        <span className="font-semibold text-slate-600 mr-1">Dose:</span>
                                                        {item.dose}
                                                    </p>
                                                )}
                                                {item.posology && (
                                                    <p>
                                                        <span className="font-semibold text-slate-600 mr-1">Posologia:</span>
                                                        {item.posology}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* ===== RODAPÉ: INFORMAÇÕES DO MÉDICO ===== */}
                    <div className="flex flex-col gap-1 text-[13px] mb-12">

                        <div className="flex gap-4">
                            <div className="flex flex-1 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-40">NOME DO(A) MÉDICO(A):</span>
                                <span className="flex-1">{doctorName}</span>
                            </div>
                            <div className="flex w-48 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-12">CRM:</span>
                                <span className="flex-1">{crmNumber}</span>
                            </div>
                            <div className="flex w-24 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-8">UF:</span>
                                <span className="flex-1 uppercase">{crmUf}</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-1 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-48">LOCAL DE ATENDIMENTO:</span>
                                <span className="flex-1">ProtocoloMed</span>
                            </div>
                            <div className="flex flex-1 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-16">E-MAIL:</span>
                                <span className="flex-1 truncate">contato@protocolomed.com.br</span>
                            </div>
                        </div>

                        <div className="flex gap-4 border-b border-transparent">
                            <div className="flex flex-1 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-24">ENDEREÇO:</span>
                                <span className="flex-1">SCLRN 703, Bloco "H", Loja 32</span>
                            </div>
                            <div className="flex w-64 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-16">BAIRRO:</span>
                                <span className="flex-1">Asa Norte</span>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex flex-1 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-20">CIDADE:</span>
                                <span className="flex-1">Brasília</span>
                            </div>
                            <div className="flex w-24 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-8">UF:</span>
                                <span className="flex-1 text-center">DF</span>
                            </div>
                            <div className="flex w-64 bg-[#EBF0F6] px-2 py-1">
                                <span className="font-semibold w-24">TELEFONE:</span>
                                <span className="flex-1">(61) 99970-4822</span>
                            </div>
                        </div>

                        <div className="flex max-w-[50%] bg-[#EBF0F6] px-2 py-1 mt-1">
                            <span className="font-semibold w-36">DATA DE EMISSÃO:</span>
                            <span className="flex-1 text-center">{dateNow}</span>
                        </div>

                    </div>

                    {/* ===== ASSINATURA MÉDICA ===== */}
                    <div className="flex flex-col items-center mt-auto mb-4">
                        <div className="w-80 h-24 border-2 border-slate-900 bg-white">
                            {/* Assinatura em branco para ser preenchida via Tablet ou Impresso para assinar */}
                        </div>
                        <p className="text-xs uppercase mt-2 font-medium tracking-wide">
                            Assinatura Médico(a)
                        </p>
                    </div>

                </div>
            </div>
        );
    }
);

PrintablePrescription.displayName = 'PrintablePrescription';
