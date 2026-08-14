// @unocss-include
import { getColorPalette, getRgb } from '@sa/color';
import { DARK_CLASS } from '@/constants/app';
import { localStg } from '@/utils/storage';
import { toggleHtmlClass } from '@/utils/common';
import { $t } from '@/locales';

export function setupLoading() {
  const themeColor = localStg.get('themeColor') || '#646cff';
  const darkMode = localStg.get('darkMode') || false;
  const palette = getColorPalette(themeColor);

  const { r, g, b } = getRgb(themeColor);

  const primaryColor = `--primary-color: ${r} ${g} ${b}`;

  const svgCssVars = Array.from(palette.entries())
    .map(([key, value]) => `--logo-color-${key}: ${value}`)
    .join(';');

  const cssVars = `${primaryColor}; ${svgCssVars}`;

  if (darkMode) {
    toggleHtmlClass(DARK_CLASS).add();
  }

  const loadingClasses = [
    'left-0 top-0',
    'left-0 bottom-0 animate-delay-500',
    'right-0 top-0 animate-delay-1000',
    'right-0 bottom-0 animate-delay-1500'
  ];

  const dot = loadingClasses
    .map(item => {
      return `<div class="absolute w-16px h-16px bg-primary rounded-8px animate-pulse ${item}"></div>`;
    })
    .join('\n');

  const loading = `
<div class="fixed-center flex-col bg-layout" style="${cssVars}">
  <div class="w-128px h-128px">
    ${getLogoSvg()}
  </div>
  <div class="w-56px h-56px my-36px">
    <div class="relative h-full animate-spin">
      ${dot}
    </div>
  </div>
  <h2 class="text-28px font-500 text-primary">${$t('system.title')}</h2>
</div>`;

  const app = document.getElementById('app');

  if (app) {
    app.innerHTML = loading;
  }
}

function getLogoSvg() {
  const logoSvg = `<svg
        width="100%"
        height="100%"
        version="1.1"
        viewBox="0 0 128 128"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
      >
        <g>
          <rect x="24" y="24" width="80" height="80" rx="12" transform="rotate(45 64 64)" fill="url(#loadingLogoGradient)" />
          <path d="M64 22 L68 34 L64 46 L60 34 Z" fill="#fff" />
          <path d="M64 106 L68 94 L64 82 L60 94 Z" fill="#fff" />
          <path d="M22 64 L34 60 L46 64 L34 68 Z" fill="#fff" />
          <path d="M106 64 L94 60 L82 64 L94 68 Z" fill="#fff" />
          <rect x="59" y="59" width="10" height="10" rx="3" transform="rotate(45 64 64)" fill="#fff" />
        </g>
        <defs>
          <linearGradient
            id="loadingLogoGradient"
            x1="18"
            y1="18"
            x2="110"
            y2="110"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stop-color="var(--logo-color-400)" />
            <stop offset="0.5" stop-color="var(--logo-color-500)" />
            <stop offset="1" stop-color="var(--logo-color-700)" />
          </linearGradient>
        </defs>
      </svg>
  `;

  return logoSvg;
}
