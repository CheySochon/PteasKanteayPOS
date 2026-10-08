"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Check,
  Move,
  Sparkles,
} from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File, croppedPreviewUrl: string) => void;
  title?: string;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  title = "កែសម្រួល & Fit រូបភាព (Crop & Fit Image)",
}: ImageCropperModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  // Crop & Transform state
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [fitMode, setFitMode] = useState<"crop" | "fit">("crop");
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [bgColor, setBgColor] = useState<"white" | "transparent" | "dark">("white");
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setImgElement(img);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });

      // Auto detect if image is tall (like drink bottle/can) -> default to fit mode if height > width * 1.2
      if (img.naturalHeight > img.naturalWidth * 1.15) {
        setFitMode("fit");
      } else {
        setFitMode("crop");
      }
    };
  }, [imageSrc]);

  // Draw preview to canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElement) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 500; // Standard 500x500 1:1 image size
    canvas.width = size;
    canvas.height = size;

    // Clear background
    ctx.clearRect(0, 0, size, size);
    if (bgColor === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
    } else if (bgColor === "dark") {
      ctx.fillStyle = "#1e1e2d";
      ctx.fillRect(0, 0, size, size);
    }

    ctx.save();
    // Move to center
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);

    const nw = imgElement.naturalWidth;
    const nh = imgElement.naturalHeight;

    let drawW: number;
    let drawH: number;

    if (fitMode === "fit") {
      // Contain mode: scale to fit inside 500x500 completely
      const scale = Math.min(size / nw, size / nh) * zoom;
      drawW = nw * scale;
      drawH = nh * scale;
    } else {
      // Cover/Crop mode: scale to fill 500x500 completely
      const scale = Math.max(size / nw, size / nh) * zoom;
      drawW = nw * scale;
      drawH = nh * scale;
    }

    ctx.drawImage(imgElement, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [imgElement, zoom, rotation, fitMode, offset, bgColor]);

  useEffect(() => {
    if (isOpen && imgElement) {
      drawCanvas();
    }
  }, [isOpen, imgElement, drawCanvas]);

  // Mouse / Touch Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.touches[0].clientX - offset.x,
      y: e.touches[0].clientY - offset.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffset({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  const handleSaveCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `cropped_item_${Date.now()}.png`, {
          type: "image/png",
        });
        const previewUrl = URL.createObjectURL(blob);
        onCropComplete(file, previewUrl);
        onClose();
      },
      "image/png",
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#2b2c40] text-slate-800 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#55a060]/10 text-[#55a060]">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400">
                តម្រឹមរូបភាពទំនិញ/ភេសជ្ជៈ ឱ្យ Fit ស្អាតលើ 1:1 Square POS Card
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main Canvas Viewport Area */}
        <div className="p-5 space-y-4">
          <div className="relative mx-auto flex h-72 w-72 sm:h-80 sm:w-80 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#55a060]/40 bg-slate-900/5 dark:bg-black/30 shadow-inner select-none cursor-move">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="h-full w-full object-contain cursor-grab active:cursor-grabbing"
            />

            {/* Hint overlay */}
            <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] text-white flex items-center gap-1">
              <Move size={10} />
              <span>អូស (Drag) ដើម្បីរំកិលរូប</span>
            </div>
          </div>

          {/* Quick Fit Mode Toggle */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFitMode("fit");
                setOffset({ x: 0, y: 0 });
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all border ${
                fitMode === "fit"
                  ? "bg-[#55a060] text-white border-transparent shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
            >
              <Maximize2 size={14} />
              <span>Fit Center (សម្រាប់ភេសជ្ជៈ/ដប)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFitMode("crop");
                setOffset({ x: 0, y: 0 });
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all border ${
                fitMode === "crop"
                  ? "bg-[#55a060] text-white border-transparent shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
              }`}
            >
              <Sparkles size={14} />
              <span>Full Crop 1:1 (សម្រាប់ម្ហូប)</span>
            </button>
          </div>

          {/* Background selector for Fit mode */}
          {fitMode === "fit" && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400 font-medium">ពណ៌ផ្ទៃក្រោយ (Background):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBgColor("white")}
                  className={`h-6 w-6 rounded-full border-2 bg-white transition-all ${
                    bgColor === "white" ? "border-[#55a060] ring-2 ring-[#55a060]/30" : "border-slate-300"
                  }`}
                  title="White background"
                />
                <button
                  type="button"
                  onClick={() => setBgColor("dark")}
                  className={`h-6 w-6 rounded-full border-2 bg-[#1e1e2d] transition-all ${
                    bgColor === "dark" ? "border-[#55a060] ring-2 ring-[#55a060]/30" : "border-slate-600"
                  }`}
                  title="Dark background"
                />
                <button
                  type="button"
                  onClick={() => setBgColor("transparent")}
                  className={`h-6 w-6 rounded-full border-2 bg-transparent transition-all flex items-center justify-center text-[10px] ${
                    bgColor === "transparent" ? "border-[#55a060] ring-2 ring-[#55a060]/30" : "border-slate-400"
                  }`}
                  title="Transparent background"
                >
                  PNG
                </button>
              </div>
            </div>
          )}

          {/* Controls: Zoom & Rotate */}
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-1 items-center gap-2">
              <ZoomOut size={15} className="text-slate-400" />
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#55a060] h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <ZoomIn size={15} className="text-slate-400" />
              <span className="text-[11px] font-mono text-slate-500 w-9 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleRotate}
              className="flex h-8 px-2.5 items-center gap-1 rounded-lg bg-white dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 cursor-pointer shadow-xs"
              title="Rotate 90 degrees"
            >
              <RotateCw size={13} />
              <span>90°</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-[#232333]/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            បោះបង់ (Cancel)
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="flex items-center gap-1.5 rounded-xl bg-[#55a060] hover:bg-[#488c52] px-5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Check size={15} />
            <span>រក្សាទុក & Fit រូបភាព</span>
          </button>
        </div>
      </div>
    </div>
  );
}
