import React, { useState, useEffect, useRef } from 'react';
import {
    DndContext,
    DragEndEvent,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor
} from '@dnd-kit/core';
import api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { PrintablePrescription } from './PrintablePrescription';

// Types and Interfaces
interface Product {
    id: string | number;
    name: string;
    description: string;
    price: number;
}

interface PrescriptionItem extends Product {
    uniqueId: string; // Para permitir arrastar o mesmo item múltiplas vezes
    dose?: string;
    posology?: string;
}

// Utilidade para converter HTML recebido do Bitrix para string pura
function stripHtml(htmlStr: string | undefined | null) {
    if (!htmlStr) return "Uso contínuo";
    // Usa o DOMParser nativo do navegador para extrair de forma segura apenas o textContent
    const doc = new DOMParser().parseFromString(htmlStr, 'text/html');
    return doc.body.textContent || "Uso contínuo";
}

// Componente Draggable (Item na lista de disponíveis)
function DraggableItem({ product }: { product: Product }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: `product - ${product.id} `,
        data: product,
    });

    // Estado de expansão do card
    const [isExpanded, setIsExpanded] = useState(false);

    const cleanDescription = stripHtml(product.description);

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`p-3 mb-2 border rounded shadow-sm transition-colors relative z-10 
                ${isDragging ? 'opacity-50 border-primary bg-primary/10 cursor-grabbing' : 'border-slate-200 bg-white hover:border-primary/50'}`}
        >
            <div className="flex justify-between items-start gap-2 cursor-grab">
                <p className="font-medium text-sm text-slate-800 flex-1">{product.name}</p>

                {/* Botão de Expandir. O stopPropagation e onPointerDown evita que o dnd-kit intercepte o clique como arrasto */}
                <button
                    type="button"
                    title={isExpanded ? "Minimizar" : "Expandir descrição"}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1 -mt-1 -mr-1 rounded-full hover:bg-slate-100 transition-colors"
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            <p
                className={`text-xs text-slate-500 mt-1 cursor-grab ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-1 overflow-hidden text-ellipsis h-4'}`}
                title={!isExpanded ? cleanDescription : undefined}
            >
                {cleanDescription}
            </p>
        </div>
    );
}

