
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Building2, GraduationCap, MessageCircle } from "lucide-react";

interface DoctorData {
    name: string;
    crm: string;
    photo?: string;
    specialty?: string; // e.g. "Tricologista"
    description?: string; // Optional bio
}

interface DoctorProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    doctor: DoctorData | null;
    roleLabel: string; // "Tricologista" or "Nutricionista"
}

export function DoctorProfileModal({ isOpen, onClose, doctor, roleLabel }: DoctorProfileModalProps) {
    if (!doctor) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="flex flex-col items-center gap-4 border-b pb-6">
                    <Avatar className="h-40 w-40 border-4 border-primary/10 shadow-lg">
                        <AvatarImage src={doctor.photo} className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold bg-primary/5 text-primary">
                            {doctor.name.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-center space-y-1">
                        <DialogTitle className="text-xl font-bold">{doctor.name}</DialogTitle>
                        <Badge variant="secondary" className="mt-1">{roleLabel}</Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-1 items-center p-3 rounded-lg bg-slate-50 border">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Registro</span>
                            <span className="font-medium">{doctor.crm}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-center p-3 rounded-lg bg-slate-50 border">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Especialidade</span>
                            <span className="font-medium">{doctor.specialty || "Especialista"}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-primary" />
                            Sobre o Especialista
                        </h4>
                        <DialogDescription className="text-sm leading-relaxed text-slate-600">
                            {doctor.description || `O Dr(a). ${doctor.name} é parte fundamental da nossa equipe multidisciplinar, focado em trazer os melhores resultados para o seu protocolo.`}
                        </DialogDescription>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onClose} className="w-full">
                        Fechar
                    </Button>
                    {/* Future Feature: Chat Link */}
                    {/* <Button className="w-full gap-2">
                        <MessageCircle className="h-4 w-4" /> Enviar Mensagem
                     </Button> */}
                </div>
            </DialogContent>
        </Dialog>
    );
}
