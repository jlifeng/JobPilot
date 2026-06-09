import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, MessageSquare, Minus } from "lucide-react";
import {
  getSecretInventorySnapshot,
  getWorkspaceSettingsSnapshot,
} from "../../lib/desktop-api";
import { useEditorStore } from "../../stores/editor-store";
import { AIChatContent } from "./ai-chat-panel";

interface AIChatBubbleProps {
  resumeId: string;
}

const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 620;
const BUBBLE_SIZE = 56;
const GAP = 12;
const MARGIN = 8;

function calcWindowPosition(bubbleRight: number, bubbleBottom: number): {
  left: number;
  top: number;
} {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const bubbleLeft = viewportWidth - bubbleRight - BUBBLE_SIZE;
  const bubbleTop = viewportHeight - bubbleBottom - BUBBLE_SIZE;

  let left = bubbleLeft + BUBBLE_SIZE - WINDOW_WIDTH;
  let top = bubbleTop - GAP - WINDOW_HEIGHT;

  if (top < MARGIN) {
    top = bubbleTop + BUBBLE_SIZE + GAP;
  }

  if (top + WINDOW_HEIGHT > viewportHeight - MARGIN) {
    top = viewportHeight - WINDOW_HEIGHT - MARGIN;
  }

  if (left < MARGIN) {
    left = MARGIN;
  }

  if (left + WINDOW_WIDTH > viewportWidth - MARGIN) {
    left = viewportWidth - WINDOW_WIDTH - MARGIN;
  }

  return { left, top };
}

export function AIChatBubble({ resumeId }: AIChatBubbleProps) {
  const { t } = useTranslation();
  const { showAiChat, toggleAiChat } = useEditorStore();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [bubblePos, setBubblePos] = useState({ x: 24, y: 24 });
  const [windowPos, setWindowPos] = useState<{ left: number; top: number } | null>(
    null,
  );

  const bubbleDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const windowDragRef = useRef<{
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    originBubbleX: number;
    originBubbleY: number;
  } | null>(null);
  const didDragRef = useRef(false);

  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t],
  );

  const autoWindowPos = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: 100, top: 100 };
    }

    return calcWindowPosition(bubblePos.x, bubblePos.y);
  }, [bubblePos.x, bubblePos.y]);

  const resolvedWindowPos = windowPos ?? autoWindowPos;

  const refreshRuntimeStatus = useCallback(async () => {
    try {
      const [settings, inventory] = await Promise.all([
        getWorkspaceSettingsSnapshot(),
        getSecretInventorySnapshot(),
      ]);

      const provider = settings.ai?.defaultProvider || "openai";
      setHasApiKey(
        inventory.entries.some(
          (entry) =>
            entry.key === `provider.${provider}.api_key` && entry.isConfigured,
        ),
      );
    } catch {
      setHasApiKey(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshRuntimeStatus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshRuntimeStatus]);

  useEffect(() => {
    if (!showAiChat) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshRuntimeStatus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshRuntimeStatus, showAiChat]);

  const handleBubbleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      didDragRef.current = false;
      bubbleDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: bubblePos.x,
        originY: bubblePos.y,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!bubbleDragRef.current) {
          return;
        }

        const deltaX = moveEvent.clientX - bubbleDragRef.current.startX;
        const deltaY = moveEvent.clientY - bubbleDragRef.current.startY;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
          didDragRef.current = true;
        }

        setBubblePos({
          x: Math.max(0, bubbleDragRef.current.originX - deltaX),
          y: Math.max(0, bubbleDragRef.current.originY - deltaY),
        });
      };

      const handleMouseUp = () => {
        bubbleDragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        setWindowPos(null);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [bubblePos.x, bubblePos.y],
  );

  const handleWindowMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      windowDragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originLeft: resolvedWindowPos.left,
        originTop: resolvedWindowPos.top,
        originBubbleX: bubblePos.x,
        originBubbleY: bubblePos.y,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!windowDragRef.current) {
          return;
        }

        const deltaX = moveEvent.clientX - windowDragRef.current.startX;
        const deltaY = moveEvent.clientY - windowDragRef.current.startY;

        setWindowPos({
          left: windowDragRef.current.originLeft + deltaX,
          top: windowDragRef.current.originTop + deltaY,
        });
        setBubblePos({
          x: Math.max(0, windowDragRef.current.originBubbleX - deltaX),
          y: Math.max(0, windowDragRef.current.originBubbleY - deltaY),
        });
      };

      const handleMouseUp = () => {
        windowDragRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [bubblePos.x, bubblePos.y, resolvedWindowPos.left, resolvedWindowPos.top],
  );

  const handleBubbleClick = useCallback(() => {
    if (!didDragRef.current) {
      toggleAiChat();
    }
  }, [toggleAiChat]);

  const panelTitle = translate("ai.panelTitle", "AI Assistant");
  const bubbleTooltip = hasApiKey
    ? translate("ai.bubbleTooltip", "Chat with AI Assistant")
    : translate(
        "ai.apiKeyMissingBubble",
        "API Key not configured. Go to Settings.",
      );

  return (
    <>
      <div
        className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl transition-opacity duration-200 dark:border-zinc-800 dark:bg-zinc-950"
        style={{
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
          left: resolvedWindowPos.left,
          top: resolvedWindowPos.top,
          opacity: showAiChat ? 1 : 0,
          pointerEvents: showAiChat ? "auto" : "none",
        }}
      >
        <div
          className="flex cursor-move items-center justify-between bg-blue-600 px-4 py-2.5 dark:bg-blue-500"
          onMouseDown={handleWindowMouseDown}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">{panelTitle}</span>
          </div>
          <button
            type="button"
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            onClick={toggleAiChat}
            title={translate("close", "Close")}
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <AIChatContent key={resumeId} resumeId={resumeId} hideTitle />
        </div>
      </div>

      <div
        className="fixed z-50"
        style={{ right: bubblePos.x, bottom: bubblePos.y }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {showTooltip && !showAiChat ? (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white shadow-lg">
            {bubbleTooltip}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-800" />
          </div>
        ) : null}

        <button
          type="button"
          data-tour="ai-chat"
          className="relative flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 active:cursor-grabbing active:scale-95 dark:bg-blue-500 dark:text-white"
          onMouseDown={handleBubbleMouseDown}
          onClick={handleBubbleClick}
          title={bubbleTooltip}
        >
          <MessageSquare className="h-6 w-6" />
          {!hasApiKey ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 shadow-sm">
              <AlertTriangle className="h-3 w-3 text-amber-900" />
            </span>
          ) : null}
        </button>
      </div>
    </>
  );
}
