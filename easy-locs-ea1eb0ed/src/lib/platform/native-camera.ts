import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import type { Photo } from "@capacitor/camera";

export interface CaptureOptions {
  quality?: number;
  width?: number;
  height?: number;
  allowEditing?: boolean;
  source?: "camera" | "photos" | "prompt";
  resultType?: "uri" | "base64" | "dataUrl";
}

export interface CaptureResult {
  dataUrl?: string;
  base64?: string;
  webPath?: string;
  format: string;
  saved: boolean;
  native: boolean;
}

export interface VideoCaptureResult {
  webPath?: string;
  duration?: number;
  native: boolean;
}

interface CapacitorWindow extends Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}

function isNative(): boolean {
  return !!(window as unknown as CapacitorWindow).Capacitor?.isNativePlatform?.();
}

function mapSource(source?: string): CameraSource {
  switch (source) {
    case "camera": return CameraSource.Camera;
    case "photos": return CameraSource.Photos;
    default: return CameraSource.Prompt;
  }
}

function mapResultType(type?: string): CameraResultType {
  switch (type) {
    case "base64": return CameraResultType.Base64;
    case "dataUrl": return CameraResultType.DataUrl;
    default: return CameraResultType.Uri;
  }
}

async function captureWithNative(options: CaptureOptions): Promise<CaptureResult> {
  const photo: Photo = await Camera.getPhoto({
    quality: options.quality ?? 90,
    width: options.width,
    height: options.height,
    allowEditing: options.allowEditing ?? false,
    source: mapSource(options.source),
    resultType: mapResultType(options.resultType ?? "dataUrl"),
    correctOrientation: true,
    saveToGallery: false,
  });

  return {
    dataUrl: photo.dataUrl,
    base64: photo.base64String,
    webPath: photo.webPath,
    format: photo.format,
    saved: photo.saved,
    native: true,
  };
}

async function captureWithGetUserMedia(options: CaptureOptions): Promise<CaptureResult> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: options.source === "camera" ? "environment" : "user",
      width: { ideal: options.width ?? 1920 },
      height: { ideal: options.height ?? 1080 },
    },
  });

  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    await video.play();

    await new Promise((r) => setTimeout(r, 300));

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    const quality = (options.quality ?? 90) / 100;
    const dataUrl = canvas.toDataURL("image/jpeg", quality);

    return {
      dataUrl,
      base64: dataUrl.split(",")[1],
      format: "jpeg",
      saved: false,
      native: false,
    };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

async function captureWithFileInput(options: CaptureOptions): Promise<CaptureResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (options.source === "camera") {
      input.setAttribute("capture", "environment");
    }

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }

      try {
        const processed = await processImage(file, options);
        resolve(processed);
      } catch (e) {
        reject(e);
      }
    };

    input.oncancel = () => reject(new Error("Camera cancelled"));
    input.click();
  });
}

async function captureWithWeb(options: CaptureOptions): Promise<CaptureResult> {
  if (options.source === "camera" || options.source === "prompt") {
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        return await captureWithGetUserMedia(options);
      }
    } catch (e) {
      console.warn("[native-camera] getUserMedia failed, falling back to file input:", e);
    }
  }
  return captureWithFileInput(options);
}

async function processImage(file: File, options: CaptureOptions): Promise<CaptureResult> {
  const bitmap = await createImageBitmap(file);
  const maxW = options.width ?? bitmap.width;
  const maxH = options.height ?? bitmap.height;

  let w = bitmap.width;
  let h = bitmap.height;
  if (w > maxW || h > maxH) {
    const ratio = Math.min(maxW / w, maxH / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const quality = (options.quality ?? 90) / 100;
  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  return {
    dataUrl,
    base64: dataUrl.split(",")[1],
    format: "jpeg",
    saved: false,
    native: false,
  };
}

export async function capturePhoto(options: CaptureOptions = {}): Promise<CaptureResult> {
  if (isNative()) {
    try {
      return await captureWithNative(options);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("cancelled") || msg.includes("User cancelled")) {
        throw e;
      }
      console.warn("[native-camera] Native capture failed, falling back to web:", e);
    }
  }
  return captureWithWeb(options);
}

export async function captureVideo(): Promise<VideoCaptureResult> {
  return captureVideoWithPicker(isNative());
}

function captureVideoWithPicker(native: boolean): Promise<VideoCaptureResult> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/quicktime,video/webm,video/*";

    if (native) {
      input.setAttribute("capture", "environment");
    }

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No video selected"));
        return;
      }

      if (!file.type.startsWith("video/")) {
        reject(new Error("Selected file is not a video"));
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          webPath: objectUrl,
          duration: isFinite(video.duration) ? video.duration : undefined,
          native,
        });
      };
      video.onerror = () => {
        resolve({
          webPath: objectUrl,
          native,
        });
      };
      video.src = objectUrl;
    };

    input.oncancel = () => reject(new Error("Video capture cancelled"));
    input.click();
  });
}

export async function captureForKYC(): Promise<CaptureResult> {
  return capturePhoto({
    quality: 95,
    width: 2048,
    height: 2048,
    allowEditing: true,
    source: "prompt",
    resultType: "dataUrl",
  });
}

export async function captureForListing(): Promise<CaptureResult> {
  return capturePhoto({
    quality: 85,
    width: 1920,
    height: 1080,
    allowEditing: true,
    source: "prompt",
    resultType: "dataUrl",
  });
}

export async function checkCameraPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (isNative()) {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === "granted") return "granted";
      if (status.camera === "denied") return "denied";
      return "prompt";
    } catch {
      return "prompt";
    }
  }

  if (navigator.permissions) {
    try {
      const result = await navigator.permissions.query({ name: "camera" as PermissionName });
      return result.state as "granted" | "denied" | "prompt";
    } catch {
      return "prompt";
    }
  }

  return "prompt";
}

export async function requestCameraPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const result = await Camera.requestPermissions({ permissions: ["camera"] });
      return result.camera === "granted";
    } catch {
      return false;
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}
