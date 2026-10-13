import type { Locale } from "./config";
import type { Dictionary } from "./types";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";
import { zh } from "./dictionaries/zh";
import { hi } from "./dictionaries/hi";
import { ja } from "./dictionaries/ja";
import { ru } from "./dictionaries/ru";

const dictionaries: Record<Locale, Dictionary> = { en, ar, zh, hi, ja, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? en;
}

export type { Dictionary };
