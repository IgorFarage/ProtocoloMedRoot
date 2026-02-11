import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { chatbot } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import LiaAvatar from "@/assets/Images/AssistenteLia.png";
import { useAuth } from "@/auth/AuthProvider";

interface Message {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
}

export function ChatbotWindow() {
    const { user } = useAuth();

    // Se não estiver logado, não renderiza nada
    if (!user) return null;

    // Extrai o primeiro nome para uma saudação mais pessoal
    const firstName = user.full_name ? user.full_name.split(" ")[0] : "";

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            text: `Olá ${firstName}! Sou a Lia, sua assistente virtual especialista em saúde capilar. Como posso ajudar você hoje?`,
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const toggleChat = () => setIsOpen(!isOpen);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const { data } = await chatbot.ask(userMessage.text);

            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: "bot",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error("Erro no chatbot:", error);
            toast({
                title: "Erro na comunicação",
                description: "Não foi possível obter resposta da IA. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <Card className="w-[350px] h-[500px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <CardHeader className="bg-primary px-4 py-3 flex-row items-center justify-between space-y-0 rounded-t-xl">
                        <div className="flex items-center gap-2 text-primary-foreground">
                            <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-white/20 bg-white/10">
                                <img src={LiaAvatar} alt="Lia" className="w-full h-full object-cover" />
                            </div>
                            <CardTitle className="text-base font-medium">Lia - Assistente Virtual</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary-foreground hover:bg-primary/80 hover:text-white"
                            onClick={toggleChat}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden bg-background">
                        <div
                            ref={scrollRef}
                            className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
                        >
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    {/* Avatar da Lia nas mensagens dela */}
                                    {msg.sender === 'bot' && (
                                        <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 mb-1 border border-border">
                                            <img src={LiaAvatar} alt="Lia" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.sender === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted text-muted-foreground rounded-tl-none border border-border"
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start items-center gap-2">
                                    <div className="h-6 w-6 rounded-full overflow-hidden flex-shrink-0 border border-border">
                                        <img src={LiaAvatar} alt="Lia" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="bg-muted text-muted-foreground rounded-2xl rounded-tl-none border border-border px-4 py-2 text-sm shadow-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-3 bg-muted/20 border-t">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Digite sua dúvida..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="flex-1 rounded-full bg-background focus-visible:ring-primary/20"
                                disabled={isLoading}
                            />
                            <Button
                                size="icon"
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="rounded-full h-10 w-10 shrink-0"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            )}

            <Button
                onClick={toggleChat}
                size="lg"
                className="h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform duration-200 bg-primary hover:bg-primary/90 text-primary-foreground p-0 overflow-hidden"
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <img src={LiaAvatar} alt="Lia" className="w-full h-full object-cover" />
                )}
            </Button>
        </div>
    );
}
