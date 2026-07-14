(function () {
  function svgBlob() {
    return new Blob([window.TimelineExport.serializeSvg()], { type: "image/svg+xml;charset=utf-8" });
  }

  function svgToImage() {
    return new Promise((resolve, reject) => {
      const svg = window.TimelineExport.getActiveSvg();
      if (!svg) {
        reject(new Error("No timeline SVG is available to export."));
        return;
      }

      const viewBox = window.TimelineExport.parseViewBox(svg);
      const image = new Image();
      const svgText = window.TimelineExport.serializeSvg();
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Timed out while rendering the SVG for image export."));
      }, 5000);

      image.onload = () => {
        window.clearTimeout(timeoutId);
        resolve({ image, width: viewBox.width, height: viewBox.height });
      };
      image.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error("Could not render the SVG for image export."));
      };
      image.src = url;
    });
  }

  function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create image file."));
      }, mimeType, quality);
    });
  }

  async function rasterBlob(format) {
    const { image, width, height } = await svgToImage();
    const scale = Math.max(3, Math.min(5, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d");
    context.setTransform(scale, 0, 0, scale, 0, 0);

    if (format === "jpg") {
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() || "#ffffff";
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    if (format === "jpg") return canvasToBlob(canvas, "image/jpeg", 0.92);
    return canvasToBlob(canvas, "image/png");
  }

  window.TimelineExport = window.TimelineExport || {};
  Object.assign(window.TimelineExport, {
    svgBlob,
    rasterBlob,
  });
})();
