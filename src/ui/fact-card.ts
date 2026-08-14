/**
 * Fact card UI (ticket #9): the panel of real data and one fun fact that
 * opens when a body is inspected (CONTEXT.md). Shows the six fact fields —
 * diameter, distance from the Sun, day length, orbital period, average
 * temperature, and number of moons — plus a "vs Earth" size bar and one fun
 * fact, all straight from the body catalog. Closes on Escape, on its close
 * button, or when the camera releases focus (clicking away in the scene,
 * wired in main.ts). Clicking another body switches the card.
 *
 * The card is generic: given any body's canonical name it looks up the
 * catalog facts and renders them. Formatting is presentation-only, verified
 * at the UI-interaction seam (ADR-0004) by the e2e suite, not unit-tested.
 * Ticket #12: showing the card plays a soft inspect chime and closing it a
 * lower release note, through the soundscape.
 */

import type { Soundscape } from "../audio/soundscape";
import { getElementIn } from "./dom";
import { factsFor, PLANET_FACTS } from "../body/catalog";

/** Earth's diameter [km] — the reference for the "vs Earth" size bar. */
const EARTH_DIAMETER_KM = PLANET_FACTS.Earth.diameterKm;
/** Width of Earth's reference bar; the body bar scales from it. */
const EARTH_BAR_WIDTH_PX = 64;

export interface FactCard {
  /** Open the card for a body (no-op if the catalog has no facts for it). */
  show(name: string): void;
  /** Close the card. */
  hide(): void;
  /** Whether the card is currently open. */
  readonly open: boolean;
}

export function initFactCard(sounds: Soundscape): FactCard {
  const card = buildCard();
  document.body.appendChild(card);

  const nameEl = getElementIn<HTMLHeadingElement>(card, "fact-card-name");
  const values = new Map<string, HTMLElement>();
  for (const el of card.querySelectorAll<HTMLElement>("[data-fact]")) {
    values.set(el.dataset.fact!, el);
  }
  const bodyFill = getElementIn<HTMLElement>(card, "fact-vs-body-fill");
  const bodyName = getElementIn<HTMLElement>(card, "fact-vs-name");
  const vsLabel = getElementIn<HTMLElement>(card, "fact-vs-label");
  const funFact = getElementIn<HTMLElement>(card, "fact-fun-fact");

  function show(name: string): void {
    const facts = factsFor(name);
    if (!facts) return;
    nameEl.textContent = name;
    values.get("diameter")!.textContent = fmtKm(facts.diameterKm);
    values.get("distance")!.textContent = fmtAu(facts.distanceFromSunAu);
    values.get("day")!.textContent = fmtHours(facts.dayLengthHours);
    values.get("period")!.textContent = fmtDays(facts.orbitalPeriodDays);
    values.get("temperature")!.textContent = fmtTemp(facts.temperatureK);
    values.get("moons")!.textContent = fmtMoons(facts.moonCount);
    const ratio = facts.diameterKm / EARTH_DIAMETER_KM;
    // The bar is Earth's width times the ratio; CSS clamps it to the track
    // (max-width) and keeps tiny bodies visible (min-width), so the label
    // carries the exact figure.
    bodyFill.style.width = `${ratio * EARTH_BAR_WIDTH_PX}px`;
    bodyName.textContent = name;
    vsLabel.textContent = fmtVsEarth(ratio);
    funFact.textContent = facts.funFact;
    card.hidden = false;
    sounds.blip("inspect");
  }

  function hide(): void {
    card.hidden = true;
    sounds.blip("release");
  }

  getElementIn<HTMLButtonElement>(card, "fact-card-close").addEventListener("click", hide);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  return { show, hide, get open() { return !card.hidden; } };
}

// ---- Formatting ----------------------------------------------------------

/** 3-4 significant digits, trailing zeros trimmed ("1", "0.273", "365.3"). */
function trimSig(value: number, digits: number): string {
  return String(Number(value.toPrecision(digits)));
}

function fmtKm(km: number): string {
  const value = km >= 1000 ? Math.round(km).toLocaleString("en-US") : trimSig(km, 3);
  return `${value} km`;
}

/** The Sun is the frame origin: distance from the Sun does not apply. */
function fmtAu(au: number): string {
  return au === 0 ? "—" : `${trimSig(au, 3)} AU`;
}

function fmtHours(hours: number): string {
  const value = hours >= 100 ? Math.round(hours).toLocaleString("en-US") : trimSig(hours, 3);
  return `${value} h`;
}

/** The Sun does not orbit: its period is stored as 0 and shown as "—". */
function fmtDays(days: number): string {
  if (days === 0) return "—";
  const value = days >= 1000 ? Math.round(days).toLocaleString("en-US") : trimSig(days, 4);
  return `${value} days`;
}

function fmtTemp(kelvin: number): string {
  const value = kelvin >= 1000 ? Math.round(kelvin).toLocaleString("en-US") : Math.round(kelvin);
  return `${value} K`;
}

function fmtMoons(count: number): string {
  return count === 1 ? "1 moon" : `${count} moons`;
}

function fmtVsEarth(ratio: number): string {
  return `${trimSig(ratio, 3)}× Earth`;
}

// ---- DOM ------------------------------------------------------------------

function buildCard(): HTMLElement {
  const card = document.createElement("aside");
  card.id = "fact-card";
  card.className = "fact-card";
  card.hidden = true;
  card.setAttribute("aria-label", "Body facts");

  const header = document.createElement("header");
  header.className = "fact-card-header";
  const name = document.createElement("h2");
  name.id = "fact-card-name";
  const close = document.createElement("button");
  close.id = "fact-card-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close facts");
  close.textContent = "×";
  header.append(name, close);

  const list = document.createElement("dl");
  list.className = "fact-list";
  for (const [label, key] of [
    ["Diameter", "diameter"],
    ["Distance from Sun", "distance"],
    ["Day length", "day"],
    ["Orbital period", "period"],
    ["Avg. temperature", "temperature"],
    ["Moons", "moons"]
  ] as const) {
    const row = document.createElement("div");
    row.className = "fact-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.dataset.fact = key;
    row.append(dt, dd);
    list.appendChild(row);
  }

  const vs = document.createElement("div");
  vs.className = "vs-earth";
  const vsTitle = document.createElement("span");
  vsTitle.className = "vs-earth-title";
  vsTitle.textContent = "vs Earth";
  const vsRows = document.createElement("div");
  vsRows.className = "vs-earth-rows";
  vsRows.append(
    buildVsRow("Earth", "vs-earth-fill", null, null),
    buildVsRow("", "vs-body-fill", "fact-vs-name", "fact-vs-body-fill")
  );
  const vsLabel = document.createElement("span");
  vsLabel.className = "vs-earth-label";
  vsLabel.id = "fact-vs-label";
  vs.append(vsTitle, vsRows, vsLabel);

  const funFact = document.createElement("p");
  funFact.className = "fact-fun-fact";
  funFact.id = "fact-fun-fact";

  card.append(header, list, vs, funFact);
  return card;
}

function buildVsRow(
  name: string,
  fillClass: string,
  nameId: string | null,
  fillId: string | null
): HTMLElement {
  const row = document.createElement("div");
  row.className = "vs-row";
  const label = document.createElement("span");
  label.className = "vs-row-name";
  label.textContent = name;
  if (nameId) label.id = nameId;
  const track = document.createElement("div");
  track.className = "vs-track";
  const fill = document.createElement("div");
  fill.className = `vs-fill ${fillClass}`;
  if (fillId) fill.id = fillId;
  track.appendChild(fill);
  row.append(label, track);
  return row;
}
