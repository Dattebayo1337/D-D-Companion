import { createContext } from "react";
import type { Content } from "@/entities/content";
export const WorkshopNavigation = createContext<
  ((entry: Content) => void) | null
>(null);
