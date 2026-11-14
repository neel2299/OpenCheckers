# Checkers & Draughts Engines: Professional Landscape & Analysis Conventions

## 1. The Professional Engine Ecosystem by Variant

Unlike chess (which unifies around UCI and Stockfish), professional draughts and checkers analysis is organized into three major rule families, each with specialized engines and protocols:

| Rule Family | Board | Key Rules | Flagship Engines | Standard GUIs / Platforms |
| :--- | :--- | :--- | :--- | :--- |
| **English / American (WCDF)** | 8 × 8 (32 sq) | Men move/capture forward; short kings (1 step); any full capture line legal | **KingsRow** (Ed Gilbert), **Cake** (Martin Fierz), **Chinook** (Schaeffer et al.) | **CheckerBoard** (Martin Fierz), NextCheckersMove |
| **International (FMJD)** | 10 × 10 (50 sq) | Backward men captures; flying kings; compulsory maximum capture | **Scan** (Fabien Letouzey / Michel Van Der Linden), **KingsRow Int.**, **Damage** (Bert Tuyt), **Truus / Flits** | **Lidraughts**, **Hub** GUI, DamExchange (**DXP**) |
| **Russian (Shashki) & Brazilian (IDF)** | 8 × 8 (32 sq) | Backward men captures; flying kings; mid-jump crowning (Russian) vs maximum capture (Brazilian) | **Kallisto** (Igor Korshunov), **Edeon**, **KingsRow-64** | **Aurora Borealis** Suite, **CheckerBoard** (Kallisto DLL) |

---

## 2. How Professional Checkers Engines Search & Evaluate

### Search Architecture
1. **Iterative Deepening Alpha-Beta (Negamax / PVS / MTD(f))**:
   - Engines search ply-by-ply (`Depth 1` → `Depth N`), storing exact, lower-bound ($\alpha$), and upper-bound ($\beta$) scores in a **Transposition Table** keyed by position hash.
   - **Move Ordering**: Hash-table best move first, followed by captures ordered by victim count, promotions, **Killer Moves** (quiet moves causing $\beta$-cutoffs at the same ply), and positional history.
   - **Quiescence / Capture Extensions**: Because captures are compulsory in all draughts variants, a tactical sequence cannot be cut off mid-exchange without Horizon Effect blunders. Professional engines extend search along forced capture chains until a quiet position is reached.

2. **Evaluation Scale ("Centimen" / "Centipieces")**:
   - Professional engines (Scan on Lidraughts, KingsRow, Cake) normalize evaluations so **`100` points (`+1.00`) = 1 Man**.
   - **Score Interpretation**:
     - `0.00` to `±0.25`: **Balanced / Theoretical Draw Zone** (in 8×8 checkers, a 20–25 centiman edge is still within drawing margin against accurate defense).
     - `±0.30` to `±0.75`: **Positional Advantage** (strong center control, intact back rank, or favorable tempo/opposition).
     - `±0.80` to `±1.50`: **Clear / Winning Advantage** (typically a full man ahead, an unstoppable runaway to king, or a decisive cramp).
     - `> ±90.00` (or `Wins` / `W+N`): **Forced Win** detected within the search horizon.

3. **Core Positional Metrics Monitored by Pros**:
   - **Material (`Men` & `Kings`)**: A short king in English checkers is worth ~`1.85` men; a flying king in International/Russian/Brazilian draughts is worth ~`2.80` men.
   - **Tempo (Advancement Pip Count)**: The sum of row advancements of all men. Having higher tempo in the endgame helps secure **Opposition ("The Move")**, while over-advancing in the opening can leave weak squares behind.
   - **Back-Rank Integrity (Bridge / Apex Defense)**: Controlling the home rank squares (`1, 2, 3` for Coral; `30, 31, 32` for Ivory on 8×8) prevents opponent men from crowning.
   - **Center Control**: Occupying central dark squares (`14, 15, 18, 19` on 8×8; `22, 23, 27, 28` on 10×10) provides maximum diagonal mobility and cramps the opponent toward the edges.

---

## 3. Professional Analyser Interface Standards

In **CheckerBoard**, **Aurora Borealis**, and **Lidraughts**, the analysis readout provides:
1. **Headline Evaluation & Verdict**: Signed score (`+0.45`), visual evaluation bar, and verbal assessment (`Balanced`, `Slight edge`, `Clear advantage`, `Winning`).
2. **Engine Telemetry**:
   - **Depth**: Nominal search depth in plies (half-moves).
   - **Nodes & Speed (`kN/s`)**: Total positions examined and search throughput in kilopositions per second.
3. **Positional Breakdown Strip**: Quick readout of **Material**, **Tempo (pips)**, **Center control**, and **Back-rank guard** for both sides so players understand *why* the engine likes a position.
4. **Multi-PV (Multiple Principal Variations)**:
   - Displays the top candidate moves (`#1 Best`, `#2 Alternative`, `#3`), each with its evaluation score, **score delta (`Δ`)** relative to the best move (highlighting whether an alternative is equally good `Δ 0.00` or an inaccuracy/blunder `Δ -0.45`), and the expected **Principal Variation (PV)** continuation line.
5. **Notation Interoperability**:
   - **Numeric PDN (`11–15`, `22×15`)** for English (1–32) and International (1–50).
   - **Algebraic PDN (`c3–d4`, `c3:e5`)** for Russian and Brazilian (a1–h8).
   - **FEN (`W:W21-32:B1-12`)** for instant position setup and sharing.

---

## 4. Application to Draughts Club (`v1.2.1+`)

1. **Analyser Enhancements (`src/game/ai.ts`, `src/components/GamePanels.tsx`)**:
   - Track search duration (`ms`) and throughput (`kN/s`) in `SearchResult`.
   - Compute a structured `positionalBreakdown(position)` exposing **Material**, **Tempo (pips)**, **Center squares**, and **Back-rank guards** for Ivory and Coral inside `EnginePanel`.
   - Display **Multi-PV candidate badges** (`Best`, `Δ` score difference) alongside each candidate line so users can immediately see when only one move holds the position ("only move") vs when multiple moves are playable.
2. **Layman-Friendly + Pro-Aligned App Tutorial (`src/components/TutorialSheet.tsx`)**:
   - Pops up automatically on the **first 3 app launches** (`tutorialCount < 3` in persisted state) with a clear indicator (`Welcome guide · 1 of 3`) and explicit instructions on where to reopen it anytime (**Learn** tab → *Open App Tutorial*, or **Settings** → *Replay App Tutorial*).
   - Covers 4 structured sections:
     1. **Basics & Variants**: How to move, compulsory captures, crowning, and how the 4 variants differ (short kings vs flying kings, any capture vs maximum capture).
     2. **Reading Notation (Numbers, Coordinates & PDN/FEN)**: How `1–32` / `1–50` checkers numbering works, `-` vs `×` / `:`, algebraic `a1–h8`, and sharing FEN/PDN.
     3. **Reading the Pro Engine Analyser**: What `+1.00` (centimen) means, how to read **Depth**, **kN/s**, **Principal Variations (PV)**, **Score Delta (`Δ`)**, **Tempo / Back-Rank / Center** metrics, and the **Evaluation Graph**.
     4. **App Tools & Workflow**: Using Hints, Takebacks, Move Tree branching (creating variations in Analysis), Position Editor, Clocks, and Tactical Puzzles.

