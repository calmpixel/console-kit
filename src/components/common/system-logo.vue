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
    <!-- 菱形徽章：外框（旋转方形） -->
    <path d="M64 8 L120 64 L64 120 L8 64 Z" fill="url(#cs-g)" />
    <path d="M64 24.8 L103.2 64 L64 103.2 L24.8 64 Z" fill="#fff" class="logo-cut" />
    <!-- 中央菱形（渐变）+ 白芯，多几何优美重合 -->
    <path d="M64 42 L88 64 L64 86 L40 64 Z" fill="url(#cs-g)" />
    <path d="M64 51 L79 64 L64 77 L49 64 Z" fill="#fff" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
