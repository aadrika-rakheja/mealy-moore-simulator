export type MachineType = 'mealy' | 'moore';
export interface StateNode { id: string; name: string; output?: string; x: number; y: number }
export interface Transition { id: string; from: string; to: string; input: string; output?: string }
export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  alphabet: string[];
  outputAlphabet: string[];
  states: StateNode[];
  transitions: Transition[];
  initialState: string;
  convention?: 'includeInitial';
}
