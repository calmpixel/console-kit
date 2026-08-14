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
    <!-- 罗盘：外环 -->
    <circle cx="64" cy="64" r="58" fill="url(#cs-g)" />
    <circle cx="64" cy="64" r="44" fill="#fff" class="logo-cut" />
    <!-- 刻度环 -->
    <circle cx="64" cy="64" r="32" fill="none" stroke="url(#cs-g)" stroke-width="3" />
    <!-- 方位刻度 N/E/S/W -->
    <path d="M64 26 L69 32 L64 38 L59 32 Z" fill="url(#cs-g)" />
    <path d="M90 64 L96 69 L102 64 L96 59 Z" fill="url(#cs-g)" />
    <path d="M64 90 L69 96 L64 102 L59 96 Z" fill="url(#cs-g)" />
    <path d="M26 64 L32 69 L38 64 L32 59 Z" fill="url(#cs-g)" />
    <!-- 次级刻度（对角） -->
    <circle cx="86.6" cy="86.6" r="2.5" fill="#c9c9c9" />
    <circle cx="41.4" cy="86.6" r="2.5" fill="#c9c9c9" />
    <circle cx="41.4" cy="41.4" r="2.5" fill="#c9c9c9" />
    <circle cx="86.6" cy="41.4" r="2.5" fill="#c9c9c9" />
    <!-- 指北针：北瓣（红）+ 南瓣（渐变） -->
    <path d="M64 44 L70 64 L58 64 Z" fill="#e64a4a" />
    <path d="M64 84 L70 64 L58 64 Z" fill="url(#cs-g)" />
    <!-- 中心轴 -->
    <circle cx="64" cy="64" r="3" fill="#fff" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
