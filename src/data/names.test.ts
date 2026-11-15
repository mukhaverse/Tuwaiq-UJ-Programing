// Matching typed names to members on the live board. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { findMember, normalizeName } from "./names.ts";

const roster = [
  { id: "sara", name: "Sara Mohammed Alharbi" },
  { id: "noura", name: "نورة عبدالله الغامدي" },
  { id: "aseel", name: "أسيل علي" },
  { id: "huda", name: "Huda Saleh Abu Alghaith", short: "Huda Abu Alghaith" },
  { id: "mona", name: "منى يحيى" },
];

test("spaces and case", () => {
  assert.equal(normalizeName("  Sara   MOHAMMED  alharbi "), "sara mohammed alharbi");
});

test("Arabic variants fold together", () => {
  assert.equal(normalizeName("أسيل"), normalizeName("اسيل"));
  assert.equal(normalizeName("إسراء"), normalizeName("اسراء"));
  assert.equal(normalizeName("نورة"), normalizeName("نوره"));
  assert.equal(normalizeName("منى"), normalizeName("مني"));
  assert.equal(normalizeName("مُنَى"), normalizeName("منى"));
  assert.equal(normalizeName("نـــورة"), normalizeName("نورة"));
});

test("full name, first + last, and card name all match", () => {
  assert.equal(findMember("sara mohammed alharbi", roster)?.id, "sara");
  assert.equal(findMember("Sara Alharbi", roster)?.id, "sara");
  assert.equal(findMember("نوره الغامدي", roster)?.id, "noura");
  assert.equal(findMember("اسيل علي", roster)?.id, "aseel");
  assert.equal(findMember("huda abu alghaith", roster)?.id, "huda");
  assert.equal(findMember("مني يحيي", roster)?.id, "mona");
});

test("partial or wrong names don't match", () => {
  assert.equal(findMember("Sara", roster), null);
  assert.equal(findMember("Sara Alharb", roster), null);
  assert.equal(findMember("", roster), null);
  assert.equal(findMember("   ", roster), null);
});
