// Matching a typed name to a roster member (the live board's "who are you?").
// Shared by the Worker and its tests; no browser or Worker APIs here.

/**
 * A name reduced to what matters for matching: trimmed, single spaces, lowercase,
 * and Arabic spelling variants folded together (أ إ آ ٱ → ا, ى → ي, ة → ه),
 * without tashkeel or tatweel.
 */
export function normalizeName(name: string): string {
  return (
    name
      .normalize("NFKC")
      // Tashkeel (harakat, shadda, sukun, superscript alef) and tatweel.
      .replace(/[ً-ٰٟـ]/g, "")
      .replace(/[آأإٱ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      // Zero-width and direction marks people paste in by accident.
      .replace(/[​-‏‪-‮⁦-⁩﻿]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
  );
}

/** First and last word, for long names (mirrors shortName in members.js). */
export function displayName(member: { name: string; short?: string | null }): string {
  if (member.short) return member.short;
  const words = member.name.trim().split(/\s+/);
  return words.length > 2 ? `${words[0]} ${words.at(-1)}` : member.name.trim();
}

/** Every spelling that counts as this member: their full name, card name, and first + last word. */
export function nameKeys(member: { name: string; short?: string | null }): string[] {
  const keys = new Set([normalizeName(member.name), normalizeName(displayName(member))]);
  if (member.short) keys.add(normalizeName(member.short));
  keys.delete("");
  return [...keys];
}

/** The first member (in the order given) whose name matches what was typed, or null. */
export function findMember<T extends { name: string; short?: string | null }>(typed: string, list: T[]): T | null {
  const key = normalizeName(typed);
  if (!key) return null;
  return list.find((m) => nameKeys(m).includes(key)) ?? null;
}
