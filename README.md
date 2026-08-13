# console-kit

控制台前端基础壳（Soybean / Naive）。契约见仓库根目录 `docs/GOKIT_API.md`。

## 运行

```bash
cd console-kit
pnpm install
pnpm dev
```

默认 `VITE_USE_MOCK=true`：不启后端即可登录逛系统管理/工作台。

接真后端：

```env
VITE_USE_MOCK=false
VITE_HTTP_PROXY=Y
# 代理目标指向本机 api-kit（见 vite.config / .env）
```

## 范围

登录壳、工作台（系统健康）、`views/system/**`、通知铃铛、AdminListPage 列表约定。  
不含资产/租户/牌局卡片。
