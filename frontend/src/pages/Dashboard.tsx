import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";

interface Submission {
  id: string;
  patientName?: string;
  timestamp: number;
  answers: Record<string, string>;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("submissions");
    if (raw) setSubmissions(JSON.parse(raw));
  }, []);

  const handleSelect = (s: Submission) => setSelected(s);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard Médico</h1>
          <div className="flex items-center gap-2">
            <div className="text-sm">{user?.name}</div>
            <Button variant="outline" onClick={logout}>Sair</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Card>
              <CardContent>
                <h2 className="font-semibold mb-4">Pacientes</h2>
                {submissions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma submissão encontrada.</p>}
                <ul className="space-y-2">
                  {submissions.map((s) => (
                    <li key={s.id}>
                      <Button variant="ghost" onClick={() => handleSelect(s)} className="w-full text-left">
                        <div className="flex justify-between">
                          <span>{s.patientName || "Paciente anônimo"}</span>
                          <small className="text-muted-foreground">{new Date(s.timestamp).toLocaleString()}</small>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <Card>
              <CardContent>
                {selected ? (
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{selected.patientName || "Paciente anônimo"}</h3>
                    <p className="text-sm text-muted-foreground mb-4">Enviado em {new Date(selected.timestamp).toLocaleString()}</p>
                    <div className="space-y-2">
                      {Object.entries(selected.answers).map(([k, v]) => (
                        <div key={k} className="border-b pb-2">
                          <div className="text-sm text-muted-foreground">{k}</div>
                          <div className="font-medium">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Selecione um paciente para ver detalhes.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
