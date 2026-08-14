# Dwarf-planet astronomical data (for the solar-system simulator)

Real orbital + physical data for the five dwarf planets used by the simulator.
Compiled from primary sources: **JPL SBDB** (ssd.jpl.nasa.gov/tools/sbdb_lookup.html), **JPL Horizons**, the **JPL "Approximate Positions of the Planets" Table 1** (E. M. Standish, ssd.jpl.nasa.gov/planets/approx_pos.html), **NASA NSSDC dwarf-planet fact sheet** (nssdc.gsfc.nasa.gov/planetary/factsheet/dwarfplanetfact.html), and the peer-reviewed **stellar-occultation/spacecraft** measurements (New Horizons for Pluto, Dawn for Ceres, Sicardy et al. 2011 for Eris, Ortiz et al. 2017 for Haumea, Ortiz et al. 2012 / Hromakina et al. 2019 for Makemake). Values are cross-checked against at least two of these per dwarf planet.

> Status: research complete. This file records the **2023-Feb-25 (2460000.5) SBDB-epoch** values found by the research pass (Pluto uses the classic JPL approximate-position row, which is J2000-epoch). The catalog (`src/orbit/elements.ts`) ships the **full-precision JPL SBDB osculating elements as transcribed by the jsorrery project** (mgvez/jsorrery, `src/scenario/scenarios/bodies/`), converted to the J2000 mean-longitude form the orbit module consumes: L0 = Ω + ω + M shifted from each body's element epoch to J2000 by the mean motion, with Ldot = mean motion × 36525 and zero other rates. The two element sets differ at the ~0.01–0.1 % level in `a` and slightly more in `e`/angles because osculating elements are epoch-dependent; the catalog's set was chosen because it carries an exact M at a documented epoch (the 2023-epoch M for Ceres/Makemake/Haumea was only computed/estimated in this research) and still reproduces the published periods and distances within tolerance. Physical constants (diameter, rotation, temperature, moons) agree between this file and the catalog.
> Pluto note: the classic JPL row's "peri" column is the longitude of perihelion ϖ; the argument of perihelion ω = ϖ − Ω = 113.76497945°. The catalog stores peri0 = ϖ directly (the mean-longitude form), not ω.

## Pluto (134340)

```
DWARF: Pluto | a_au: 39.48211675 | e: 0.24882730 | i_deg: 17.14001206 | node_deg: 110.30393684 | peri_deg: 224.06891629 | M_deg: 14.86012204 | period_years: 247.94 | period_days: 90560 | diameter_km: 2376.6 | rotation_hours: 153.2935 | temp_K: 44 | moons: 5 | epoch: J2000.0 (JD 2451545.0)
```

- **a, e, i, Ω, ϖ (peri), L, M** — JPL "Approximate Positions of the Planets" Table 1 (Standish), epoch **J2000.0** (JD 2451545.0), elements valid 1800–2050 with rates per Julian century:
  `a = 39.48211675 AU` (da/dt = −0.00031596), `e = 0.24882730` (de/dt = +0.00005170), `I = 17.14001206°` (dI/dt = +0.00004818), `L = 238.92903833°` (dL/dt = +145.20780515), `peri = 224.06891629°` (dϖ/dt = −0.04062942), `node = 110.30393684°` (dΩ/dt = −0.01183482), `M = L − peri = 14.86012204°`.
  Source: ssd.jpl.nasa.gov/planets/approx_pos.html — exact strings re-confirmed verbatim in independent transcriptions: GitLab spyce `aprx_pos_planets.md`, VizieR CDS `VI/88/pluto.txt`, the zh-yue Wikipedia Pluto article, and the jsorrery project's `pluto.js` (which the catalog's `DWARF_ELEMENTS.Pluto` follows digit-for-digit).
  **Note on peri:** Table 1's "peri" column is the **longitude of perihelion ϖ**, not the argument of perihelion ω. The J2000 argument of perihelion is ω = ϖ − Ω = **113.76497945°**. JPL SBDB at epoch 2460000.5 (2023-Feb-25) gives the osculating **ω ≈ 113.83°** (Wikipedia infobox cites 113.834°; ssd.jpl.nasa.gov/tools/sbdb_lookup.html, sstr=134340). Mean anomaly at the SBDB epoch is **not** 14.86°: M advances at n ≈ 0.003972°/d (from a), so over 8455.5 d from J2000 to 2460000.5, M(2023-Feb-25) ≈ 14.8601 + 33.59 = **≈48.45°** (computed; the SBDB page's displayed M digit — verify on the lookup page).
