import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Bot,
  Brain,
  Clock,
  MessageSquare,
  Plus,
  SendHorizonal,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { parseReasoningContent } from "../../lib/ai/reasoning-parser";
import { getNextStreamText } from "../editor/ai-dialog-helpers";
import { MarkdownWithCopy } from "./markdown-with-copy";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "../../stores/editor-store";
import { useResumeStore } from "../../stores/resume-store";
import {
  getDocument,
  getSecretInventorySnapshot,
  getWorkspaceSettingsSnapshot,
  listenToAiStreamEvents,
  startAiPromptStream,
  fetchAiModels,
  type DesktopAiConversationMessage,
  type DesktopAiToolCallPayload,
  type DesktopAiStreamEvent,
} from "../../lib/desktop-api";
import { toResumeDocument } from "../../lib/desktop-document-mappers";
import { ReasoningBlock } from "./reasoning-block";
import { ToolExecutionCard } from "./tool-execution-card";

interface AIChatPanelProps {
  resumeId: string;
}

interface AIChatContentProps {
  resumeId: string;
  hideTitle?: boolean;
}

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  thinkingContent?: string;
  createdAt: number;
  error?: boolean;
  toolCalls?: DesktopAiToolCallPayload[];
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface InitialChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
}

interface RuntimeChatSettings {
  loading: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
}

const SESSION_STORAGE_VERSION = 1;
const SESSION_STORAGE_PREFIX = "desktop-ai-chat-sessions";
const MAX_CONVERSATION_HISTORY_MESSAGES = 12;
const MAX_CONVERSATION_HISTORY_CHARS = 12_000;

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function orderSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((left, right) => right.updatedAt - left.updatedAt);
}

function createSession(title: string): ChatSession {
  return {
    id: createId("session"),
    title,
    updatedAt: Date.now(),
    messages: [],
  };
}

function getStorageKey(resumeId: string): string {
  return `${SESSION_STORAGE_PREFIX}:${resumeId}`;
}

