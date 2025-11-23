
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Settings, VoiceGender, VoiceModelInfo, OpenRouterModelSummary, PhoneticFormat } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { generateReferenceAudio, listVoiceModels } from '../services/pronunciationService';
import { translateText, getPhonetics } from '../services/geminiService';
import { CATEGORY_DEFINITIONS, CATEGORY_KEYS, BASE_CATEGORY_LANGUAGE_NAME, type QAItem, type CategoryDefinition, type CategorySection, type PhraseSection, type TranslatedCategories } from '../data/conversationCategories';
import { saveCategoryTranslations, getCategoryPhonetic, saveCategoryPhonetic } from '../services/db';
import { fetchOpenRouterModels } from '../services/voskService';

interface SettingsViewProps {
  settings: Settings;
  onSettingsChange: (newSettings: Settings) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => Promise<void>;
  onBack: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange, onExportBackup, onImportBackup, onBack }) => {

  const [voiceModels, setVoiceModels] = useState<VoiceModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [testText, setTestText] = useState('Hello everyone! Welcome to LinguaFlow.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [backupFileInputRef] = useState(() => { return { current: null as HTMLInputElement | null }; });
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Load last backup time from localStorage
  useEffect(() => {
    const backup = localStorage.getItem('autoBackup_lastBackupTime');
    if (backup) {
      setLastBackup(backup);
    }
  }, []);
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelSummary[]>([]);
  const [isLoadingOpenRouter, setIsLoadingOpenRouter] = useState(false);
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [modelSearch, setModelSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modelsReloadToken, setModelsReloadToken] = useState(0);
  const [providerFilter, setProviderFilter] = useState('all');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const [preprocessStatus, setPreprocessStatus] = useState('');
  const [preprocessProgress, setPreprocessProgress] = useState(0);

  const includeFree = settings.openRouterIncludeFree ?? true;
  const includePaid = settings.openRouterIncludePaid ?? true;

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(modelSearch.trim());
    }, 400);
    return () => {
      window.clearTimeout(handle);
    };
  }, [modelSearch]);

  useEffect(() => {
    const loadVoiceModels = async () => {
      try {
        setIsLoadingModels(true);
        setModelsError(null);
        const models = await listVoiceModels();
        setVoiceModels(models);
      } catch (error) {
        console.error('Failed to load Piper voice models:', error);
        setModelsError('Não foi possível carregar os modelos de voz do Piper.');
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadVoiceModels();
  }, []);

  useEffect(() => {
    if (!settings.useVoskStt) {
      setOpenRouterModels([]);
      setOpenRouterError(null);
      return;
    }

    let cancelled = false;
    const loadModels = async () => {
      try {
        setIsLoadingOpenRouter(true);
        setOpenRouterError(null);
        const result = await fetchOpenRouterModels({
          search: debouncedSearch,
          includeFree,
          includePaid,
          provider: providerFilter,
        });
        if (!cancelled) {
          setOpenRouterModels(result.models);
          setAvailableProviders(result.providers);
          if (result.providers.length > 0 && providerFilter !== 'all') {
            const exists = result.providers.some(p => p.toLowerCase() === providerFilter.toLowerCase());
            if (!exists) {
              setProviderFilter('all');
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Falha ao carregar modelos do OpenRouter:', error);
          setOpenRouterError('Não foi possível carregar os modelos do OpenRouter. Verifique sua conexão e a chave OPENROUTER_API_KEY.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOpenRouter(false);
        }
      }
    };

    loadModels();
    return () => {
      cancelled = true;
    };
  }, [settings.useVoskStt, includeFree, includePaid, debouncedSearch, modelsReloadToken, providerFilter]);

  const handleModelChange = (value: string) => {
    onSettingsChange({
      ...settings,
      piperVoiceModel: value || undefined,
    });
  };

  const selectedVoiceLabel = useMemo(() => {
    if (!settings.piperVoiceModel) {
      return 'Padrão (en_US-lessac-medium)';
    }
    const info = voiceModels.find(model => model.key === settings.piperVoiceModel);
    if (!info) {
      return settings.piperVoiceModel;
    }
    const languageLabel = info.language?.toUpperCase() ?? 'Idioma desconhecido';
    const qualityLabel = info.quality ? info.quality.toUpperCase() : 'Qualidade indefinida';
    return `${info.key} • ${languageLabel} • ${qualityLabel}`;
  }, [settings.piperVoiceModel, voiceModels]);

  const selectedOpenRouterLabel = useMemo(() => {
    if (!settings.openRouterModelId) {
      return 'openrouter/auto (padrão)';
    }
    const model = openRouterModels.find((item) => item.id === settings.openRouterModelId);
    return model?.name ? `${model.name} (${model.id})` : settings.openRouterModelId;
  }, [settings.openRouterModelId, openRouterModels]);

  const handleGenerateTestAudio = async () => {
    try {
      setIsGenerating(true);
      setGeneratedUrl(null);
      setGeneratedModel(null);
      const response = await generateReferenceAudio(testText, settings.piperVoiceModel ? settings.piperVoiceModel : undefined);
      if (response.audio_url) {
        setGeneratedUrl(response.audio_url);
        setGeneratedModel(response.voice_model ?? settings.piperVoiceModel ?? 'default');
      }
    } catch (error) {
      console.error('Failed to generate test audio:', error);
      window.alert(error instanceof Error ? error.message : 'Falha ao gerar áudio de teste.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onSettingsChange({
      ...settings,
      [name]: value,
    });
  };

  const handleBackupImportClick = () => {
    backupFileInputRef.current?.click();
  };

  const handleBackupFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await onImportBackup(file);
    } catch (error) {
      console.error('Falha ao importar backup:', error);
      window.alert('Falha ao importar backup. Verifique se o arquivo é válido.');
    } finally {
      event.target.value = '';
    }
  };

  const handlePreprocessCategories = async () => {
    try {
      setIsPreprocessing(true);
      setPreprocessStatus('Preparando categorias...');
      setPreprocessProgress(0);
      const englishName = 'English (US)';
      const nativeName = SUPPORTED_LANGUAGES.find(l => l.code === settings.nativeLanguage)?.name || settings.nativeLanguage;
      const out: Partial<TranslatedCategories> = {};
      let totalTexts = 0;
      for (const key of CATEGORY_KEYS) {
        const base = CATEGORY_DEFINITIONS[key];
        const sections: CategorySection[] = [];
        for (const section of base.sections) {
          if (section.type === 'phrases') {
            const items: string[] = [];
            for (const it of section.items as string[]) {
              const tr = await translateText(it, BASE_CATEGORY_LANGUAGE_NAME, englishName);
              items.push(tr && tr !== 'Erro na tradução.' ? tr : it);
              totalTexts++;
            }
            sections.push({ ...section, heading: await translateText(section.heading, BASE_CATEGORY_LANGUAGE_NAME, englishName), items } as PhraseSection);
          } else {
            const items: QAItem[] = [];
            for (const it of section.items as QAItem[]) {
              const q = await translateText(it.question, BASE_CATEGORY_LANGUAGE_NAME, englishName);
              const a = await translateText(it.answer, BASE_CATEGORY_LANGUAGE_NAME, englishName);
              items.push({ question: q, answer: a });
              totalTexts += 2;
            }
            sections.push({ ...section, heading: await translateText(section.heading, BASE_CATEGORY_LANGUAGE_NAME, englishName), items } as CategorySection);
          }
        }
        const translated: CategoryDefinition = {
          ...base,
          title: await translateText(base.title, BASE_CATEGORY_LANGUAGE_NAME, englishName),
          description: await translateText(base.description, BASE_CATEGORY_LANGUAGE_NAME, englishName),
          roleInstruction: await translateText(base.roleInstruction, BASE_CATEGORY_LANGUAGE_NAME, englishName),
          kickoffPrompt: await translateText(base.kickoffPrompt, BASE_CATEGORY_LANGUAGE_NAME, englishName),
          sections,
        };
        (out as TranslatedCategories)[key] = translated;
      }
      const merged = out as TranslatedCategories;
      await saveCategoryTranslations('en-US', merged);
      setPreprocessStatus('Gerando fonética...');
      let processed = 0;
      for (const key of CATEGORY_KEYS) {
        const cat = merged[key];
        for (const section of cat.sections) {
          if (section.type === 'qa') {
            for (const it of section.items as QAItem[]) {
              const texts = [it.question, it.answer];
              for (const t of texts) {
                const cached = await getCategoryPhonetic('en-US', settings.nativeLanguage, t);
                if (!cached) {
                  const ph = await getPhonetics(t, englishName, nativeName);
                  await saveCategoryPhonetic('en-US', settings.nativeLanguage, t, ph);
                }
                processed++;
                setPreprocessProgress(Math.round((processed / totalTexts) * 100));
              }
            }
          } else {
            for (const t of section.items as string[]) {
              const cached = await getCategoryPhonetic('en-US', settings.nativeLanguage, t);
              if (!cached) {
                const ph = await getPhonetics(t, englishName, nativeName);
                await saveCategoryPhonetic('en-US', settings.nativeLanguage, t, ph);
              }
              processed++;
              setPreprocessProgress(Math.round((processed / totalTexts) * 100));
            }
          }
        }
      }
      setPreprocessStatus('Concluído');
    } catch (error) {
      console.error('Falha no pré-processamento:', error);
      setPreprocessStatus('Falha');
      window.alert('Falha ao pré-processar categorias. Verifique a conexão e tente novamente.');
    } finally {
      setIsPreprocessing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-cyan-400">Configurações</h2>

      <div className="space-y-6 max-w-2xl">
        <div className="p-4 bg-gray-800 rounded-lg space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">Backup e Restauração</h3>
            <p className="text-xs text-gray-400 mt-1">
              Salve todas as configurações, flashcards, imagens sobrescritas, traduções e dados do Anki em um único arquivo.
              Ao exportar, o navegador abrirá a caixa de "Salvar como" para você escolher a pasta.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onExportBackup}
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-md transition-colors"
            >
              Exportar backup
            </button>
            <button
              onClick={handleBackupImportClick}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-md transition-colors"
            >
              Restaurar de arquivo
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Recomenda-se guardar o arquivo em um diretório seguro e manter cópias de versões anteriores.
          </p>
          <input
            ref={backupFileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleBackupFileChange}
          />
        </div>

        {/* Auto-Backup Status Panel */}
        <div className="p-4 bg-gray-800 rounded-lg space-y-3 border-l-4 border-green-500">
          <div>
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Backup Automático
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              O sistema realiza backups automáticos sempre que você adiciona flashcards, altera configurações ou salva traduções/fonética.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Último Backup</p>
              <p className="mt-1 text-sm font-medium text-gray-200">
                {lastBackup ? new Date(lastBackup).toLocaleString('pt-BR') : 'Nunca'}
              </p>
            </div>
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Status</p>
              <p className="mt-1 text-sm font-medium text-green-400">
                {lastBackup ? 'Ativo' : 'Pendente'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              import('../services/autoBackupService').then(({ performManualBackup }) => {
                performManualBackup();
                alert('Backup manual iniciado! O arquivo será baixado em instantes.');
              });
            }}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors"
          >
            🔄 Forçar Backup Manual Agora
          </button>
          <div className="text-xs text-gray-500 bg-gray-750 p-2 rounded">
            <strong>📁 Arquivo:</strong> Backup_linguaflow_data_HORARIO.json
            <br />
            <strong>📍 Local:</strong> Pasta de Downloads padrão do navegador
          </div>
        </div>

        {/* Cache Statistics Panel */}
        <div className="p-4 bg-gray-800 rounded-lg space-y-3 border-l-4 border-blue-500">
          <div>
            <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              Estatísticas de Cache
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              O cache armazena dados localmente para evitar chamadas repetidas às APIs e funcionar offline.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Imagens Pixabay</p>
              <p className="mt-1 text-lg font-bold text-blue-400" id="cache-pixabay">...</p>
            </div>
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Traduções</p>
              <p className="mt-1 text-lg font-bold text-green-400" id="cache-translations">...</p>
            </div>
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Fonética</p>
              <p className="mt-1 text-lg font-bold text-purple-400" id="cache-phonetics">...</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Cache Imagens (Blob)</p>
              <p className="mt-1 text-lg font-bold text-yellow-400" id="cache-images">...</p>
            </div>
            <div className="p-3 bg-gray-750 rounded-md">
              <p className="text-xs text-gray-400">Cache Conversa</p>
              <p className="mt-1 text-lg font-bold text-pink-400" id="cache-conversa">...</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={async () => {
                const { getCacheStats } = await import('../services/db');
                const stats = await getCacheStats();
                document.getElementById('cache-pixabay')!.textContent = stats.pixabaySearches.toString();
                document.getElementById('cache-translations')!.textContent = stats.translations.toString();
                document.getElementById('cache-phonetics')!.textContent = stats.phonetics.toString();
                document.getElementById('cache-images')!.textContent = stats.imageCache.toString();
                document.getElementById('cache-conversa')!.textContent = stats.conversaCache.toString();
              }}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
            >
              🔄 Atualizar Estatísticas
            </button>
            <button
              onClick={async () => {
                if (confirm('Deseja limpar cache antigo (> 30 dias)? Isso não afetará dados recentes.')) {
                  const { clearOldPixabayCache } = await import('../services/db');
                  const olderThan30days = 30 * 24 * 60 * 60 * 1000;
                  const removed = await clearOldPixabayCache(olderThan30days);
                  alert(`✅ ${removed} registros antigos foram removidos do cache Pixabay.`);
                }
              }}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition-colors"
            >
              🗑️ Limpar Cache Antigo
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-750 p-2 rounded">
            <strong>💡 Dica:</strong> O cache funciona automaticamente. Dados são salvos em IndexedDB e funcionam mesmo offline!
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">Pré-processamento de conteúdo</h3>
            <p className="text-xs text-gray-400 mt-1">Gera e salva no banco as traduções fixas em inglês e as transcrições fonéticas de todas as categorias.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreprocessCategories}
              disabled={isPreprocessing}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text_white font-semibold rounded-md transition-colors disabled:opacity-60"
            >
              {isPreprocessing ? 'Processando...' : 'Pré-processar agora'}
            </button>
            {preprocessStatus && (
              <span className="text-xs text-gray-300">{preprocessStatus} {preprocessProgress ? `• ${preprocessProgress}%` : ''}</span>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-200">Voz de Conversa Offline (Vosk + OpenRouter)</h3>
              <p className="text-xs text-gray-400 mt-1">
                Ative para usar reconhecimento de fala offline com o modelo Vosk. A transcrição é enviada ao OpenRouter para gerar a resposta de IA e o áudio final é produzido via Piper TTS.
              </p>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <span className="mr-2 text-sm text-gray-300">Desativado</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.useVoskStt ?? false}
                  onChange={(event) => {
                    onSettingsChange({
                      ...settings,
                      useVoskStt: event.target.checked,
                    });
                  }}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors ${settings.useVoskStt ? 'bg-cyan-500' : 'bg-gray-600'}`}></div>
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.useVoskStt ? 'translate-x-6' : ''}`}
                ></div>
              </div>
              <span className="ml-2 text-sm text-gray-300">Ativado</span>
            </label>
          </div>

          {settings.useVoskStt && (
            <div className="space-y-4 border border-gray-700 rounded-lg p-4 bg-gray-900/60">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide mb-1">
                    Buscar modelos OpenRouter
                  </label>
                  <input
                    value={modelSearch}
                    onChange={(event) => setModelSearch(event.target.value)}
                    placeholder="Digite parte do nome, descrição ou tags..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wide">
                    Provedor
                  </label>
                  <select
                    value={providerFilter}
                    onChange={(event) => setProviderFilter(event.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="all">Todos</option>
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={includeFree}
                      onChange={(event) =>
                        onSettingsChange({
                          ...settings,
                          openRouterIncludeFree: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    Gratuitos
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={includePaid}
                      onChange={(event) =>
                        onSettingsChange({
                          ...settings,
                          openRouterIncludePaid: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
                    />
                    Pagos
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2 text-xs text-gray-400 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span>Modelos disponíveis</span>
                    <button
                      onClick={() => setModelsReloadToken((token) => token + 1)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-200 hover:border-cyan-500 hover:text-cyan-300"
                    >
                      Atualizar
                    </button>
                  </div>

                  <p className="text-xs text-gray-400">
                    Modelo selecionado: {selectedOpenRouterLabel}
                  </p>
                </div>

                <div className="relative min-h-[120px]">
                  {isLoadingOpenRouter && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 text-sm text-gray-300">
                      Carregando modelos...
                    </div>
                  )}

                  {openRouterError && !isLoadingOpenRouter && (
                    <div className="rounded-md border border-rose-600 bg-rose-950/60 p-3 text-sm text-rose-200">
                      {openRouterError}
                    </div>
                  )}

                  {!openRouterError && !isLoadingOpenRouter && openRouterModels.length === 0 && (
                    <div className="rounded-md border border-gray-700 bg-gray-900/60 p-3 text-sm text-gray-300">
                      Nenhum modelo encontrado. Ajuste os filtros ou a busca.
                    </div>
                  )}

                  {openRouterModels.length > 0 && (
                    <div className="space-y-2">
                      {openRouterModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() =>
                            onSettingsChange({
                              ...settings,
                              openRouterModelId: model.id,
                            })
                          }
                          className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${settings.openRouterModelId === model.id
                            ? 'border-cyan-500 bg-cyan-900/30 text-cyan-100'
                            : 'border-gray-700 bg-gray-900/40 text-gray-200 hover:border-cyan-600 hover:bg-gray-900'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{model.name || model.id}</span>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400">
                              {model.tags?.join(' • ') || 'sem tags'}
                            </span>
                          </div>
                          {model.description && (
                            <p className="mt-1 text-xs text-gray-300 line-clamp-2">{model.description}</p>
                          )}
                          <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                            <span>ID: {model.id}</span>
                            <span>
                              Contexto: {model.context_length ?? 'desconhecido'} • Custos:{' '}
                              {(() => {
                                const pricing = model.pricing ?? {};
                                const prompt = pricing['prompt'];
                                const completion = pricing['completion'];
                                if (prompt == null && completion == null) return 'n/d';
                                return `${prompt ?? '?'} / ${completion ?? '?'}`;
                              })()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="nativeLanguage" className="block text-sm font-medium text-gray-300 mb-2">
            Minha língua nativa
          </label>
          <select
            id="nativeLanguage"
            name="nativeLanguage"
            value={settings.nativeLanguage}
            onChange={handleSelectChange}
            className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="learningLanguage" className="block text-sm font-medium text-gray-300 mb-2">
            Quero aprender
          </label>
          <select
            id="learningLanguage"
            name="learningLanguage"
            value={settings.learningLanguage}
            onChange={handleSelectChange}
            className="w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Gênero da Voz (TTS)
          </label>
          <div className="flex space-x-4">
            {(['female', 'male', 'neutral'] as VoiceGender[]).map((gender) => (
              <button
                key={gender}
                onClick={() => onSettingsChange({ ...settings, voiceGender: gender })}
                className={`px-4 py-2 rounded-md transition-colors ${settings.voiceGender === gender
                  ? 'bg-cyan-600 text-white font-semibold'
                  : 'bg-gray-700 hover:bg-gray-600'
                  }`}
              >
                {gender === 'female' ? 'Feminina' : gender === 'male' ? 'Masculina' : 'Neutra'}
              </button>
            ))}
          </div>
        </div>

        {/* NEW: Phonetic Format Selection */}
        <div className="p-4 bg-gray-800 rounded-lg space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-200">Formato de Transcrição Fonética</h3>
            <p className="text-xs text-gray-400 mt-1">
              Escolha como deseja visualizar a pronúncia das palavras em inglês na aba Conversa.
            </p>
          </div>

          <div className="space-y-3">
            {/* Simplified Option */}
            <label className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="phoneticFormat"
                value="simplified"
                checked={(settings.phoneticFormat ?? 'simplified') === 'simplified'}
                onChange={() => onSettingsChange({ ...settings, phoneticFormat: 'simplified' })}
                className="mt-1 h-4 w-4 text-cyan-500 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <div className="text-white font-medium">Simplificada (Recomendado)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Adaptada para brasileiros, usando letras normais e acentos.
                </div>
                <div className="mt-2 p-2 bg-gray-900/60 rounded border border-gray-600">
                  <div className="text-xs text-gray-300 font-mono">
                    <span className="text-gray-500">Exemplo:</span> "Hello, how are you?"
                  </div>
                  <div className="text-sm text-green-400 font-mono mt-1">
                    re-LÔU, rau ár iú?
                  </div>
                </div>
              </div>
            </label>

            {/* IPA Option */}
            <label className="flex items-start gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                name="phoneticFormat"
                value="ipa"
                checked={settings.phoneticFormat === 'ipa'}
                onChange={() => onSettingsChange({ ...settings, phoneticFormat: 'ipa' })}
                className="mt-1 h-4 w-4 text-cyan-500 focus:ring-cyan-500"
              />
              <div className="flex-1">
                <div className="text-white font-medium">IPA (Alfabeto Fonético Internacional)</div>
                <div className="text-xs text-gray-400 mt-1">
                  Formato padrão acadêmico com símbolos especiais (θ, ð, ə, etc.).
                </div>
                <div className="mt-2 p-2 bg-gray-900/60 rounded border border-gray-600">
                  <div className="text-xs text-gray-300 font-mono">
                    <span className="text-gray-500">Exemplo:</span> "Hello, how are you?"
                  </div>
                  <div className="text-sm text-green-400 font-mono mt-1">
                    /həˈloʊ, haʊ ɑr juː/
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-800 rounded-lg text-sm">
          <h4 className="font-semibold text-gray-300 mb-2">Configuração das Chaves de API</h4>
          <p className="text-xs text-gray-400">
            Sua chave de API do Google Gemini e do Pixabay são configuradas de forma segura através de variáveis de ambiente e não precisam ser inseridas aqui.
          </p>
        </div>

        <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Piper TTS</h3>
            <p className="text-xs text-gray-400">
              Ajuste o modelo de voz do Piper e teste a síntese de voz diretamente do navegador. As alterações são salvas automaticamente nas configurações da conta local.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="piperVoiceModel" className="block text-sm font-medium text-gray-300">
              Modelo de voz
            </label>
            <select
              id="piperVoiceModel"
              name="piperVoiceModel"
              value={settings.piperVoiceModel ?? ''}
              onChange={event => handleModelChange(event.target.value)}
              className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isLoadingModels}
            >
              <option value="">Padrão (en_US-lessac-medium)</option>
              {voiceModels.map(model => (
                <option key={model.key} value={model.key}>
                  {model.key} • {model.language?.toUpperCase()} {model.quality ? `• ${model.quality}` : ''}
                </option>
              ))}
            </select>
            {isLoadingModels && (
              <p className="text-xs text-gray-400">Carregando modelos disponíveis...</p>
            )}
            {modelsError && (
              <p className="text-xs text-rose-400">{modelsError}</p>
            )}
            {!isLoadingModels && !modelsError && voiceModels.length === 0 && (
              <p className="text-xs text-gray-500">Nenhum modelo adicional encontrado. Certifique-se de que os arquivos .onnx estão na pasta <code className="bg-gray-900 px-1 rounded">backend/pronunciation/models</code>.</p>
            )}
            <p className="text-xs text-gray-400">Modelo selecionado: {selectedVoiceLabel}</p>
          </div>

          <div className="space-y-3">
            <label htmlFor="piperTestText" className="block text-sm font-medium text-gray-300">
              Texto para teste
            </label>
            <textarea
              id="piperTestText"
              value={testText}
              onChange={event => setTestText(event.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Digite um texto para sintetizar..."
            />

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateTestAudio}
                disabled={isGenerating || !testText.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-60"
              >
                {isGenerating ? 'Gerando...' : 'Gerar áudio de teste'}
              </button>
              {generatedUrl && (
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Abrir áudio gerado ({generatedModel})
                </a>
              )}
            </div>

            {generatedUrl && (
              <div className="rounded-md border border-gray-700 bg-gray-900 p-3 text-xs text-gray-300">
                <p>Áudio gerado com sucesso!</p>
                <p className="mt-1 break-all">URL: {generatedUrl}</p>
                <p className="mt-1">Modelo utilizado: {generatedModel ?? 'desconhecido'}</p>
                <audio controls className="mt-2 w-full">
                  <source src={generatedUrl} type="audio/wav" />
                  Seu navegador não suporta reprodução de áudio.
                </audio>
              </div>
            )}
          </div>
        </div>



      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default SettingsView;
