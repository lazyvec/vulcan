# Claude HUD 설치 및 커스텀 설정 가이드

마스터 서버와 동일한 HUD 환경을 구성하는 지시문.
Claude Code에 아래 내용을 그대로 붙여넣어 실행할 것.

---

## 전달할 지시문 (복붙용)

```
아래 순서대로 HUD를 설정해줘. 중간에 확인 없이 순서대로 전부 실행해.

---

## 0단계: 경로 확인

먼저 아래를 확인해:
- HUD 플러그인 경로: ~/.claude/plugins/marketplaces/claude-hud/
- 해당 경로 없으면 claude-hud 플러그인이 미설치 상태 → /claude-hud:setup 먼저 실행 필요

---

## 1단계: 수정된 dist 파일 5개 덮어쓰기

PLUGIN_DIR="$HOME/.claude/plugins/marketplaces/claude-hud/dist"

### $PLUGIN_DIR/render/colors.js

export const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const CLAUDE_CORAL = '\x1b[38;5;209m';
const CLAUDE_AMBER = '\x1b[38;5;214m';
export function green(text) { return `${GREEN}${text}${RESET}`; }
export function yellow(text) { return `${YELLOW}${text}${RESET}`; }
export function red(text) { return `${RED}${text}${RESET}`; }
export function cyan(text) { return `${CYAN}${text}${RESET}`; }
export function magenta(text) { return `${MAGENTA}${text}${RESET}`; }
export function dim(text) { return `${DIM}${text}${RESET}`; }
export function getContextColor(percent) {
    if (percent >= 85) return RED;
    if (percent >= 70) return YELLOW;
    return GREEN;
}
export function getQuotaColor(percent) {
    if (percent >= 90) return RED;
    if (percent >= 75) return YELLOW;
    return GREEN;
}
export function quotaBar(percent, width = 6) {
    const safeWidth = Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0;
    const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    const filled = Math.round((safePercent / 100) * safeWidth);
    const empty = safeWidth - filled;
    const color = getQuotaColor(safePercent);
    return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}
export function coloredBar(percent, width = 6) {
    const safeWidth = Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0;
    const safePercent = Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
    const filled = Math.round((safePercent / 100) * safeWidth);
    const empty = safeWidth - filled;
    const color = getContextColor(safePercent);
    return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}
//# sourceMappingURL=colors.js.map


### $PLUGIN_DIR/render/lines/project.js

import { getModelName, getProviderLabel } from '../../stdin.js';
import { cyan, magenta, yellow, green, dim } from '../colors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
function readAccountLabel(customLabel) {
    if (customLabel) return customLabel;
    try {
        const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
        const claudeJson = path.join(configDir, '.claude.json');
        if (!fs.existsSync(claudeJson)) return null;
        const d = JSON.parse(fs.readFileSync(claudeJson, 'utf8'));
        const acc = d.oauthAccount;
        if (!acc) return null;
        const name = acc.displayName || acc.emailAddress?.split('@')[0];
        const org = acc.organizationName && !acc.organizationName.includes('@')
            ? acc.organizationName : null;
        return org ? `${name} (${org})` : name;
    } catch { return null; }
}
export function renderProjectLine(ctx) {
    const display = ctx.config?.display;
    const parts = [];
    const accountLabel = readAccountLabel(ctx.config?.accountLabel);
    const providerLabel = getProviderLabel(ctx.stdin);
    const planName = display?.showUsage !== false ? ctx.usageData?.planName : undefined;
    const planDisplay = providerLabel ?? planName;
    if (accountLabel) {
        const planPart = planDisplay ? ` ${dim('·')} ${dim(planDisplay)}` : '';
        parts.push(`👤 ${dim(accountLabel)}${planPart}`);
    }
    if (display?.showModel !== false) {
        const model = getModelName(ctx.stdin);
        parts.push(`🤖 ${cyan(model)}`);
    }
    if (ctx.stdin.cwd) {
        const segments = ctx.stdin.cwd.split(/[/\\]/).filter(Boolean);
        const pathLevels = ctx.config?.pathLevels ?? 1;
        const projectPath = segments.length > 0 ? segments.slice(-pathLevels).join('/') : '/';
        let gitPart = '';
        const gitConfig = ctx.config?.gitStatus;
        const showGit = gitConfig?.enabled ?? true;
        if (showGit && ctx.gitStatus) {
            const gitParts = [ctx.gitStatus.branch];
            if ((gitConfig?.showDirty ?? true) && ctx.gitStatus.isDirty) gitParts.push('*');
            if (gitConfig?.showAheadBehind) {
                if (ctx.gitStatus.ahead > 0) gitParts.push(` ↑${ctx.gitStatus.ahead}`);
                if (ctx.gitStatus.behind > 0) gitParts.push(` ↓${ctx.gitStatus.behind}`);
            }
            if (gitConfig?.showFileStats && ctx.gitStatus.fileStats) {
                const { modified, added, deleted, untracked } = ctx.gitStatus.fileStats;
                const statParts = [];
                if (modified > 0) statParts.push(`!${modified}`);
                if (added > 0) statParts.push(`+${added}`);
                if (deleted > 0) statParts.push(`✘${deleted}`);
                if (untracked > 0) statParts.push(`?${untracked}`);
                if (statParts.length > 0) gitParts.push(` ${statParts.join(' ')}`);
            }
            gitPart = `  🌿 ${green(gitParts.join(''))}`;
        }
        parts.push(`📁 ${yellow(projectPath)}${gitPart}`);
    }
    if (parts.length === 0) return null;
    return parts.join(` · `);
}
//# sourceMappingURL=project.js.map


### $PLUGIN_DIR/render/lines/environment.js

import { dim, cyan } from '../colors.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
function readMcpNames() {
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const settingsFiles = [
        path.join(configDir, 'settings.json'),
        path.join(os.homedir(), '.claude', 'settings.json'),
    ];
    const names = new Set();
    for (const f of settingsFiles) {
        try {
            const d = JSON.parse(fs.readFileSync(f, 'utf8'));
            for (const k of Object.keys(d.mcpServers ?? {})) names.add(k);
        } catch {}
    }
    return [...names];
}
function readHookNames() {
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const settingsFiles = [
        path.join(configDir, 'settings.json'),
        path.join(os.homedir(), '.claude', 'settings.json'),
    ];
    const names = new Set();
    for (const f of settingsFiles) {
        try {
            const d = JSON.parse(fs.readFileSync(f, 'utf8'));
            for (const k of Object.keys(d.hooks ?? {})) names.add(k);
        } catch {}
    }
    return [...names];
}
export function renderEnvironmentLine(ctx) {
    const display = ctx.config?.display;
    if (display?.showConfigCounts === false) return null;
    const totalCounts = ctx.claudeMdCount + ctx.rulesCount + ctx.mcpCount + ctx.hooksCount;
    const threshold = display?.environmentThreshold ?? 0;
    if (totalCounts === 0 || totalCounts < threshold) return null;
    const parts = [];
    if (ctx.mcpCount > 0) {
        const names = readMcpNames();
        let label;
        if (names.length === 0) {
            label = `${ctx.mcpCount} MCPs`;
        } else if (names.length <= 2) {
            label = names.map(n => cyan(n)).join(dim(' · '));
        } else {
            label = `${cyan(names[0])} ${dim(`+${names.length - 1}`)}`;
        }
        parts.push(`🔌 ${label}`);
    }
    if (ctx.hooksCount > 0) {
        const names = readHookNames();
        let label;
        if (names.length === 0) {
            label = `${ctx.hooksCount} hooks`;
        } else if (names.length <= 2) {
            label = names.join(dim(' · '));
        } else {
            label = `${names.length} hooks`;
        }
        parts.push(`🪝 ${dim(label)}`);
    }
    if (ctx.claudeMdCount > 0) {
        parts.push(dim(`📋 ${ctx.claudeMdCount} CLAUDE.md`));
    }
    if (parts.length === 0) return null;
    return parts.join(` · `);
}
//# sourceMappingURL=environment.js.map


### $PLUGIN_DIR/render/tools-line.js

import { yellow, green, cyan, dim } from './colors.js';
const TOOL_EMOJIS = {
    'Edit': '✏️', 'MultiEdit': '✏️', 'Write': '📝',
    'Read': '📖', 'Bash': '⚡', 'Grep': '🔍',
    'Glob': '📂', 'WebFetch': '🌐', 'WebSearch': '🔎',
    'Agent': '🤖', 'TodoWrite': '📋', 'TodoRead': '📋',
    'NotebookEdit': '📓', 'NotebookRead': '📓',
    'ask_codex': '🔵', 'ask_gemini': '💎',
    'wait_for_job': '⏳', 'check_job_status': '🔎',
};
function toolEmoji(name) { return TOOL_EMOJIS[name] ?? '🔧'; }
function toolDisplayName(name) {
    if (!name.startsWith('mcp__')) return name;
    const lastDunder = name.lastIndexOf('__');
    if (lastDunder > 4) return name.slice(lastDunder + 2);
    return name;
}
export function renderToolsLine(ctx) {
    const { tools } = ctx.transcript;
    if (tools.length === 0) return null;
    const parts = [];
    const runningTools = tools.filter((t) => t.status === 'running');
    const completedTools = tools.filter((t) => t.status === 'completed' || t.status === 'error');
    for (const tool of runningTools.slice(-2)) {
        const displayName = toolDisplayName(tool.name);
        const target = tool.target ? truncatePath(tool.target) : '';
        parts.push(`${toolEmoji(displayName)} ${cyan(displayName)}${target ? dim(`: ${target}`) : ''}`);
    }
    const toolCounts = new Map();
    for (const tool of completedTools) {
        const displayName = toolDisplayName(tool.name);
        const count = toolCounts.get(displayName) ?? 0;
        toolCounts.set(displayName, count + 1);
    }
    const sortedTools = Array.from(toolCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);
    for (const [name, count] of sortedTools) {
        parts.push(`${green('✓')} ${toolEmoji(name)} ${name} ${dim(`×${count}`)}`);
    }
    if (parts.length === 0) return null;
    return parts.join(` · `);
}
export function renderCompactToolsLine(ctx) {
    const { tools } = ctx.transcript;
    if (tools.length === 0) return null;
    const parts = [];
    const runningTools = tools.filter((t) => t.status === 'running');
    const completedTools = tools.filter((t) => t.status === 'completed' || t.status === 'error');
    for (const tool of runningTools.slice(-3)) {
        const displayName = toolDisplayName(tool.name);
        parts.push(yellow(toolEmoji(displayName)));
    }
    const nameCounts = new Map();
    for (const tool of completedTools) {
        const displayName = toolDisplayName(tool.name);
        nameCounts.set(displayName, (nameCounts.get(displayName) ?? 0) + 1);
    }
    const sorted = Array.from(nameCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    for (const [name, count] of sorted) {
        parts.push(`${toolEmoji(name)}${dim('×' + count)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : null;
}
function truncatePath(path, maxLen = 20) {
    const normalizedPath = path.replace(/\\/g, '/');
    if (normalizedPath.length <= maxLen) return normalizedPath;
    const parts = normalizedPath.split('/');
    const filename = parts.pop() || normalizedPath;
    if (filename.length >= maxLen) return filename.slice(0, maxLen - 3) + '...';
    return '.../' + filename;
}
//# sourceMappingURL=tools-line.js.map


