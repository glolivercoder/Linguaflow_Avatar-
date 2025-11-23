# AVATAR_AZURE_X_CSS.md – Guia Comparativo

## Visão geral

| Recurso | **azure‑speech‑viseme‑svg** | **lipsync.js** |
|---------|----------------------------|----------------|
| **Alvo de integração** | Funciona diretamente com o **Azure Speech SDK** (`SpeechSynthesizer.visemeReceived`). | Genérico – funciona com qualquer fonte de visemas (Azure, Google, personalizada). |
| **Estilo de implementação** | Manipula o **DOM**: mostra/oculta grupos `<g id="mouth‑X">` dentro de um avatar SVG. | Adiciona uma **classe CSS** (`.viseme‑X`) ao elemento SVG; a visibilidade é controlada via CSS. |
| **Dependências** | `azure-speech-viseme-svg` (≈2 KB) + Azure Speech SDK (já presente no projeto). | `lipsync.js` (MIT, ~1 KB). |
| **Complexidade de configuração** | Muito baixa – um `npm i` e uma chamada ao helper. | Baixa – um `npm i` e um pequeno arquivo CSS. |
| **Desempenho em tempo de execução** | Atualizações diretas ao DOM; overhead insignificante. | Troca de classe CSS; também insignificante. |
| **Customização** | Você pode editar o helper para mapear qualquer ID de visema para qualquer grupo SVG. | Controle total via CSS (animações, transições). |
| **Necessidade de Docker** | **Nenhuma** – puro JS, roda no navegador. | **Nenhuma** – puro JS. |
| **Ideal para** | Projetos que já utilizam **Azure TTS** e desejam a solução plug‑and‑play mais rápida. | Projetos que preferem estilização **apenas com CSS** ou que podem mudar o provedor de TTS no futuro. |

---

## Como gerar o avatar 2‑D (SVG) – passo a passo comum

1. **Crie uma imagem de retrato** (foto do usuário).  
2. **Converta para PNG em estilo desenho** usando Stable Diffusion (ou qualquer ferramenta de IA que transforme foto em esboço).  
3. **Vetorialize para SVG** com `potrace` (instale via `npm i -g potrace`):
   ```bash
   # PNG → SVG (arquivo de saída: avatar.svg)
   potrace portrait.png -s -o public/avatars/avatar.svg
   ```
4. **Edite o SVG** para que cada forma de boca seja um grupo separado:
   ```xml
   <g id="mouth-0"><path …/></g>   <!-- silêncio -->
   <g id="mouth-1"><path …/></g>   <!-- AA -->
   ...
   <g id="mouth-20"><path …/></g>
   ```
   *Você pode desenhar as formas de boca manualmente no Inkscape ou em outro editor vetorial.*

Coloque o SVG final em `public/avatars/` (ex.: `public/avatars/avatar.svg`).

---

## 1️⃣ Usando **azure‑speech‑viseme‑svg** (baseado em DOM)

### Instalação
```bash
npm i azure-speech-viseme-svg
```

### Componente React (exemplo mínimo)
```tsx
import { useEffect, useRef } from "react";
import {
  SpeechSynthesizer,
  SpeechConfig,
  AudioConfig,
} from "microsoft-cognitiveservices-speech-sdk";
import { applyVisemeToSvg } from "azure-speech-viseme-svg";

export const AvatarAzure = ({ text }: { text: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const cfg = SpeechConfig.fromSubscription(
      import.meta.env.VITE_AZURE_KEY,
      import.meta.env.VITE_AZURE_REGION
    );
    cfg.speechSynthesisVoiceName = "en-US-AriaNeural";
    const audio = AudioConfig.fromDefaultSpeakerOutput();
    const synth = new SpeechSynthesizer(cfg, audio);

    // 👉 Mapeamento Visema → SVG
    synth.visemeReceived = (_, e) => {
      if (svgRef.current) applyVisemeToSvg(svgRef.current, e.visemeId);
    };

    synth.speakTextAsync(text, () => console.log("done"), (err) => console.error(err));
    return () => synth.close();
  }, [text]);

  return (
    <svg ref={svgRef} viewBox="0 0 200 200">
      {/* copie os grupos do avatar.svg aqui ou use <use href="/avatars/avatar.svg"/> */}
    </svg>
  );
};
```

### O que o helper faz
* Esconde **todos** os elementos `<g id="mouth‑*">`.
* Exibe o grupo cujo ID corresponde ao `visemeId` recebido (0‑20).
* Não requer CSS – a manipulação é feita diretamente no DOM.

---

## 2️⃣ Usando **lipsync.js** (baseado em CSS)

### Instalação
```bash
npm i lipsync.js
```

### Arquivo CSS (`src/avatar.css`)
```css
svg g { display: none; }
/* mapeia cada visema para uma classe */
svg.viseme-0 g[id^="mouth-"] { display: none; }
svg.viseme-0 g#mouth-0 { display: block; }
svg.viseme-1 g#mouth-1 { display: block; }
/* repita até o visema‑20 */
```

### Componente React (exemplo mínimo)
```tsx
import { useEffect, useRef } from "react";
import {
  SpeechSynthesizer,
  SpeechConfig,
  AudioConfig,
} from "microsoft-cognitiveservices-speech-sdk";
import LipSync from "lipsync.js"; // export default

export const AvatarCSS = ({ text }: { text: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const cfg = SpeechConfig.fromSubscription(
      import.meta.env.VITE_AZURE_KEY,
      import.meta.env.VITE_AZURE_REGION
    );
    cfg.speechSynthesisVoiceName = "en-US-AriaNeural";
    const audio = AudioConfig.fromDefaultSpeakerOutput();
    const synth = new SpeechSynthesizer(cfg, audio);

    synth.visemeReceived = (_, e) => {
      if (svgRef.current) {
        // remove a classe anterior e adiciona a nova
        svgRef.current.className = `viseme-${e.visemeId}`;
        // opcional: LipSync.setViseme(e.visemeId) para helpers extras
        LipSync.setViseme(e.visemeId);
      }
    };

    synth.speakTextAsync(text, () => console.log("done"), (err) => console.error(err));
    return () => synth.close();
  }, [text]);

  return (
    <svg ref={svgRef} className="viseme-0" viewBox="0 0 200 200">
      {/* copie os grupos do avatar.svg */}
    </svg>
  );
};
```

### Vantagens da abordagem CSS
* Você pode adicionar **transições** ou **animações** em CSS (ex.: `transition: opacity 0.1s`).
* Trocar o provedor de TTS requer apenas enviar os mesmos valores de `visemeId`.

---

## Checklist rápido de decisão
| Necessidade | Escolha |
|------------|---------|
| Já usa Azure Speech SDK e quer plug‑and‑play sem configuração | **azure‑speech‑viseme‑svg** |
| Prefere estilização **apenas com CSS**, quer controle fácil de animações ou pode mudar de provedor TTS | **lipsync.js** |
| Quer o bundle menor possível (ambas são pequenas, mas `lipsync.js` não tem código helper extra) | **lipsync.js** |

---

## Dica final
As duas bibliotecas podem coexistir. Comece com `azure‑speech‑viseme‑svg` para prototipar rapidamente e, se precisar de efeitos visuais mais avançados, migre para a solução baseada em CSS (`lipsync.js`).
