# Checkers & Draughts Puzzle Repositories: Web Locations, Extraction Methods & Ingestion Guide

This document catalogs tactical puzzle repositories, combination strokes, and endgame studies across the four rule variants supported by **Draughts Club**:
1. **English / American (8×8, WCDF)**
2. **International (10×10, FMJD)**
3. **Russian Shashki (8×8, IDF)**
4. **Brazilian (8×8, IDF)**

---

## 1. Digital Platforms & Live APIs

### 1.1 Lidraughts (Online Platform)
* **Web**: [lidraughts.org/training](https://lidraughts.org/training)
* **Russian Training**: [lidraughts.org/training/russian](https://lidraughts.org/training/russian)
* **Daily Training**: [lidraughts.org/training/daily](https://lidraughts.org/training/daily)
* **Repository**: [RoepStoep/lidraughts](https://github.com/RoepStoep/lidraughts)
* **License & Status**: 
  - The server code is licensed under AGPL-3.0.
  - Unlike Lichess (which publishes open CC0 puzzle dumps at `database.lichess.org`), Lidraughts has **no public bulk puzzle download**.
  - ⚠️ **Important**: Do not scrape or bulk-ingest Lidraughts puzzles without prior consent from the platform maintainer (RoepStoep). Treat Lidraughts as a reference implementation or seek written permission for content syndication.

#### Verified Endpoints & Live Schema
Lidraughts dynamically serves puzzles generated from Scan engine analysis. Each puzzle page embeds its state in a `<script>` tag:
```javascript
lidraughts.puzzle = {
  "data": {
    "puzzle": {
      "id": 4093,
      "variant": { "key": "standard", "name": "Standard", "board": { "size": [10, 10] } },
      "rating": 2911,
      "attempts": 37646,
      "fen": "B:WK2,24,25,30,34,35:B13,14,15,18,19,K26,27:H0:F59",
      "color": "white",
      "initialPly": 118,
      "lines": {
        "0208": {
          "1302": {
            "2413": { "1322": { "2231": { "3142": "win" } } }
          }
        }
      },
      "branch": { ... }
    }
  },
  "history": {
    "ply": 118,
    "fen": "W:WK2,24,25,30,34,35:B13,14,15,18,19,27,K37:H0:F60",
    "uci": "2637"
  }
};
```

#### Parsing Considerations for Draughts Club:
1. **Trailing FEN tags**: Lidraughts appends `:H0:F59` (Half-move clock and Full-move counter) to the standard FEN. `fromFen` in `src/game/engine.ts` expects `Turn:WhitePieces:BlackPieces` and will reject additional tags. Strip extra colon-separated fields before passing to `fromFen`.
2. **Move notation in `lines`**: Moves are encoded as four-digit strings representing square indices (`"0208"` = 2 to 8; `"1302"` = 13 captures 2). Multi-jump lines are broken into individual ply steps in the nested tree.
3. **Setup move**: `history.uci` holds the opponent's prior move (`"2637"` = 26-37) that initiated the tactical sequence.

---

## 2. Grandmaster Compendiums & Public Domain Books

Checkers literature contains over two centuries of published tactical compositions categorized into recurring motifs (**Strokes**, **Shots**, **Breeches**, **Crown Sweeps**, and **Blockades**).

### 2.1 Richard Pask Compendiums (English 8×8)
* **Author**: Grandmaster Richard Pask (former WCDF President, leading draughts author)
* **Primary Verified Distribution**: [usacheckers.com](https://www.usacheckers.com/) (Books & Publications) and [wcdf.net](http://www.wcdf.net/)
* **Note on Dead Links**: Old references to `onlinecheckers.net/richard-pask/` are defunct (domain expired/redirects to third parties). Use the official American Checker Federation (ACF) library at `usacheckers.com`.
* **Availability**: Digital PDF/PDN versions of *Complete Checkers* were authorized by Richard Pask and the WCDF for non-commercial educational distribution.
* **Core Problem Suites**:
  1. ***Complete Checkers* (Volumes 1–5)**:
     - Volume 1: Basic Tactics and Endgames (over 400 beginner-to-intermediate tactical problems).
     - Volume 2–5: Advanced tactical themes, master combinations, and technical endings.
  2. ***Checkers for the Novice***:
     - Standardized tactical drills on foundational motifs:
       * **The Double Cross**
       * **The Slip Shot**
       * **The In-and-Out Shot**
       * **The Goose Walk**
       * **The Breeches (Forking two pieces)**
       * **The King Trap / Corner Lock**
  3. ***Solid Checkers***: Tactical defense exercises and endgame resourcefulness.

### 2.2 Martin Fierz / CheckerBoard Public Archives (English 8×8)
* **Website**: [fierz.ch/checkers.php](https://www.fierz.ch/checkers.php)
* **Availability**: Freely downloadable PDN collections bundled with or distributed alongside CheckerBoard (Martin Fierz).
* **Key Databases**:
  * **Boland's *Familiar Themes in Checkers* (1938)**: Ben Boland's masterwork categorizing over 500 thematic positions, strokes, and endgame traps. Available in standard `.pdn`.
  * **Boland's *Master Play in Checkers* (1947)**: Hundreds of tactical combinations from master games.
  * **Gould's *Problem Book* (1884)**: Over 1,000 classic English 8×8 problems (**Public Domain**).
  * **Sturges' *Guide to the Game of Draughts* (1800)**: Joshua Sturges' foundational 140 Critical Positions that form the bedrock of checkers endgame theory (**Public Domain**).
  * **Lees' *Guide to the Game of Draughts***: Classic tactical drills (**Public Domain**).

### 2.3 The Checker Maven (English 8×8)
* **Editor**: Bob Newell
* **Verified Website**: [checkermaven.com](https://www.checkermaven.com/) (redirects to `https://www.bobnewell.net/nucleus/checkers.php`)
* **Archive**: Active weekly column running continuously for over 20 years with **over 1,000 curated problems**.
* **Categories**:
  * *Speed Problems* (Quick single/double-jump tactical recognition for beginners).
  * *Stroke Problems* (Elaborate sacrifice-and-sweep combination shots).
  * *Endgame Studies* (Precision Opposition, First Position, Second Position, Third Position, Payne's Draw).
* **Format**: Clear ASCII board diagrams, PDN notation, and step-by-step solutions.

---

## 3. International (10×10) & European Archives

### 3.1 FMJD (World Draughts Federation) & CPI
* **Official Website**: [fmjd.org](https://www.fmjd.org/)
* **Specialty**: The international governing body for draughts problem compositions and endgame art on 10×10.
* **Classic Combinations ("Coups")**:
  * **Coup de Philippe** (Sacrifice provoking a multi-jump king sweep)
  * **Coup Royal** (Center-break sacrifice opening a return capture)
  * **Coup Turc** (Turkish shot forcing king displacement)
  * **Coup Napoléon** (Cross-board tactical sweep)
  * **Coup de la Bombe** (Explosive triple sacrifice)
  * **Coup Fabre** (Deflection into long-range flying king trap)
  * **Coup Springer**, **Coup Manoury**, **Coup Suisse**, **Coup Raichenbach**

### 3.2 KNDB Toernooibase (Netherlands)
* **Verified Website**: [toernooibase.kndb.nl](https://toernooibase.kndb.nl/) (Comprehensive game archive with engine evaluations)
* **Training System**:
  * Standardized Dutch training curriculum ("Step Method"):
    * Step 1: Basic captures, king crowning, simple combinations.
    * Step 2: Forcing captures, 2-for-1 shots, King traps.
    * Step 3: Complex multi-piece shots, tempo calculations.
    * Step 4: Flying king endgames (3 kings vs 1 king on Scouffe line).

---

## 4. Russian (Shashki) & Brazilian (8×8) Resources

Russian and Brazilian draughts feature backward captures and flying kings, resulting in dynamic tactical combinations ("kompozitsiya"):

### 4.1 Shashki.com
* **Verified Website**: [shashki.com](http://shashki.com/)
* **Software**: Aurora Borealis suite (Alexander Svirin)
* **Volume**: Over **100,000 problem compositions** and etudes stored in `.pnd` and `.pdn` formats.
* **Famous Tactical Motifs**:
  * **The Kukuev Stroke (Удар Кукуева)**: Sudden flank sacrifice converting into a backward sweep.
  * **The Petrov Stroke**: Mid-capture promotion unlocking an immediate flying king kill shot.
  * **The Triangular Trap (Треугольник Петрова)**: Three kings trapping a lone opponent king on the main diagonal.
  * **The Column Lock (Столбняк)**: Quiet zugzwang blockade sealing every escape square.

---

## 5. Summary Table: Sources by Variant & License

| Source | Variant(s) | Volume | Primary Format | Status / License |
| :--- | :--- | :--- | :--- | :--- |
| **In-House Engine Generation** | All 4 variants | Unlimited | FEN / JSON | ✅ 100% clean IP, no third-party rights |
| **Sturges' 140 Positions (1800)**| English 8×8 | 140 | PDN / Text | ✅ Public Domain (out of copyright) |
| **Gould's Problem Book (1884)** | English 8×8 | 1,000+ | PDN / Text | ✅ Public Domain (out of copyright) |
| **CheckerBoard / Boland (1938)** | English 8×8 | 500+ | PDN | ⚠️ Check copyright on later reprints |
| **Richard Pask (WCDF/ACF)** | English 8×8 | 1,500+ | PDF / PDN | ⚠️ Free educational distribution (attribution required) |
| **The Checker Maven** | English 8×8 | 1,000+ | PDN / Text | ⚠️ Web archive; credit Bob Newell |
| **Lidraughts Training** | 10×10, Russian 8×8 | 10,000+ | Embedded JSON | ⚠️ No bulk CC0 license; ask maintainer before using |
| **Shashki.com / Aurora** | Russian & Brazilian 8×8 | 50,000+ | PND / PDN | ⚠️ Community archives; non-commercial attribution |

---

## 6. How to Convert External Puzzles into Draughts Club Format

### 6.1 Draughts Club Puzzle Schema (`src/game/puzzles.ts`)
```typescript
export interface Puzzle {
  id: string;
  title: string;
  variant: 'english' | 'international' | 'russian' | 'brazilian';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  fen: string;                     // Standard FEN (e.g., 'W:Wc3,g3:Bb4,d4,f6')
  objective: string;               // Instruction text shown to the player
  hint: string;                    // Tactical guidance when requested
  solutionRoutes: string[];        // Square coordinate path: ['c3-e5-g7']
}
```

### 6.2 Mapping Numeric PDN to Draughts Club Coordinates
Draughts Club uses algebraic dark-square coordinates for internal consistency:
* **English 8×8**: Square `1` = `b8`, `4` = `h8`, `29` = `a1`, `32` = `g1`.
* **International 10×10**: Square `1` = `b10`, `5` = `j10`, `46` = `a1`, `50` = `i1`.

#### Conversion Helper Using `engine.ts`:
Rather than re-implementing coordinate math, use the canonical functions directly from [`src/game/engine.ts`](../src/game/engine.ts):

```typescript
import { coordinate, squareIndex } from './engine';
import { VARIANTS, type VariantId } from './variants';

/**
 * Converts a numbered draughts square (1-32 for 8x8, 1-50 for 10x10)
 * to Draughts Club algebraic notation (e.g. 22 -> 'e3').
 */
export function numberToCoordinate(squareNum: number, variant: VariantId): string {
  const size = VARIANTS[variant].size;
  const boardIndex = squareIndex(squareNum, size);
  return coordinate(boardIndex, size);
}

/**
 * Converts a numeric PDN move string (e.g. '11-15' or '22x15x6')
 * to a Draughts Club route string (e.g. 'c5-c4' or 'c3-e5-g7').
 */
export function pdnRouteToAlgebraic(pdnMove: string, variant: VariantId): string {
  const parts = pdnMove.split(/[-x×:]/).map(Number);
  return parts.map(n => numberToCoordinate(n, variant)).join('-');
}

/**
 * Sanitizes external FEN (such as Lidraughts) by stripping trailing clocks/plies.
 * Input:  'B:WK2,24,25:B13,14:H0:F59'
 * Output: 'B:WK2,24,25:B13,14'
 */
export function sanitizeFen(rawFen: string): string {
  const parts = rawFen.trim().split(':');
  if (parts.length > 3) {
    return parts.slice(0, 3).join(':');
  }
  return rawFen.trim();
}
```

### 6.3 Automated Ingestion Script Pattern
To periodically ingest puzzles from Lidraughts or a PDN archive:
1. Fetch puzzle JSON from `https://lidraughts.org/training/<variant>` (only if permission is obtained).
2. Clean FEN via `sanitizeFen()`.
3. Map initial move and winning branch moves from numeric squares to coordinate routes via `pdnRouteToAlgebraic()`.
4. Determine difficulty from the puzzle rating:
   * `< 1500`: **Beginner**
   * `1500 - 2100`: **Intermediate**
   * `> 2100`: **Advanced**
5. Verify that `fromFen(sanitizedFen, variant)` and every move in the solution route are accepted as legal by `legalMoves()` in `src/game/engine.ts`.
