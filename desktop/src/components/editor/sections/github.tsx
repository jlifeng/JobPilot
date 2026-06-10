import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, RefreshCw, Star, Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EditableText } from "../fields/editable-text";
import { EditableRichText } from "../fields/editable-rich-text";
import { generateId } from "../../../stores/resume-store";
import type { ResumeSection, GitHubContent, GitHubRepoItem } from "../../../types/resume";

const GITHUB_REPO_RE = /github\.com\/[^/]+\/[^/]+/;

interface Props {
  section: ResumeSection;
  onUpdate: (content: Partial<GitHubContent>) => void;
}

async function fetchGitHubRepo(url: string): Promise<{
  name: string;
  stars: number;
  language: string;
  description: string;
} | null> {
  try {
    // Extract owner/repo from URL
    const match = url.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!match) return null;
    const [, owner, repo] = match;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name || "",
      stars: data.stargazers_count || 0,
      language: data.language || "",
      description: data.description || "",
    };
  } catch {
    return null;
  }
}

export function GitHubSection({ section, onUpdate }: Props) {
  const { t } = useTranslation();
  const content = section.content as GitHubContent;
  const items = content.items || [];
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  // Keep a ref to always access the latest items, avoiding stale closures in setTimeout
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const addItem = () => {
    const newItem: GitHubRepoItem = {
      id: generateId(),
      repoUrl: "",
      name: "",
      stars: 0,
      language: "",
      description: "",
    };
    onUpdate({ items: [...items, newItem] } as any);
  };

  const updateItem = (index: number, data: Partial<GitHubRepoItem>) => {
    const latest = itemsRef.current;
    const updated = latest.map((item, i) =>
      i === index ? { ...item, ...data } : item
    );
    onUpdate({ items: updated } as any);
  };

  const removeItem = (index: number) => {
    const item = items[index];
    const timer = debounceTimers.current.get(item.id);
    if (timer) clearTimeout(timer);
    debounceTimers.current.delete(item.id);
    onUpdate({ items: items.filter((_, i) => i !== index) } as any);
  };

  const fetchRepo = async (index: number, url: string) => {
    const latest = itemsRef.current;
    const item = latest[index];
    if (!item) return;
    setLoadingIds((prev) => new Set(prev).add(item.id));
    try {
      const data = await fetchGitHubRepo(url);
      if (data) {
        updateItem(index, {
          name: data.name,
          stars: data.stars,
          language: data.language,
          description: data.description,
        });
      }
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const item = items[index];
    updateItem(index, { repoUrl: value });

    const prev = debounceTimers.current.get(item.id);
    if (prev) clearTimeout(prev);

    if (GITHUB_REPO_RE.test(value)) {
      const timer = setTimeout(() => {
        debounceTimers.current.delete(item.id);
        fetchRepo(index, value);
      }, 600);
      debounceTimers.current.set(item.id, timer);
    }
  };

  // Auto-refresh stars for all repos on mount
  const didAutoRefresh = useRef(false);
  useEffect(() => {
    if (didAutoRefresh.current) return;
    didAutoRefresh.current = true;
    const current = itemsRef.current;
    current.forEach((item, index) => {
      if (item.repoUrl && GITHUB_REPO_RE.test(item.repoUrl)) {
        fetchGitHubRepo(item.repoUrl)
          .then((data) => {
            if (data) updateItem(index, { stars: data.stars });
          })
          .catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id || `gh-${index}`}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">
                #{index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 cursor-pointer p-1 text-zinc-400 hover:text-red-500"
                onClick={() => removeItem(index)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative">
              <EditableText
                label={t("editor.fields.repoUrl")}
                value={item.repoUrl}
                onChange={(v) => handleUrlChange(index, v)}
              />
              {loadingIds.has(item.id) && (
                <Loader2 className="absolute right-2 top-7 h-4 w-4 animate-spin text-zinc-400" />
              )}
            </div>
            <EditableText
              label={t("editor.fields.repoName")}
              value={item.name}
              onChange={(v) => updateItem(index, { name: v })}
            />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <input
                  type="number"
                  min={0}
                  value={item.stars}
                  onChange={(e) => updateItem(index, { stars: parseInt(e.target.value, 10) || 0 })}
                  className="w-20 rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                />
              </div>
              {item.language && (
                <span className="inline-flex items-center gap-0.5 text-xs text-zinc-500">
                  <Code2 className="h-3 w-3" />
                  {item.language}
                </span>
              )}
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                onClick={() => fetchRepo(index, item.repoUrl)}
                disabled={loadingIds.has(item.id)}
              >
                <RefreshCw
                  className={`h-3 w-3 ${loadingIds.has(item.id) ? "animate-spin" : ""}`}
                />
              </button>
            </div>
            <EditableRichText
              label={t("editor.fields.description")}
              value={item.description}
              onChange={(v) => updateItem(index, { description: v })}
            />
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full cursor-pointer gap-1"
      >
        <Plus className="h-3.5 w-3.5" />
        {t("editor.fields.addItem")}
      </Button>
    </div>
  );
}
