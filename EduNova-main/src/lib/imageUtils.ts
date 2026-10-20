export const compressImage = (
  dataUrl: string,
  maxWidth = 1000,
  maxHeight = 1400,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(dataUrl);
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);

      let width = img.width;
      let height = img.height;

      // Scale down proportionally if either width or height exceeds maximum
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      // Compress to JPEG with specified quality
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
  });
};