### $PLUGIN_DIR/config.js

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
export const DEFAULT_CONFIG = {
    lineLayout: 'expanded',
    showSeparators: false,
    pathLevels: 1,
    gitStatus: { enabled: true, showDirty: true, showAheadBehind: false, showFileStats: false },
    display: {
        showModel: true, showContextBar: true, contextValue: 'percent',
        showConfigCounts: false, showDuration: false, showSpeed: false,
        showTokenBreakdown: true, showUsage: true, usageBarEnabled: true,
        showTools: false, showAgents: false, showTodos: false,
        autocompactBuffer: 'enabled', usageThreshold: 0, sevenDayThreshold: 80,
        environmentThreshold: 0,
    },
};
export function getConfigPath() {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'plugins', 'claude-hud', 'config.json');
}
function validatePathLevels(value) { return value === 1 || value === 2 || value === 3; }
function validateLineLayout(value) { return value === 'compact' || value === 'expanded'; }
function validateAutocompactBuffer(value) { return value === 'enabled' || value === 'disabled'; }
function validateContextValue(value) { return value === 'percent' || value === 'tokens'; }
function migrateConfig(userConfig) {
    const migrated = { ...userConfig };
    if ('layout' in userConfig && !('lineLayout' in userConfig)) {
        if (userConfig.layout === 'separators') {
            migrated.lineLayout = 'compact'; migrated.showSeparators = true;
        } else {
            migrated.lineLayout = 'compact'; migrated.showSeparators = false;
        }
        delete migrated.layout;
    }
    return migrated;
}
function validateThreshold(value, max = 100) {
    if (typeof value !== 'number') return 0;
    return Math.max(0, Math.min(max, value));
}
function mergeConfig(userConfig) {
    const migrated = migrateConfig(userConfig);
    const lineLayout = validateLineLayout(migrated.lineLayout) ? migrated.lineLayout : DEFAULT_CONFIG.lineLayout;
    const showSeparators = typeof migrated.showSeparators === 'boolean' ? migrated.showSeparators : DEFAULT_CONFIG.showSeparators;
    const pathLevels = validatePathLevels(migrated.pathLevels) ? migrated.pathLevels : DEFAULT_CONFIG.pathLevels;
    const gitStatus = {
        enabled: typeof migrated.gitStatus?.enabled === 'boolean' ? migrated.gitStatus.enabled : DEFAULT_CONFIG.gitStatus.enabled,
        showDirty: typeof migrated.gitStatus?.showDirty === 'boolean' ? migrated.gitStatus.showDirty : DEFAULT_CONFIG.gitStatus.showDirty,
        showAheadBehind: typeof migrated.gitStatus?.showAheadBehind === 'boolean' ? migrated.gitStatus.showAheadBehind : DEFAULT_CONFIG.gitStatus.showAheadBehind,
        showFileStats: typeof migrated.gitStatus?.showFileStats === 'boolean' ? migrated.gitStatus.showFileStats : DEFAULT_CONFIG.gitStatus.showFileStats,
    };
    const display = {
        showModel: typeof migrated.display?.showModel === 'boolean' ? migrated.display.showModel : DEFAULT_CONFIG.display.showModel,
        showContextBar: typeof migrated.display?.showContextBar === 'boolean' ? migrated.display.showContextBar : DEFAULT_CONFIG.display.showContextBar,
        contextValue: validateContextValue(migrated.display?.contextValue) ? migrated.display.contextValue : DEFAULT_CONFIG.display.contextValue,
        showConfigCounts: typeof migrated.display?.showConfigCounts === 'boolean' ? migrated.display.showConfigCounts : DEFAULT_CONFIG.display.showConfigCounts,
        showDuration: typeof migrated.display?.showDuration === 'boolean' ? migrated.display.showDuration : DEFAULT_CONFIG.display.showDuration,
        showSpeed: typeof migrated.display?.showSpeed === 'boolean' ? migrated.display.showSpeed : DEFAULT_CONFIG.display.showSpeed,
        showTokenBreakdown: typeof migrated.display?.showTokenBreakdown === 'boolean' ? migrated.display.showTokenBreakdown : DEFAULT_CONFIG.display.showTokenBreakdown,
        showUsage: typeof migrated.display?.showUsage === 'boolean' ? migrated.display.showUsage : DEFAULT_CONFIG.display.showUsage,
        usageBarEnabled: typeof migrated.display?.usageBarEnabled === 'boolean' ? migrated.display.usageBarEnabled : DEFAULT_CONFIG.display.usageBarEnabled,
        showTools: typeof migrated.display?.showTools === 'boolean' ? migrated.display.showTools : DEFAULT_CONFIG.display.showTools,
        showAgents: typeof migrated.display?.showAgents === 'boolean' ? migrated.display.showAgents : DEFAULT_CONFIG.display.showAgents,
        showTodos: typeof migrated.display?.showTodos === 'boolean' ? migrated.display.showTodos : DEFAULT_CONFIG.display.showTodos,
        autocompactBuffer: validateAutocompactBuffer(migrated.display?.autocompactBuffer) ? migrated.display.autocompactBuffer : DEFAULT_CONFIG.display.autocompactBuffer,
        usageThreshold: validateThreshold(migrated.display?.usageThreshold, 100),
        sevenDayThreshold: validateThreshold(migrated.display?.sevenDayThreshold, 100),
        environmentThreshold: validateThreshold(migrated.display?.environmentThreshold, 100),
    };
    const accountLabel = typeof migrated.accountLabel === 'string' ? migrated.accountLabel : undefined;
    return { lineLayout, showSeparators, pathLevels, gitStatus, display, ...(accountLabel ? { accountLabel } : {}) };
}
export async function loadConfig() {
    const configPath = getConfigPath();
    try {
        if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
        const content = fs.readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return mergeConfig(userConfig);
    } catch { return DEFAULT_CONFIG; }
}
//# sourceMappingURL=config.js.map

