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
    <!-- 圆角菱形徽章（渐变外框） -->
    <rect x="24" y="24" width="80" height="80" rx="12" transform="rotate(45 64 64)" fill="url(#cs-g)" />
    <!-- 中心星芒核心：四向梭形射线 + 中心圆角菱形 -->
    <path d="M64 22 L68 34 L64 46 L60 34 Z" fill="#fff" />
    <path d="M64 106 L68 94 L64 82 L60 94 Z" fill="#fff" />
    <path d="M22 64 L34 60 L46 64 L34 68 Z" fill="#fff" />
    <path d="M106 64 L94 60 L82 64 L94 68 Z" fill="#fff" />
    <rect x="59" y="59" width="10" height="10" rx="3" transform="rotate(45 64 64)" fill="#fff" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