// Componente Droppable (A Receita)
function DroppableArea({ items, hasSavedRx, onRemove, onUpdate, onPrint }: { items: PrescriptionItem[], hasSavedRx: boolean, onRemove: (uniqueId: string) => void, onUpdate: (uniqueId: string, field: 'dose' | 'posology', value: string) => void, onPrint: () => void }) {
    const { setNodeRef, isOver } = useDroppable({
        id: 'prescription-area',
    });

    return (
        <div
            ref={setNodeRef}
            className={`w-1/2 flex flex-col border-2 rounded-lg shadow-sm transition-colors relative bg-white
                ${isOver ? 'border-primary border-solid ring-2 ring-primary/20' : 'border-slate-200 border-dashed hover:border-primary/50'}`}
        >
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 relative min-h-[400px]">
                {items.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm px-8 text-center bg-slate-50/50">
                        <div className="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                            <ChevronDown className="w-6 h-6 text-slate-300" />
                        </div>
                        Solte os medicamentos aqui para<br />montar a prescrição do paciente.
                    </div>
                ) : (
                    items.map((item, index) => (
                        <div key={item.uniqueId} className="p-3 bg-white rounded-md shadow-sm border border-slate-200 flex flex-col gap-2 group hover:border-primary/30 transition-colors relative">
                            <button
                                onClick={() => onRemove(item.uniqueId)}
                                className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 w-6 h-6 flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100 shadow-sm z-10"
                                title="Remover medicamento"
                            >
                                &times;
                            </button>
                            <div className="flex justify-between items-start pr-4">
                                <div className="flex gap-3">
                                    <span className="text-slate-400 font-medium text-sm mt-0.5">{index + 1}.</span>
                                    <span className="font-semibold text-sm text-slate-800 leading-snug">{item.name}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-4 gap-y-3 pl-6 mt-1 pr-2 w-full overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-end gap-1 w-full">
                                    <span className="text-xs text-slate-500 pb-1 whitespace-nowrap">Dose:</span>
                                    <input
                                        type="text"
                                        placeholder="Ex: 50mg"
                                        className="w-full text-sm border-b border-dashed border-slate-300 bg-transparent focus:outline-none focus:border-primary px-1 pb-1 min-w-0"
                                        value={item.dose || ""}
                                        onChange={(e) => onUpdate(item.uniqueId, 'dose', e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-end gap-1 w-full">
                                    <span className="text-xs text-slate-500 pb-1 whitespace-nowrap">Posologia:</span>
                                    <input
                                        type="text"
                                        placeholder="Ex: 1x ao dia"
                                        className="w-full text-sm border-b border-dashed border-slate-300 bg-transparent focus:outline-none focus:border-primary px-1 pb-1 min-w-0"
                                        value={item.posology || ""}
                                        onChange={(e) => onUpdate(item.uniqueId, 'posology', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {/* Helper visual para drop */}
                {isOver && items.length > 0 && (
                    <div className="h-14 border-2 border-dashed border-primary/50 bg-primary/5 rounded-md flex items-center justify-center text-primary/70 text-sm font-medium animate-pulse mt-2">
                        Solte para adicionar
                    </div>
                )}
            </div>

            {items.length > 0 && (
                <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-lg">
                    <Button onClick={onPrint} size="sm" className="shadow-sm font-medium w-full sm:w-auto">
                        <Printer className="w-4 h-4 mr-2" />
                        {hasSavedRx ? "Atualizar e Imprimir" : "Criar prescrição"}
                    </Button>
                </div>
            )}
        </div>
    );
}

// Componente Principal
export function PrescriptionDragAndDrop({ appointmentId, patientName, doctorName, doctorCrm }: { appointmentId?: string, patientName?: string, doctorName?: string, doctorCrm?: string }) {
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasSavedRx, setHasSavedRx] = useState(false);
    const { toast } = useToast();

    const printRef = useRef<HTMLDivElement>(null);
    const triggerPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `ProtocoloMed_Receita_${new Date().getTime()}`,
        onAfterPrint: () => {
            toast({
                title: "Receita pronta!",
                description: "O documento foi preparado para impressão e os dados foram salvos.",
                variant: "default",
            });
        }
    });

    const handlePrintAndSave = async () => {
        if (!appointmentId) {
            toast({
                title: "Erro ao salvar",
                description: "Consulta não identificada. Apenas será impresso.",
                variant: "destructive",
            });
            triggerPrint();
            return;
        }

        setIsSaving(true);
        try {
            // Formatar os dados da receita para o backend
            const payload = prescription.map(p => ({
                id: p.id,
                name: p.name,
                dose: p.dose || '',
                posology: p.posology || ''
            }));

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { medicalService } = await import('@/services/medicalService');
            await medicalService.savePrescriptionData(appointmentId, payload);

            // Sucesso no BD, Dispara print e atualiza o estado visual
            setHasSavedRx(true);
            triggerPrint();
        } catch (error) {
            console.error("Falha ao salvar receita no BD", error);
            toast({
                title: "Erro de Sincronização",
                description: "Falha ao gravar receita no banco. Verifique sua conexão.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Configuração dos Sensores para só iniciar o arrasto se mover o mouse ao menos 5 pixels ou tocar um tempo.
    // Isso previne que um clique rápido (como no botão expandir) seja confundido com arrasto.
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    useEffect(() => {
        async function fetchCatalog() {
            try {
                setIsLoading(true);
                const response = await api.get('/store/catalog/');
                if (response.data && Array.isArray(response.data)) {
                    setAvailableProducts(response.data);
                }
            } catch (error) {
                console.error("Erro ao carregar catálogo:", error);
                toast({
                    title: "Erro de Conexão",
                    description: "Não foi possível carregar os medicamentos do servidor.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchCatalog();
    }, [toast]);

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        // Se não soltou em cima de nada ou não é a área permitida
        if (!over || over.id !== 'prescription-area') {
            return;
        }

        const productData = active.data.current as Product;
        if (productData) {
            setPrescription((prev) => [
                ...prev,
                {
                    ...productData,
                    uniqueId: `${productData.id} -${Date.now()} `
                }
            ]);

            toast({
                title: "Medicamento adicionado",
                description: `${productData.name} adicionado à receita.`,
                variant: "default",
            });
        }
    }

    function handleRemoveItem(uniqueId: string) {
        setPrescription(prev => prev.filter(item => item.uniqueId !== uniqueId));
    }

    function handleUpdateItem(uniqueId: string, field: 'dose' | 'posology', value: string) {
        setPrescription(prev => prev.map(item =>
            item.uniqueId === uniqueId ? { ...item, [field]: value } : item
        ));
    }

    return (
        <>
            {/* O próprio DragAndDrop Interativo */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="flex gap-6 h-[500px]">

                    {/* Painel Esquerdo: Medicamentos Disponíveis */}
                    <div className="w-1/2 flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-medium flex justify-between items-center">
                            <span>Buscador de Medicamentos</span>
                            <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">
                                {availableProducts.length} itens integrais
                            </span>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            {isLoading ? (
                                // Skeleton Loading UX
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="p-3 border rounded">
                                            <Skeleton className="h-4 w-3/4 mb-2" />
                                            <Skeleton className="h-3 w-1/2" />
                                        </div>
                                    ))}
                                </div>
                            ) : availableProducts.length === 0 ? (
                                <div className="text-center text-slate-500 py-6 text-sm">
                                    Nenhum medicamento encontrado no catálogo.
                                </div>
                            ) : (
                                <>
                                    <div className="text-xs text-slate-500 mb-2">Arraste para a receita do paciente:</div>
                                    {availableProducts.map(product => (
                                        <DraggableItem key={product.id} product={product} />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Painel Direito: Receita em si */}
                    <div className="w-1/2 relative">
                        {isSaving && (
                            <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-lg border border-slate-200">
                                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <span className="text-sm font-medium text-slate-700">Salvando receita...</span>
                                </div>
                            </div>
                        )}
                        <DroppableArea items={prescription} hasSavedRx={hasSavedRx} onRemove={handleRemoveItem} onUpdate={handleUpdateItem} onPrint={handlePrintAndSave} />
                    </div>

                </div>
            </DndContext>

            {/* Container Invisível que sustenta a Folha A4 para Impressão */}
            <div className="hidden">
                <PrintablePrescription
                    ref={printRef}
                    prescriptionList={prescription.map(p => ({ id: p.id, name: p.name, description: stripHtml(p.description), dose: p.dose, posology: p.posology }))}
                    patientName={patientName}
                    doctorName={doctorName}
                    doctorCrm={doctorCrm}
                />
            </div>
        </>
    );
}
