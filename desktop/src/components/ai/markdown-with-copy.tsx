import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownWithCopyProps {
  content: string;
}

/**
 * Markdown 渲染组件，带复制按钮
 * - hover 时显示复制按钮
 * - 点击后显示成功状态 2 秒
 */
export function MarkdownWithCopy({ content }: MarkdownWithCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 不可用时静默失败
    }
  };

  return (
    <div className="group relative">
      <div className="ai-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-0 top-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded bg-zinc-100 opacity-0 transition-opacity hover:bg-zinc-200 group-hover:opacity-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        )}
      </button>
    </div>
  );
}
