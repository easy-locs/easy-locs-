const WATERMARK_TEXT = "EASY-LOCS";
const LOGO_URL = "/logo-icon.png";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function applyWatermark(sourceBlob: Blob): Promise<Blob> {
  const img = await loadImage(URL.createObjectURL(sourceBlob));
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  const fontSize = Math.max(img.width / 10, 40);
  ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', system-ui, sans-serif`;
  ctx.translate(img.width / 2, img.height / 2);
  ctx.rotate(-15 * Math.PI / 180);

  const spacing = fontSize * 2.5;
  for (let y = -img.height; y < img.height; y += spacing) {
    for (let x = -img.width; x < img.width; x += spacing) {
      ctx.fillText(WATERMARK_TEXT, x, y);
    }
  }
  ctx.restore();

  try {
    const logo = await loadImage(LOGO_URL);
    const logoSize = 60;
    ctx.globalAlpha = 0.3;
    ctx.drawImage(logo, img.width - logoSize - 16, img.height - logoSize - 16, logoSize, logoSize);
    ctx.globalAlpha = 1;
  } catch {}

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Watermark toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export async function downloadWithWatermark(imageUrl: string, fileName: string): Promise<void> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  const watermarked = await applyWatermark(blob);

  const url = URL.createObjectURL(watermarked);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}
