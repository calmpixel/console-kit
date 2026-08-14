<template>
  <svg
    class="app-logo"
    width="100%"
    height="100%"
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="cs-g" x1="18" y1="18" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-300-color))" />
        <stop offset="0.5" stop-color="rgb(var(--primary-500-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-700-color))" />
      </linearGradient>
    </defs>
    <!-- 徽章：切角方形（八边形）外框 -->
    <path d="M34 18 L94 18 L110 34 L110 94 L94 110 L34 110 L18 94 L18 34 Z" fill="url(#cs-g)" />
    <path d="M43 31.8 L85 31.8 L96.2 43 L96.2 85 L85 96.2 L43 96.2 L31.8 85 L31.8 43 Z" fill="#fff" class="logo-cut" />
    <!-- 四角方位点 -->
    <circle cx="39" cy="39" r="2.5" fill="#c9c9c9" />
    <circle cx="89" cy="39" r="2.5" fill="#c9c9c9" />
    <circle cx="89" cy="89" r="2.5" fill="#c9c9c9" />
    <circle cx="39" cy="89" r="2.5" fill="#c9c9c9" />
    <!-- 指北针：北瓣（红）+ 南瓣（渐变） -->
    <path d="M64 36 L72 64 L56 64 Z" fill="#e64a4a" />
    <path d="M64 92 L72 64 L56 64 Z" fill="url(#cs-g)" />
    <!-- 中心轴 -->
    <circle cx="64" cy="64" r="3" fill="#fff" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
