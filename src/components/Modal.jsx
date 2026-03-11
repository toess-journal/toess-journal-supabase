import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Modal — renders via React Portal into document.body so it is
 * never clipped by parent overflow/transform/stacking contexts.
 *
 * Usage:
 *   <Modal onClose={() => setOpen(false)}>
 *     <div>…content…</div>
 *   </Modal>
 *
 * Props:
 *   onClose   – called when backdrop is clicked
 *   maxWidth  – Tailwind max-w class for the sheet, default "max-w-3xl"
 *   children
 */
/**
 * children can be a function to receive `close`:
 *   <Modal onClose={...}>
 *     {(close) => <button onClick={close}>✕</button>}
 *   </Modal>
 *
 * Or plain JSX — backdrop click still closes with animation.
 */
export default function Modal({ onClose, maxWidth = "max-w-3xl", children }) {
  const [visible, setVisible] = useState(false);
  const closingRef = useRef(false);

  // Animate in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Runs exit animation THEN calls onClose
  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return createPortal(
    <div
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
        backgroundColor: visible ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0)",
        transition: "background-color 300ms ease",
      }}
      className="sm:!items-center sm:!p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-t-2xl sm:rounded-2xl w-full ${maxWidth}`}
        style={{
          maxHeight: "92vh",
          overflowY: "auto",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          opacity: 1,
          transition: "transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 250ms ease",
        }}
        data-modal-sheet="true"
      >
        {/* Support render-prop pattern so inner ✕ buttons can trigger animated close */}
        {typeof children === "function" ? children(handleClose) : children}
      </div>

      <style>{`
        @media (min-width: 640px) {
          [data-modal-sheet="true"] {
            transform: ${visible ? "scale(1)" : "scale(0.94)"} !important;
            opacity: ${visible ? "1" : "0"} !important;
            transition: transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 220ms ease !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}