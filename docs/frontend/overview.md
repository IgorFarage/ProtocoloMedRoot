# Frontend Overview (React)

## Princípios de UI/UX

O Front-end do ProtocoloMed é uma Single Page Application construída com:
*   **Vite:** Bundler de build ultrarrápido (substituindo CRAs antigos).
*   **React 18 & TypeScript:** Tipagem rigorosa nos props e estados para evitar erros de render.
*   **TailwindCSS:** Para estilização utilitária inline rápida e coesa baseada em um Design System global (`tailwind.config.ts`).
*   **Lucide React:** Para iconografia vetorial de alta definição e leveza.

A premissa da nossa interface é guiada pela [**Lei nº 2: Reutilização e Padronização**](../manifesto.md). Toda tela *deve* herdar e reusar componentes da pasta `/components` como botões, inputs mascarados (`cpf`, `telefone`), containers e tipografias (H1, p). Reinventar a roda é uma violação arquitetural grave.

## Estrutura de Diretórios (`src/`)

A organização visa facilitar finding de código baseando-se em features em vez de tipos de arquivo:

### `src/components/` (Presentational / Dumb Components)
Componentes puramente visuais. Aqui ficam os blocos construtores que **não agem iterativamente com a API** nem guardam estados globais persistentes (Botões, Modais customizados, Spinners de Loading, Custom Inputs).
Eles recebem dados estritamente via `props`.

*Exemplo de Componente Dumb Saudável:*
```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
}

export const PrimaryButton = ({ label, onClick, isLoading }: ButtonProps) => (
  <button onClick={onClick} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">
    {isLoading ? <Spinner /> : label}
  </button>
);
```

### `src/pages/` (Containers / Smart Components)
Componentes de altíssimo nível da hierarquia que mapeiam diretamente as rotas do `react-router-dom`.
Eles **buscam dados (Fetch)**, mapeiam a lógica de resposta, tratam erros, e injetam o resultado goela abaixo (Props drill) nas cascas dos Dumb components.
Ex: `Login`, `Dashboard`, `VideoConsultation`, `Plans`.

### `src/hooks/` (Data Fetching e State Management)
Toda lógica pesada de extração da API deve ser encapsulada aqui, escondida das Views (`pages`).

Por exemplo, criamos o custom hook `useClientData()` para que tanto o *Header* quanto o *Dashboard* consigam invocar e extrair os dados do paciente simultaneamente, e em caso de ausência no cache local, aciona silenciosamente o serviço Axios.
Isso obedece fortemente à Separação de Responsabilidades: **Componentes UI apenas reagem aos dados extraídos pelos Custom Hooks.**

### `src/services/` (The Network Layer)
A camada do *Axios*. O arquivo base `api.ts` guarda a configuração canônica (Base URL apontando pra Env VITE_, Content-Type).

*A Magia dos Interceptors:* Para oferecer uma vida útil infinita de login (UX Premium), amarramos "Middlewares" cliente-side do Axios (`interceptors.response`). Caso a API de recursos do Django retorne HTTP `401 Unauthorized` (Token JWT Access vencido), o Axios intercepta a queda ANTES da tela piscar, faz o request contendo o `Refresh Token` longo para `/api/accounts/refresh/`, atualiza a store global com o novo token válido, e refaz a chamada originária automaticamente.

### `src/router/` ou In-app routes
Configuração estrita e protegida. Se usarmos rotas privadas (`<ProtectedRoute>`), o router avalia o local storage / contexto de autenticação antes de mostrar a Page.

## Regras de Tipagem (TypeScript)

Apoiados inteiramente na [**Lei nº 3: Tipagem e Documentação**](../manifesto.md):

1. **Nunca** utilize `any` em retornos de API ou interfaces. Sempre faça o casting para uma `interface` mapeada fielmente com o `serializer` correspondente do Django DRF Backend.
   Exemplo:
   ```typescript
   export interface UserProfile {
       id: number;
       email: string;
       current_plan: string;
       perfil: {
           paciente?: { gender: string };
           medico?: { crm: string };
       }
   }
   ```
2. Tipar corretamente os Hooks caso use context api ou estados asíncronos para evitar chamadas lógicas de Prop undefined.

## Dívidas Técnicas Front
* A gestão global de cache das chamadas ainda pode ser refatorada para TanStack Query (React Query) puro com maior robustez em todo app. Por ora, os hooks manuais do `useClientData` mantêm estados locais nas Pages importadas.
