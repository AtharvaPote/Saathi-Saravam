'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle, Package, X } from 'lucide-react';
import { findItem, type State, type Unit } from './lib/domain';

export default function InventoryEditor({state,busy,onClose,onSubmit}:{state:State;busy:boolean;onClose:()=>void;onSubmit:(action:unknown)=>void}) {
 const [mode,setMode]=useState<'add'|'set'>('add');
 const [item,setItem]=useState(''),[unit,setUnit]=useState<Unit>('cartons'),[baseUnit,setBaseUnit]=useState<Unit>('packs');
 const existing=findItem(state,item),base=existing?.unit||baseUnit;
 const packaging=existing?.packaging?.find(p=>p.unit===unit);
 const needsConversion=unit!==base&&['cartons','boxes'].includes(unit);
 function chooseItem(value:string){setItem(value);const found=findItem(state,value);if(found){setUnit(found.packaging?.[0]?.unit||found.unit);setBaseUnit(found.unit);}}
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);
  onSubmit({type:'inventory',mode,item,quantity:Number(data.get('quantity')),unit,baseUnit:base,
   ...(needsConversion&&!packaging&&data.get('unitsPerPack')?{unitsPerPack:Number(data.get('unitsPerPack'))}:{}),
   ...(data.get('price')?{price:Number(data.get('price'))}:{})});
 }
 return <div className="modal-layer"><button className="modal-backdrop" onClick={onClose} aria-label="Dismiss form backdrop"/>
  <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
   <div className="modal-heading"><span className="tile-icon sage"><Package/></span><button className="icon-button" onClick={onClose} aria-label="Close form"><X/></button></div>
   <h2 id="form-title">{mode==='add'?'Receive new stock':'Correct a stock total'}</h2><p>{mode==='add'?'Tell us what arrived. We’ll add it to your existing stock after you confirm.':'Use this when you have counted everything on hand.'}</p>
   <div className="stock-mode" aria-label="Stock operation"><button aria-pressed={mode==='add'} onClick={()=>setMode('add')}>Add received stock</button><button aria-pressed={mode==='set'} onClick={()=>setMode('set')}>Set total on hand</button></div>
   <form onSubmit={submit}>
    <label>Item name<input list="stock-items" value={item} onChange={e=>chooseItem(e.target.value)} required maxLength={100} placeholder="e.g. Maggi" autoComplete="off"/><datalist id="stock-items">{state.inventory.map(i=><option key={i.item} value={i.item}/>)}</datalist></label>
    {item.trim()&&<p className="stock-context">{existing?`Already in stock: ${existing.quantity} ${existing.unit}`:'New item · created only after confirmation'}</p>}
    <div className="form-row"><label>{mode==='add'?'Quantity received':'Total quantity on hand'}<input name="quantity" type="number" required min={mode==='add'?(['kg','litres'].includes(unit)?0.0001:1):0} max="1000000" step={['kg','litres'].includes(unit)?'0.0001':'1'} placeholder="10"/></label><label>Received in<select value={unit} onChange={e=>{const next=e.target.value as Unit;setUnit(next);if(!existing&&!['cartons','boxes'].includes(next))setBaseUnit(next);}}>{(['cartons','boxes','packs','pieces','kg','litres'] as Unit[]).filter(u=>!existing||u===existing.unit||['cartons','boxes'].includes(u)).map(u=><option key={u}>{u}</option>)}</select></label></div>
    {!existing&&['cartons','boxes'].includes(unit)&&<label>Keep stock and sell in<select value={baseUnit} onChange={e=>setBaseUnit(e.target.value as Unit)}>{(['packs','pieces','kg','litres','boxes','cartons'] as Unit[]).map(u=><option key={u}>{u}</option>)}</select></label>}
    {needsConversion&&(packaging?<p className="stock-context">Saved packaging: 1 {unit==='cartons'?'carton':'box'} = {packaging.unitsPerPack} {base}</p>:<label>How many {base} in one {unit==='cartons'?'carton':'box'}?<input name="unitsPerPack" type="number" min={['kg','litres'].includes(base)?0.0001:1} max="100000" step={['kg','litres'].includes(base)?'0.0001':'1'} placeholder="e.g. 24"/><span className="field-hint">Leave blank to continue the question with Saathi.</span></label>)}
    {existing?.price!=null?<p className="stock-context">Selling price stays ₹{existing.price} per {existing.unit}.</p>:<label>Selling price per {base} (₹, optional)<input name="price" type="number" min="0" max="100000" step="0.01" placeholder="Add later if you’re not ready"/></label>}
    <button className="primary wide" disabled={busy}>{busy?<LoaderCircle className="spin" size={17}/>:<>Review stock change <ArrowRight size={17}/></>}</button>
   </form>
  </section>
 </div>;
}
