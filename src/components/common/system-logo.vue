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
      <linearGradient id="cs-up" x1="64" y1="6" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-100-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-300-color))" />
      </linearGradient>
      <linearGradient id="cs-dn" x1="64" y1="122" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-600-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-400-color))" />
      </linearGradient>
      <linearGradient id="cs-lf" x1="6" y1="64" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-300-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-500-color))" />
      </linearGradient>
      <linearGradient id="cs-rt" x1="122" y1="64" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="rgb(var(--primary-300-color))" />
        <stop offset="1" stop-color="rgb(var(--primary-500-color))" />
      </linearGradient>
    </defs>
    <!-- 菱形四切面（对称宝石切面，多面渐变） -->
    <path d="M64 6 L122 64 L6 64 Z" fill="url(#cs-up)" />
    <path d="M122 64 L64 6 L64 122 Z" fill="url(#cs-rt)" />
    <path d="M64 122 L6 64 L122 64 Z" fill="url(#cs-dn)" />
    <path d="M6 64 L64 122 L64 6 Z" fill="url(#cs-lf)" />
  </svg>
</template>

<style scoped>
html.dark .logo-cut {
  fill: rgb(var(--container-bg-color));
}
</style>
