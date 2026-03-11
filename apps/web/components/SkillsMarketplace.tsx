"use client";

import { useCallback, useMemo, useState } from "react";
import type { Agent, Skill, SkillCategory, SkillRegistryEntry } from "@/lib/types";

const CATEGORIES: { value: SkillCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "coding", label: "Coding" },
  { value: "research", label: "Research" },
  { value: "writing", label: "Writing" },
  { value: "data", label: "Data" },
  { value: "communication", label: "Communication" },
  { value: "automation", label: "Automation" },
  { value: "other", label: "Other" },
];

const ICON_MAP: Record<string, string> = {
  code: "💻",
  "code-2": "🖥️",
  search: "🔍",
  zap: "⚡",
  pen: "✏️",
  "file-text": "📄",
  database: "🗄️",
  mail: "📧",
  bot: "🤖",
  terminal: "🖥️",
  globe: "🌐",
  shield: "🛡️",
  wrench: "🔧",
  brain: "🧠",
};

function getIconEmoji(iconKey: string): string {
  return ICON_MAP[iconKey] ?? "⚡";
}

interface Props {
  initialSkills: Skill[];
  initialAgents: Agent[];
  initialRegistry: SkillRegistryEntry[];
}

type TabMode = "catalog" | "agent";

export function SkillsMarketplace({ initialSkills, initialAgents, initialRegistry }: Props) {
  const [skills, setSkills] = useState(initialSkills);
  const [agents] = useState(initialAgents);
  const [registry] = useState(initialRegistry);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<TabMode>("catalog");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentSkillMap, setAgentSkillMap] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const agent of initialAgents) {
      map[agent.id] = agent.skills ?? [];
    }
    return map;
  });
  const [syncing, setSyncing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredSkills = useMemo(() => {
    let result = skills;
    if (categoryFilter !== "all") {
      result = result.filter((s) => s.category === categoryFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [skills, categoryFilter, searchQuery]);

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedSkillId) ?? null,
    [skills, selectedSkillId],
  );

  const agentsWithSkill = useMemo(() => {
    if (!selectedSkill) return [];
    return agents.filter((a) => (agentSkillMap[a.id] ?? []).includes(selectedSkill.name));
  }, [selectedSkill, agents, agentSkillMap]);

  const selectedAgentSkills = useMemo(() => {
    if (!selectedAgentId) return [];
    return agentSkillMap[selectedAgentId] ?? [];
  }, [selectedAgentId, agentSkillMap]);

  const refreshSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills);
      }
    } catch {
      // best-effort
    }
  }, []);

  function showError(msg: string) {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  }

  async function handleSync() {
    setSyncing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/skills/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const newMap = { ...agentSkillMap };
        for (const item of data.synced) {
          newMap[item.agentId] = item.skills;
        }
        setAgentSkillMap(newMap);
        await refreshSkills();
      } else {
        showError(`동기화 실패: ${res.status}`);
      }
    } catch (error) {
      showError(`동기화 오류: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleInstall(agentId: string, skillName: string) {
    setActionInProgress(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName }),
      });
      if (res.ok) {
        setAgentSkillMap((prev) => ({
          ...prev,
          [agentId]: [...(prev[agentId] ?? []), skillName],
        }));
        await refreshSkills();
      } else {
        showError(`설치 실패: ${res.status}`);
      }
    } catch (error) {
      showError(`설치 오류: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleRemove(agentId: string, skillName: string) {
    setActionInProgress(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/skills/${encodeURIComponent(skillName)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAgentSkillMap((prev) => ({
          ...prev,
          [agentId]: (prev[agentId] ?? []).filter((s) => s !== skillName),
        }));
        await refreshSkills();
      } else {
        showError(`제거 실패: ${res.status}`);
      }
    } catch (error) {
      showError(`제거 오류: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setActionInProgress(false);
    }
  }

  return (
    <section className="space-y-3">
      {errorMessage && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-destructive-border)] bg-[var(--color-destructive-bg)] px-4 py-2 text-sm text-[var(--color-destructive-text)]">
          {errorMessage}
        </div>
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.5fr)]">
      {/* 왼쪽: 카탈로그 패널 */}
      <article className="vulcan-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Skill Catalog</h2>
          <button
            type="button"
            className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>

        <input
          type="text"
          placeholder="스킬 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="vulcan-input mb-3 w-full"
        />

        <div className="mb-3 flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              aria-pressed={categoryFilter === cat.value}
              className={`vulcan-chip cursor-pointer text-[11px] transition-colors ${
                categoryFilter === cat.value
                  ? "bg-[var(--color-primary)] text-white"
                  : ""
              }`}
              onClick={() => setCategoryFilter(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="space-y-1 overflow-y-auto lg:max-h-[calc(100vh-320px)]">
          {filteredSkills.length === 0 && (
            <p className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              {skills.length === 0 ? "Sync를 클릭하여 스킬을 가져오세요" : "검색 결과 없음"}
            </p>
          )}
          {filteredSkills.map((skill) => (
            <button
              key={skill.id}
              type="button"
              className={`flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--color-surface-elevated)] ${
                selectedSkillId === skill.id ? "bg-[var(--color-surface-elevated)] ring-1 ring-[var(--color-primary)]" : ""
              }`}
              onClick={() => setSelectedSkillId(skill.id)}
            >
              <span className="text-base">{getIconEmoji(skill.iconKey)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{skill.displayName || skill.name}</p>
                <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
                  {skill.category} · {skill.name}
                </p>
              </div>
              {skill.isBuiltin && (
                <span className="vulcan-chip text-[10px]">builtin</span>
              )}
            </button>
          ))}
        </div>

        {registry.length > 0 && (
          <div className="mt-3 border-t border-[var(--color-border)] pt-3">
            <p className="mb-1 text-[11px] font-semibold text-[var(--color-tertiary)]">
              Registry ({registry.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {registry.map((entry) => (
                <span key={entry.id} className="vulcan-chip text-[10px]">
                  {entry.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* 오른쪽: 상세 패널 */}
      <article className="vulcan-card p-4">
        <div className="mb-3 flex gap-1">
          <button
            type="button"
            className={`rounded-[var(--radius-control)] px-3 py-1 text-xs font-medium transition-colors ${
              tab === "catalog"
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
            onClick={() => setTab("catalog")}
          >
            Catalog
          </button>
          <button
            type="button"
            className={`rounded-[var(--radius-control)] px-3 py-1 text-xs font-medium transition-colors ${
              tab === "agent"
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
            onClick={() => setTab("agent")}
          >
            Per Agent
          </button>
        </div>

        {tab === "catalog" && (
          <CatalogTab
            skill={selectedSkill}
            agentsWithSkill={agentsWithSkill}
            allAgents={agents}
            agentSkillMap={agentSkillMap}
            actionInProgress={actionInProgress}
            onInstall={handleInstall}
            onRemove={handleRemove}
          />
        )}

        {tab === "agent" && (
          <AgentTab
            agents={agents}
            selectedAgentId={selectedAgentId}
            selectedAgentSkills={selectedAgentSkills}
            skills={skills}
            actionInProgress={actionInProgress}
            onSelectAgent={setSelectedAgentId}
            onInstall={handleInstall}
            onRemove={handleRemove}
          />
        )}
      </article>
      </div>
    </section>
  );
}

function CatalogTab({
  skill,
  agentsWithSkill,
  allAgents,
  agentSkillMap,
  actionInProgress,
  onInstall,
  onRemove,
}: {
  skill: Skill | null;
  agentsWithSkill: Agent[];
  allAgents: Agent[];
  agentSkillMap: Record<string, string[]>;
  actionInProgress: boolean;
  onInstall: (agentId: string, skillName: string) => void;
  onRemove: (agentId: string, skillName: string) => void;
}) {
  if (!skill) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-[var(--color-muted-foreground)]">
        왼쪽에서 스킬을 선택하세요
      </div>
    );
  }

  const agentsWithout = allAgents.filter(
    (a) => a.isActive && !(agentSkillMap[a.id] ?? []).includes(skill.name),
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getIconEmoji(skill.iconKey)}</span>
          <div>
            <h3 className="text-lg font-semibold">{skill.displayName || skill.name}</h3>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {skill.category} · {skill.name}
            </p>
          </div>
        </div>
        {skill.description && (
          <p className="mt-2 text-sm text-[var(--color-secondary)]">{skill.description}</p>
        )}
        {skill.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {skill.tags.map((tag) => (
              <span key={tag} className="vulcan-chip text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">
          설치된 에이전트 ({agentsWithSkill.length})
        </h4>
        {agentsWithSkill.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            이 스킬이 설치된 에이전트가 없습니다
          </p>
        ) : (
          <div className="space-y-1">
            {agentsWithSkill.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2"
              >
                <span className="text-sm">{agent.name}</span>
                <button
                  type="button"
                  className="rounded-[var(--radius-control)] px-2 py-0.5 text-[11px] text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)] disabled:opacity-50"
                  onClick={() => onRemove(agent.id, skill.name)}
                  disabled={actionInProgress}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {agentsWithout.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">설치 가능한 에이전트</h4>
          <div className="space-y-1">
            {agentsWithout.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2"
              >
                <span className="text-sm">{agent.name}</span>
                <button
                  type="button"
                  className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-2 py-0.5 text-[11px] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                  onClick={() => onInstall(agent.id, skill.name)}
                  disabled={actionInProgress}
                >
                  Install
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentTab({
  agents,
  selectedAgentId,
  selectedAgentSkills,
  skills,
  actionInProgress,
  onSelectAgent,
  onInstall,
  onRemove,
}: {
  agents: Agent[];
  selectedAgentId: string | null;
  selectedAgentSkills: string[];
  skills: Skill[];
  actionInProgress: boolean;
  onSelectAgent: (id: string | null) => void;
  onInstall: (agentId: string, skillName: string) => void;
  onRemove: (agentId: string, skillName: string) => void;
}) {
  const activeAgents = agents.filter((a) => a.isActive);
  const availableSkills = skills.filter((s) => !selectedAgentSkills.includes(s.name));

  return (
    <div className="space-y-4">
      <select
        className="vulcan-input w-full"
        value={selectedAgentId ?? ""}
        onChange={(e) => onSelectAgent(e.target.value || null)}
      >
        <option value="">에이전트 선택...</option>
        {activeAgents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>

      {selectedAgentId && (
        <>
          <div>
            <h4 className="mb-2 text-sm font-semibold">
              설치된 스킬 ({selectedAgentSkills.length})
            </h4>
            {selectedAgentSkills.length === 0 ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                설치된 스킬이 없습니다
              </p>
            ) : (
              <div className="space-y-1">
                {selectedAgentSkills.map((skillName) => {
                  const skill = skills.find((s) => s.name === skillName);
                  return (
                    <div
                      key={skillName}
                      className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span>{getIconEmoji(skill?.iconKey ?? "zap")}</span>
                        <span className="text-sm">{skill?.displayName ?? skillName}</span>
                      </div>
                      <button
                        type="button"
                        className="rounded-[var(--radius-control)] px-2 py-0.5 text-[11px] text-[var(--color-destructive-text)] transition-colors hover:bg-[var(--color-destructive-bg)] disabled:opacity-50"
                        onClick={() => onRemove(selectedAgentId, skillName)}
                        disabled={actionInProgress}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {availableSkills.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">추가 가능한 스킬</h4>
              <div className="space-y-1">
                {availableSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span>{getIconEmoji(skill.iconKey)}</span>
                      <div>
                        <span className="text-sm">{skill.displayName || skill.name}</span>
                        <span className="ml-2 text-[10px] text-[var(--color-muted-foreground)]">
                          {skill.category}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-[var(--radius-control)] bg-[var(--color-primary)] px-2 py-0.5 text-[11px] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                      onClick={() => onInstall(selectedAgentId, skill.name)}
                      disabled={actionInProgress}
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
