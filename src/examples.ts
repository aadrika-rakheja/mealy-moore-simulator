import type { Machine } from './types';

export const examples: Machine[] = [
  {
    id:'mealy-101', name:'Binary 101 Detector (Mealy)', type:'mealy',
    alphabet:['0','1'], outputAlphabet:['0','1'], initialState:'S0',
    states:[
      {id:'S0',name:'S0',x:130,y:180},{id:'S1',name:'S1',x:330,y:180},
      {id:'S2',name:'S2',x:530,y:180}
    ],
    transitions:[
      {id:'t1',from:'S0',to:'S0',input:'0',output:'0'},{id:'t2',from:'S0',to:'S1',input:'1',output:'0'},
      {id:'t3',from:'S1',to:'S2',input:'0',output:'0'},{id:'t4',from:'S1',to:'S1',input:'1',output:'0'},
      {id:'t5',from:'S2',to:'S0',input:'0',output:'0'},{id:'t6',from:'S2',to:'S1',input:'1',output:'1'}
    ]
  },
  {
    id:'moore-101', name:'Binary 101 Detector (Moore)', type:'moore',
    alphabet:['0','1'], outputAlphabet:['0','1'], initialState:'A',
    states:[
      {id:'A',name:'A',output:'0',x:130,y:180},{id:'B',name:'B',output:'0',x:330,y:180},
      {id:'C',name:'C',output:'0',x:530,y:180},{id:'D',name:'D',output:'1',x:730,y:180}
    ],
    transitions:[
      {id:'m1',from:'A',to:'A',input:'0'},{id:'m2',from:'A',to:'B',input:'1'},
      {id:'m3',from:'B',to:'C',input:'0'},{id:'m4',from:'B',to:'B',input:'1'},
      {id:'m5',from:'C',to:'A',input:'0'},{id:'m6',from:'C',to:'D',input:'1'},
      {id:'m7',from:'D',to:'C',input:'0'},{id:'m8',from:'D',to:'B',input:'1'}
    ]
  },
  {
    id:'parity', name:'Even–Odd Parity', type:'mealy',
    alphabet:['0','1'], outputAlphabet:['E','O'], initialState:'Even',
    states:[
      {id:'Even',name:'Even',x:180,y:180},{id:'Odd',name:'Odd',x:480,y:180}
    ],
    transitions:[
      {id:'p1',from:'Even',to:'Even',input:'0',output:'E'},{id:'p2',from:'Even',to:'Odd',input:'1',output:'O'},
      {id:'p3',from:'Odd',to:'Odd',input:'0',output:'O'},{id:'p4',from:'Odd',to:'Even',input:'1',output:'E'}
    ]
  }
];
