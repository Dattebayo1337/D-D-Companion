import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { Content } from "@/entities/content";
import { changeReadingList, useReadingList } from "./reading-list";
export function ReadingBookmark({ entry }: { entry: Content }) {
  const { list, error } = useReadingList();
  const [failure, setFailure] = useState("");
  const { id, edition } = entry;
  useEffect(() => {
    try {
      changeReadingList("visit", { id, edition });
    } catch {
      /* Reading stays available when the browser blocks persistence. */
    }
  }, [id, edition]);
  const saved = list.favorites.some((e) => e.id === id);
  return (
    <div className="reading-bookmark">
      <button
        className="button secondary"
        aria-pressed={saved}
        onClick={() => {
          try {
            changeReadingList("toggle", { id, edition });
            setFailure("");
          } catch (e) {
            setFailure(
              e instanceof Error
                ? e.message
                : "Браузер не разрешил сохранить закладку.",
            );
          }
        }}
      >
        <Star size={17} fill={saved ? "currentColor" : "none"} />
        {saved ? "Убрать из избранного" : "В избранное"}
      </button>
      {(error || failure) && <p role="alert">{failure || error}</p>}
    </div>
  );
}