function formatTime(epochMs: number): string {
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}/${month}/${day} · ${hours}:${minutes}`;
}

function loadStoredSessions(resumeId: string): ChatSession[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(resumeId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as {
      version?: number;
      sessions?: ChatSession[];
    };

    if (parsed.version !== SESSION_STORAGE_VERSION || !Array.isArray(parsed.sessions)) {
      return [];
    }

    return orderSessions(
      parsed.sessions.filter(
        (session): session is ChatSession =>
          typeof session?.id === "string" &&
          typeof session?.title === "string" &&
          typeof session?.updatedAt === "number" &&
          Array.isArray(session?.messages),
      ),
    );
  } catch {
    return [];
  }
}

function getInitialChatState(
  resumeId: string,
  fallbackTitle: string,
): InitialChatState {
  const storedSessions = resumeId ? loadStoredSessions(resumeId) : [];
  if (storedSessions.length > 0) {
    return {
      sessions: storedSessions,
      activeSessionId: storedSessions[0].id,
    };
  }

  const initialSession = createSession(fallbackTitle);
  return {
    sessions: [initialSession],
    activeSessionId: initialSession.id,
  };
}

function persistSessions(resumeId: string, sessions: ChatSession[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getStorageKey(resumeId),
    JSON.stringify({
      version: SESSION_STORAGE_VERSION,
      sessions,
    }),
  );
}

function toSessionTitle(input: string, fallback: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
}

function buildFriendlyError(rawMessage: string, fallback: string): string {
  if (!rawMessage) {
    return fallback;
  }

  const normalized = rawMessage.toLowerCase();
  if (
    normalized.includes("api key") ||
    normalized.includes("credential") ||
    normalized.includes("secret")
  ) {
    return "AI runtime is missing a valid API key. Open Settings > AI and save the credential again.";
  }

  if (normalized.includes("429") || normalized.includes("rate")) {
    return "The current AI provider is rate limited right now. Wait a moment and try again.";
  }

  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "The AI runtime timed out before completing the reply. Check the network or provider settings and retry.";
  }

  if (normalized.includes("network") || normalized.includes("connect")) {
    return "The desktop runtime could not reach the configured AI endpoint. Check Base URL, network access, and provider status.";
  }

  return rawMessage;
}

function toConversationContent(message: ChatMessage): string {
  if (message.role === "assistant") {
    const parsed = parseReasoningContent(message.content);
    return (parsed.answerText || parsed.reasoningText || "").trim();
  }

  return message.content.trim();
}

function buildConversationHistory(
  messages: ChatMessage[],
): DesktopAiConversationMessage[] {
  const collected: DesktopAiConversationMessage[] = [];
  let totalChars = 0;

  for (const message of [...messages].reverse()) {
    if (message.error) {
      continue;
    }

    const content = toConversationContent(message);
    if (!content) {
      continue;
    }

    const nextTotalChars = totalChars + content.length;
    if (
      collected.length >= MAX_CONVERSATION_HISTORY_MESSAGES ||
      nextTotalChars > MAX_CONVERSATION_HISTORY_CHARS
    ) {
      break;
    }

    collected.push({
      role: message.role,
      content,
    });
    totalChars = nextTotalChars;
  }

  return collected.reverse();
}

function buildResumeEditSystemPrompt(
  sections: Array<{
    id: string;
    type: string;
    title: string;
  }>,
): string {
  const sectionList = sections.length
    ? sections
        .map(
          (section) =>
            `- [${section.type}] "${section.title}" (sectionId: ${section.id})`,
        )
        .join("\n")
    : "- No editable sections were provided.";

  return [
    "You are JobPilot's desktop resume assistant.",
    "Keep answers concise, actionable, and in the user's language.",
    "If fetched webpage content or search results are included in the prompt, use them directly, cite the URLs you relied on, and do not say you cannot access the link or browse the web.",
    "When the user asks to update, rewrite, optimize, add, or directly modify the resume, you MUST use the available resume-editing tools instead of outputting raw resume JSON.",
    "Never dump the full resume JSON unless the user explicitly asks for raw JSON.",
    "For section edits, use the exact sectionId values provided below.",
    "When calling replaceResumeText, send patches with exact originalText values copied verbatim from the resume context and replacementText values. Do not send full section JSON.",
    "After a resume-edit tool succeeds, briefly confirm what changed.",
    "Available resume sections:",
    sectionList,
  ].join("\n");
}

function upsertToolCall(
  toolCalls: DesktopAiToolCallPayload[],
  nextToolCall: DesktopAiToolCallPayload,
): DesktopAiToolCallPayload[] {
  const existingIndex = toolCalls.findIndex(
    (toolCall) => toolCall.toolCallId === nextToolCall.toolCallId,
  );

  if (existingIndex === -1) {
    return [...toolCalls, nextToolCall];
  }

  return toolCalls.map((toolCall, index) =>
    index === existingIndex ? nextToolCall : toolCall,
  );
}

export function AIChatContent({
  resumeId,
  hideTitle = false,
}: AIChatContentProps) {
  const { t } = useTranslation();
  const { currentResume, sections, isDirty, save, setResume } = useResumeStore();
  const { aiChatInitialPrompt } = useEditorStore();

  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t],
  );

  const panelTitle = translate("ai.panelTitle", "AI Assistant");
  const defaultGreeting = translate(
    "ai.defaultGreeting",
    "Hi! I'm your resume optimization assistant. Which part of your resume would you like to improve?",
  );
  const placeholder = translate(
    "ai.placeholder",
    "Describe what you want to improve...",
  );
  const thinkingLabel = translate("ai.thinking", "AI is thinking...");
  const apiKeyMissingTitle = translate(
    "ai.apiKeyMissing",
    "API Key Not Configured",
  );
  const apiKeyMissingHint = translate(
    "ai.apiKeyMissingHint",
    "Please configure your AI API Key in Settings before using AI features.",
  );
  const newChatLabel = translate("ai.newChat", "New Chat");
  const genericError = translate(
    "ai.errorMessage",
    "Something went wrong. Please try again.",
  );
  const reasoningLabel = translate("ai.reasoning", "Thought process");
  const thinkingToggleLabel = translate(
    "ai.thinkingToggle",
    "Enable deep thinking",
  );
  const toolCallingLabel = translate("ai.toolCalling", "Calling:");
  const toolResultLabel = translate("ai.toolResult", "Result");
  const toolCallErrorLabel = translate("ai.toolCallError", "Failed");
  const [initialChatState] = useState<InitialChatState>(() =>
    getInitialChatState(resumeId, newChatLabel),
  );

  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeChatSettings>({
    loading: true,
    provider: "openai",
    model: "",
    baseUrl: "",
    hasApiKey: false,
  });
  const [selectedModel, setSelectedModel] = useState("");
  const [fetchedModelOptions, setFetchedModelOptions] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>(initialChatState.sessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialChatState.activeSessionId,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingToolCalls, setStreamingToolCalls] = useState<
    DesktopAiToolCallPayload[]
  >([]);
  const [streamingThinkingText, setStreamingThinkingText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  const activeSessionIdRef = useRef<string | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const streamingTextRef = useRef("");
  const streamingThinkingTextRef = useRef("");
  const streamingToolCallsRef = useRef<DesktopAiToolCallPayload[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );
  const parsedStreamingContent = useMemo(
    () => parseReasoningContent(streamingText),
    [streamingText],
  );

  const modelOptions = useMemo(() => {
    return Array.from(
      new Set(
        [selectedModel, runtimeSettings.model, ...fetchedModelOptions].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    );
  }, [runtimeSettings.model, fetchedModelOptions, selectedModel]);

  const reloadDocumentIntoStore = useCallback(
    async (documentId: string) => {
      if (!documentId) {
        return;
      }

      try {
        const document = await getDocument(documentId);
        if (document) {
          setResume(toResumeDocument(document));
        }
      } catch (error) {
        console.error("Failed to reload desktop resume after AI tool call:", error);
      }
    },
    [setResume],
  );


  const refreshRuntimeSettings = useCallback(async () => {
    try {
      const [settings, inventory] = await Promise.all([
        getWorkspaceSettingsSnapshot(),
        getSecretInventorySnapshot(),
      ]);

      const provider = settings.ai?.defaultProvider || "openai";
      const providerConfig = settings.ai?.providerConfigs?.[provider];
      const hasApiKey = inventory.entries.some(
        (entry) =>
          entry.key === `provider.${provider}.api_key` && entry.isConfigured,
      );

      const model = providerConfig?.model || "";

      setRuntimeSettings({
        loading: false,
        provider,
        model,
        baseUrl: providerConfig?.baseUrl || "",
        hasApiKey,
      });
      setSelectedModel(model);

      // Fetch models from the provider
      try {
        const modelsResult = await fetchAiModels({
          provider,
          baseUrl: providerConfig?.baseUrl || "",
        });
        setFetchedModelOptions(modelsResult.models);
      } catch {
        setFetchedModelOptions([]);
      }
    } catch {
      setRuntimeSettings({
        loading: false,
        provider: "openai",
        model: "",
        baseUrl: "",
        hasApiKey: false,
      });
      setSelectedModel("");
      setFetchedModelOptions([]);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshRuntimeSettings();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshRuntimeSettings]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshRuntimeSettings();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshRuntimeSettings]);

  useEffect(() => {
    const handleSettingsChanged = () => {
      void refreshRuntimeSettings();
    };

    window.addEventListener("ai-settings-changed", handleSettingsChanged);
    return () => {
      window.removeEventListener("ai-settings-changed", handleSettingsChanged);
    };
  }, [refreshRuntimeSettings]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    streamingToolCallsRef.current = streamingToolCalls;
  }, [streamingToolCalls]);

  useEffect(() => {
    if (!resumeId) {
      return;
    }

    persistSessions(resumeId, sessions);
  }, [resumeId, sessions]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const attach = async () => {
      unlisten = await listenToAiStreamEvents((event: DesktopAiStreamEvent) => {
        if (!requestIdRef.current || event.requestId !== requestIdRef.current) {
          return;
        }

        if (event.kind === "delta_thinking" && event.deltaText) {
          streamingThinkingTextRef.current += event.deltaText;
          setStreamingThinkingText(streamingThinkingTextRef.current);
          return;
        }

        if (event.kind === "tool" && event.toolCall) {
          setStreamingToolCalls((previous) =>
            upsertToolCall(previous, event.toolCall as DesktopAiToolCallPayload),
          );
          return;
        }

        if (event.kind === "completed") {
          const sessionId = activeSessionIdRef.current;
          const toolCalls = streamingToolCallsRef.current;
          const shouldReloadResume = toolCalls.some(
            (toolCall) =>
              toolCall.state === "output-available" &&
              (toolCall.toolName === "updateSection" ||
                toolCall.toolName === "replaceResumeText" ||
                toolCall.toolName === "updateResumeMetadata"),
          );
          if (sessionId) {
            const content = event.accumulatedText || streamingTextRef.current;
            const thinkingContent =
              event.accumulatedThinking ||
              streamingThinkingTextRef.current ||
              undefined;
            setSessions((previous) =>
              orderSessions(
                previous.map((session) =>
                  session.id === sessionId
                    ? {
                        ...session,
                        updatedAt: Date.now(),
                        messages: content.trim() || toolCalls.length > 0
                          ? [
                              ...session.messages,
                              {
                                id: createId("assistant"),
                                role: "assistant",
                                content,
                                thinkingContent,
                                createdAt: Date.now(),
                                toolCalls:
                                  toolCalls.length > 0 ? toolCalls : undefined,
                              },
                            ]
                          : session.messages,
                      }
                    : session,
                ),
              ),
            );
          }

          if (shouldReloadResume) {
            void reloadDocumentIntoStore(resumeId);
          }

          setIsThinking(false);
          setStreamingText("");
          streamingTextRef.current = "";
          setStreamingThinkingText("");
          streamingThinkingTextRef.current = "";
          setStreamingToolCalls([]);
          streamingToolCallsRef.current = [];
          setErrorMessage("");
          requestIdRef.current = null;
          return;
        }

        if (event.kind === "error") {
          const friendly = buildFriendlyError(
            event.errorMessage || genericError,
            genericError,
          );
          setIsThinking(false);
          setStreamingText("");
          streamingTextRef.current = "";
          setStreamingThinkingText("");
          streamingThinkingTextRef.current = "";
          setErrorMessage(friendly);
          requestIdRef.current = null;
          return;
        }

        const nextText = getNextStreamText(event, streamingTextRef.current);

        if (nextText !== null) {
          streamingTextRef.current = nextText;
          setStreamingText(nextText);
        }
      });
    };

    void attach();

    return () => {
      unlisten?.();
    };
  }, [genericError, reloadDocumentIntoStore, resumeId]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !isNearBottomRef.current) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [activeSession?.messages, errorMessage, isThinking, streamingText, streamingToolCalls]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      const distanceToBottom =
        element.scrollHeight - element.scrollTop - element.clientHeight;
      isNearBottomRef.current = distanceToBottom < 80;
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (aiChatInitialPrompt) {
      queueMicrotask(() => {
        setInput(aiChatInitialPrompt);
      });
    }
  }, [aiChatInitialPrompt]);

  const createNewSession = useCallback(() => {
    const session = createSession(newChatLabel);
    setSessions((previous) => [session, ...previous]);
    setActiveSessionId(session.id);
    setHistoryOpen(false);
    setInput("");
    setIsThinking(false);
    setStreamingText("");
    streamingTextRef.current = "";
    setStreamingThinkingText("");
    streamingThinkingTextRef.current = "";
    setStreamingToolCalls([]);
    streamingToolCallsRef.current = [];
    setErrorMessage("");
    requestIdRef.current = null;
  }, [newChatLabel]);

  const deleteSession = useCallback(
    (sessionId: string) => {
      const remaining = orderSessions(
        sessions.filter((session) => session.id !== sessionId),
      );

      if (remaining.length === 0) {
        const replacement = createSession(newChatLabel);
        setSessions([replacement]);
        setActiveSessionId(replacement.id);
      } else {
        setSessions(remaining);
        if (activeSessionId === sessionId) {
          setActiveSessionId(remaining[0].id);
        }
      }

      if (activeSessionId === sessionId) {
        requestIdRef.current = null;
        setIsThinking(false);
        setStreamingText("");
        streamingTextRef.current = "";
        setStreamingThinkingText("");
        streamingThinkingTextRef.current = "";
        setStreamingToolCalls([]);
        streamingToolCallsRef.current = [];
        setErrorMessage("");
      }

      setHistoryOpen(false);
    },
    [activeSessionId, newChatLabel, sessions],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const prompt = input.trim();
      if (!prompt || isThinking) {
        return;
      }

      if (!runtimeSettings.hasApiKey) {
        setErrorMessage(apiKeyMissingHint);
        return;
      }

      let sessionId = activeSession?.id;
      if (!sessionId) {
        const freshSession = createSession(newChatLabel);
        sessionId = freshSession.id;
        setSessions([freshSession]);
        setActiveSessionId(freshSession.id);
      }

      const nextTitle =
        activeSession && activeSession.messages.length > 0
          ? activeSession.title
          : toSessionTitle(prompt, newChatLabel);

      setSessions((previous) =>
        orderSessions(
          previous.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  title: nextTitle,
                  updatedAt: Date.now(),
                  messages: [
                    ...session.messages,
                    {
                      id: createId("user"),
                      role: "user",
                      content: prompt,
                      createdAt: Date.now(),
                    },
                  ],
                }
              : session,
          ),
        ),
      );

      setInput("");
      setHistoryOpen(false);
      setErrorMessage("");
      setIsThinking(true);
      setStreamingText("");
      streamingTextRef.current = "";
      setStreamingThinkingText("");
      streamingThinkingTextRef.current = "";
      setStreamingToolCalls([]);
      streamingToolCallsRef.current = [];

      const requestId = createId("desktop-chat");
      requestIdRef.current = requestId;

      if (isDirty) {
        await save();
      }

      const resumeContext = {
        title: currentResume?.title || "",
        language: currentResume?.language || "",
        template: currentResume?.template || "",
        targetJobTitle: currentResume?.targetJobTitle || "",
        targetCompany: currentResume?.targetCompany || "",
        sections: sections.map((section) => ({
          id: section.id,
          type: section.type,
          title: section.title,
          sortOrder: section.sortOrder,
          visible: section.visible,
          content: section.content,
        })),
      };
      const conversation = buildConversationHistory(activeSession?.messages ?? []);
      const systemPrompt = buildResumeEditSystemPrompt(
        sections.map((section) => ({
          id: section.id,
          type: section.type,
          title: section.title,
        })),
      );

      try {
        await startAiPromptStream({
          provider: runtimeSettings.provider,
          documentId: currentResume?.id || resumeId,
          model: selectedModel || runtimeSettings.model,
          baseUrl: runtimeSettings.baseUrl || undefined,
          requestId,
          systemPrompt,
          prompt: `${prompt}\n\nResume context:\n${JSON.stringify(
            resumeContext,
            null,
            2,
          )}`,
          conversation,
          thinkingEnabled,
        });
      } catch (error) {
        setIsThinking(false);
        setStreamingText("");
        streamingTextRef.current = "";
        setStreamingThinkingText("");
        streamingThinkingTextRef.current = "";
        setErrorMessage(
          buildFriendlyError(
            error instanceof Error ? error.message : String(error),
            genericError,
          ),
        );
        requestIdRef.current = null;
      }
    },
    [
      activeSession,
      apiKeyMissingHint,
      currentResume,
      genericError,
      input,
      isThinking,
      newChatLabel,
      runtimeSettings.baseUrl,
      runtimeSettings.hasApiKey,
      runtimeSettings.model,
      runtimeSettings.provider,
      save,
      sections,
      selectedModel,
      isDirty,
      resumeId,
      thinkingEnabled,
    ],
  );

  return (
    <>
      {/* Header bar */}
      <div
        className={`flex items-center ${
          hideTitle ? "justify-end" : "justify-between"
        } border-b px-4 py-3`}
      >
        {!hideTitle && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {panelTitle}
            </h3>
          </div>
        )}
        <div className="flex items-center gap-1">
          {/* Thinking toggle */}
          <button
            type="button"
            onClick={() => setThinkingEnabled((prev) => !prev)}
            className={`h-7 w-7 cursor-pointer rounded-md flex items-center justify-center transition-colors ${
              thinkingEnabled
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
            title={thinkingToggleLabel}
          >
            <Brain className="h-4 w-4" />
          </button>
          {/* History popover */}
          <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 cursor-pointer p-0"
              >
                <Clock className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0" sideOffset={8}>
              <div className="max-h-80 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="group flex cursor-pointer items-start gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setHistoryOpen(false);
                      // 清除流式状态，避免切换 session 后显示残留内容
                      setIsThinking(false);
                      setStreamingText("");
                      streamingTextRef.current = "";
                      setStreamingToolCalls([]);
                      streamingToolCallsRef.current = [];
                      setErrorMessage("");
                      requestIdRef.current = null;
                    }}
                  >
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
                        {session.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {formatTime(session.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-0.5 hidden shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 group-hover:block dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteSession(session.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                    {defaultGreeting}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 cursor-pointer p-0"
            onClick={createNewSession}
            title={newChatLabel}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {!runtimeSettings.hasApiKey && (
            <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-[13px] font-medium">
                  {apiKeyMissingTitle}
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-amber-600 dark:text-amber-400/90">
                {apiKeyMissingHint}
              </p>
            </div>
          )}

          {activeSession && activeSession.messages.length === 0 && (
            <div className="rounded-xl bg-zinc-100 p-3 text-[13px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {defaultGreeting}
            </div>
          )}

          {activeSession?.messages.map((message) => {
            const isUser = message.role === "user";
            const parsedAssistantContent = isUser
              ? null
              : parseReasoningContent(message.content);
            return (
              <div
                key={message.id}
                className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    isUser
                      ? "bg-zinc-700"
                      : message.error
                        ? "bg-red-500"
                        : "bg-blue-600 dark:bg-blue-500"
                  }`}
                >
                  {isUser ? (
                    <User className="h-3 w-3 text-white" />
                  ) : (
                    <Bot className="h-3 w-3 text-white" />
                  )}
                </div>
                <div
                  className={`min-w-0 max-w-[calc(100%-2.5rem)] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                    isUser
                      ? "bg-zinc-800 text-white"
                      : message.error
                        ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300"
                        : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800/80"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="space-y-2">
                      {message.toolCalls?.map((toolCall) => (
                        <ToolExecutionCard
                          key={toolCall.toolCallId}
                          toolName={toolCall.toolName}
                          state={toolCall.state}
                          input={toolCall.input}
                          output={toolCall.output}
                          errorText={toolCall.errorText || undefined}
                          callingLabel={toolCallingLabel}
                          resultLabel={toolResultLabel}
                          resultErrorLabel={toolCallErrorLabel}
                        />
                      ))}
                      {message.thinkingContent ? (
                        <ReasoningBlock
                          label={reasoningLabel}
                          content={message.thinkingContent}
                        />
                      ) : parsedAssistantContent?.reasoningText ? (
                        <ReasoningBlock
                          label={reasoningLabel}
                          content={parsedAssistantContent.reasoningText}
                        />
                      ) : null}
                      {parsedAssistantContent?.answerText ? (
                        <MarkdownWithCopy
                          content={parsedAssistantContent.answerText}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(streamingToolCalls.length > 0 || streamingText) && (
            <div className="flex gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="min-w-0 max-w-[calc(100%-2.5rem)] rounded-2xl bg-zinc-50 px-3 py-2 text-[13px] leading-relaxed text-zinc-700 ring-1 ring-zinc-200/60 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-800/80">
                <div className="space-y-2">
                  {streamingToolCalls.map((toolCall) => (
                    <ToolExecutionCard
                      key={toolCall.toolCallId}
                      toolName={toolCall.toolName}
                      state={toolCall.state}
                      input={toolCall.input}
                      output={toolCall.output}
                      errorText={toolCall.errorText || undefined}
                      callingLabel={toolCallingLabel}
                      resultLabel={toolResultLabel}
                      resultErrorLabel={toolCallErrorLabel}
                    />
                  ))}
                  {streamingThinkingText ? (
                    <ReasoningBlock
                      label={reasoningLabel}
                      content={streamingThinkingText}
                    />
                  ) : parsedStreamingContent.reasoningText ? (
                    <ReasoningBlock
                      label={reasoningLabel}
                      content={parsedStreamingContent.reasoningText}
                    />
                  ) : null}
                  {parsedStreamingContent.answerText ? (
                    <MarkdownWithCopy
                      content={parsedStreamingContent.answerText}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {isThinking && !streamingText && streamingToolCalls.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-700 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-700 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-700 [animation-delay:300ms]" />
              </span>
              {thinkingLabel}
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-600 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 transition-colors focus-within:border-zinc-300 focus-within:bg-white dark:border-zinc-800 dark:bg-zinc-900/60 dark:focus-within:border-zinc-700 dark:focus-within:bg-zinc-900">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            rows={2}
            disabled={
              isThinking ||
              runtimeSettings.loading ||
              !runtimeSettings.hasApiKey
            }
            className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />

          <div className="flex items-center justify-between px-3 pb-2.5">
            <div>
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={runtimeSettings.loading || isThinking}
              >
                <SelectTrigger className="h-7 max-w-[180px] gap-1 rounded-full border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-600 shadow-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  <span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((model) => (
                    <SelectItem key={model} value={model} className="text-xs">
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="submit"
              disabled={
                isThinking ||
                runtimeSettings.loading ||
                !runtimeSettings.hasApiKey ||
                !input.trim()
              }
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 [&:not(:disabled)]:bg-zinc-700 [&:not(:disabled)]:text-white [&:not(:disabled)]:bg-zinc-700 hover:bg-zinc-600 dark:[&:not(:disabled)]:bg-zinc-700 dark:[&:not(:disabled)]:text-white dark:[&:not(:disabled)]:bg-zinc-700 hover:bg-zinc-600"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

export function AIChatPanel({ resumeId }: AIChatPanelProps) {
  const { toggleAiChat } = useEditorStore();

  return (
    <div className="relative flex w-80 shrink-0 flex-col overflow-hidden border-l bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <AIChatContent key={resumeId} resumeId={resumeId} />
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 h-7 w-7 cursor-pointer p-0"
        onClick={() => toggleAiChat()}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
