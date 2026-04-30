# DevAgent Hub

> 开发者环境智能监控与配置管理平台 — Web 可视化，本地优先

DevAgent Hub 将三个核心工具集成到统一的 Web 应用，所有操作点按即用，无需接触终端。

## 功能总览

| 模块 | 用途 | 核心能力 |
|------|------|---------|
| **Config Sync** | 开发环境配置同步 | VS Code/Git/Shell 配置发现、备份、版本管理、差异对比、远程 Git 同步 |
| **Time Audit** | 个人时间效率审计 | 浏览器/VSCode/Git/文件系统数据采集、自动分类、效率评分、趋势图表 |
| **Monitor Center** | 插件化监控平台 | HTTP/进程/文件/命令/Git 5 种内置监控，定时采集，趋势图表 |

## 快速开始

### 前置要求

- **Node.js** >= 18
- **npm** >= 9
- **Git**（用于 Config Sync 远程同步）

### 安装

```bash
git clone https://github.com/guichen-0/DevAgent-Hub.git
cd DevAgent-Hub
npm install
```

### 启动

```bash
npx tsx server/index.ts
```

打开浏览器访问 **http://localhost:3456**

## 页面说明

### ⚙ Config Sync — 配置同步

自动发现本机开发环境配置（VS Code 设置/快捷键/扩展、Git 配置、PowerShell 配置），支持版本管理和远程同步。

- **扫描配置** — 发现本机可同步的配置文件
- **备份** — 将配置快照存入本地 vault
- **版本历史** — 时间线展示，支持差异对比和回滚
- **远程同步** — 推送 vault 到 Git 仓库 / 从 Git 仓库克隆到新电脑

> **新电脑部署**：输入远程 Git URL → 从远程克隆 → 恢复配置到本机，即可无缝迁移

### ⏱ Time Audit — 时间审计

从浏览器历史、VSCode 活动、Git 提交、文件系统变更中采集数据，自动分类并生成效率报告。

- **扫描数据** — 从 4 个数据源采集活动记录
- **生成报告** — 分类统计 + 占比环形图
- **每日摘要** — 效率评分 + 活动排名 + 改进建议
- **趋势分析** — 堆叠柱状图展示多日趋势

### 📡 Monitor Center — 监控中心

插件化监控框架，无需写代码即可创建各种监控。

**内置监控类型：** HTTP（URL 可达性）、进程（运行状态）、文件（大小/存在性）、命令（脚本输出）、Git（未提交/未推送）

## 架构

```
DevAgent Hub
├── server/
│   ├── index.ts            # Express 入口
│   ├── routes/             # REST API 路由
│   │   ├── config-sync.ts
│   │   ├── time-audit.ts
│   │   └── monitor.ts
│   └── db/                 # SQLite 持久化
├── client/
│   ├── index.html          # SPA 入口
│   ├── app.js              # 页面路由
│   ├── api.js              # 共享 API 工具
│   ├── styles/             # 全局样式
│   └── pages/              # 独立页面
│       ├── config-sync/
│       ├── time-audit/
│       └── monitor/
├── config-sync/            # 配置同步核心逻辑
├── time-audit/             # 时间审计核心逻辑
└── dashboard/              # 监控引擎
```

## 隐私说明

- **完全本地运行** — 数据存储在本机 `~/.config-sync/` 和 `data/` 目录
- **不联网** — 仅监控 HTTP 类型需要网络请求
- **可选远程同步** — Config Sync 支持推送到 Git 仓库，需手动配置

## License

MIT
