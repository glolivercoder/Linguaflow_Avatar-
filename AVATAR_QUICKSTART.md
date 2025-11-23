# Avatar com Sincronização Labial - Guia de Uso

## Configuração Rápida

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar credenciais Azure
1. Acesse [Azure Portal](https://portal.azure.com)
2. Crie um recurso **Speech Service**
3. Copie a **chave** e a **região**
4. Adicione ao arquivo `.env`:
   ```
   VITE_AZURE_KEY=sua_chave_aqui
   VITE_AZURE_REGION=sua_regiao_aqui
   ```

### 3. Usar o componente Avatar
```tsx
import { Avatar } from './components/Avatar';

function App() {
  return <Avatar text="Olá, tudo bem?" />;
}
```

## Como funciona
- O componente `Avatar` usa o **Azure Speech SDK** para gerar áudio a partir de texto
- Durante a síntese, o SDK emite eventos `visemeReceived` com IDs de 0-20
- Cada ID representa uma forma de boca (visema)
- O helper `applyVisemeToSvg` mostra/oculta os grupos SVG correspondentes

## Próximos passos
1. **Gerar avatar personalizado** a partir de foto (ver `AVATAR_AZURE_X_CSS.MD`)
2. **Criar grupos SVG** para cada visema (mouth-0 até mouth-20)
3. **Integrar ao ConversationView** para sincronizar com o chat

## Custos
- **Plano gratuito**: 5.000 caracteres/mês
- **Pago**: ~$1-2 por milhão de caracteres
