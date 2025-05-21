- more mechanics
  - flappy bird mode
  - VVVV mode
  - normal mode
  - "cannon" mode (feather mode from celeste)
    - https://www.youtube.com/watch?v=3Za9Z_qAhtg
  - bubble cannon (like animal well!)
    - balloons to be more distinct?

  - turrets
    X ones that shoot basic bullets at you
    - ones that shoot homing bullets at you?

- improve player graphics
  - make player wobbly
  - give player eyes?
    - eyes wobble with physics like "you are gravity"

- campaign mode
  - better death animation?
    - player explodes?
    - automatic retry
  - add level spawn
  - add level finish
    - level stats screen (time and deaths?)
  - add level selection UI
  - "continue to next level" or "replay level" or "main menu"

- various
  - fix sounds to only play while only happening on screen
  - add sound to interval blocks switching
  - update game with a good color palette? check lospec prob
    - maybe support multiple palettes
  - mobile controls!
    - virtual joystick on left
    - jump on right
  - fix performance
    - use chrome performance tools
  - support controller

- editor (lower priority)
  - select rect of tiles and move it
  - copy it maybe too?

---

- different sound for tramps

RELEASE single player mode!

lets describe the user experience:

- go to link
- you see levels
  - they are left to right
  - starts with tutorial
  - beating levels unlocks the levels to the right
  - stretch goals:
    - level select shows best time per level
    - once you beat all levels, you see total leveltime
    - level select, should track and show lifetime stats

- upon selecting level
  - nice transition?
  - good death animations
  - r to retry still probly
  - upon level completion, show fun stat screen
    - time to beat level
    - deaths
    - press a button to go to level select

---

refactoring:
- make a global "particle system"
- improve the sound system
  - automatically load sound assets
  - warn if sound is not loaded
  - maybe use jsfxr library instead of using .wav assets?
  - make lots of placeholder sounds easier to use

---

game feel & ui inspo https://kultisti.itch.io/frogfall

---

client change
