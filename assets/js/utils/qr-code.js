(function () {
  // QR Code Model 2, version 6, error correction level L (byte mode).
  const SIZE = 41;
  const DATA_CODEWORDS = 136;
  const BLOCK_DATA = 68;
  const ECC_CODEWORDS = 18;

  function multiply(x, y) {
    let product = 0;
    for (let bit = 7; bit >= 0; bit -= 1) {
      product = (product << 1) ^ ((product >>> 7) * 0x11d);
      product ^= ((y >>> bit) & 1) * x;
    }
    return product;
  }

  function eccDivisor() {
    const divisor = new Uint8Array(ECC_CODEWORDS);
    divisor[ECC_CODEWORDS - 1] = 1;
    let root = 1;
    for (let i = 0; i < ECC_CODEWORDS; i += 1) {
      for (let j = 0; j < ECC_CODEWORDS; j += 1) {
        divisor[j] = multiply(divisor[j], root);
        if (j + 1 < ECC_CODEWORDS) divisor[j] ^= divisor[j + 1];
      }
      root = multiply(root, 2);
    }
    return divisor;
  }

  function eccRemainder(data, divisor) {
    const remainder = new Uint8Array(ECC_CODEWORDS);
    data.forEach((byte) => {
      const factor = byte ^ remainder[0];
      remainder.copyWithin(0, 1);
      remainder[ECC_CODEWORDS - 1] = 0;
      for (let i = 0; i < ECC_CODEWORDS; i += 1) remainder[i] ^= multiply(divisor[i], factor);
    });
    return remainder;
  }

  function dataCodewords(value) {
    const bytes = new TextEncoder().encode(value);
    if (bytes.length > 134) return null;
    const bits = [0, 1, 0, 0]; // Byte mode.
    for (let i = 7; i >= 0; i -= 1) bits.push((bytes.length >>> i) & 1);
    bytes.forEach((byte) => {
      for (let i = 7; i >= 0; i -= 1) bits.push((byte >>> i) & 1);
    });
    for (let i = 0; i < 4 && bits.length < DATA_CODEWORDS * 8; i += 1) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
      codewords.push(byte);
    }
    let pad = 0xec;
    while (codewords.length < DATA_CODEWORDS) {
      codewords.push(pad);
      pad ^= 0xfd;
    }
    return codewords;
  }

  function interleavedCodewords(data) {
    const divisor = eccDivisor();
    const blocks = [data.slice(0, BLOCK_DATA), data.slice(BLOCK_DATA)];
    const checks = blocks.map((block) => eccRemainder(block, divisor));
    const result = [];
    for (let i = 0; i < BLOCK_DATA; i += 1) blocks.forEach((block) => result.push(block[i]));
    for (let i = 0; i < ECC_CODEWORDS; i += 1) checks.forEach((check) => result.push(check[i]));
    return result;
  }

  function matrix(codewords) {
    const modules = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const reserved = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    const set = (x, y, dark) => {
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
      modules[y][x] = dark;
      reserved[y][x] = true;
    };
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, distance !== 2 && distance !== 4);
      }
    };
    finder(3, 3);
    finder(SIZE - 4, 3);
    finder(3, SIZE - 4);
    for (let i = 8; i < SIZE - 8; i += 1) {
      set(i, 6, i % 2 === 0);
      set(6, i, i % 2 === 0);
    }
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      set(SIZE - 7 + dx, SIZE - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }

    // Level L and mask 0: format data 0b01000, protected by BCH(15,5).
    const formatData = 8;
    let remainder = formatData;
    for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const format = ((formatData << 10) | remainder) ^ 0x5412;
    const formatBit = (i) => ((format >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i += 1) set(8, i, formatBit(i));
    set(8, 7, formatBit(6));
    set(8, 8, formatBit(7));
    set(7, 8, formatBit(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, formatBit(i));
    for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, formatBit(i));
    for (let i = 8; i < 15; i += 1) set(8, SIZE - 15 + i, formatBit(i));
    set(8, SIZE - 8, true);

    let bitIndex = 0;
    for (let right = SIZE - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vertical = 0; vertical < SIZE; vertical += 1) {
        const y = ((right + 1) & 2) === 0 ? SIZE - 1 - vertical : vertical;
        for (let offset = 0; offset < 2; offset += 1) {
          const x = right - offset;
          if (reserved[y][x]) continue;
          const byte = codewords[bitIndex >>> 3] || 0;
          const dark = bitIndex < codewords.length * 8 && ((byte >>> (7 - (bitIndex & 7))) & 1) !== 0;
          modules[y][x] = dark !== ((x + y) % 2 === 0);
          bitIndex += 1;
        }
      }
    }
    return modules;
  }

  window.SortingQrCode = {
    svg(value) {
      const data = dataCodewords(String(value || ''));
      if (!data) return '';
      const modules = matrix(interleavedCodewords(data));
      const cells = [];
      modules.forEach((row, y) => row.forEach((dark, x) => {
        if (dark) cells.push(`<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`);
      }));
      return `<svg class="sorting-label-qrcode" viewBox="0 0 49 49" role="img" aria-label="分拣二维码"><rect width="49" height="49" fill="#fff"/>${cells.join('')}</svg>`;
    }
  };
})();
