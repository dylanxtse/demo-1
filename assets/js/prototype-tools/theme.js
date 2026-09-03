/* Theme bridge for the reusable prototype-tools package. */
(function (global) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function parseHex(value) {
    const hex = String(value || '').trim().replace(/^#/, '');
    if (!/^[\da-f]{6}$/i.test(hex)) return null;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16)
    };
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
      h = (h * 60 + 360) % 360;
    }
    return { h, s: delta ? delta / (1 - Math.abs(2 * l - 1)) : 0, l };
  }

  function hslToHex({ h, s, l }) {
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const section = h / 60;
    const x = chroma * (1 - Math.abs((section % 2) - 1));
    const match = l - chroma / 2;
    let [r, g, b] = [0, 0, 0];
    if (section < 1) [r, g, b] = [chroma, x, 0];
    else if (section < 2) [r, g, b] = [x, chroma, 0];
    else if (section < 3) [r, g, b] = [0, chroma, x];
    else if (section < 4) [r, g, b] = [0, x, chroma];
    else if (section < 5) [r, g, b] = [x, 0, chroma];
    else [r, g, b] = [chroma, 0, x];
    return `#${[r, g, b].map((channel) => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`;
  }

  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
  }

  function fallbackTheme(options = {}) {
    const configuredProjectColor = parseHex(global.PrototypeToolsConfig?.projectColor);
    const hostProjectColor = parseHex(getComputedStyle(document.documentElement).getPropertyValue('--primary'));
    const projectColor = parseHex(options.projectColor)
      || configuredProjectColor
      || hostProjectColor
      || { r: 2, g: 73, b: 196 };
    const source = rgbToHsl(projectColor);
    const accent = options.accent || hslToHex({
      h: (source.h + 180) % 360,
      s: clamp(source.s, .55, .75),
      l: clamp(source.l, .55, .75)
    });
    const rgb = parseHex(accent) || { r: 214, g: 112, b: 20 };
    const accentRgb = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    return {
      projectColor: options.projectColor
        || global.PrototypeToolsConfig?.projectColor
        || rgbToHex(projectColor),
      accent,
      strong: options.strong || accent,
      contrastText: options.contrastText || '#172033',
      accentRgb,
      accentSoft: `rgba(${accentRgb}, .10)`,
      accentFaint: `rgba(${accentRgb}, .06)`,
      accentBorder: `rgba(${accentRgb}, .32)`,
      accentShadow: `rgba(${accentRgb}, .16)`
    };
  }

  function resolve(options = {}) {
    if (!options.accent && global.PrototypeToolsTheme?.resolve) {
      return global.PrototypeToolsTheme.resolve();
    }
    return fallbackTheme(options);
  }

  function apply(target, options = {}) {
    const element = target?.nodeType === 1 ? target : document.documentElement;
    const theme = resolve(options);
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
    Object.entries(variables).forEach(([name, value]) => element.style.setProperty(name, value));
    if (!options.accent && global.PrototypeToolsTheme?.apply) {
      global.PrototypeToolsTheme.apply(element);
    }
    return theme;
  }

  global.PrototypeToolsThemeAdapter = { apply, resolve };
})(typeof window === 'undefined' ? globalThis : window);