- **Sidereal period** — 247.94 yr / 90,560 d (Wikipedia infobox citing JPL; NSSDC prints 247.92 yr / 90,553 d; Kepler at Table 1 a gives a^1.5 = 248.09 yr / 90,613 d — published values differ at the ~0.1 % level).
- **Diameter** — mean diameter 2376.6 km (mean radius 1188.3 ± 1.8 km; New Horizons, refined by Nimmo et al. 2017, *Icarus* 287:12–29 — Stern et al. 2015, *Science* 350:aad1815 first reported 1187 ± 4 km; NASA facts pages round to ~2,380 km).
- **Rotation** — 153.2935 h = 6.3872304 d, retrograde (Wikipedia citing JPL; NSSDC prints −6.3872 d / −153.2928 h — same value, fewer digits).
- **Temperature** — mean ~44 K (−229 °C), range 33–55 K (NSSDC Pluto fact sheet; Wikipedia infobox −240 to −218 °C).
- **Moons** — 5: Charon (1978), Nix (2005), Hydra (2005), Kerberos (2011), Styx (2012) (NASA/JPL; IAU MPC dwarf-planets page).

## Ceres (1)

```
DWARF: Ceres | a_au: 2.7670949 | e: 0.07854 | i_deg: 10.594 | node_deg: 80.32916 | peri_deg: 73.59758 | M_deg: ~17.3 (computed) | period_years: 4.60 | period_days: 1681.63 | diameter_km: 939.4 | rotation_hours: 9.07417 | temp_K: 168 | moons: 0 | epoch: 2460000.5 (2023-Feb-25)
```

- **a, e, i, Ω, ω** — JPL SBDB osculating elements, epoch **2460000.5 (2023-Feb-25)**: a = 2.7670949 AU, e = 0.07854, i = 10.594° (Wikipedia 10.593, NSSDC 10.59), Ω = 80.32916°, ω = 73.59758° (ssd.jpl.nasa.gov/tools/sbdb_lookup.html, sstr=Ceres; cross-checked via spacereference.org/asteroid/1-ceres-a801-aa and heavens-above.com/MinorPlanet.aspx?desig=1). Note: e = 0.0785 is the current SBDB value; older sources cite 0.0758.
- **M at epoch** — ~17.3° at 2460000.5: **computed**, not snippet-verified. Anchor: Ceres perihelion 2022-Dec-06 (in-the-sky.org/news.php?id=20221206_13_100), 81 days before 2023-Feb-25 → 81/1681.63 × 360 = 17.3°; consistent with Ceres opposition 2023-03-21. M advances ~0.214°/day; verify exact digits live at ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=Ceres before hard-coding.
- **Sidereal period** — 4.60 yr / 1,681.63 d (NASA rounds to 1,682 d; NSSDC 4.60 yr).
- **Diameter** — mean diameter 939.4 km (mean radius 469.7 km, Dawn, Park et al. 2019, *Icarus* 319:812; Ermakov et al. 2017, *JGR Planets*; Russell et al. 2016, *Science* 353).
- **Rotation** — 9.07417 h (Chamberlain et al. 2007, *Icarus*; Wikipedia; NASA ~9 h; NSSDC 9.07 h).
- **Temperature** — mean ~168 K (range ~90–235 K; MAPS 2018, doi:10.1111/maps.13024, gives 116–243 K) (NSSDC Ceres fact sheet; Wikipedia).
- **Moons** — 0 (none; Dawn imaging; HST satellite-search papers).

## Eris (136199)

```
DWARF: Eris | a_au: 67.668 | e: 0.44068 | i_deg: 44.040 | node_deg: 35.951 | peri_deg: 151.639 | M_deg: 204.16 | period_years: 557.55 | period_days: 203600 | diameter_km: 2326 | rotation_hours: 25.9 (legacy) / ~378.9 (tidal lock) | temp_K: 42 | moons: 1 | epoch: 2460000.5 (2023-Feb-25)
```

