import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Boxes, Download, Moon, Play, Plus, Save, Sun, Trash2 } from 'lucide-react';
import { Background, BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow, type Edge, type EdgeProps, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Machine, Transition } from './types';
import { examples } from './examples';
import { cloneMachine, mealyToMoore, mooreToMealy, simulate, validateMachine } from './engine';

type Page = 'Dashboard' | 'Mealy Machine' | 'Moore Machine' | 'Conversion Lab' | 'Simulator' | 'Theory & Guide';

const emptyMachine = (type: 'mealy' | 'moore'): Machine => ({
  id:`machine-${Date.now()}`, name:`Untitled ${type === 'mealy' ? 'Mealy' : 'Moore'} Machine`, type,
  alphabet:['0','1'], outputAlphabet:['0','1'], states:[{id:'A',name:'A',output:type==='moore'?'0':undefined,x:220,y:180}],
  transitions:[], initialState:'A'
});

function MachineFlowNode({ data, selected }: NodeProps<Node<{ name:string; output?:string; type:'mealy'|'moore'; initial:boolean; active:boolean }>>) {
  return <div className={`rf-node ${data.initial?'initial':''} ${data.active?'active':''} ${selected?'selected':''}`}>
    <Handle type="target" position={Position.Top} id="top-target" />
    <Handle type="source" position={Position.Top} id="top-source" />
    <Handle type="target" position={Position.Bottom} id="bottom-target" />
    <Handle type="source" position={Position.Bottom} id="bottom-source" />
    <Handle type="target" position={Position.Left} id="left-target" />
    <Handle type="source" position={Position.Left} id="left-source" />
    <Handle type="target" position={Position.Right} id="right-target" />
    <Handle type="source" position={Position.Right} id="right-source" />
    <div className="rf-state-label"><strong>{data.name}</strong>{data.type==='moore'&&<span>/ {data.output||'—'}</span>}</div>
  </div>;
}

function LoopEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, style, label, labelStyle }: EdgeProps) {
  const path = `M ${sourceX} ${sourceY} C ${sourceX - 10} ${sourceY - 72}, ${targetX + 64} ${targetY - 72}, ${targetX} ${targetY}`;
  const labelX = (sourceX + targetX) / 2 + 8;
  const labelY = Math.min(sourceY, targetY) - 48;
  return <>
    <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
    <EdgeLabelRenderer>
      <div className="rf-edge-label" style={{ transform:`translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, ...(labelStyle||{}) }}>{label}</div>
    </EdgeLabelRenderer>
  </>;
}

const flowNodeTypes = { machineState: MachineFlowNode };
const flowEdgeTypes = { loop: LoopEdge };

function Graph({ machine, activeState, activeTransition, onSelect }: { machine:Machine; activeState?:string; activeTransition?:string; onSelect?: (id:string)=>void }) {
  const nodes: Node[] = useMemo(() => {
    const count = machine.states.length;
    if (!count) return [];

    // Layout states in a horizontal row for ≤5 states, else in a grid
    const columns = count <= 5 ? count : Math.ceil(Math.sqrt(count * 1.5));
    const spacingX = count <= 4 ? 220 : 190;
    const spacingY = 190;

    return machine.states.map((state, index) => {
      const row = Math.floor(index / columns);
      const totalRows = Math.ceil(count / columns);
      const remaining = count - row * columns;
      const inRow = Math.min(remaining, columns);
      const rowWidth = (inRow - 1) * spacingX;
      // Center each row; rows grow downward
      const cx = rowWidth / 2 - (index % columns) * spacingX;
      const cy = row * spacingY;
      return {
        id: state.id,
        position: { x: -cx + 42, y: cy + 40 },
        data: { name:state.name, output:state.output, type:machine.type, initial:machine.initialState===state.id, active:activeState===state.id },
        type: 'machineState'
      };
    });
  }, [machine.states, machine.initialState, machine.type, activeState]);

  // Build per-direction edge groups: key = "from->to" (directed)
  const edgeGroups = useMemo(() => {
    const groups = new Map<string, Transition[]>();
    machine.transitions.forEach(t => {
      const key = `${t.from}->${t.to}`;
      groups.set(key, [...(groups.get(key) || []), t]);
    });
    return groups;
  }, [machine.transitions]);

  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];
    edgeGroups.forEach((transitions, key) => {
      const first = transitions[0];
      const selfLoop = first.from === first.to;
      // Merge all labels for same (from,to) pair
      const label = [...new Set(transitions.map(t =>
        `${t.input}${machine.type === 'mealy' ? ` / ${t.output || '—'}` : ''}`
      ))].join('  ·  ');
      const isActive = transitions.some(t => t.id === activeTransition);
      const color = isActive ? '#f59e0b' : '#42d3c5';

      const reverseExists = !selfLoop && edgeGroups.has(`${first.to}->${first.from}`);
      const fromIndex = machine.states.findIndex(s=>s.id===first.from);
      const toIndex = machine.states.findIndex(s=>s.id===first.to);
      const columns = machine.states.length <= 5 ? machine.states.length : Math.ceil(Math.sqrt(machine.states.length*1.5));
      const sameRow = Math.floor(fromIndex/columns)===Math.floor(toIndex/columns);
      const forward = fromIndex < toIndex;
      const baseEdge = {
        id: key,
        source: first.from,
        target: first.to,
        label,
        className: isActive ? 'rf-edge-active' : 'rf-edge',
        style: { stroke: color, strokeWidth: 2 },
        labelStyle: { fill: '#dbe6f3', fontSize: 12 },
        labelBgStyle: { fill: '#08111f', fillOpacity: 0.92 },
        labelBgPadding: [5, 4] as [number, number],
        labelShowBg: true,
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 }
      };

      if (selfLoop) {
        result.push({ ...baseEdge, type: 'loop', sourceHandle:'top-source', targetHandle:'right-target' });
      } else {
        result.push({
          ...baseEdge,
          type: 'default',
          sourceHandle: reverseExists ? (forward?'top-source':'bottom-source') : (sameRow?(forward?'right-source':'left-source'):'bottom-source'),
          targetHandle: reverseExists ? (forward?'top-target':'bottom-target') : (sameRow?(forward?'left-target':'right-target'):'top-target')
        });
      }
    });
    return result;
  }, [edgeGroups, machine.transitions, machine.type, activeTransition]);

  return (
    <div className="graph rf-graph" onDoubleClick={() => undefined}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={flowNodeTypes}
        edgeTypes={flowEdgeTypes}
        fitView
        fitViewOptions={{ padding: 0.35, maxZoom: 1.0, minZoom: 0.4 }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => onSelect?.(node.id)}
        panOnDrag
        panOnScroll={false}
        zoomOnScroll
        minZoom={0.3}
        maxZoom={2.0}
        defaultEdgeOptions={{ animated: false }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="#1b2d43" />
      </ReactFlow>
    </div>
  );
}

function Table({ machine, activeTransition, onTransition }: {machine:Machine; activeTransition?:string; onTransition?: (t:Transition)=>void}) {
  return (
    <div className="table-wrap"><table>
      <thead><tr><th>State</th>{machine.type==='moore'&&<th>Output</th>} {machine.alphabet.map(a=><th key={a}>{a}</th>)}</tr></thead>
      <tbody>{machine.states.map(s=><tr key={s.id}><td><strong>{s.name}</strong>{machine.initialState===s.id&&<span className="tag">initial</span>}</td>
        {machine.type==='moore'&&<td>{s.output||<span className="missing">Missing</span>}</td>}
        {machine.alphabet.map(a=>{
          const t=machine.transitions.find(x=>x.from===s.id&&x.input===a);
          return <td key={a} className={!t?'missing-cell':activeTransition===t.id?'active-cell':''}><button className="cell-button" onClick={()=>t&&onTransition?.(t)}>{t?(machine.type==='mealy'?`${machine.states.find(x=>x.id===t.to)?.name||t.to} / ${t.output||'—'}`:machine.states.find(x=>x.id===t.to)?.name||t.to):<span className="missing">Missing</span>}</button></td>;
        })}
      </tr>)}</tbody>
    </table></div>
  );
}

function MachineEditor({ machine, setMachine }: {machine:Machine; setMachine:(m:Machine)=>void}) {
  const [view,setView]=useState<'graph'|'table'>('graph');
  const [selected,setSelected]=useState(machine.states[0]?.id||'');
  const [transitionId,setTransitionId]=useState('');
  const [form,setForm]=useState({from:selected,to:selected,input:machine.alphabet[0]||'',output:machine.outputAlphabet[0]||''});
  useEffect(()=>setForm(f=>({...f,from:selected})),[selected]);
  useEffect(()=>setForm(f=>({...f,input:machine.alphabet[0]||'',to:machine.states[0]?.id||''})),[machine.id]);
  const errors=validateMachine(machine);
  const up=(patch:Partial<Machine>)=>setMachine({...machine,...patch});
  const addState=()=>{
    const n=machine.states.length;
    const id=String.fromCharCode(65+n%26)+(n>=26?Math.floor(n/26):'');
    const next={id,name:id,output:machine.type==='moore'?(machine.outputAlphabet[0]||''):undefined,x:170+(n*150)%600,y:120+(n%2)*180};
    up({states:[...machine.states,next],initialState:machine.initialState||id});
    setSelected(id);
  };
  const rename=(id:string,name:string)=>{
    up({states:machine.states.map(s=>s.id===id?{...s,id:name,name}:s),initialState:machine.initialState===id?name:machine.initialState,
      transitions:machine.transitions.map(t=>({...t,from:t.from===id?name:t.from,to:t.to===id?name:t.to}))});
    setSelected(name);
  };
  const removeState=(id:string)=>{
    const states=machine.states.filter(s=>s.id!==id);
    up({states,initialState:machine.initialState===id?(states[0]?.id||''):machine.initialState,transitions:machine.transitions.filter(t=>t.from!==id&&t.to!==id)});
  };
  const saveTransition=()=>{
    if(!form.from||!form.to||!form.input)return;
    const existing=machine.transitions.find(t=>t.from===form.from&&t.input===form.input);
    const t:Transition={id:existing?.id||`t-${Date.now()}`,from:form.from,to:form.to,input:form.input,output:machine.type==='mealy'?form.output:undefined};
    up({transitions:existing?machine.transitions.map(x=>x.id===existing.id?t:x):[...machine.transitions,t]});
  };
  const editTransition=(t:Transition)=>{setTransitionId(t.id);setForm({from:t.from,to:t.to,input:t.input,output:t.output||machine.outputAlphabet[0]||''})};
  const deleteTransition=(id:string)=>up({transitions:machine.transitions.filter(t=>t.id!==id)});
  return (
    <div className="editor-layout">
      <aside className="config-panel panel">
        <label>Machine name<input value={machine.name} onChange={e=>up({name:e.target.value})}/></label>
        <div className="field-row"><label>Input alphabet<input value={machine.alphabet.join(', ')} onChange={e=>up({alphabet:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label></div>
        <label>Output alphabet<input value={machine.outputAlphabet.join(', ')} onChange={e=>up({outputAlphabet:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})}/></label>
        <div className="section-title"><span>States</span><button className="icon-button" onClick={addState}><Plus size={16}/></button></div>
        <div className="state-list">{machine.states.map(s=><div className={`state-item ${selected===s.id?'selected':''}`} key={s.id} onClick={()=>setSelected(s.id)}>
          <input value={s.name} onChange={e=>rename(s.id,e.target.value)} onClick={e=>e.stopPropagation}/>
          {machine.type==='moore'&&<input className="state-output" value={s.output||''} onChange={e=>up({states:machine.states.map(x=>x.id===s.id?{...x,output:e.target.value}:x)})} onClick={e=>e.stopPropagation}/>}
          <button title="Set initial" className={machine.initialState===s.id?'initial-btn on':'initial-btn'} onClick={e=>{e.stopPropagation();up({initialState:s.id})}}>I</button>
          <button className="danger-icon" onClick={e=>{e.stopPropagation();removeState(s.id)}}><Trash2 size={14}/></button>
        </div>)}</div>
        {errors.length>0&&<div className="validation"><strong>{errors.length} issue{errors.length>1?'s':''}</strong>{errors.slice(0,3).map(e=><div key={e}>• {e}</div>)}</div>}
      </aside>
      <main className="workspace panel">
        <div className="workspace-head"><div className="view-switch"><button className={view==='graph'?'on':''} onClick={()=>setView('graph')}>Diagram</button><button className={view==='table'?'on':''} onClick={()=>setView('table')}>Table</button></div></div>
        {view==='graph'?<Graph machine={machine} onSelect={setSelected}/>:<Table machine={machine} onTransition={editTransition}/>}
      </main>
      <aside className="transition-panel panel">
        <div className="section-title"><span>{transitionId?'Edit transition':'New transition'}</span>{transitionId&&<button className="text-button" onClick={()=>{setTransitionId('');setForm(f=>({...f,from:selected}))}}>Cancel</button>}</div>
        <label>From<select value={form.from} onChange={e=>setForm({...form,from:e.target.value})}>{machine.states.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Input<select value={form.input} onChange={e=>setForm({...form,input:e.target.value})}>{machine.alphabet.map(a=><option key={a}>{a}</option>)}</select></label>
        <label>To<select value={form.to} onChange={e=>setForm({...form,to:e.target.value})}>{machine.states.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        {machine.type==='mealy'&&<label>Output<select value={form.output} onChange={e=>setForm({...form,output:e.target.value})}><option value="">Select output</option>{machine.outputAlphabet.map(o=><option key={o}>{o}</option>)}</select></label>}
        <button className="primary full" onClick={saveTransition}>{transitionId?'Update transition':'Add transition'} <ArrowRight size={16}/></button>
        <div className="transition-list">{machine.transitions.map(t=><div className="transition-row" key={t.id}><button onClick={()=>editTransition(t)}>{t.from} <span>--{t.input}{machine.type==='mealy'?`/${t.output}`:''}→</span> {t.to}</button><button className="danger-icon" onClick={()=>deleteTransition(t.id)}><Trash2 size={14}/></button></div>)}</div>
      </aside>
    </div>
  );
}

function Dashboard({ navigate, loadExample, create }: { navigate:(p:Page)=>void; loadExample:(m:Machine)=>void; create:(t:'mealy'|'moore')=>void }) {
  return (
    <div className="dashboard">
      <section className="hero">
        <div><span className="eyebrow">AUTOMATA THEORY WORKBENCH</span><h1>Design. Convert. <span>Simulate.</span></h1><p>Build deterministic finite-state machines, understand their behavior, and convert between Mealy and Moore models.</p><div className="hero-actions"><button className="primary" onClick={()=>create('mealy')}><Plus size={17}/> Create Mealy Machine</button><button className="secondary" onClick={()=>create('moore')}><Plus size={17}/> Create Moore Machine</button></div></div>
        <div className="hero-art"><div className="mini-state one">A</div><div className="mini-state two">B</div><svg viewBox="0 0 300 180"><defs><marker id="hero-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#5eead4"/></marker></defs><path d="M82 82 C120 30 180 30 218 82" fill="none" stroke="#5eead4" strokeWidth="2" markerEnd="url(#hero-arrow)"/><text x="150" y="42" textAnchor="middle" fill="#94a3b8">1 / X</text><path d="M218 98 C180 145 120 145 82 98" fill="none" stroke="#5eead4" strokeWidth="2" markerEnd="url(#hero-arrow)"/><text x="150" y="145" textAnchor="middle" fill="#94a3b8">0 / Y</text></svg></div>
      </section>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-head"><div><span className="eyebrow">QUICK START</span><h2>Example machines</h2></div></div><div className="example-list">{examples.map(m=><button key={m.id} className="example-card" onClick={()=>loadExample(m)}><div className={`example-icon ${m.type}`}>{m.type==='mealy'?'M':'O'}</div><div><strong>{m.name}</strong><span>{m.states.length} states · {m.alphabet.join(', ')}</span></div><ArrowRight size={16}/></button>)}</div></section>
        <section className="panel comparison"><div className="panel-head"><div><span className="eyebrow">MODEL COMPARISON</span><h2>Mealy vs Moore</h2></div></div><div className="compare-row"><span>Output location</span><b>Transition</b><b>State</b></div><div className="compare-row"><span>Output timing</span><b>On transition</b><b>On arrival</b></div><div className="compare-row"><span>Typical states</span><b>Fewer</b><b>May require more</b></div><button className="text-button" onClick={()=>navigate('Theory & Guide')}>Open theory guide →</button></section>
        <section className="panel workflow"><div className="panel-head"><span className="eyebrow">WORKFLOW</span><h2>From idea to equivalence</h2></div><div className="steps"><div><b>1</b><span>Create a machine</span></div><div><b>2</b><span>Build transitions</span></div><div><b>3</b><span>Convert or simulate</span></div><div><b>4</b><span>Test equivalence</span></div></div></section>
      </div>
    </div>
  );
}

function Simulator({ machines, addSaved }: { machines:Machine[]; addSaved:(m:Machine)=>void }) {
  const [selected,setSelected]=useState(machines[0]?.id||'');
  const machine=machines.find(m=>m.id===selected)||machines[0];
  const [input,setInput]=useState(machine?.type==='mealy'?'101':'101');
  const [step,setStep]=useState(-1);
  const [result,setResult]=useState(()=>machine?simulate(machine,input):null);
  useEffect(()=>{setStep(-1);setResult(machine?simulate(machine,input):null)},[selected]);
  if(!machine)return <div className="empty panel">Create or load a machine to begin.</div>;
  const run=()=>{setStep(-1);setResult(simulate(machine,input))};
  const stepForward=()=>{if(step>=0&&step>=input.length)return;setStep(s=>Math.min(s+1,input.length))};
  const active=result?.steps[Math.max(0,step-1)];
  const currentState=step<=0?machine.initialState:(active?.to||machine.initialState);
  const activeTransition=active?machine.transitions.find(t=>t.from===active.state&&t.input===active.input&&t.to===active.to)?.id:undefined;
  return (
    <div className="sim-layout">
      <aside className="config-panel panel"><label>Machine<select value={selected} onChange={e=>setSelected(e.target.value)}>{machines.map(m=><option key={m.id} value={m.id}>{m.name} ({m.type})</option>)}</select></label><label>Input string<input value={input} onChange={e=>setInput(e.target.value.replace(/\s/g,''))}/></label><div className="alphabet">Alphabet: {machine.alphabet.map(a=><span key={a}>{a}</span>)}</div><button className="primary full" onClick={run}><Play size={16}/> Run complete</button><div className="control-row"><button className="secondary" onClick={()=>{setStep(-1);setResult(simulate(machine,input))}}>Reset</button><button className="secondary" onClick={stepForward}>Step +1</button></div></aside>
      <main className="workspace panel"><div className="workspace-head"><h2>Simulation trace</h2><span className={result?.valid?'status ok':'status bad'}>{result?.valid?'Valid':'Invalid'}</span></div><Graph machine={machine} activeState={currentState} activeTransition={activeTransition}/></main>
      <aside className="results-panel panel"><h3>Result</h3>{result&&<><div className="metric"><span>State sequence</span><strong>{result.stateSequence.join(' → ')}</strong></div><div className="metric"><span>Output sequence</span><strong>{machine.type==='moore'&&machine.convention==='includeInitial'?result.outputs.join(' '):result.outputs.join(' ')||'—'}</strong></div><div className="metric"><span>Transitions</span><strong>{result.steps.length}</strong></div><div className="timing-note">{machine.type==='mealy'?'Mealy: output is produced on each transition.':'Moore: output comes from the entered state; the initial-state output is included as the first symbol.'}</div><div className="trace">{result.steps.map((s,i)=><div key={i} className={i===step-1?'trace-step active':'trace-step'}><b>{i+1}</b><span>{s.state} --{s.input}/{s.output}→ {s.to}</span></div>)}</div>{!result.valid&&<div className="validation">{result.message}</div>}</>}</aside>
    </div>
  );
}

function ConversionLab({ machines }: {machines:Machine[]}) {
  const [sourceId,setSourceId]=useState(machines.find(m=>m.type==='mealy')?.id||machines[0]?.id||'');
  const [direction,setDirection]=useState<'mtom'|'mtomr'>('mtom');
  const source=machines.find(m=>m.id===sourceId);
  const [converted,setConverted]=useState<Machine|null>(null);
  const [test,setTest]=useState<{count:number;matches:number;mismatches:number}|null>(null);
  useEffect(()=>{
    if(source?.type==='mealy')setDirection('mtom');
    else if(source?.type==='moore')setDirection('mtomr');
  },[sourceId]);
  const convert=()=>{
    if(!source)return;
    setConverted(source.type==='mealy'?mealyToMoore(source):mooreToMealy(source));
    setTest(null);
  };
  const runEquivalence=()=>{
    if(!source||!converted)return;
    const strings=['','0','1','00','01','10','11','101','010','111','1010','0101','01101'];
    let matches=0;
    for(const text of strings){
      const a=simulate(source,text),b=simulate(converted,text);
      if(a.valid===b.valid){
        const ao=source.type==='moore'?a.outputs.slice(1):a.outputs;
        const bo=converted.type==='moore'?b.outputs.slice(1):b.outputs;
        if(JSON.stringify(ao)===JSON.stringify(bo)&&JSON.stringify(a.stateSequence)===JSON.stringify(b.stateSequence))matches++;
      }
    }
    setTest({count:strings.length,matches,mismatches:strings.length-matches});
  };
  return (
    <div className="conversion">
      <div className="conversion-controls panel">
        <label>Source machine<select value={sourceId} onChange={e=>setSourceId(e.target.value)}>{machines.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Direction<select value={direction} onChange={e=>setDirection(e.target.value as 'mtom'|'mtomr')}><option value="mtom">Mealy to Moore</option><option value="mtomr">Moore to Mealy</option></select></label>
        <button className="primary" onClick={convert}>Convert <ArrowRight size={16}/></button>
        <button className="secondary" onClick={runEquivalence} disabled={!converted}>Run Equivalence Test</button>
      </div>
      {test&&<div className={`test-banner ${test.mismatches?'bad':'ok'}`}><strong>{test.mismatches?'Issues detected':'Pass: equivalent on tested inputs'}</strong><span>{test.matches}/{test.count} strings matched · {test.mismatches} mismatches</span></div>}
      {source&&converted?(
        <>
          <div className="conversion-grid">
            <section className="panel"><div className="panel-head"><h2>Original · {source.type}</h2></div><Graph machine={source}/><Table machine={source}/></section>
            <section className="panel"><div className="panel-head"><h2>Converted · {converted.type}</h2></div><Graph machine={converted}/><Table machine={converted}/></section>
          </div>
          <section className="panel conversion-explain"><h2>Conversion steps</h2>{source.type==='mealy'?<><p>1. Collect distinct incoming transition outputs for every original state.</p><p>2. Split states that receive different outputs, such as A_X and A_Y.</p><p>3. Move each transition output onto the destination Moore state.</p><p>4. Select the initial Moore state using the incoming-output convention.</p></>:<><p>1. Preserve every Moore state and transition.</p><p>2. Replace each edge output with the destination state output.</p><p>3. Remove state-associated output annotations from the Mealy result.</p></>}</section>
        </>
      ):<div className="empty panel">Select a source machine and run conversion to inspect the result.</div>}
    </div>
  );
}

function Theory() {
  return (
    <div className="theory">
      <section className="panel theory-hero"><span className="eyebrow">REFERENCE GUIDE</span><h1>Finite State Machines</h1><p>A finite state machine is a mathematical model consisting of states, transitions, and an input alphabet. Its response is determined entirely by the current state and next input symbol.</p></section>
      <div className="theory-grid">
        <section className="panel"><h2>Mealy machine</h2><div className="formula">{'M = (Q, Σ, Δ, Γ, λ, q₀)'}</div><p>A Mealy machine emits output while traversing a transition. Therefore, <b>{'λ(q, a)'}</b> depends on both the current state and the input symbol.</p><div className="formula-example">{'A -- 0 / X --> B'}</div><h3>Advantages</h3><ul><li>Often requires fewer states</li><li>Fast response on transition</li></ul><h3>Limitations</h3><ul><li>Output can change immediately with input</li><li>Harder to associate output with stable states</li></ul></section>
        <section className="panel"><h2>Moore machine</h2><div className="formula">{'M = (Q, Σ, Δ, Γ, λ, q₀)'}</div><p>A Moore machine emits output from the state it occupies. Therefore, <b>{'λ(q)'}</b> depends only on the current state.</p><div className="formula-example">{'A / 0 -- 1 --> B / 1'}</div><h3>Advantages</h3><ul><li>Stable, state-associated output</li><li>Output timing is explicit</li></ul><h3>Limitations</h3><ul><li>May require additional states</li><li>Output changes only after arrival</li></ul></section>
      </div>
      <section className="panel"><h2>Mealy–Moore conversion theory</h2><div className="conversion-theory"><div><b>Mealy → Moore</b><p>For every original state, inspect the outputs of transitions entering it. Split the state for each distinct incoming output. For example, state A receiving X and Y becomes A_X and A_Y.</p></div><div><b>Moore → Mealy</b><p>Copy every Moore transition and assign it the output of the destination state.</p></div><div><b>Initial output</b><p>Mealy machines have no initial-state output; Moore machines do. For exact equivalence, explicitly include or exclude the initial Moore output and document this convention.</p></div></div></section>
      <section className="panel"><h2>Applications</h2><div className="application-grid"><div>Sequence detection</div><div>Digital logic</div><div>Protocol parsing</div><div>Control systems</div><div>Text scanning</div><div>Lexical analysis</div></div></section>
    </div>
  );
}

export default function App() {
  const [page,setPage]=useState<Page>('Dashboard');
  const [light,setLight]=useState(false);
  const [saved,setSaved]=useState<Machine[]>(()=>{
    try{return JSON.parse(localStorage.getItem('machine-lab-saved')||'[]')}catch{return []}
  });
  const [mealy,setMealy]=useState<Machine>(()=>examples[0]);
  const [moore,setMoore]=useState<Machine>(()=>examples[1]);
  const allMachines=[...saved,...(saved.some(m=>m.id===mealy.id)?[]:[mealy]),...(saved.some(m=>m.id===moore.id)?[]:[moore])];
  useEffect(()=>{document.documentElement.className=light?'light':''},[light]);
  const create=(type:'mealy'|'moore')=>{
    const m=emptyMachine(type);
    if(type==='mealy')setMealy(m);else setMoore(m);
    setPage(type==='mealy'?'Mealy Machine':'Moore Machine');
  };
  const loadExample=(m:Machine)=>{
    const copy=cloneMachine(m);
    if(copy.type==='mealy')setMealy(copy);else setMoore(copy);
    setSaved(s=>[copy,...s.filter(x=>x.id!==copy.id)].slice(0,12));
    setPage(copy.type==='mealy'?'Mealy Machine':'Moore Machine');
  };
  const save=(m:Machine)=>setSaved(s=>[cloneMachine(m),...s.filter(x=>x.id!==m.id)].slice(0,20));
  const exportJson=(m:Machine)=>{
    const blob=new Blob([JSON.stringify(m,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`${m.name.replace(/\s+/g,'-').toLowerCase()}.json`;a.click();URL.revokeObjectURL(url);
  };
  useEffect(()=>localStorage.setItem('machine-lab-saved',JSON.stringify(saved)),[saved]);
  const nav=[['Dashboard',Activity],['Mealy Machine',Boxes],['Moore Machine',Boxes],['Conversion Lab',ArrowRight],['Simulator',Play],['Theory & Guide',BookOpen]] as const;
  return (
    <div className="app">
      <aside className="sidebar"><div className="brand"><div className="brand-mark">M<span>↔</span>M</div><div><strong>Machine Lab</strong><span>Automata Simulator</span></div></div><nav>{nav.map(([name,Icon])=><button key={name} className={page===name?'active':''} onClick={()=>setPage(name)}><Icon size={18}/><span>{name}</span></button>)}</nav><div className="sidebar-bottom"><button onClick={()=>setLight(v=>!v)}>{light?<Moon size={18}/>:<Sun size={18}/>}<span>{light?'Dark mode':'Light mode'}</span></button></div></aside>
      <div className="main-shell"><header className="topbar"><div><span className="breadcrumb">Workspace</span><b>/ {page}</b></div><div className="top-actions">{page==='Mealy Machine'&&<><button className="secondary" onClick={()=>save(mealy)}><Save size={16}/> Save</button><button className="icon-button" title="Export JSON" onClick={()=>exportJson(mealy)}><Download size={17}/></button></>}{page==='Moore Machine'&&<><button className="secondary" onClick={()=>save(moore)}><Save size={16}/> Save</button><button className="icon-button" title="Export JSON" onClick={()=>exportJson(moore)}><Download size={17}/></button></>}</div></header><main className="content">
        {page==='Dashboard'&&<Dashboard navigate={setPage} loadExample={loadExample} create={create}/>}
        {page==='Mealy Machine'&&<MachineEditor machine={mealy} setMachine={setMealy}/>}
        {page==='Moore Machine'&&<MachineEditor machine={moore} setMachine={setMoore}/>}
        {page==='Conversion Lab'&&<ConversionLab machines={allMachines}/>}
        {page==='Simulator'&&<Simulator machines={allMachines} addSaved={save}/>}
        {page==='Theory & Guide'&&<Theory/>}
      </main></div>
    </div>
  );
}
