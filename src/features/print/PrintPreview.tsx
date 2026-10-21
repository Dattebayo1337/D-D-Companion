"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function PrintPreview({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) {
      dialog.current?.querySelectorAll("details").forEach((element) => {
        element.open = true;
      });
      dialog.current?.showModal();
    }
  }, [open]);
  return (
    <>
      <button
        type="button"
        className="button secondary"
        onClick={() => setOpen(true)}
      >
        {title}
      </button>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            id="companion-print"
            aria-label={title}
            onCancel={() => setOpen(false)}
          >
            <div className="print-controls">
              <button className="button primary" onClick={() => window.print()}>
                Печать / сохранить PDF
              </button>
              <button
                className="button secondary"
                onClick={() => setOpen(false)}
              >
                Закрыть
              </button>
              <p>
                Проверьте содержимое перед печатью. Выберите «Сохранить PDF» в
                окне принтера.
              </p>
            </div>
            <div className="print-pages">{children}</div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
