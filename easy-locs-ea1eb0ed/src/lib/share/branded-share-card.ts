import { BRAND } from "@/lib/brand-config";

export type ShareCardType = "quran" | "hadith" | "forex" | "analytics" | "annonce";

interface BaseCardOptions {
  type: ShareCardType;
}

interface QuranCardOptions extends BaseCardOptions {
  type: "quran";
  arabicText: string;
  translation: string;
  reference: string;
}

interface HadithCardOptions extends BaseCardOptions {
  type: "hadith";
  arabicText: string;
  translation?: string;
  collection: string;
  number: number;
}

interface ForexCardOptions extends BaseCardOptions {
  type: "forex";
  pair: string;
  rate: number;
  change: number;
}

interface AnalyticsCardOptions extends BaseCardOptions {
  type: "analytics";
  kpiLabel: string;
  kpiValue: string;
  subtitle?: string;
}

interface AnnonceCardOptions extends BaseCardOptions {
  type: "annonce";
  title: string;
  price: string;
  city: string;
  imageUrl?: string;
}

export type ShareCardOptions =
  | QuranCardOptions
  | HadithCardOptions
  | ForexCardOptions
  | AnalyticsCardOptions
  | AnnonceCardOptions;

const CARD_SIZE = 1080;
const LOGO_URL = "/logo-icon.png";

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawBase(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BRAND.colors.primary;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

  ctx.fillStyle = BRAND.colors.gold;
  ctx.fillRect(0, 0, CARD_SIZE, 6);
}

async function drawLogo(ctx: CanvasRenderingContext2D) {
  try {
    const logo = await loadImage(LOGO_URL);
    ctx.drawImage(logo, CARD_SIZE - 120, 30, 80, 80);
  } catch {
    ctx.fillStyle = BRAND.colors.gold;
    ctx.font = "bold 24px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("EASY-LOCS", CARD_SIZE - 40, 70);
    ctx.textAlign = "left";
  }
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BRAND.colors.gold;
  ctx.fillRect(0, CARD_SIZE - 60, CARD_SIZE, 60);
  ctx.fillStyle = BRAND.colors.primary;
  ctx.font = "bold 22px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("easy-locs.com", CARD_SIZE / 2, CARD_SIZE - 22);
  ctx.textAlign = "left";
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 10): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  let lineCount = 0;
  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line + "…", x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

function drawQuranCard(ctx: CanvasRenderingContext2D, opts: QuranCardOptions) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "36px 'Amiri', 'Traditional Arabic', serif";
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  wrapText(ctx, opts.arabicText, CARD_SIZE - 80, 200, CARD_SIZE - 160, 56, 8);

  ctx.direction = "ltr";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "24px 'Plus Jakarta Sans', system-ui, sans-serif";
  wrapText(ctx, opts.translation, 80, 600, CARD_SIZE - 160, 36, 6);

  ctx.fillStyle = BRAND.colors.gold;
  ctx.font = "bold 28px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.reference, CARD_SIZE / 2, CARD_SIZE - 100);
  ctx.textAlign = "left";
}

function drawHadithCard(ctx: CanvasRenderingContext2D, opts: HadithCardOptions) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "32px 'Amiri', 'Traditional Arabic', serif";
  ctx.textAlign = "right";
  ctx.direction = "rtl";
  wrapText(ctx, opts.arabicText, CARD_SIZE - 80, 200, CARD_SIZE - 160, 50, 8);

  if (opts.translation) {
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "22px 'Plus Jakarta Sans', system-ui, sans-serif";
    wrapText(ctx, opts.translation, 80, 620, CARD_SIZE - 160, 32, 5);
  }

  ctx.direction = "ltr";
  ctx.fillStyle = BRAND.colors.gold;
  ctx.font = "bold 26px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${opts.collection} — Hadith n°${opts.number}`, CARD_SIZE / 2, CARD_SIZE - 100);
  ctx.textAlign = "left";
}

function drawForexCard(ctx: CanvasRenderingContext2D, opts: ForexCardOptions) {
  ctx.fillStyle = BRAND.colors.gold;
  ctx.font = "bold 32px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FOREX", CARD_SIZE / 2, 180);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(opts.pair, CARD_SIZE / 2, 340);

  ctx.font = "bold 96px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(opts.rate.toFixed(4), CARD_SIZE / 2, 500);

  const isUp = opts.change >= 0;
  ctx.fillStyle = isUp ? "#22c55e" : "#ef4444";
  ctx.font = "bold 48px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(`${isUp ? "▲" : "▼"} ${Math.abs(opts.change).toFixed(2)}%`, CARD_SIZE / 2, 620);
  ctx.textAlign = "left";
}

function drawAnalyticsCard(ctx: CanvasRenderingContext2D, opts: AnalyticsCardOptions) {
  ctx.fillStyle = BRAND.colors.gold;
  ctx.font = "bold 30px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(opts.kpiLabel.toUpperCase(), CARD_SIZE / 2, 300);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 120px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(opts.kpiValue, CARD_SIZE / 2, 500);

  if (opts.subtitle) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "24px 'Plus Jakarta Sans', system-ui, sans-serif";
    ctx.fillText(opts.subtitle, CARD_SIZE / 2, 580);
  }
  ctx.textAlign = "left";
}

async function drawAnnonceCard(ctx: CanvasRenderingContext2D, opts: AnnonceCardOptions) {
  if (opts.imageUrl) {
    try {
      const img = await loadImage(opts.imageUrl);
      const size = 400;
      const sx = (img.width - Math.min(img.width, img.height)) / 2;
      const sy = (img.height - Math.min(img.width, img.height)) / 2;
      const sSize = Math.min(img.width, img.height);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(CARD_SIZE / 2 - size / 2, 150, size, size, 20);
      ctx.clip();
      ctx.drawImage(img, sx, sy, sSize, sSize, CARD_SIZE / 2 - size / 2, 150, size, size);
      ctx.restore();
    } catch {}
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = "center";
  wrapText(ctx, opts.title, CARD_SIZE / 2, 640, CARD_SIZE - 160, 44, 2);

  ctx.fillStyle = BRAND.colors.gold;
  ctx.font = "bold 52px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(opts.price, CARD_SIZE / 2, 760);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "24px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.fillText(opts.city, CARD_SIZE / 2, 820);
  ctx.textAlign = "left";
}

export async function generateShareCard(options: ShareCardOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_SIZE;
  canvas.height = CARD_SIZE;
  const ctx = canvas.getContext("2d")!;

  drawBase(ctx);
  await drawLogo(ctx);

  switch (options.type) {
    case "quran":
      drawQuranCard(ctx, options);
      break;
    case "hadith":
      drawHadithCard(ctx, options);
      break;
    case "forex":
      drawForexCard(ctx, options);
      break;
    case "analytics":
      drawAnalyticsCard(ctx, options);
      break;
    case "annonce":
      await drawAnnonceCard(ctx, options);
      break;
  }

  drawFooter(ctx);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
      "image/png",
      1.0
    );
  });
}

export async function shareAsImage(options: ShareCardOptions, title: string): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const blob = await generateShareCard(options);
    const file = new File([blob], "easylocs-share.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return "shared";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "easylocs-share.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
