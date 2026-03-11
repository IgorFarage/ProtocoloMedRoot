# Gerenciamento de Estado e Ciclos de Vida (Frontend)

Com a maturidade do ProtocoloMed, o front-end se deparou com desafios onde vários componentes na árvore (Sidebar, Header, Dashboard Central, Módulos de Vídeo) precisavam da mesma informação (Ex: "O usuário é médico ou paciente?" e "Qual assinatura dele?").

A forma arquitetada para resolver o fluxo de estado local é padronizada neste formato:

## 1. Persistência de Sessão e Auth
1. O backend solta 2 tokens (`access` e `refresh`) na rota `/api/token/`.
2. O serviço de API usa a Storage API nativa do Browser para manter o Refresh vivo. O Header Authotization do Axios guarda sempre o `Bearer access` em memória (estado do Axios) para mitigar roubo via XSS.
3. Um hook isolado `useAuth` é responsável por varrer o cache logo no mount principal `<App />` ou checar com o BackEnd a integridade de uma sessão.

*Exemplo de Hook de Autenticação:*
```typescript
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('refresh_token');
    if (token) {
        // Axios interceptor fará o refresh automático do access
        setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  return { isAuthenticated, isLoading };
}
```

## 2. Abordagem de Estado Compartilhado (Data Fetching)

Hoje, há grande foco em "SWR" via React Hóoks customizados, como o **`useClientData`**.

```typescript
// Exemplo Mental do uso:
function Dashboard() {
  const { data, loading, error } = useClientData();

  if(loading) return <FullScreenSpinner />
  if(error) return <ErrorMessage text={error.message} />

  return <PatientView profile={data.perfil.paciente} />
}
```

O `useClientData` não só busca, mas idealmente centraliza uma única Promise em memória (memoization) se múltiplos componentes paralelos renderizarem na mesma árvore, evitando assim metralhar a API do backend à toa (Lei de Performance).

### Regra de Ouro (Data-Drilling):
Evite *Props Drilling* excessivo. Se as propriedades caírem por mais de 3 níveis de profundidade (Pai -> Filho -> Neto -> Bisneto) apenas para o Bisneto saber o nome do usuário, passe a utilizar Context API (`createContext`) para os dados vitais (`UserContext`) no Root da App.

*Exemplo de Injeção via Context:*
```tsx
export const UserContext = createContext<UserProfile | null>(null);

// No main.tsx ou App.tsx
<UserContext.Provider value={clientData}>
   <RouterProvider router={router} />
</UserContext.Provider>

// No componente Neto/Bisneto
const user = useContext(UserContext);
console.log(user?.current_plan);
```

## 3. Gestão e UI UX Response State (Notificações)
Toda interação complexa ou demorada no backend:
1. Deve ser embrulhada em `try...catch`.
2. O botão originador DEVE virar disabled e mostrar estado "Carregando..." (Spinner).
3. Seja Success ou Fail, a interface deve jogar um componente de `Toast` flutuante no canto da tela (Usando pacotes com visual rico pré-instalados/construídos).
*Nunca solte um `console.log` para reportar falha ao usuário*. Asfalte o erro num container legível.

## 4. WebRTC state limitations (VideoSDK)
Quando a sala de *VideoSDK* abre, componentes React mudam e desmotam violentamente (Unmount). Garanta que os Cleanup Hooks (`useEffect return () => {}`) encerrem os Event Listeners (ex: câmera nativa em background) se o usuário decidir voltar na navbar sem clicar formalmente em "Desligar a Sala".

*Exemplo SRE de Proteção contra Vazeamento de Memória (Memory Leak):*
```tsx
useEffect(() => {
   const meeting = VideoSDK.initMeeting({...});
   meeting.join();

   // Failsafe de Unmount (O usuário apertou Voltar no Navegador)
   return () => {
      meeting.leave();
      console.log("Cleanup: Sala encerrada via Unmount do React");
   }
}, []);
```
