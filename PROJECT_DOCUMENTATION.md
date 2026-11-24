# Mealy & Moore Machine Lab — Complete Project Documentation

An interactive, web-based Automata Theory workbench and simulator for designing, testing, converting, and analyzing **Mealy Machines** and **Moore Machines**.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Theoretical Background](#2-theoretical-background)
   - [Mealy Machine Model](#mealy-machine-model)
   - [Moore Machine Model](#moore-machine-model)
   - [Model Comparison & Equivalence](#model-comparison--equivalence)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure & File Organization](#4-project-structure--file-organization)
5. [Core Algorithms & Implementation Details](#5-core-algorithms--implementation-details)
   - [Machine Validation Algorithm (`validateMachine`)](#machine-validation-algorithm)
   - [Execution & Simulation Algorithm (`simulate`)](#execution--simulation-algorithm)
   - [Mealy-to-Moore Conversion Algorithm (`mealyToMoore`)](#mealy-to-moore-conversion-algorithm)
   - [Moore-to-Mealy Conversion Algorithm (`mooreToMealy`)](#moore-to-mealy-conversion-algorithm)
   - [Automated Equivalence Verification](#automated-equivalence-verification)
   - [Graph Layout & Edge Routing Algorithm](#graph-layout--edge-routing-algorithm)
6. [Application Features & User Workflow](#6-application-features--user-workflow)
   - [1. Dashboard](#1-dashboard)
   - [2. Machine Editors (Mealy & Moore)](#2-machine-editors)
   - [3. Interactive Simulator](#3-interactive-simulator)
   - [4. Conversion Lab](#4-conversion-lab)
   - [5. Theory & Guide](#5-theory--guide)
7. [Installation, Setup & Build](#7-installation-setup--build)

---

## 1. Project Overview

The **Mealy & Moore Machine Lab** is an educational and engineering tool built with modern web technologies to bridge the gap between theoretical computer science (automata theory, finite state machines) and practical visualization.

### Key Capabilities:
- **Visual State Diagram Editor:** Interactive node-graph canvas powered by `@xyflow/react` with drag-and-drop nodes, curved bidirectional transitions, self-loops, and status indicators.
- **Dual Representation:** Live synchronization between interactive state diagrams and formal transition tables.
- **Step-by-Step Simulation:** Real-time string execution engine showing step-by-step state sequence, active transitions, and output production.
- **Formal Conversion Engine:** Algorithmic conversion from Mealy to Moore (with state splitting) and Moore to Mealy, complete with automated equivalence testing over test vectors.
- **Pre-built Templates:** Quick-load classical automata such as Binary 101 Detector (Mealy & Moore) and Even–Odd Parity checker.
- **State Persistence:** Local storage persistence and JSON import/export capabilities.

---

## 2. Theoretical Background

Finite State Machines with output (FSMs) are deterministic models consisting of states, input symbols, transitions, and output symbols.

### Mealy Machine Model
A **Mealy Machine** is formally defined as a 6-tuple:
$$M = (Q, \Sigma, \Delta, \delta, \lambda, q_0)$$
Where:
- $Q$: Finite, non-empty set of states.
- $\Sigma$: Input alphabet (finite set of valid input symbols).
- $\Delta$: Output alphabet (finite set of valid output symbols).
- $\delta: Q \times \Sigma \to Q$: State transition function.
- $\lambda: Q \times \Sigma \to \Delta$: Output function.
- $q_0 \in Q$: Initial/start state.

> **Key Attribute:** The output $\lambda(q, a)$ is associated with the **transition**. It depends on both the **current state** and the **current input symbol**. As a consequence, outputs occur simultaneously with state changes.

### Moore Machine Model
A **Moore Machine** is formally defined as a 6-tuple:
$$M = (Q, \Sigma, \Delta, \delta, \lambda, q_0)$$
Where:
- $Q, \Sigma, \Delta, \delta, q_0$ are defined as above.
- $\lambda: Q \to \Delta$: Output function associated strictly with states.

> **Key Attribute:** The output $\lambda(q)$ is associated strictly with the **state itself**. When the machine enters state $q$, it produces output $\lambda(q)$ regardless of which input triggered the transition.

### Model Comparison & Equivalence

| Dimension | Mealy Machine | Moore Machine |
| :--- | :--- | :--- |
| **Output Location** | On transitions ($q \xrightarrow{a / z} q'$) | Inside states ($q / z$) |
| **Output Function** | $\lambda(q, a) \in \Delta$ | $\lambda(q) \in \Delta$ |
| **State Count** | Typically fewer states | May require additional states due to state-splitting |
| **Reaction Time** | Instantaneous with input change | Clocked / registered upon arrival at next state |
| **Output Length** | For an input string of length $n$, output length is $n$ | Length is $n+1$ if initial output is included, or $n$ on transitions |

---

## 3. Technology Stack

- **React 19 (Client UI Library):** Modular component architecture with standard Hooks (`useState`, `useMemo`, `useEffect`).
- **TypeScript:** Strict type checking across domain types (`Machine`, `Transition`, `StateNode`, `SimulationStep`).
- **Vite:** High-performance ES module bundler and fast HMR development server.
- **@xyflow/react (React Flow v13):** Canvas engine for rendering interactive node-link state graphs, drag-and-drop state positioning, and custom edge routing.
- **Lucide React:** Iconography (`Activity`, `Boxes`, `Play`, `ArrowRight`, `Trash2`, `Moon`, `Sun`, etc.).
- **CSS3 / CSS Variables:** Custom design system featuring dark and light theme tokens, custom scrollbars, and responsive flex/grid layouts.

---

## 4. Project Structure & File Organization

```
mealy-moore-simulator/
├── index.html              # HTML shell & font inclusions (DM Sans & Manrope)
├── package.json            # Dependencies, scripts, and build metadata
├── tsconfig.json           # TypeScript configuration
├── dist/                   # Production build output
└── src/
    ├── main.tsx            # React entry point mounting <App />
    ├── types.ts            # Domain models and interfaces
    ├── engine.ts           # Core automata algorithms (simulate, convert, validate)
    ├── examples.ts         # Preloaded example machines
    ├── App.tsx             # Root component, views, Graph, Table, and Editors
    ├── styles.css          # Theme styles, React Flow overrides, and layouts
    └── vite-env.d.ts       # Vite client types
```

### Module Responsibilities:
- **`src/types.ts`:** Defines TypeScript contracts for `MachineType`, `StateNode`, `Transition`, and `Machine`.
- **`src/engine.ts`:** Pure functional implementations without UI side-effects:
  - `validateMachine()`
  - `simulate()`
  - `mealyToMoore()`
  - `mooreToMealy()`
  - `cloneMachine()`
- **`src/examples.ts`:** Static definitions for standard test machines (Binary 101 Detectors and Even/Odd Parity).
- **`src/App.tsx`:** Coordinates state, navigation tabs (Dashboard, Mealy Editor, Moore Editor, Simulator, Conversion Lab, Theory), and renders the graphical editor.
- **`src/styles.css`:** UI design language, dark/light theme classes, and React Flow visual customization.

---

## 5. Core Algorithms & Implementation Details

### Machine Validation Algorithm
**Function:** `validateMachine(machine: Machine): string[]`  
**Location:** `src/engine.ts`

Ensures that the state machine is deterministic, complete, and syntactically valid before simulation or conversion:
1. **Name & State Existence:** Verifies machine has a non-empty name and at least one state.
2. **Initial State Integrity:** Confirms $q_0$ exists within the machine's state list.
3. **State Uniqueness:** Checks that all state IDs are unique ($|Set(IDs)| = |States|$).
4. **Moore Output Completeness:** If `type === 'moore'`, every state must have an assigned output value.
5. **Determinism & Completeness ($\forall q \in Q, \forall a \in \Sigma$):**
   - Detects **Missing transitions**: No transition defined for state $q$ on symbol $a$.
   - Detects **Duplicate/Non-deterministic transitions**: More than one transition for $(q, a)$.
   - Detects **Dangling transitions**: Target state $t.to$ does not exist in $Q$.
6. **Mealy Output Completeness:** If `type === 'mealy'`, every transition must have an assigned output.

---

### Execution & Simulation Algorithm
**Function:** `simulate(machine: Machine, input: string): SimulationResult`  
**Location:** `src/engine.ts`

Executes an input string character by character on the given machine.

```text
Algorithm: simulate(machine, input)
1. Initialize current_state = machine.initialState
2. Initialize state_sequence = [current_state]
3. If machine.type == 'moore':
       outputs = [output_of(current_state)]
   Else:
       outputs = []
4. For each symbol 'a' at index i in input:
       a. Check if 'a' is in machine.alphabet; if not, return Error.
       b. Find transition t where t.from == current_state AND t.input == a.
       c. If transition not found, return Error.
       d. Determine output:
          - If Mealy: output = t.output
          - If Moore: output = output_of(t.to)
       e. Record step: { state: current_state, input: a, to: t.to, output, position: i + 1 }
       f. current_state = t.to
       g. Append current_state to state_sequence
       h. Append output to outputs
5. Return { valid: true, stateSequence, outputs, steps }
```

---

### Mealy-to-Moore Conversion Algorithm
**Function:** `mealyToMoore(mealy: Machine): Machine`  
**Location:** `src/engine.ts`

Converts a Mealy machine into an equivalent Moore machine by **splitting states** based on incoming transition outputs.

#### Mathematical Steps:
1. **Analyze Incoming Outputs:**
   For every state $q \in Q_{mealy}$, find the set of distinct outputs on all transitions entering $q$:
   $$\text{Incoming}(q) = \{ t.output \mid t \in T_{mealy}, t.to = q \}$$
   If a state has no incoming transitions, $\text{Incoming}(q) = \{ '' \}$ (empty default).

2. **Generate Split States:**
   For each output $y \in \text{Incoming}(q)$, create a new Moore state:
   $$q_y \quad \text{with} \quad \lambda(q_y) = y$$
   If $\text{Incoming}(q)$ has only one output, the state retains a single representative $q_y$.

3. **Map Initial State:**
   Identify the incoming outputs to the original initial state $q_0$. Select the designated initial state $q_{0, y_0}$.

4. **Replicate Transitions:**
   For every original Mealy transition $q \xrightarrow{a / z} p$:
   - For every duplicate of the source state $q_y$:
   - Create a Moore transition:
     $$q_y \xrightarrow{a} p_z$$
     where $p_z$ is the destination state carrying output $z$.

---

### Moore-to-Mealy Conversion Algorithm
**Function:** `mooreToMealy(moore: Machine): Machine`  
**Location:** `src/engine.ts`

Converting Moore to Mealy preserves the state set $Q$ exactly ($1:1$) while moving state outputs onto transitions.

#### Mathematical Steps:
1. **Preserve States:**
   $Q_{mealy} = Q_{moore}$ (state outputs are stripped or ignored).
2. **Assign Transition Outputs:**
   For every transition $t \in T_{moore}$ going from $p \xrightarrow{a} q$:
   $$\text{Output}(t) = \lambda_{moore}(q)$$
   The output produced by arriving at state $q$ becomes the edge output of the transition entering $q$.

---

### Automated Equivalence Verification
**Function:** `runEquivalence()`  
**Location:** `src/App.tsx` (Conversion Lab)

Validates semantic equivalence between the source machine $M_1$ and converted machine $M_2$:
- Evaluates a comprehensive test vector set:
  $$\text{Test Strings} = \{ \epsilon, '0', '1', '00', '01', '10', '11', '101', '010', '111', '1010', '0101', '01101' \}$$
- For each test string:
  - Runs `simulate(M1, string)` and `simulate(M2, string)`.
  - Normalizes Moore machine outputs (accounting for the initial state output convention).
  - Verifies that output sequences match exactly across all test cases.

---

### Graph Layout & Edge Routing Algorithm
**Component:** `Graph`  
**Location:** `src/App.tsx`

Provides clean, non-overlapping state diagram visualization:

1. **Adaptive Node Positioning:**
   - For small machines ($\le 5$ states), states are laid out in a clean horizontal chain.
   - For larger machines, an optimal grid layout is computed:
     $$\text{columns} = \lceil \sqrt{|Q| \times 1.5} \rceil$$
   - Rows grow downward ($cy = \text{row} \times \text{spacingY}$) and each row is centered horizontally.

2. **Edge Grouping (`edgeGroups`):**
   - Transitions sharing the same source and destination are grouped under a directed key:
     $$\text{key} = \text{from} \to \text{to}$$
   - Multiple inputs/outputs are merged into a clean label (e.g., `0 / 0 · 1 / 1`).

3. **Bidirectional Curve Separation:**
   - If a reverse transition exists ($b \to a$ alongside $a \to b$), React Flow's default bezier curve is applied with path offsets:
     $$\text{offset} = 40, \quad \text{borderRadius} = 20$$
   - This ensures forward and backward transitions curve away from each other without overlapping.

4. **Self-Loop Handling:**
   - Transitions where $\text{from} == \text{to}$ are rendered as smooth loop arcs anchored to the state boundary.

---

## 6. Application Features & User Workflow

### 1. Dashboard
- Quick overview comparing Mealy vs. Moore characteristics.
- Pre-loaded interactive examples (e.g., 101 Sequence Detector, Parity Checker).
- One-click machine creation for either architecture.

### 2. Machine Editors
- **Visual Diagram View:** Pan, zoom, drag nodes, inspect initial state markers and active transitions.
- **Formal Table View:** Interactive transition matrix showing states $\times$ alphabet symbols. Clicking any cell populates the transition editor.
- **Side Panel Controls:**
  - Machine name, input alphabet, and output alphabet configuration.
  - State list with real-time renaming, output assignment, and initial state toggle.
  - Real-time validation warning box highlighting missing or invalid transitions.
  - Transition form to add, edit, or delete transitions.

### 3. Interactive Simulator
- Input string runner with input validation against alphabet symbols.
- **Run Complete:** Instantly runs the entire input and displays the full state trajectory.
- **Step +1 Mode:** Step-by-step debugger highlighting the active state on the graph in gold and illuminating the exact transition edge traversed.
- Trace table showing step number, source state, symbol, output, and target state.

### 4. Conversion Lab
- Side-by-side comparison between Original and Converted machines.
- Supports both **Mealy $\to$ Moore** and **Moore $\to$ Mealy**.
- Interactive **Equivalence Test Suite** running multiple binary vectors.
- Educational explanation detailing how states were split or how outputs were shifted.

### 5. Theory & Guide
- Mathematical definitions, formal tuples, advantages, and limitations of both models.
- Step-by-step conversion theory with real-world applications (digital logic, sequence detection, protocol parsing, lexical analysis).

---

## 7. Installation, Setup & Build

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18+ recommended)
- `npm` or `pnpm`

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Locally in Development Mode
```bash
npm run dev
```
The application will be accessible at: `http://localhost:5173`

### 3. Build for Production
```bash
npm run build
```
Build output will be bundled into the `dist/` directory.

### 4. Preview Production Build
```bash
npm run preview
```
