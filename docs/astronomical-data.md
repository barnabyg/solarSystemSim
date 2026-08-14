# Real Astronomical Data for the Solar System Simulator

Compiled for the simulator's fact cards and default physics. Primary reference:
**NASA NSSDC Planetary Fact Sheets** (https://nssdc.gsfc.nasa.gov/planetary/factsheet/),
cross-checked against JPL Solar System Dynamics physical parameters, Wikipedia, and
current IAU/Moon-number announcements (see "Moons" notes per body).

> **Method note:** Values below are the canonical NSSDC fact-sheet figures (stable
> reference constants), confirmed against archived copies of the NSSDC pages surfaced
> by web search plus independent reputable sources. Archived NSSDC copies used:
> https://web.archive.org/web/*/nssdc.gsfc.nasa.gov/planetary/factsheet/{planet}fact.html

---

## SUN

- `radius_km: 696000` (equatorial; mean radius 696000 km, diameter ~1,392,000 km)
- `temp_K: 5772` — **surface (photosphere) temperature**, IAU 2015 nominal value
  (older sources: 5778 K; NSSDC ~5772 K)
- `rotation_hours: 609.1` — sidereal rotation at the equator, 25.38 days
  (differential rotation: ~25.4 d at equator to ~34.4 d at poles)
- `moons: 0` — the Sun has no moons; the 8 planets orbit it

Sources: [NSSDC Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html)
(archived copy: https://web.archive.org/web/20130928004020/http://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html)

## MERCURY

- `radius_km: 2439.7` (equatorial ≈ mean; essentially spherical)
- `distance_au: 0.387` | `distance_1e6km: 57.9`
- `rotation_hours: 1407.6` (sidereal, 58.646 days; 3:2 spin–orbit resonance)
- `period_days: 87.969` (0.2408 yr)
- `temp_K: 440` — **mean surface temperature** (NSSDC; subsolar ~700 K, night side ~100 K)
- `moons: 0`

Sources: [NSSDC Mercury Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html)
(archived copy: https://web.archive.org/web/20140702023145/http://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html)

## VENUS

- `radius_km: 6051.8` (equatorial ≈ mean)
- `distance_au: 0.723` | `distance_1e6km: 108.2`
- `rotation_hours: -5832.5` — **retrograde**, 243.025 days (negative = retrograde;
  rotation is slower than its orbit)
- `period_days: 224.701` (0.6152 yr)
- `temp_K: 737` — **mean surface temperature** (NSSDC; greenhouse-heated)
- `moons: 0`

Sources: [NSSDC Venus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html)
(archived copy: https://web.archive.org/web/20150318004939/http://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html)

## EARTH

- `radius_km: 6378.1` (equatorial; mean radius 6371 km)
- `distance_au: 1.000` | `distance_1e6km: 149.6`
- `rotation_hours: 23.9345` (sidereal day; solar day = 24 h)
- `period_days: 365.256` (1.0000 yr, sidereal)
- `temp_K: 288` — **global mean surface temperature** (NSSDC)
- `moons: 1`

Sources: [NSSDC Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)
(archived copies: https://web.archive.org/web/19970607223047/http://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html,
https://web.archive.org/web/20220524013055/https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)

## MARS

- `radius_km: 3396.2` (equatorial; mean radius 3389.5 km)
- `distance_au: 1.524` | `distance_1e6km: 227.9`
- `rotation_hours: 24.6229` (sidereal; solar day = 24.66 h)
- `period_days: 686.980` (1.8808 yr)
- `temp_K: 210` — **mean surface temperature** (NSSDC)
- `moons: 2` (Phobos, Deimos)

Sources: [NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html)

## JUPITER

- `radius_km: 71492` (equatorial, 1-bar level; mean radius 69911 km)
- `distance_au: 5.203` | `distance_1e6km: 778.6`
- `rotation_hours: 9.925` (System III, magnetosphere)
- `period_days: 4332.589` (11.862 yr)
- `temp_K: 110` — **effective temperature** (NSSDC; blackbody/equilibrium ~102 K,
  observed effective ~124 K with internal heat)
- `moons: 95` (NSSDC count as of 2023; still the current count, no later additions announced)

Sources: [NSSDC Jupiter Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html);
moons: [PopSci coverage of the 95 count](https://www.popsci.com/science/saturn-new-moons/)

> **Catalog note:** the simulator catalog (`src/body/catalog.ts`) ships the **current** IAU-confirmed counts — Saturn 274 (March 2025), Uranus 29 (August 2025), Jupiter 95, Neptune 16 — per spec story 29 (facts the user can trust).

## SATURN

- `radius_km: 60268` (equatorial, 1-bar level; mean radius 58232 km)
- `distance_au: 9.537` | `distance_1e6km: 1433.5`
- `rotation_hours: 10.656` (System III)
- `period_days: 10759.22` (29.457 yr)
- `temp_K: 81` — **effective temperature** (NSSDC)
- `moons: 146` (NSSDC count as of 2023) — **updated: 274** confirmed as of March 2025
  (128 new moons announced/recognized by the IAU, MPC)

Sources: [NSSDC Saturn Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html)
(archived copy: https://web.archive.org/web/20201106232750/https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html);
274-moon announcement: [SwRI/CBC/Straits Times, Mar 2025](https://www.straitstimes.com/world/united-states/saturn-gains-128-new-moons-bringing-its-total-to-274)

## URANUS

- `radius_km: 25559` (equatorial, 1-bar level; mean radius 25362 km)
- `distance_au: 19.191` | `distance_1e6km: 2872.5`
- `rotation_hours: -17.24` — **retrograde** (negative = retrograde; axis tilted ~98°)
- `period_days: 30688.5` (84.011 yr)
- `temp_K: 58` — **effective temperature** (NSSDC)
- `moons: 28` (NSSDC count as of 2024) — **updated: 29** as of August 2025
  (tiny moon discovered via JWST, SwRI-led survey; announced Aug 2025)

Sources: [NSSDC Uranus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html);
29th moon: [SwRI press release, Aug 2025](https://www.swri.org/newsroom/press-releases/swri-led-webb-telescope-survey-discovers-new-moon-orbiting-uranus),
[EurekAlert](https://www.eurekalert.org/news-releases/1095256), [New Scientist](https://www.newscientist.com/article/2493197-new-moon-discovered-orbiting-uranus-is-its-smallest-one/)

## NEPTUNE

- `radius_km: 24764` (equatorial, 1-bar level; mean radius 24622 km)
- `distance_au: 30.07` | `distance_1e6km: 4495.1`
- `rotation_hours: 16.11` (sidereal)
- `period_days: 60182` (164.79 yr)
- `temp_K: 59` — **effective temperature** (NSSDC)
- `moons: 16` (NSSDC count as of 2024; updated from 14 by the Feb 2024 IAU
  announcement of S/2002 N5 and S/2021 N1)

Sources: [NSSDC Neptune Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html);
Feb 2024 moon announcements: [CBS News](https://www.cbsnews.com/miami/news/3-new-moons-discovered-uranus-neptune/),
[PopSci](https://www.popsci.com/science/uranus-neptune-new-moons/)

---

## ASTEROID BELT (main belt, between Mars and Jupiter)

- `inner_au: 2.1–2.2` — inner edge of the main belt (4:1 Kirkwood gap resonance
  with Jupiter at ~2.06 AU; belt proper starts ~2.1–2.2 AU)
- `outer_au: 3.2–3.3` — outer edge (2:1 Kirkwood gap at ~3.28 AU; belt proper
  ends ~3.2–3.3 AU)
- `half_thickness_au: ~0.5` — typical vertical half-thickness (total vertical
  extent ~1 AU; most main-belt asteroids have inclinations < 20°)
- `count_1km_plus: 1.1–1.9 million` — estimated number of asteroids larger than
  1 km (IRAS-based census, Tedesco & Desert 2002; ESA/NASA commonly quote
  "1.1–1.9 million", often rounded to "1–2 million")

Sources: [ESA: New study reveals twice as many asteroids as previously believed](https://www.esa.int/Science_Exploration/Space_Science/New_study_reveals_twice_as_many_asteroids_as_previously_believed),
[CNN coverage of the census](https://www.cnn.com/2002/TECH/space/04/05/asteroid.survey/),
[Wikipedia: Asteroid belt](https://en.wikipedia.org/wiki/Asteroid_belt),
[Purdue EAS-105 lecture (belt extent)](https://web.ics.purdue.edu/~nowack/geos105/lect19-dir/lecture19.htm)

## TEMPERATURE DEFINITION SUMMARY

| Body    | Definition used            | Value (K) |
|---------|----------------------------|-----------|
| Sun     | Surface (photosphere)      | 5772      |
| Mercury | Mean surface temperature   | 440       |
| Venus   | Mean surface temperature   | 737       |
| Earth   | Global mean surface temp   | 288       |
| Mars    | Mean surface temperature   | 210       |
| Jupiter | Effective temperature      | 110       |
| Saturn  | Effective temperature      | 81        |
| Uranus  | Effective temperature      | 58        |
| Neptune | Effective temperature      | 59        |