---

## 2단계: config.json 작성

아래 두 명령을 실행해:

mkdir -p "$HOME/.claude/plugins/claude-hud"

그 다음 ~/.claude/plugins/claude-hud/config.json 파일을 아래 내용으로 작성:

{
  "lineLayout": "expanded",
  "showSeparators": false,
  "pathLevels": 1,
  "gitStatus": {
    "enabled": true,
    "showDirty": true,
    "showAheadBehind": true,
    "showFileStats": false
  },
  "display": {
    "showModel": true,
    "showContextBar": true,
    "contextValue": "percent",
    "showDuration": true,
    "showUsage": true,
    "usageBarEnabled": true,
    "showTools": true,
    "showAgents": true,
    "showTodos": true,
    "showTokenBreakdown": true,
    "showConfigCounts": true,
    "showSpeed": false,
    "sevenDayThreshold": 0,
    "autocompactBuffer": "enabled"
  }
}

---

## 3단계: 이모지 래퍼 스크립트 생성

아래 두 명령 실행:

mkdir -p "$HOME/.claude/hud"

~/.claude/hud/claude-hud-emoji.sh 파일을 아래 내용으로 작성 후 chmod +x 적용:

#!/bin/bash
node "$HOME/.claude/plugins/marketplaces/claude-hud/dist/index.js" "$@" | sed \
  -e 's/◐ Edit: /✏️  /g' \
  -e 's/◐ Read: /📖 /g' \
  -e 's/◐ Bash: /⚡ /g' \
  -e 's/◐ Write: /📝 /g' \
  -e 's/◐ Grep: /🔍 /g' \
  -e 's/◐ Glob: /📂 /g' \
  -e 's/◐ WebFetch: /🌐 /g' \
  -e 's/◐ WebSearch: /🔎 /g' \
  -e 's/◐ Agent: /🤖 /g' \
  -e 's/✓ Edit/✅ Edit/g' \
  -e 's/✓ Read/📖 Read/g' \
  -e 's/✓ Bash/⚡ Bash/g' \
  -e 's/✓ Write/📝 Write/g' \
  -e 's/✓ Grep/🔍 Grep/g' \
  -e 's/✓ Glob/📂 Glob/g' \
  -e 's/✓ WebFetch/🌐 WebFetch/g' \
  -e 's/✓ WebSearch/🔎 WebSearch/g' \
  -e 's/✓ Agent/🤖 Agent/g'

