import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pill, Calendar as CalendarIcon, Truck, FileText } from "lucide-react";
import { ptBR } from "date-fns/locale";

const ClientProtocol = () => {
    const [date, setDate] = useState<Date | undefined>(new Date(2025, 11, 5)); // Mock next appointment: Dec 5, 2025

    // Mock Data
    const currentPlan = {
        name: "Plano Essencial - Queda Moderada",
        medications: [
            { name: "Minoxidil 5%", dosage: "1x ao dia (noite)", type: "Tópico" },
            { name: "Finasterida 1mg", dosage: "1x ao dia", type: "Oral" },
            { name: "Shampoo Antiqueda", dosage: "Uso diário", type: "Tópico" }
        ],
        nextShipment: "15/12/2025",
        value: "R$ 199,90 / mês"
    };

    const prescriptionHistory = [
        { id: 1, date: "15/11/2025", doctor: "Dra. Ana Costa", items: "Minoxidil, Finasterida, Shampoo", value: "R$ 199,90" },
        { id: 2, date: "15/10/2025", doctor: "Dra. Ana Costa", items: "Minoxidil, Finasterida, Shampoo", value: "R$ 199,90" },
        { id: 3, date: "15/09/2025", doctor: "Dra. Ana Costa", items: "Minoxidil, Finasterida", value: "R$ 149,90" },
    ];

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-5xl mx-auto space-y-8">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Meu protocolo</h1>
                            <p className="text-muted-foreground">
                                Acompanhe seu tratamento, prescrições e agendamentos.
                            </p>
                        </div>
                        <Badge variant="outline" className="text-lg py-1 px-4 border-green-600 text-green-600 bg-green-50">
                            Ativo
                        </Badge>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">

                        {/* Coluna Principal: Plano e Histórico */}
                        <div className="lg:col-span-2 space-y-8">

                            {/* Plano Atual */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <Pill className="h-5 w-5 text-primary" />
                                        <CardTitle>Plano atual de medicamentos</CardTitle>
                                    </div>
                                    <CardDescription>{currentPlan.name}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        {currentPlan.medications.map((med, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg border">
                                                <div>
                                                    <p className="font-medium">{med.name}</p>
                                                    <p className="text-sm text-muted-foreground">{med.dosage}</p>
                                                </div>
                                                <Badge variant="secondary">{med.type}</Badge>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator />

                                    <div className="flex flex-col sm:flex-row justify-between gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Próximo envio:</span>
                                            <span className="font-semibold">{currentPlan.nextShipment}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">Valor mensal:</span>
                                            <span className="font-semibold text-primary">{currentPlan.value}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Histórico de Prescrições */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        <CardTitle>Histórico de prescrições</CardTitle>
                                    </div>
                                    <CardDescription>Registro de envios e renovações de receita.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Médico</TableHead>
                                                <TableHead>Itens</TableHead>
                                                <TableHead className="text-right">Valor</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {prescriptionHistory.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="font-medium">{item.date}</TableCell>
                                                    <TableCell>{item.doctor}</TableCell>
                                                    <TableCell className="max-w-[200px] truncate" title={item.items}>
                                                        {item.items}
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.value}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>

                        </div>

                        {/* Coluna lateral: Calendário */}
                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon className="h-5 w-5 text-primary" />
                                        <CardTitle>Próxima consulta</CardTitle>
                                    </div>
                                    <CardDescription>Acompanhamento agendado.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center space-y-4">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        locale={ptBR}
                                        className="rounded-md border"
                                    />
                                    <div className="text-center space-y-1">
                                        <p className="font-medium">05 de Dezembro de 2025</p>
                                        <p className="text-sm text-muted-foreground">às 14:30 com Dra. Ana Costa</p>
                                    </div>
                                    <Link to="/agendamento" className="w-full">
                                        <Button className="w-full">Agendar consulta</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ClientProtocol;
