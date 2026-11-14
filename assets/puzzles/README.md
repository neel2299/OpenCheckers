# Puzzle database

33 positions and their original principal variations were downloaded from
[Shadow Checkers](https://github.com/ShadowfetchStudio/shadow-checkers/blob/666fec688667ef3517d81d32297315df176fd942/data/puzzles.json),
copyright (c) 2026 Shadowfetch, under the MIT license. The complete notice is
preserved in `SHADOW-CHECKERS-LICENSE.txt`. `source.json` pins the source commit.

`node scripts/import-puzzles.mjs --download` downloads that pinned version,
replays every source line with this app's rules, proves each goal against all
defender replies within the published move budget, and builds the offline
solution trees in `src/game/puzzlePack.ts`. Without `--download`, it uses the
local database. Equivalent winning moves are included at every player node;
the defender reply is chosen to require the longest continuation.

Difficulty levels 1–5 retain the source classification. There are 23 English,
5 Russian, and 5 Brazilian puzzles. Four original Draughts Club lessons, including
one International lesson, supplement this collection. Titles and starting
positions are retained; instructional hints are written for Draughts Club.

For material goals the source values men at 1, English kings at 1.5 and flying
kings at 2.5. A gain is only complete when the opponent has no immediate capture.
No network connection or engine search is needed while playing puzzles.
