/*
 * 原型辅助工具主题层。
 *
 * 辅助工具不直接占用业务系统主色，而是读取项目主色后生成互补强调色。
 * 标注和迭代面板只消费这里提供的 CSS 变量，因此可以被独立复制到其他项目。
 */
(function () {
  if (window.PrototypeToolsTheme) return;

  const registeredTargets = new Set();
  // 本项目只有一个主色；独立页面未加载 variables.css 时也必须沿用它。
  const fallbackProjectColor = { r: 2, g: 73, b: 196 };
  let observer = null;
  let refreshQueued = false;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const parseChannel = (value) => {
    const text = String(value).trim();
    if (text.endsWith('%')) return clamp(Number.parseFloat(text) * 2.55, 0, 255);
    return clamp(Number.parseFloat(text), 0, 255);
  };

  const parseAlpha = (value) => {
    if (value == null || value === '') return 1;
    const text = String(value).trim();
    return text.endsWith('%')
      ? clamp(Number.parseFloat(text) / 100, 0, 1)
      : clamp(Number.parseFloat(text), 0, 1);
  };

  function parseColor(value) {
    const text = String(value || '').trim();
    if (!text || text === 'transparent' || text.startsWith('var(')) return null;

    const hex = text.replace(/^#/, '');
    if (/^[\da-f]{3,8}$/i.test(hex)) {
      const normalized = hex.length <= 4
        ? hex.split('').map((part) => part + part).join('')
        : hex;
      return {
        r: Number.parseInt(normalized.slice(0, 2), 16),
        g: Number.parseInt(normalized.slice(2, 4), 16),
        b: Number.parseInt(normalized.slice(4, 6), 16),
        a: normalized.length >= 8 ? Number.parseInt(normalized.slice(6, 8), 16) / 255 : 1
      };
    }

    const rgbMatch = text.match(/^rgba?\((.*)\)$/i);
    if (rgbMatch) {
      const parts = rgbMatch[1].replace('/', ' ').split(/[\s,]+/).filter(Boolean);
      if (parts.length >= 3) {
        return {
          r: parseChannel(parts[0]),
          g: parseChannel(parts[1]),
          b: parseChannel(parts[2]),
          a: parseAlpha(parts[3])
        };
      }
    }

    const hslMatch = text.match(/^hsla?\((.*)\)$/i);
    if (hslMatch) {
      const parts = hslMatch[1].replace('/', ' ').split(/[\s,]+/).filter(Boolean);
      if (parts.length >= 3) {
        const hue = ((Number.parseFloat(parts[0]) % 360) + 360) % 360;
        const saturation = clamp(Number.parseFloat(parts[1]) / (parts[1].includes('%') ? 100 : 1), 0, 1);
        const lightness = clamp(Number.parseFloat(parts[2]) / (parts[2].includes('%') ? 100 : 1), 0, 1);
        const rgb = hslToRgb({ h: hue, s: saturation, l: lightness });
        return { ...rgb, a: parseAlpha(parts[3]) };
      }
    }

    return null;
  }

  function rgbToHsl({ r, g, b }) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    let h = 0;
    const l = (max + min) / 2;

    if (delta) {
      if (max === red) h = ((green - blue) / delta) % 6;
      else if (max === green) h = (blue - red) / delta + 2;
      else h = (red - green) / delta + 4;
      h *= 60;
      if (h < 0) h += 360;
    }

    return {
      h,
      s: delta ? delta / (1 - Math.abs(2 * l - 1)) : 0,
      l
    };
  }

  function hslToRgb({ h, s, l }) {
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const section = h / 60;
    const x = chroma * (1 - Math.abs((section % 2) - 1));
    const match = l - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;

    if (section < 1) [red, green, blue] = [chroma, x, 0];
    else if (section < 2) [red, green, blue] = [x, chroma, 0];
    else if (section < 3) [red, green, blue] = [0, chroma, x];
    else if (section < 4) [red, green, blue] = [0, x, chroma];
    else if (section < 5) [red, green, blue] = [x, 0, chroma];
    else [red, green, blue] = [chroma, 0, x];

    return {
      r: Math.round((red + match) * 255),
      g: Math.round((green + match) * 255),
      b: Math.round((blue + match) * 255)
    };
  }

  function relativeLuminance({ r, g, b }) {
    const linearise = (channel) => {
      const value = channel / 255;
      return value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
    };
    return .2126 * linearise(r) + .7152 * linearise(g) + .0722 * linearise(b);
  }

  function contrastRatio(first, second) {
    const light = Math.max(relativeLuminance(first), relativeLuminance(second));
    const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
    return (light + .05) / (dark + .05);
  }

  function toHex({ r, g, b }) {
    return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
  }

  function chooseAccent(projectColor) {
    const source = rgbToHsl(projectColor);
    // 先取项目主题色的互补色，再只校正饱和度和明度；校正过程中保持互补色的 H 不变。
    const hue = (source.h + 180) % 360;
    const saturation = clamp(source.s, .55, .75);
    const lightness = clamp(source.l, .55, .75);
    const accent = hslToRgb({ h: hue, s: saturation, l: lightness });
    const white = { r: 255, g: 255, b: 255 };
    const dark = { r: 23, g: 32, b: 51 };
    const contrastText = contrastRatio(accent, white) >= 4.5 ? white : dark;
    const adjustment = contrastText === white ? -.08 : -.04;
    const strong = hslToRgb({
      h: hue,
      s: saturation,
      l: clamp(lightness + adjustment, .2, .62)
    });
    return { accent, strong, contrastText };
  }

  function resolveProjectColor() {
    const configured = window.PrototypeToolsConfig?.projectColor;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--primary');
    return parseColor(configured) || parseColor(raw) || fallbackProjectColor;
  }

  function resolve() {
    const projectColor = resolveProjectColor();
    const { accent, strong, contrastText } = chooseAccent(projectColor);
    const rgb = `${accent.r}, ${accent.g}, ${accent.b}`;
    return {
      projectColor: toHex(projectColor),
      accent: toHex(accent),
      strong: toHex(strong),
      contrastText: toHex(contrastText),
      accentRgb: rgb,
      accentSoft: `rgba(${rgb}, .10)`,
      accentFaint: `rgba(${rgb}, .06)`,
      accentBorder: `rgba(${rgb}, .32)`,
      accentShadow: `rgba(${rgb}, .16)`
    };
  }

  function setStyleProperty(element, name, value) {
    if (element.style.getPropertyValue(name) === value) return;
    element.style.setProperty(name, value);
  }

  function apply(target) {
    const element = target?.nodeType === 1 ? target : document.documentElement;
    const theme = resolve();
    const variables = {
      '--prototype-project-color': theme.projectColor,
      '--prototype-accent': theme.accent,
      '--prototype-accent-strong': theme.strong,
      '--prototype-accent-contrast': theme.contrastText,
      '--prototype-accent-rgb': theme.accentRgb,
      '--prototype-accent-soft': theme.accentSoft,
      '--prototype-accent-faint': theme.accentFaint,
      '--prototype-accent-border': theme.accentBorder,
      '--prototype-accent-shadow': theme.accentShadow
    };
    Object.entries(variables).forEach(([name, value]) => setStyleProperty(element, name, value));
    registeredTargets.add(element);
    ensureObserver();
    return theme;
  }

  function refresh() {
    registeredTargets.forEach((target) => {
      if (target.isConnected) apply(target);
      else registeredTargets.delete(target);
    });
  }

  function queueRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    window.requestAnimationFrame(() => {
      refreshQueued = false;
      refresh();
    });
  }

  function ensureObserver() {
    if (observer || !window.MutationObserver || !document.documentElement) return;
    observer = new MutationObserver(queueRefresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  }

  window.PrototypeToolsTheme = { apply, refresh, resolve };
})();
