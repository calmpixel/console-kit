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
      <linearGradient id="cs-m" x1="18" y1="18" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-200-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-400-color))" />
      </linearGradient>
      <linearGradient id="cs-t" x1="18" y1="18" x2="110" y2="110" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-100-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-300-color))" />
      </linearGradient>
    </defs>
    <!-- 三层菱形错位叠加（颜色叠加，不做镂空） -->
    <path d="M64 6 L122 64 L64 122 L6 64 Z" fill="url(#cs-g)" />
    <path d="M74 14 L118 58 L74 102 L30 58 Z" fill="url(#cs-m)" opacity="0.9" />
    <path d="M80 24 L110 54 L80 84 L50 54 Z" fill="url(#cs-t)" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
