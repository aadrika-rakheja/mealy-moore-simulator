import type { Machine, StateNode, Transition } from './types';

export function cloneMachine(machine: Machine): Machine {
  return JSON.parse(JSON.stringify(machine));
}

export function validateMachine(machine: Machine): string[] {
  const errors: string[] = [];
  if (!machine.name.trim()) errors.push('Machine name is required.');
  if (!machine.states.length) errors.push('Add at least one state.');
  if (!machine.initialState || !machine.states.some(s => s.id === machine.initialState)) errors.push('A valid initial state is required.');
  const ids = new Set(machine.states.map(s => s.id));
  if (ids.size !== machine.states.length) errors.push('State names must be unique.');
  for (const state of machine.states) {
    if (machine.type === 'moore' && (state.output === undefined || state.output === '')) errors.push(`Assign an output to ${state.name}.`);
  }
  for (const symbol of machine.alphabet) {
    for (const state of machine.states) {
      const matches = machine.transitions.filter(t => t.from === state.id && t.input === symbol);
      if (matches.length === 0) errors.push(`Missing transition: ${state.name} / ${symbol}`);
      if (matches.length > 1) errors.push(`Duplicate transition: ${state.name} / ${symbol}`);
      if (matches[0]?.to && !ids.has(matches[0].to)) errors.push(`Transition from ${state.name} points to a deleted state.`);
    }
  }
  if (machine.type === 'mealy') {
    for (const transition of machine.transitions) {
      if (!transition.output) errors.push(`Missing output for transition ${transition.input}.`);
    }
  }
  return errors;
}

export interface SimulationStep { state: string; input: string; to: string; output: string; position: number }
export interface SimulationResult { valid: boolean; message: string; stateSequence: string[]; outputs: string[]; steps: SimulationStep[] }

export function simulate(machine: Machine, input: string): SimulationResult {
  const result: SimulationResult = { valid: true, message: 'Simulation complete.', stateSequence: [machine.initialState], outputs: [], steps: [] };
  let state = machine.initialState;
  if (machine.type === 'moore') result.outputs = [machine.states.find(s => s.id === state)?.output ?? ''];
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    if (!machine.alphabet.includes(symbol)) return { ...result, valid:false, message:`Invalid input symbol "${symbol}" at position ${i + 1}.` };
    const transition = machine.transitions.find(t => t.from === state && t.input === symbol);
    if (!transition) return { ...result, valid:false, message:`Missing transition for ${state} on "${symbol}".` };
    const output = machine.type === 'mealy' ? transition.output ?? '' : (machine.states.find(s => s.id === transition.to)?.output ?? '');
    result.steps.push({ state, input:symbol, to:transition.to, output, position:i + 1 });
    state = transition.to;
    result.stateSequence.push(state);
    result.outputs.push(output);
  }
  return result;
}

export function mealyToMoore(mealy: Machine): Machine {
  const mapping = new Map<string, string[]>();
  for (const state of mealy.states) {
    const incoming = new Set(mealy.transitions.filter(t => t.to === state.id).map(t => t.output ?? '').filter(Boolean));
    if (!incoming.size) incoming.add('');
    mapping.set(state.id, [...incoming].sort());
  }
  const generatedStates: StateNode[] = [];
  const stateMap = new Map<string, string>();
  for (const state of mealy.states) {
    const outputs = mapping.get(state.id) ?? [''];
    outputs.forEach((output, index) => {
      const id = outputs.length === 1 ? `${state.id}_${output || 'N'}` : `${state.id}_${output}`;
      stateMap.set(`${state.id}|${output}`, id);
      generatedStates.push({ id, name:id, output:output || 'N', x:state.x, y:state.y + index * 90 });
    });
  }
  const initialIncoming = mealy.transitions.filter(t => t.to === mealy.initialState).map(t => t.output ?? '').filter(Boolean);
  const initialOutput = initialIncoming.length === 1 ? initialIncoming[0] : '';
  const initialId = stateMap.get(`${mealy.initialState}|${initialIncoming.length ? initialOutput : ''}`)
    ?? stateMap.get(`${mealy.initialState}|${initialIncoming[0] ?? ''}`)
    ?? `${mealy.initialState}_${initialOutput || 'N'}`;
  const transitions: Transition[] = [];
  for (const incomingOutput of mealy.states.flatMap(s => mapping.get(s.id) ?? [''])) {
    void incomingOutput;
  }
  for (const source of mealy.states) {
    for (const sourceOutput of mapping.get(source.id) ?? ['']) {
      for (const symbol of mealy.alphabet) {
        const mealyTransition = mealy.transitions.find(t => t.from === source.id && t.input === symbol);
        if (!mealyTransition) continue;
        transitions.push({
          id:`${source.id}-${sourceOutput}-${symbol}-moore`,
          from:stateMap.get(`${source.id}|${sourceOutput}`) ?? `${source.id}_${sourceOutput || 'N'}`,
          to:stateMap.get(`${mealyTransition.to}|${mealyTransition.output ?? ''}`) ?? `${mealyTransition.to}_${mealyTransition.output || 'N'}`,
          input:symbol
        });
      }
    }
  }
  return { ...cloneMachine(mealy), id:`${mealy.id}-moore`, name:`${mealy.name} (Moore)`, type:'moore', states:generatedStates, transitions, initialState:initialId, convention:'includeInitial', outputAlphabet:mealy.outputAlphabet };
}

export function mooreToMealy(moore: Machine): Machine {
  const outputs = new Map(moore.states.map(s => [s.id, s.output ?? '']));
  const transitions: Transition[] = moore.transitions.map(t => ({ ...t, id:`${t.id}-mealy`, output:outputs.get(t.to) ?? '' }));
  return { ...cloneMachine(moore), id:`${moore.id}-mealy`, name:`${moore.name} (Mealy)`, type:'mealy', transitions };
}
