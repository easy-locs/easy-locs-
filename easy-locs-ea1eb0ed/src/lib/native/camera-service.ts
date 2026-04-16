export interface CameraPhoto {
  dataUrl: string;
  format: string;
  webPath?: string;
  blob?: Blob;
}

export type CameraSource = "camera" | "photos" | "prompt";

export async function takePhoto(source: CameraSource = "prompt"): Promise<CameraPhoto | null> {
  try {
    const { Camera, CameraResultType, CameraSource: CapCameraSource } = await import("@capacitor/camera");

    const sourceMap: Record<CameraSource, typeof CapCameraSource.Camera> = {
      camera: CapCameraSource.Camera,
      photos: CapCameraSource.Photos,
      prompt: CapCameraSource.Prompt,
    };

    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: sourceMap[source],
      correctOrientation: true,
      width: 1920,
      height: 1920,
      presentationStyle: "fullscreen",
    });

    return {
      dataUrl: photo.dataUrl ?? "",
      format: photo.format,
      webPath: photo.webPath,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("cancelled") || message.includes("User cancelled")) {
      return null;
    }
    console.warn("[camera] Capacitor camera unavailable, using file input:", message);
    return fallbackFileInput(source === "camera" ? "environment" : undefined);
  }
}

export async function takeMultiplePhotos(maxCount: number = 5): Promise<CameraPhoto[]> {
  try {
    const { Camera, CameraResultType } = await import("@capacitor/camera");

    const photos = await Camera.pickImages({
      quality: 85,
      limit: maxCount,
    });

    return photos.photos.map((p) => ({
      dataUrl: "",
      format: p.format,
      webPath: p.webPath,
    }));
  } catch (err) {
    console.warn("[camera] Multi-photo selection failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

function fallbackFileInput(capture?: string): Promise<CameraPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.setAttribute("capture", capture);

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }

      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          format: file.type.split("/")[1] ?? "jpeg",
          blob: file,
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function checkCameraPermission(): Promise<"granted" | "denied" | "prompt"> {
  try {
    const { Camera } = await import("@capacitor/camera");
    const status = await Camera.checkPermissions();
    return status.camera as "granted" | "denied" | "prompt";
  } catch (err) {
    console.warn("[camera] Permission check unavailable:", err instanceof Error ? err.message : err);
    return "prompt";
  }
}