- **a, e, i, Ω, ω, M** — JPL SBDB osculating elements, epoch **2460000.5 (2023-Feb-25)**: a = 67.668 AU, e = 0.44068, i = 44.040°, Ω = 35.951°, ω = 151.639°, M = 204.16° (Wikipedia infobox citing JPL SBDB; cross-checked via spacereference.org/asteroid/136199-eris-2003-ub313, in-the-sky.org/data/object.php?id=15, and astro.vanbuitenen.nl/minorplanet/Eris). Note: older element sets give a ≈ 67.86 AU — epoch-dependent.
- **Sidereal period** — 557.55 yr / 203,600 d (Wikipedia citing JPL; lesia.obspm.fr/lucky-star/obj.php?p=359; a^1.5 at 67.668 AU = 556.7 yr).
- **Diameter** — 2326 ± 12 km mean diameter (radius 1163 ± 6 km), measured by stellar occultation 2010-11-06 (Sicardy et al. 2011, *Nature* 478:493); consistent with Herschel/PACS thermal emission.
- **Rotation** — **literature conflict**: 25.9 h (traditional light-curve value) vs **~15.786 d ≈ 378.9 h** — 2020–2023 studies show Eris is tidally locked (synchronous with Dysnomia; Szabó et al. 2023, A&A 669; arxiv.org/abs/2211.07987; Holler et al. 2021, *Icarus* 355:14130). Simulator should use the tidal-lock value or expose both.
- **Temperature** — mean ~42 K (range ~30–55 K) (Wikipedia citing JPL/NSSDC; nineplanets.org/eris).
- **Moons** — 1: Dysnomia (Brown et al. 2006; IAU). Dysnomia orbit (Holler et al. 2021): P = 15.786 d, a ≈ 37,273 km, e ≈ 0.0079.

## Makemake (136472)

```
DWARF: Makemake | a_au: 45.4 | e: 0.156 | i_deg: 29.0 | node_deg: 79.6 | peri_deg: 298.4 | M_deg: ~152 (verify) | period_years: 305.34 | period_days: 111526 | diameter_km: 1430 | rotation_hours: 22.83 | temp_K: ~36 | moons: 1 | epoch: 2460000.5 (2023-Feb-25)
```

- **a, e, i, Ω, ω** — JPL SBDB osculating elements, epoch **2460000.5 (2023-Feb-25)**: a = 45.4 AU (45.4–45.8 across sources; older refs round 45.79), e ≈ 0.156 (0.16), i ≈ 29.0°, Ω ≈ 79.6°, ω ≈ 298.4° (JPL SBDB sstr=136472, archived sbdb.cgi pages; Wikipedia infobox; in-the-sky.org). Note: Wikipedia's Makemake infobox cites JPL Horizons at epoch JD 2461000.5 (2025-Nov-21) — same element set; M differs by ≈ n·Δt ≈ 3° between the two epochs.
- **M at epoch** — ≈152° at 2460000.5 (agent-reported, **not snippet-verified** — read the exact digit off the JPL SBDB lookup page before hard-coding; sanity check: M = 152° implies perihelion ≈ 1894 AD and aphelion ≈ 2047 AD).
- **Sidereal period** — 305.34 yr / 111,526 d (JPL-derived; Wikipedia rounds 306.2 yr / 111,845 d).
- **Diameter** — ≈1430 km mean diameter (mean radius ≈ 715 km), stellar occultation (Ortiz et al. 2012, *Nature* 491:566); oblate — equatorial ≈ 751 km / polar ≈ 707 km.
- **Rotation** — 22.83 h (Heinze et al. 2009, *AJ* 138:428); Hromakina et al. 2019, *A&A* 625:A46, suggests 7.77 h (≈ 22.83/3 ambiguity).
- **Temperature** — ~30–40 K (mean ≈ 36 K quoted) (Wikipedia; Lim et al. 2010).
- **Moons** — 1: MK 2 / S/2015 (136472) 1 (discovered 2015, announced 2016; ~175 km; ~21,000 km separation; ~12.4 d period; refined orbit 2025, arXiv:2509.05880).

