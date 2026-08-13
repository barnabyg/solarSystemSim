# Solar System Simulator

An exploration-first, entertainment-driven solar system simulator for the web. Users freely explore a stylized solar system and inspect celestial bodies; scientific accuracy is secondary to visual appeal.

## Language

**Body**:
A single celestial object in the sim — a planet, moon, or dwarf planet — that can be inspected.
_Avoid_: world, celestial body, object

**Asteroid belt**:
The ring of small bodies between Mars and Jupiter, rendered as a stylized field; a region of the sim rather than a single body.
_Avoid_: asteroid field

**Exploration**:
The core experience — the user moves freely through the sim and inspects bodies; nothing is scripted.
_Avoid_: tour, journey

**Scale mode**:
How the sim represents real physical distances and sizes. Compressed mode (default) enlarges bodies and shrinks gaps for playability; true-scale mode shows real distances while keeping bodies at a readable minimum size.
_Avoid_: zoom, camera distance

**Fact card**:
The panel of real data and one fun fact that opens when a body is inspected.
_Avoid_: info popup, tooltip, info card

**Orbit**:
The fixed elliptical path a body travels around its primary (the Sun for planets, a planet for moons). Orbits are stable and repeat exactly — bodies never disturb one another.
_Avoid_: trajectory, path

**Time warp**:
How much simulation time passes per real second. Controlled by pause, a slider, and preset steps; the sim starts at roughly one sim-day per real second.
_Avoid_: speed, playback rate

**Focus**:
The state of having one body selected: the camera orbits the body and follows it as it moves. Inspecting a body focuses it.
_Avoid_: lock-on, target

**Free flight**:
Moving the viewpoint through the scene with no target body; the default state when nothing is focused.
_Avoid_: free roam, fly mode

**Soundscape**:
The procedurally generated ambient audio bed and UI feedback sounds, synthesized at runtime so the sim ships no audio assets.
_Avoid_: music, soundtrack

**Sim date**:
The current date in the simulation, shown in a corner readout; starts at today's real date and advances with time warp.
_Avoid_: clock, timer
