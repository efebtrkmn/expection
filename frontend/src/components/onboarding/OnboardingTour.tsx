"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useTourStore, tourSteps } from "@/lib/tour-store";

export function OnboardingTour() {
  const { isActive, currentStep, nextStep, prevStep, endTour } =
    useTourStore();
  const [highlight, setHighlight] = useState<DOMRect | null>(null);

  const step = tourSteps[currentStep];
  const isLast = currentStep === tourSteps.length - 1;
  const isFirst = currentStep === 0;

  const updateHighlight = useCallback(() => {
    if (!isActive || !step) return;
    const el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      setHighlight(rect);
    } else {
      setHighlight(null);
    }
  }, [isActive, step]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => updateHighlight());
    window.addEventListener("resize", updateHighlight);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateHighlight);
    };
  }, [updateHighlight]);

  if (!isActive || !step) return null;

  const getTooltipPosition = () => {
    if (!highlight) return { top: "50%", left: "50%" };
    const padding = 16;
    switch (step.position) {
      case "right":
        return {
          top: `${highlight.top + highlight.height / 2}px`,
          left: `${highlight.right + padding}px`,
          transform: "translateY(-50%)",
        };
      case "left":
        return {
          top: `${highlight.top + highlight.height / 2}px`,
          right: `${window.innerWidth - highlight.left + padding}px`,
          transform: "translateY(-50%)",
        };
      case "bottom":
        return {
          top: `${highlight.bottom + padding}px`,
          left: `${highlight.left + highlight.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "top":
        return {
          bottom: `${window.innerHeight - highlight.top + padding}px`,
          left: `${highlight.left + highlight.width / 2}px`,
          transform: "translateX(-50%)",
        };
      default:
        return {};
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100]" onClick={endTour}>
        {/* Dark Overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {highlight && (
                <rect
                  x={highlight.left - 6}
                  y={highlight.top - 6}
                  width={highlight.width + 12}
                  height={highlight.height + 12}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#tour-mask)"
          />
          {highlight && (
            <rect
              x={highlight.left - 6}
              y={highlight.top - 6}
              width={highlight.width + 12}
              height={highlight.height + 12}
              rx="12"
              fill="none"
              stroke="rgba(99,102,241,0.5)"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Tooltip */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute z-[101] w-80 glass-card p-5"
          style={getTooltipPosition()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brand-400" />
              <span className="text-xs text-zinc-500">
                {currentStep + 1} / {tourSteps.length}
              </span>
            </div>
            <button
              onClick={endTour}
              className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <h3 className="text-sm font-semibold text-white mb-1.5">
            {step.title}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={endTour}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Atla
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  Geri
                </button>
              )}
              <button
                onClick={isLast ? endTour : nextStep}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs text-white transition-colors cursor-pointer"
              >
                {isLast ? "Bitir" : "İleri"}
                {!isLast && <ArrowRight size={12} />}
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {tourSteps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentStep ? "bg-brand-500" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
