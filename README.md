# DevAgent Hub

> 开发者环境智能监控与配置管理平台 — 本地优先、插件化、AI 驱动

DevAgent Hub 是一个面向开发者的本地化工具套件，包含三个核心模块，覆盖开发环境配置管理、时间效率分析和系统监控。

## 功能总览

| 模块 | 用途 | 核心能力 |
|------|------|---------|
| **Config Sync** | 开发环境配置同步 | VS Code/Git/Shell 配置发现、备份、版本管理、差异对比 |
| **Time Audit** | 个人时间效率审计 | 浏览器/VSCode/Git/文件系统数据采集、自动分类、效率评分 |
| **Monitor Center** | 插件化监控平台 | HTTP/进程/文件/命令/Git 5 种内置监控，定时采集，趋势图表 |

## 快速开始

### 前置要求

- **Node.js** >= 18
- **npm** >= 9
- **Git**（用于远程同步功能）

### 安装

```bash
# 克隆仓库
git clone https://github.com/guichen-0/DevAgent-Hub.git
cd DevAgent-Hub

# 安装依赖（三个模块）
cd config-sync && npm install && cd ..
cd time-audit && npm install && cd ..
cd dashboard && npm install && cd ..
```

### 启动 Web 仪表盘

```bash
cd dashboard
npx tsx server.ts
```

打开浏览器访问 **http://localhost:3456**

### CLI 独立运行

每个模块也可作为 CLI 独立使用：

```bash
# Config Sync
cd config-sync
npx tsx src/index.ts discover
npx tsx src/index.ts backup --profile work
npx tsx src/index.ts status

# Time Audit
cd time-audit
npx tsx src/index.ts scan
npx tsx src/index.ts report --daily
```

---

## 模块说明

### 1. Config Sync — 配置同步

自动发现并管理开发环境配置文件，支持多 Profile 和版本历史。

```bash
# 初始化 vault
npx tsx src/index.ts init --profile work

# 扫描本机可同步的配置文件
npx tsx src/index.ts discover

# 备份到 vault
npx tsx src/index.ts backup

# 查看同步状态
npx tsx src/index.ts status

# 从 vault 恢复
npx tsx src/index.ts restore

# 版本历史管理
npx tsx src/index.ts diff              # 对比本地与 vault 差异
npx tsx src/index.ts profile list      # 管理 profile
```

**适配器：** VS Code（设置/快捷键/扩展）、Git 配置、Shell 配置

### 2. Time Audit — 时间审计

从浏览器历史、VSCode 活动等本地数据源采集原始数据，自动分类并生成效率报告。

```bash
# 采集数据（浏览器历史、VSCode、Git、文件系统）
npx tsx src/index.ts scan

# 生成报告
npx tsx src/index.ts report --daily    # 日报
npx tsx src/index.ts report --weekly   # 周报
npx tsx src/index.ts report --summary  # 汇总

# 查看缓存状态
npx tsx src/index.ts cache --info
```

**数据源：** Chrome/Edge 浏览器历史、VS Code 工作区活动、Git 提交日志、文件系统变更

### 3. Monitor Center — 监控中心

插件化监控框架，无需写代码即可创建各种监控。

**内置监控类型：**

| 类型 | 功能 | 配置参数 |
|------|------|---------|
| HTTP | 监控 URL 可达性和响应时间 | URL、方法、超时、预期状态码 |
| 进程 | 监控进程是否在运行 | 进程名（如 `node.exe`） |
| 文件 | 监控文件是否存在、大小变化 | 文件路径 |
| 命令 | 定时执行脚本取输出值 | Shell 命令 |
| Git | 监控仓库未提交/未推送 | 仓库目录路径 |

所有监控数据自动持久化，支持历史趋势图查看。

---

## 架构

```
DevAgent Hub
├── config-sync/          # 配置感知 Agent
│   ├── src/
│   │   ├── core/         # vault 管理、同步引擎
│   │   ├── sources/      # 配置源适配器（VS Code/Git/Shell）
│   │   ├── commands/     # CLI 命令
│   │   └── utils/        # 工具函数
│   └── bin/              # CLI 入口
├── time-audit/            # 时序采集 + 行为分析 Agent
│   ├── src/
│   │   ├── readers/      # 多源数据读取器
│   │   ├── engine/       # 分类器 + 分析器
│   │   ├── report/       # 报告生成
│   │   └── cache/        # 数据缓存
│   └── bin/
└── dashboard/             # 监控编排 + 前端
    ├── plugins/           # 插件系统
    │   ├── builtins/      # 内置监控插件
    │   ├── PluginManager.ts
    │   ├── Scheduler.ts   # 定时调度器
    │   └── Storage.ts     # 时序数据持久化
    ├── routes/            # REST API
    └── public/            # 前端仪表盘
```

## 隐私说明

- **完全本地运行** — 所有数据存储在本机 `~/.config-sync/` 和 `dashboard/data/`
- **不联网** — 仅监控中心 HTTP 类型的监控需要网络请求
- **可选云端同步** — Config Sync 支持推送 vault 到 Git 远程仓库，需手动配置

## License

MIT