## Haumea (136108)

```
DWARF: Haumea | a_au: 43.13 | e: 0.194 | i_deg: 28.2 | node_deg: 121.8 | peri_deg: 240.2 | M_deg: ~203 (estimated) | period_years: 283.28 | period_days: 103410 | diameter_km: 2322x1704x1138 (volumetric mean ~1650) | rotation_hours: 3.915341 | temp_K: ~40 | moons: 2 | epoch: 2460000.5 (2023-Feb-25)
```

- **a, e, i, Ω, ω** — JPL SBDB osculating elements, epoch **2460000.5 (2023-Feb-25)**: a = 43.13 AU, e ≈ 0.194 (0.191–0.194 across epochs), i ≈ 28.2°, Ω ≈ 121.8° (121.75–121.8), ω ≈ 240.2° (240.2–240.3) (ssd.jpl.nasa.gov/tools/sbdb_lookup.html, sstr=136108; cross-checked via in-the-sky.org/data/object.php?id=A136108 and astro.vanbuitenen.nl/minorplanet/Haumea).
- **M at epoch** — ≈203°: **estimated, not snippet-verified** (anchor: Haumea at aphelion ~2005, where M = 180°, so M ≈ 180° + 1.271°/yr × 18.15 yr ≈ 203° at 2023-Feb-25). Grab exact digits from the JPL SBDB lookup before hard-coding.
- **Sidereal period** — 283.28 yr / 103,410 d (Wikipedia citing JPL; a^1.5 at 43.13 AU = 283.2 yr).
- **Dimensions** — triaxial ellipsoid **2,322 × 1,704 × 1,138 km** (± ~90/80/50 km), measured by stellar occultation (Ortiz et al. 2017, *Nature* 550:219); equivalent-volume mean diameter ≈ 1,650 km (mean radius ≈ 798 km — note Wikipedia's infobox still lists the older mean radius of 780 km).
- **Rotation** — 3.915341 h = 0.163146 d (fastest large TNO; NSSDC / JPL; consistent with Müller et al. 2019, *Icarus* 334:39 thermal data).
- **Temperature** — mean ~40 K (range ~32–50 K) (NSSDC dwarf-planet fact sheet; Müller et al. 2019).
- **Moons** — 2: Hiʻiaka and Namaka (Brown et al. 2005; Ragozzine & Brown 2009, *AJ* 137:4766).

## Element-set summary

| Body | Element set / epoch used | Notes |
|---|---|---|
| Pluto | JPL Approximate Positions Table 1, J2000.0 (JD 2451545.0) | `peri` column = longitude of perihelion ϖ; ω = ϖ − Ω = 113.76° (J2000). SBDB osculating set (epoch 2460000.5) has ω ≈ 113.83° and M ≈ 48.45° |
| Ceres | JPL SBDB osculating, 2460000.5 (2023-Feb-25) | a = 2.7670949, e = 0.07854, i = 10.594°, Ω = 80.32916°, ω = 73.59758°; M ≈ 17.3° at epoch (computed) |
| Eris | JPL SBDB osculating, 2460000.5 (2023-Feb-25) | a = 67.668, e = 0.44068, i = 44.040°, Ω = 35.951°, ω = 151.639°, M = 204.16° at epoch; rotation tidal-locked ≈ 378.9 h |
| Makemake | JPL SBDB osculating, 2460000.5 (2023-Feb-25) | a = 45.4, e ≈ 0.156, i ≈ 29.0°, Ω ≈ 79.6°, ω ≈ 298.4°; M ≈ 152° at epoch (verify; Wikipedia infobox cites Horizons 2461000.5) |
| Haumea | JPL SBDB osculating, 2460000.5 (2023-Feb-25) | a = 43.13, e ≈ 0.194, i ≈ 28.2°, Ω ≈ 121.8°, ω ≈ 240.2°; M ≈ 203° at epoch (estimated) |

**Conversion note for the sim** (see `docs/adr/0001-keplerian-orbits.md`): the simulator integrates fixed Keplerian orbits, so `(a, e, i, Ω, ω, M)` at the stated epoch defines the orbit and the body's starting true longitude; `period = a^1.5` years (or the published sidereal period above) drives mean motion.
