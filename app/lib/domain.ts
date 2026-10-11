import { z } from 'zod';
export type Profile = 'shop' | 'farm';
export const profiles = {
  shop: { name: 'Meena', fullName: 'Meena Sharma', business: 'Meena Kirana Store', email: 'shop@saathi.demo', location: 'Jaipur, Rajasthan', initials: 'MS' },
  farm: { name: 'Ramesh', fullName: 'Ramesh Patil', business: 'Patil Family Farm', email: 'farmer@saathi.demo', location: 'Nashik, Maharashtra', initials: 'RP' },
};
const name = z.string().trim().min(1).max(100);
const amount = z.number().finite().positive().max(1000000);
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('inventory'), item: name, quantity: z.number().finite().min(0).max(100000), unit: z.enum(['kg','litres','packs','pieces']), price: z.number().finite().min(0).max(100000) }),
  z.object({ type: z.literal('credit'), customer: name, amount, note: z.string().max(200).default('') }),
  z.object({ type: z.literal('payment'), customer: name, amount }),
  z.object({ type: z.literal('sale'), item: name, quantity: z.number().finite().positive().max(100000), customer: name }),
  z.object({ type: z.literal('task'), title: name, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v, 'Use a valid date') }),
  z.object({ type: z.literal('appointment'), customer: name, service: name, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }),
]);
export type Action = z.infer<typeof actionSchema>;
export type Message = { id: string; role: 'user'|'assistant'; text: string; at: string; action?: Action; status?: 'pending'|'saved'|'cancelled' };
export type State = {
  inventory: { item: string; quantity: number; unit: string; price: number }[];
  credits: { customer: string; amount: number; note: string }[];
  sales: { id: string; item: string; quantity: number; total: number; customer: string; at: string }[];
  tasks: { id: string; title: string; date: string; done: boolean }[];
  appointments: { id: string; customer: string; service: string; date: string; time: string }[];
  messages: Message[];
  activity: { id: string; text: string; at: string }[];
  usage: { start: number; count: number };
};
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function seed(profile: Profile): State {
  return { inventory: profile === 'shop' ? [{item:'Rice',quantity:45,unit:'kg',price:60},{item:'Wheat flour',quantity:30,unit:'kg',price:45},{item:'Sunflower oil',quantity:8,unit:'litres',price:140},{item:'Sugar',quantity:4,unit:'kg',price:42},{item:'Tea',quantity:18,unit:'packs',price:30}] : [], credits: profile === 'shop' ? [{customer:'Ravi',amount:450,note:'Groceries'},{customer:'Sunita',amount:280,note:'Monthly essentials'},{customer:'Amit',amount:120,note:'Tea and sugar'}] : [], sales: [], tasks: profile === 'farm' ? [{id:'seed-task',title:'Check soil moisture in the onion plot',date:today(),done:false}] : [], appointments: [], messages: [], activity: [], usage:{start:Date.now(),count:0} };
}
export function describe(a: Action) {
  if(a.type==='inventory') return `Set ${a.item} stock to ${a.quantity} ${a.unit} · ₹${a.price}/${a.unit}`;
  if(a.type==='credit') return `Add ₹${a.amount} to ${a.customer}'s udhaar${a.note ? ' · '+a.note : ''}`;
  if(a.type==='payment') return `Record ₹${a.amount} received from ${a.customer}`;
  if(a.type==='sale') return `Bill ${a.customer} for ${a.quantity} of ${a.item} at the saved price`;
  if(a.type==='task') return `${a.title} · ${a.date}`;
  return `${a.service} for ${a.customer} · ${a.date} at ${a.time}`;
}
export function applyAction(s: State, raw: unknown, profile: Profile) {
  const a=actionSchema.parse(raw);
  if(profile==='farm' && a.type!=='task') throw new Error('Use the shop demo for business records.');
  if(a.type==='inventory') {
    const i=s.inventory.findIndex(x=>x.item.toLowerCase()===a.item.toLowerCase());
    const row={item:a.item,quantity:a.quantity,unit:a.unit,price:a.price};
    if(i<0)s.inventory.push(row);else s.inventory[i]=row;
  } else if(a.type==='credit'||a.type==='payment') {
    let c=s.credits.find(x=>x.customer.toLowerCase()===a.customer.toLowerCase());
    if(a.type==='payment' && (!c || c.amount<a.amount))throw new Error('Payment exceeds this customer’s outstanding udhaar.');
    if(!c){c={customer:a.customer,amount:0,note:''};s.credits.push(c);}
    c.amount=Math.round((c.amount+(a.type==='credit'?a.amount:-a.amount))*100)/100;
    if(a.type==='credit')c.note=a.note;
  } else if(a.type==='sale') {
    const item=s.inventory.find(x=>x.item.toLowerCase()===a.item.toLowerCase());
    if(!item)throw new Error('Add this item to inventory with a price first.');
    if(item.quantity<a.quantity)throw new Error(`Only ${item.quantity} ${item.unit} of ${item.item} is available.`);
    item.quantity=Math.round((item.quantity-a.quantity)*100)/100;
    s.sales.unshift({id:crypto.randomUUID(),...a,total:Math.round(item.price*a.quantity*100)/100,at:new Date().toISOString()});
  } else if(a.type==='task') s.tasks.unshift({id:crypto.randomUUID(),title:a.title,date:a.date,done:false});
  else {
    if(s.appointments.some(x=>x.date===a.date && x.time===a.time))throw new Error('This appointment slot is already booked. Choose another time.');
    s.appointments.unshift({id:crypto.randomUUID(),...a});
  }
  s.activity.unshift({id:crypto.randomUUID(),text:describe(a),at:new Date().toISOString()});
  s.activity=s.activity.slice(0,150);
  return s;
}
