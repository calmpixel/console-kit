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
    <!-- 古钱：外圆 -->
    <circle cx="64" cy="64" r="58" fill="url(#cs-g)" />
    <circle cx="64" cy="64" r="44" fill="#fff" class="logo-cut" />
    <!-- 内方孔 -->
    <rect x="46" y="46" width="36" height="36" rx="3" fill="url(#cs-g)" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
