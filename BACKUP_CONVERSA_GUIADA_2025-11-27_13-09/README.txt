BACKUP DAS MODIFICAÇÕES - 2025-11-27 13:09
==============================================

Este backup contém as modificações que foram revertidas com git reset --hard.

ARQUIVOS MODIFICADOS:
- INICIAR_AVATAR.bat (otimizações de startup)
- components/ConversationView.tsx (campo de tradução + Conversa Guiada)
- components/GuidedConversationSidebar.tsx (novo componente)
- components/icons.tsx (LanguageIcon + outros ícones)
- constants.ts (defaults STT Whisper)
- services/db.ts (tabelas UserProfile e GuidedConversationHistory)
- types.ts (interfaces UserProfile e GuidedConversationHistory)

MOTIVO DO ROLLBACK:
As últimas alterações comprometeram a tela, código e funcionamento do app.

COMMIT RESTAURADO:
c08d2c1 - Nova função conversa guiada

NOTA: Os arquivos originais foram perdidos durante o git clean -fd.
Para recuperar, use: git stash ou git reflog
