# HelmAdmin

<div align="center">
  <span><a href="./README.en_US.md">English</a> | 中文</span>
</div>

HelmAdmin：运营后台前端基础壳（Soybean / Naive UI）。后端接口契约见 `gokit` 仓库的 `docs/GOKIT_API.md` 与 `docs/console-frontend-style.md`。

## 运行

```bash
cd console-kit
pnpm install
pnpm dev
```

开发服务默认端口 `9527`（`vite --mode test`），构建产物输出到仓库外的 `web/dist`。

### 接真后端（默认）

`.env` 中 `VITE_USE_MOCK=false`，dev server 将 `/api`、`/ui`、`/mock-ui` 代理到本机后端 `http://127.0.0.1:18080`（需先启动 gokit 服务）。

### 不带后端看 UI（本地 mock）

将 `.env` 中 `VITE_USE_MOCK` 改为 `true` 即可登录逛系统管理/工作台，无需启动后端。个人本地覆盖建议用 `.env.local`（遵循 Vite 官方优先级，`*.local` 不入库）。

## 环境文件

| 文件        | 模式                  | 关键值                                                |
| ----------- | --------------------- | ----------------------------------------------------- |
| `.env`      | 公共基础              | `VITE_USE_MOCK=false`、`VITE_AUTH_ROUTE_MODE=dynamic` |
| `.env.test` | dev（`pnpm dev`）     | 后端基址 `http://127.0.0.1:18080/api/console/v1`      |
| `.env.prod` | build（`pnpm build`） | 同源 `/api/console/v1`                                |

## 范围

登录壳、工作台（系统健康）、`views/system/**`、通知铃铛、AdminListPage 列表约定。  
不含资产/租户/牌局卡片。
