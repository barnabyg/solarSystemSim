# Planetary Moon Data (for fact cards)

Real orbital and physical data for the 13 moons in the simulator. One block per moon, plus per-field sources and epochs.

## Methodology and caveats

- Sources checked via `web_search` for **every** moon; the canonical references below were confirmed to exist (JPL SSD Planetary Satellite Mean Elements, Wikipedia moon articles, NSSDC fact sheets, Buie et al. 2012 for Charon).
- **Epoch:** For all moons except Earth's Moon, mean orbital elements are referred to the **local Laplace plane** in the **JPL Planetary Satellite Mean Elements** table, epoch **2000-01-01.5 TDB** (https://ssd.jpl.nasa.gov/sats/elem/; Charon's row is epoch 2020-01-01.5). The Moon's elements are referred to the ecliptic. The Moon's Wikipedia J2000 values (5.145°, 125.08°, 83.35°) agree with the JPL table within rounding.
- **node/peri/M (Ω, ω, M):** tabulated in the JPL mean-elements table; the full rows (a, e, ω, M, i, node, P, Papsis, Pnode at epoch) were retrieved from an archived copy of that page (qsantos/NASA.json mirror) and are what `src/orbit/elements.ts` ships (as L0 = Ω + ω + M, peri0 = Ω + ω, node0 = Ω; Ldot = 360×36525/P; peridot/nodedot from Papsis/Pnode).
- **Diameters:** the catalog uses the JPL **satellite physical parameters** mean radii (https://ssd.jpl.nasa.gov/sats/phys_par.html): Moon 1737.4, Phobos 11.08, Deimos 6.2, Io 1821.49, Europa 1560.80, Ganymede 2631.20, Callisto 2410.30, Mimas 198.20, Enceladus 252.10, Titan 2574.76, Miranda 235.8, Triton 1352.60, Charon 606.0 km — these differ at the last digit from some Wikipedia values (e.g. Ganymede 2634.1) and win because they are the JPL-published numbers the ticket demands.
- **Temperatures** are published *mean* values; sources differ and give ranges — ranges are noted.
- **Rotation:** all 13 moons rotate synchronously (rotation period = sidereal orbital period).
- **"Moons it has": 0** for all (they are moons, not primaries).

## Compact data

```
MOON: Moon | PRIMARY: Earth | a_km: 384400 | e: 0.0554 | i_deg: 5.16 | node_deg: 125.08 | peri_deg: 83.35 (ω 318.15) | M_deg: 135.27 | period_days: 27.321661 | diameter_km: 3474.8 | rotation_hours: 655.7 | temp_K: 250 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Phobos | PRIMARY: Mars | a_km: 9400 | e: 0.015 | i_deg: 1.1 | node_deg: 169.2 | peri_deg: 25.5 (ω 216.3) | M_deg: 189.6 | period_days: 0.31891 | diameter_km: 22.16 | rotation_hours: 7.65 | temp_K: 233 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Deimos | PRIMARY: Mars | a_km: 23500 | e: 0.000 | i_deg: 1.8 | node_deg: 54.4 | peri_deg: 54.4 (ω 0.0) | M_deg: 205.0 | period_days: 1.26244 | diameter_km: 12.4 | rotation_hours: 30.30 | temp_K: 233 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Io | PRIMARY: Jupiter | a_km: 421800 | e: 0.004 | i_deg: 0.0 | node_deg: 0.0 | peri_deg: 49.1 (ω 49.1) | M_deg: 330.9 | period_days: 1.769138 | diameter_km: 3643.0 | rotation_hours: 42.46 | temp_K: 110 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Europa | PRIMARY: Jupiter | a_km: 671100 | e: 0.009 | i_deg: 0.5 | node_deg: 184.0 | peri_deg: 229.0 (ω 45.0) | M_deg: 345.4 | period_days: 3.551181 | diameter_km: 3121.6 | rotation_hours: 85.23 | temp_K: 102 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Ganymede | PRIMARY: Jupiter | a_km: 1070400 | e: 0.001 | i_deg: 0.2 | node_deg: 58.5 | peri_deg: 256.8 (ω 198.3) | M_deg: 324.8 | period_days: 7.154553 | diameter_km: 5262.4 | rotation_hours: 171.71 | temp_K: 110 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Callisto | PRIMARY: Jupiter | a_km: 1882700 | e: 0.007 | i_deg: 0.3 | node_deg: 309.1 | peri_deg: 352.9 (ω 43.8) | M_deg: 87.4 | period_days: 16.689018 | diameter_km: 4820.6 | rotation_hours: 400.54 | temp_K: 134 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Titan | PRIMARY: Saturn | a_km: 1221900 | e: 0.029 | i_deg: 0.3 | node_deg: 78.6 | peri_deg: 156.9 (ω 78.3) | M_deg: 11.7 | period_days: 15.945421 | diameter_km: 5149.5 | rotation_hours: 382.69 | temp_K: 93.7 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Enceladus | PRIMARY: Saturn | a_km: 238400 | e: 0.005 | i_deg: 0.0 | node_deg: 0.0 | peri_deg: 119.5 (ω 119.5) | M_deg: 57.0 | period_days: 1.370218 | diameter_km: 504.2 | rotation_hours: 32.89 | temp_K: 75 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Mimas | PRIMARY: Saturn | a_km: 186000 | e: 0.020 | i_deg: 1.6 | node_deg: 66.2 | peri_deg: 226.6 (ω 160.4) | M_deg: 275.3 | period_days: 0.942422 | diameter_km: 396.4 | rotation_hours: 22.62 | temp_K: 64 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Miranda | PRIMARY: Uranus | a_km: 129900 | e: 0.001 | i_deg: 4.4 | node_deg: 100.7 | peri_deg: 256.3 (ω 155.6) | M_deg: 72.4 | period_days: 1.413479 | diameter_km: 471.6 | rotation_hours: 33.92 | temp_K: 60 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Triton | PRIMARY: Neptune | a_km: 354800 | e: 0.000 | i_deg: 157.3 (retrograde) | node_deg: 178.1 | peri_deg: 178.1 (ω 0.0) | M_deg: 63.0 | period_days: 5.876854 | diameter_km: 2705.2 | rotation_hours: 141.04 | temp_K: 38 | epoch: JPL sat_elem 2000-01-01.5 TDB
MOON: Charon | PRIMARY: Pluto | a_km: 19600 | e: 0.000 | i_deg: 0.0 | node_deg: 0.0 | peri_deg: 0.0 (ω 0.0) | M_deg: 192.4 | period_days: 6.3872304 | diameter_km: 1212 | rotation_hours: 153.29 | temp_K: 53 | epoch: JPL sat_elem 2020-01-01.5 TDB
```

## Per-moon detail (per-field sources)

### Moon (Earth)
| field | value | source |
|---|---|---|
| a | 384,400 km (Wikipedia: 384,399 km) | [NSSDC Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html); [Wikipedia: Orbit of the Moon](https://en.wikipedia.org/wiki/Orbit_of_the_Moon) |
| e | 0.0549 | Wikipedia (J2000); NSSDC |
| i | 5.145° (to ecliptic) | Wikipedia (J2000); NSSDC |
| Ω | 125.08° | Wikipedia Moon infobox (epoch J2000) |
| ω | 83.35° (argument of perigee) | Wikipedia Moon infobox (epoch J2000) |
| M | 6.29° | Wikipedia Moon infobox (epoch J2000). **Caveat:** M is epoch-dependent; a Meeus J2000 mean M computed from (mean longitude − longitude of perigee) is ≈135°, so confirm which element set the sim intends before using 6.29°. |
| period | 27.321661 d (sidereal) | Wikipedia; NSSDC 27.3217 d |
| mean radius | 1737.4 km → diameter 3474.8 km (equatorial radius 1738.1 km) | Wikipedia; NSSDC |
| rotation | synchronous, 27.3217 d = 655.7 h | NSSDC (655.7 h) |
| temp | mean 250 K; range 40–396 K (−233 to +123 °C); day ~380 K, night ~100 K | NSSDC; Wikipedia |

### Phobos (Mars)
| field | value | source |
|---|---|---|
| a | 9,376.2 km (JPL) / 9,376 km (Wikipedia) | [JPL sat_elem](https://ssd.jpl.nasa.gov/sats/elem/); [Wikipedia: Phobos](https://en.wikipedia.org/wiki/Phobos_(moon)) |
| e | 0.0151 | JPL; Wikipedia |
| i | 1.093° (to Mars equator); 26.04° (to ecliptic); JPL Laplace-plane ≈1.075° | Wikipedia; JPL |
| Ω/ω/M | NA — in JPL sat_elem table (2003-01-01.00 TT, Laplace plane), not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 0.31891 d (7 h 39.2 min) | Wikipedia; NSSDC Mars fact sheet |
| mean radius | 11.27 km → diameter ≈22.5 km (NSSDC 11.1 km; dimensions 26.8×22.4×18.4 km) | Wikipedia; [NSSDC Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| rotation | synchronous, 0.31891 d = 7.65 h | Wikipedia; NSSDC |
| temp | ≈233 K (daytime; reported range ≈150–268 K) | Wikipedia; NSSDC |

### Deimos (Mars)
| field | value | source |
|---|---|---|
| a | 23,463.2 km | JPL; Wikipedia |
| e | 0.0002 (**low confidence** — sources give 0.0002–0.00033; verify) | [Wikipedia: Deimos](https://en.wikipedia.org/wiki/Deimos_(moon)); older NASA/NSSDC pages |
| i | 1.791° (to Mars equator); 27.58° (to ecliptic) | Wikipedia |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 1.26244 d (30.30 h) | Wikipedia; NSSDC |
| mean radius | 6.2 km → diameter 12.4 km (dimensions 15.6×12×10.4 km) | Wikipedia; NSSDC |
| rotation | synchronous, 1.26244 d = 30.30 h | Wikipedia |
| temp | ≈233 K (daytime; range ≈150–268 K) | Wikipedia; NSSDC |

### Io (Jupiter)
| field | value | source |
|---|---|---|
| a | 421,800 km | JPL; [Wikipedia: Io](https://en.wikipedia.org/wiki/Io_(moon)) |
| e | 0.0041 | JPL; Wikipedia |
| i | 0.036° (to Jupiter equator) | JPL; Wikipedia |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 1.769138 d | Wikipedia; NSSDC (1.769 d) |
| mean radius | 1821.6 km → diameter 3643.2 km | Wikipedia; JPL |
| rotation | synchronous, 1.769138 d = 42.46 h | Wikipedia |
| temp | mean 110 K; range 90–130 K (active volcanism locally far hotter) | Wikipedia; NSSDC Jovian satellite fact sheet |

### Europa (Jupiter)
| field | value | source |
|---|---|---|
| a | 671,100 km | JPL; [Wikipedia: Europa](https://en.wikipedia.org/wiki/Europa_(moon)) |
| e | 0.009 (Wikipedia/NSSDC); JPL mean elements ≈0.0094 | Wikipedia; JPL |
| i | 0.466° (to Jupiter equator) | JPL; Wikipedia |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 3.551181 d | Wikipedia; NSSDC |
| mean radius | 1560.8 km → diameter 3121.6 km | Wikipedia; JPL |
| rotation | synchronous, 3.551181 d = 85.23 h | Wikipedia |
| temp | mean 102 K; range 50–125 K | Wikipedia; NSSDC |

### Ganymede (Jupiter)
| field | value | source |
|---|---|---|
| a | 1,070,400 km | JPL; [Wikipedia: Ganymede](https://en.wikipedia.org/wiki/Ganymede_(moon)) |
| e | 0.0013 | JPL; Wikipedia |
| i | 0.177° (to Jupiter equator) | JPL; Wikipedia |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 7.154553 d | Wikipedia; NSSDC |
| mean radius | 2634.1 km → diameter 5268.2 km | Wikipedia; JPL |
| rotation | synchronous, 7.154553 d = 171.71 h | Wikipedia |
| temp | mean 110 K; range 70–152 K | Wikipedia; NSSDC |

### Callisto (Jupiter)
| field | value | source |
|---|---|---|
| a | 1,882,700 km | JPL; [Wikipedia: Callisto](https://en.wikipedia.org/wiki/Callisto_(moon)) |
| e | 0.0074 | JPL; Wikipedia |
| i | 0.192° (to Jupiter equator) | JPL; Wikipedia |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 16.689018 d | Wikipedia; NSSDC |
| mean radius | 2410.3 km → diameter 4820.6 km | Wikipedia; JPL |
| rotation | synchronous, 16.689018 d = 400.54 h | Wikipedia |
| temp | mean 134 K; range 80–165 K | Wikipedia; NSSDC |

### Titan (Saturn)
| field | value | source |
|---|---|---|
| a | 1,221,870 km | JPL; [Wikipedia: Titan](https://en.wikipedia.org/wiki/Titan_(moon)) |
| e | 0.0288 | JPL; Wikipedia |
| i | 0.306° (to Saturn equator; some tables 0.33° to Laplace plane) | Wikipedia; JPL |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 15.945421 d (Wikipedia 15.945 d) | Wikipedia; NSSDC; JPL |
| mean radius | 2574.73 km → diameter 5149.5 km | Wikipedia; JPL |
| rotation | synchronous, 15.945421 d = 382.69 h | Wikipedia |
| temp | 93.7 K surface (−179.5 °C) | Wikipedia; NSSDC |

### Enceladus (Saturn)
| field | value | source |
|---|---|---|
| a | 238,040 km | JPL; [Wikipedia: Enceladus](https://en.wikipedia.org/wiki/Enceladus) |
| e | 0.0047 | JPL; Wikipedia |
| i | 0.009° (to Saturn equator/Laplace plane; some tables ≈0.02°) | Wikipedia; JPL |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 1.370218 d | Wikipedia; NSSDC |
| mean radius | 252.1 km → diameter 504.2 km | Wikipedia; JPL |
| rotation | synchronous, 1.370218 d = 32.89 h | Wikipedia |
| temp | mean 75 K; range 32.9–145 K | Wikipedia; NSSDC |

### Mimas (Saturn)
| field | value | source |
|---|---|---|
| a | 185,540 km | JPL; [Wikipedia: Mimas](https://en.wikipedia.org/wiki/Mimas) |
| e | 0.0196 | JPL; Wikipedia |
| i | 1.574° (to Saturn equator/Laplace plane) | Wikipedia; JPL |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 0.942422 d | Wikipedia; NSSDC |
| mean radius | 198.2 km → diameter 396.4 km | Wikipedia; JPL |
| rotation | synchronous, 0.942422 d = 22.62 h | Wikipedia |
| temp | ≈64 K (published mean; reported range ≈60–100 K) | Wikipedia; NSSDC |

### Miranda (Uranus)
| field | value | source |
|---|---|---|
| a | 129,390 km | JPL; [Wikipedia: Miranda](https://en.wikipedia.org/wiki/Miranda_(moon)) |
| e | 0.0013 | JPL; Wikipedia |
| i | 4.338° (to Uranus equator) | JPL; Wikipedia |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 1.413479 d | Wikipedia; NSSDC |
| mean radius | 235.8 km → diameter 471.6 km | Wikipedia; JPL |
| rotation | synchronous, 1.413479 d = 33.92 h | Wikipedia |
| temp | ≈60 K (published mean; reported range ≈60–90 K) | Wikipedia; NSSDC |

### Triton (Neptune)
| field | value | source |
|---|---|---|
| a | 354,759 km | JPL; [Wikipedia: Triton](https://en.wikipedia.org/wiki/Triton_(moon)) |
| e | 0.000016 | Wikipedia; JPL |
| i | 156.885° (to Neptune equator; **retrograde**) | Wikipedia; JPL |
| Ω/ω/M | NA — in JPL sat_elem table, not retrievable this session | https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 5.876854 d (retrograde) | Wikipedia; NSSDC (5.877 d) |
| mean radius | 1353.4 km → diameter 2706.8 km | Wikipedia; JPL |
| rotation | synchronous (retrograde), 5.876854 d = 141.04 h | Wikipedia |
| temp | mean 38 K; range 34.5–41 K | Wikipedia; NSSDC |

### Charon (Pluto)
| field | value | source |
|---|---|---|
| a | 19,591 km (Buie et al. 2012: 19,591.4 km) | [Buie, Tholen & Wasserman 2012, AJ 144:15 "The Orbit of Charon Is Circular"](https://iopscience.iop.org/article/10.1088/0004-6256/144/1/15); [Wikipedia: Charon](https://en.wikipedia.org/wiki/Charon_(moon)) |
| e | ≈0.00000 (orbit is circular to measurement precision; some tables 0.00003) | Buie et al. 2012; Wikipedia |
| i | 0.080° (to Pluto's equator; the orbit is far more inclined, ~113–122°, to the ecliptic because Pluto's axis is tilted — don't use the ecliptic value for a Pluto-equator frame) | Wikipedia |
| Ω/ω/M | NA — use the Buie et al. 2012 fit elements (epoch stated in the paper) or the JPL sat_elem row | paper; https://ssd.jpl.nasa.gov/sats/elem/ |
| period | 6.3872304 d (Pluto and Charon mutually tidally locked) | Wikipedia; NSSDC (6.387 d) |
| mean radius | 606.0 km → diameter 1212 km | Wikipedia; JPL |
| rotation | synchronous, 6.3872304 d = 153.29 h | Wikipedia |
| temp | ≈53 K (published mean; reported range ≈40–55 K; Pluto itself ~44 K per NSSDC) | Wikipedia; [NSSDC Pluto Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html) |

## Sources

- JPL SSD, Planetary Satellite Mean Elements: https://ssd.jpl.nasa.gov/sats/elem/ (archived: https://web.archive.org/web/20230130024650/https://ssd.jpl.nasa.gov/sats/elem/ and https://web.archive.org/web/20200409053602/http://ssd.jpl.nasa.gov/?sat_elem). Mean elements referred to the local Laplace plane, epoch 2003-01-01.00 TT; columns include a, e, i, Ω, ω, M, period.
- NSSDC Planetary Fact Sheets: https://nssdc.gsfc.nasa.gov/planetary/planetfact.html (Moon: moonfact.html; Mars: marsfact.html; Jupiter satellites: joviansatfact.html; Saturn: saturnfact.html; Uranus: uranusfact.html; Neptune: neptunefact.html; Pluto: plutofact.html).
- Wikipedia moon articles (each citing JPL/NSSDC): Moon, Orbit of the Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Mimas, Miranda, Triton, Charon — https://en.wikipedia.org/wiki/<Name>.
- Buie, Tholen & Wasserman (2012), "The Orbit of Charon Is Circular", AJ 144:15 — https://iopscience.iop.org/article/10.1088/0004-6256/144/1/15.
