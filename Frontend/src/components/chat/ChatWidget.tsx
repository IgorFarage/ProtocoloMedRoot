import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', text: 'Olá! Eu sou o assistente virtual do ProtocoloMed. Como posso ajudar você hoje?', sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll para baixo quando chega nova mensagem
    useEffect(() => {
        if (isOpen) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user'
        };

        setMessages(prev => [...prev, newUserMsg]);
        setInputValue("");

        // Simulação de resposta do Bot
        setTimeout(() => {
            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                text: "Obrigado pela sua mensagem! Em breve estarei conectado à nossa IA para responder suas dúvidas sobre tratamentos e agendamentos.",
                sender: 'bot'
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

            {/* JANELA DO CHAT */}
            {isOpen && (
                <Card className="w-[calc(100vw-32px)] sm:w-[380px] h-[500px] shadow-2xl border-slate-200 animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col">
                    <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-lg flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center gap-2">
                            <Bot className="w-6 h-6" />
                            <CardTitle className="text-base font-bold">Assistente Virtual</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50">
                        <ScrollArea className="h-full p-4">
                            <div className="flex flex-col gap-3">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex gap-2 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                                    >
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                            ${msg.sender === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}
                                        `}>
                                            {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                                        </div>
                                        <div className={`
                                            p-3 rounded-2xl text-sm shadow-sm
                                            ${msg.sender === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}
                                        `}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-3 bg-white border-t gap-2">
                        <Input
                            placeholder="Digite sua mensagem..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 focus-visible:ring-primary"
                        />
                        <Button onClick={handleSendMessage} size="icon" className="shrink-0 bg-primary hover:bg-primary/90">
                            <Send className="w-4 h-4" />
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* BOTÃO FLUTUANTE DE ABRIR */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-110 transition-all duration-300"
                >
                    <MessageCircle className="w-8 h-8" />
                </Button>
            )}
        </div>
    );
}