---

## 4단계: settings.json에 statusLine 추가

Claude 설정 파일을 찾아서 (우선순위: $CLAUDE_CONFIG_DIR/settings.json → ~/.claude/settings.json)
"statusLine" 키를 추가해. 이미 있으면 덮어써:

"statusLine": {
  "type": "command",
  "command": "/절대경로를여기에/.claude/hud/claude-hud-emoji.sh"
}

※ $HOME이 아닌 echo $HOME 으로 확인한 실제 절대 경로를 사용할 것.
※ CLAUDE_CONFIG_DIR 환경변수가 설정된 경우 해당 경로의 settings.json도 동일하게 수정.

---

## 5단계: credentials 심볼릭 링크 (Usage 바 표시용)

CLAUDE_CONFIG_DIR이 ~/.claude 와 다른 경우에만 실행:

ln -sf "$CLAUDE_CONFIG_DIR/.credentials.json" "$HOME/.claude/.credentials.json"

같은 경우 스킵.

---

## 6단계: 동작 확인

아래 명령으로 출력 확인:

echo '{"model":{"display_name":"Sonnet"},"context_window":{"current_usage":{"input_tokens":10000},"context_window_size":200000},"cwd":"'$PWD'"}' | node "$HOME/.claude/plugins/marketplaces/claude-hud/dist/index.js"

정상 출력 확인 후 Claude Code 재시작 (claude 명령 재실행).
```
