'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, IndianRupee, Leaf, MapPin, Plus, ReceiptText, Sprout, X } from 'lucide-react';
import { today, type State } from './lib/domain';
import './farm-workspace.css';

type Crop = { id: string; plot: string; crop: string; variety: string; area: number; areaUnit: 'acres' | 'hectares'; sownOn: string; location: string; stage: 'planned' | 'growing' | 'harvested' };
type Expense = { id: string; cropId?: string; category: 'seeds' | 'fertiliser' | 'labour' | 'irrigation' | 'equipment' | 'transport' | 'other'; amount: number; date: string; note: string };
type FarmState = State & { farmCrops?: Crop[]; farmExpenses?: Expense[] };
type Props = { state: State; language: string; busy: boolean; onPropose: (action: unknown) => Promise<boolean>; onAsk: (text: string) => void; onTask: () => void; compact?: boolean };
const copy = {
  'en-IN': {
    title: 'Your farm, at a glance', subtitle: 'A clear view of your crops, costs and next steps.', crops: 'Crops & plots', addCrop: 'Add a crop', editCrop: 'Edit crop details', cropHint: 'One record for each crop cycle on a plot.', active: 'Growing crops', recorded: 'Recorded expenses', pending: 'Open tasks', overdue: 'Overdue', dueToday: 'Due today', upcoming: 'Upcoming', noCrop: 'Start with the land you grow.', noCropText: 'Add a crop and plot to keep its costs and everyday tasks together.', plot: 'Plot name', crop: 'Crop', variety: 'Variety (optional)', area: 'Area', unit: 'Area unit', acres: 'acres', hectares: 'hectares', sownOn: 'Sowing date', plannedOn: 'Planned sowing date', location: 'Village / location', stage: 'Crop stage', planned: 'Planned', growing: 'Growing', harvested: 'Harvested', review: 'Review with Saathi', reviewNote: 'Review the details in the conversation, then confirm to save.', cancel: 'Cancel', edit: 'Edit', addExpense: 'Record expense', expenses: 'Expense diary', expenseHint: 'Your recorded spending, grouped by crop.', amount: 'Amount (₹)', category: 'Category', date: 'Date', note: 'Note (optional)', linkCrop: 'Link to a crop', general: 'General farm expense', noExpense: 'No expenses recorded yet.', noExpenseText: 'Start with seeds, labour or an irrigation payment.', total: 'Total recorded', cropTotal: 'Recorded for this crop', expenseCount: 'entries', allCrops: 'All crops', tasks: 'What needs your attention', taskHint: 'Review a task before marking it complete.', addTask: 'Add task', taskTitle: 'What needs doing?', generalTask: 'General farm task', noTasks: 'No open tasks. Add your next farm job.', completed: 'Completed', showCompleted: 'Show completed', showOpen: 'Show open', complete: 'Mark complete', reopen: 'Reopen task', taskFor: 'Add task for this crop', advice: 'A little guidance for your next step', adviceHint: 'Ask with your crop and location for more useful guidance.', cropAdvice: 'Plan crop care', costAdvice: 'Understand my expenses', marketAdvice: 'Prepare for the mandi', carePrompt: 'Help me plan the next steps for my crops using my saved crop and plot details. Ask for any missing information before advising.', costPrompt: 'Summarise my recorded farm expenses by crop and category. What costs have I recorded and what should I track next?', marketPrompt: 'Help me prepare a mandi sale checklist for my crops. Ask about my location, harvest date and quantity; do not invent live prices.', savedOnly: 'Based on your saved records', more: 'Show all', fewer: 'Show fewer', invalid: 'Please complete the required fields with valid values.', sowing: 'Sown', plannedSowing: 'Sowing planned', linkedMissing: 'Crop unavailable', optional: 'Optional', closeForm: 'Close form', expenseFor: 'Record an expense for this crop', openTaskCount: 'open tasks', noMatches: 'No expenses for this crop yet.', allExpenses: 'All recorded expenses', noLive: 'Planned services: live weather, mandi prices, soil-card uploads and phone alerts are not connected. Guidance uses your saved records.', countUnit: 'crops', editIdentity: 'Crop, plot and sowing date identify this crop cycle and stay fixed. Add a new record for the next season.',
  },
  'hi-IN': {
    title: 'आपके खेत का एक नज़र में हाल', subtitle: 'फसल, खर्च और अगले काम — एक जगह।', crops: 'फसलें और खेत', addCrop: 'फसल जोड़ें', editCrop: 'फसल का विवरण बदलें', cropHint: 'हर खेत में हर फसल चक्र का अलग रिकॉर्ड रखें।', active: 'उगती फसलें', recorded: 'दर्ज खर्च', pending: 'बाकी काम', overdue: 'तारीख बीत गई', dueToday: 'आज करना है', upcoming: 'आने वाला', noCrop: 'अपने खेत से शुरुआत करें।', noCropText: 'फसल और खेत जोड़कर उसके खर्च और काम साथ रखें।', plot: 'खेत का नाम', crop: 'फसल', variety: 'किस्म (वैकल्पिक)', area: 'क्षेत्रफल', unit: 'क्षेत्रफल की इकाई', acres: 'एकड़', hectares: 'हेक्टेयर', sownOn: 'बुवाई की तारीख', plannedOn: 'तय बुवाई की तारीख', location: 'गाँव / स्थान', stage: 'फसल की स्थिति', planned: 'योजना में', growing: 'उग रही है', harvested: 'कटाई पूरी', review: 'साथी के साथ जाँचें', reviewNote: 'बातचीत में विवरण जाँचें, फिर पुष्टि करके सहेजें।', cancel: 'रद्द करें', edit: 'बदलें', addExpense: 'खर्च दर्ज करें', expenses: 'खर्च की डायरी', expenseHint: 'फसल के हिसाब से आपके दर्ज खर्च।', amount: 'राशि (₹)', category: 'खर्च का प्रकार', date: 'तारीख', note: 'विवरण (वैकल्पिक)', linkCrop: 'फसल से जोड़ें', general: 'खेत का सामान्य खर्च', noExpense: 'अभी कोई खर्च दर्ज नहीं है।', noExpenseText: 'बीज, मजदूरी या सिंचाई के भुगतान से शुरुआत करें।', total: 'कुल दर्ज खर्च', cropTotal: 'इस फसल का दर्ज खर्च', expenseCount: 'प्रविष्टियाँ', allCrops: 'सभी फसलें', tasks: 'इन कामों पर ध्यान दें', taskHint: 'काम पूरा बताने से पहले जाँचें।', addTask: 'काम जोड़ें', taskTitle: 'क्या काम करना है?', generalTask: 'खेत का सामान्य काम', noTasks: 'कोई काम बाकी नहीं। अगला काम जोड़ें।', completed: 'पूरा हुआ', showCompleted: 'पूरे हुए काम', showOpen: 'बाकी काम', complete: 'पूरा हुआ', reopen: 'फिर से खोलें', taskFor: 'इस फसल का काम जोड़ें', advice: 'अगले कदम के लिए थोड़ी मदद', adviceHint: 'बेहतर सलाह के लिए फसल और स्थान बताएं।', cropAdvice: 'फसल की देखभाल', costAdvice: 'मेरे खर्च समझें', marketAdvice: 'मंडी की तैयारी', carePrompt: 'मेरी सहेजी हुई फसल और खेत की जानकारी से अगले कामों की योजना बनाने में मदद करें। सलाह से पहले जो जानकारी कम है वह पूछें।', costPrompt: 'मेरे दर्ज कृषि खर्च फसल और प्रकार के अनुसार समझाएं। मैंने क्या खर्च दर्ज किए हैं और आगे क्या दर्ज करना चाहिए?', marketPrompt: 'मेरी फसल मंडी में बेचने के लिए तैयारी की सूची बनाएं। मेरा स्थान, कटाई की तारीख और मात्रा पूछें; लाइव भाव न गढ़ें।', savedOnly: 'आपके सहेजे रिकॉर्ड के आधार पर', more: 'सभी दिखाएं', fewer: 'कम दिखाएं', invalid: 'ज़रूरी जानकारी सही रूप में भरें।', sowing: 'बुवाई', plannedSowing: 'तय बुवाई', linkedMissing: 'फसल उपलब्ध नहीं', optional: 'वैकल्पिक', closeForm: 'फ़ॉर्म बंद करें', expenseFor: 'इस फसल का खर्च दर्ज करें', openTaskCount: 'बाकी काम', noMatches: 'इस फसल का खर्च अभी दर्ज नहीं है।', allExpenses: 'सभी दर्ज खर्च', noLive: 'प्रस्तावित सेवाएँ: लाइव मौसम, मंडी भाव, मृदा कार्ड अपलोड और फोन अलर्ट अभी जुड़े नहीं हैं। सलाह आपके रिकॉर्ड पर आधारित है।', countUnit: 'फसलें', editIdentity: 'फसल, खेत और बुवाई की तारीख इस चक्र की पहचान हैं और बदले नहीं जा सकते। अगले मौसम के लिए नई फसल जोड़ें।',
  },
  'mr-IN': {
    title: 'तुमच्या शेतीचा एका नजरेत आढावा', subtitle: 'पिके, खर्च आणि पुढची कामे — एकाच ठिकाणी.', crops: 'पिके आणि शेत', addCrop: 'पीक जोडा', editCrop: 'पिकाची माहिती बदला', cropHint: 'प्रत्येक शेतातील प्रत्येक पीक हंगामाची वेगळी नोंद ठेवा.', active: 'वाढणारी पिके', recorded: 'नोंदवलेला खर्च', pending: 'बाकी कामे', overdue: 'तारीख उलटली', dueToday: 'आज करायचे', upcoming: 'पुढील काम', noCrop: 'तुमच्या शेतापासून सुरुवात करा.', noCropText: 'पीक आणि शेत जोडा आणि त्याचे खर्च व कामे एकत्र ठेवा.', plot: 'शेताचे नाव', crop: 'पीक', variety: 'वाण (ऐच्छिक)', area: 'क्षेत्रफळ', unit: 'क्षेत्रफळाचे एकक', acres: 'एकर', hectares: 'हेक्टर', sownOn: 'पेरणीची तारीख', plannedOn: 'ठरवलेली पेरणीची तारीख', location: 'गाव / ठिकाण', stage: 'पिकाची स्थिती', planned: 'नियोजित', growing: 'वाढत आहे', harvested: 'कापणी पूर्ण', review: 'साथीसोबत तपासा', reviewNote: 'संभाषणात माहिती तपासा, मग पुष्टी करून जतन करा.', cancel: 'रद्द करा', edit: 'बदला', addExpense: 'खर्च नोंदवा', expenses: 'खर्चाची वही', expenseHint: 'पिकानुसार तुमचा नोंदवलेला खर्च.', amount: 'रक्कम (₹)', category: 'खर्चाचा प्रकार', date: 'तारीख', note: 'तपशील (ऐच्छिक)', linkCrop: 'पिकाशी जोडा', general: 'शेतीचा सामान्य खर्च', noExpense: 'अजून खर्च नोंदवलेला नाही.', noExpenseText: 'बियाणे, मजुरी किंवा सिंचनाच्या खर्चापासून सुरुवात करा.', total: 'एकूण नोंदवलेला खर्च', cropTotal: 'या पिकाचा नोंदवलेला खर्च', expenseCount: 'नोंदी', allCrops: 'सर्व पिके', tasks: 'या कामांकडे लक्ष द्या', taskHint: 'काम पूर्ण करण्यापूर्वी तपासा.', addTask: 'काम जोडा', taskTitle: 'काय काम करायचे आहे?', generalTask: 'शेतीचे सामान्य काम', noTasks: 'बाकी कामे नाहीत. पुढचे काम जोडा.', completed: 'पूर्ण', showCompleted: 'पूर्ण झालेली कामे', showOpen: 'बाकी कामे', complete: 'पूर्ण करा', reopen: 'पुन्हा उघडा', taskFor: 'या पिकाचे काम जोडा', advice: 'पुढच्या टप्प्यासाठी थोडी मदत', adviceHint: 'उपयुक्त मार्गदर्शनासाठी पीक आणि ठिकाण सांगा.', cropAdvice: 'पिकाची काळजी', costAdvice: 'माझा खर्च समजून घ्या', marketAdvice: 'बाजाराची तयारी', carePrompt: 'माझ्या जतन केलेल्या पीक आणि शेताच्या माहितीनुसार पुढील कामांचे नियोजन करण्यास मदत करा. सल्ल्यापूर्वी आवश्यक माहिती विचारा.', costPrompt: 'माझ्या नोंदवलेल्या शेती खर्चाचा पीक आणि प्रकारानुसार आढावा द्या. मी कोणते खर्च नोंदवले आहेत आणि पुढे काय नोंदवावे?', marketPrompt: 'माझे पीक बाजारात विकण्यासाठी तयारीची यादी करा. ठिकाण, कापणीची तारीख आणि प्रमाण विचारा; थेट बाजारभाव बनवू नका.', savedOnly: 'तुमच्या जतन केलेल्या नोंदींवर आधारित', more: 'सर्व दाखवा', fewer: 'कमी दाखवा', invalid: 'आवश्यक माहिती योग्य प्रकारे भरा.', sowing: 'पेरणी', plannedSowing: 'नियोजित पेरणी', linkedMissing: 'पीक उपलब्ध नाही', optional: 'ऐच्छिक', closeForm: 'फॉर्म बंद करा', expenseFor: 'या पिकाचा खर्च नोंदवा', openTaskCount: 'बाकी कामे', noMatches: 'या पिकासाठी अजून खर्च नाही.', allExpenses: 'सर्व नोंदवलेले खर्च', noLive: 'नियोजित सेवा: थेट हवामान, बाजारभाव, मृदा कार्ड अपलोड आणि फोन सूचना अजून जोडलेल्या नाहीत. मार्गदर्शन तुमच्या नोंदींवर आधारित आहे.', countUnit: 'पिके', editIdentity: 'पीक, शेत आणि पेरणीची तारीख या हंगामाची ओळख आहेत आणि बदलता येत नाहीत. पुढील हंगामासाठी नवीन पीक जोडा.',
  },
};
const categories = {
  'en-IN': { seeds: 'Seeds', fertiliser: 'Fertiliser', labour: 'Labour', irrigation: 'Irrigation', equipment: 'Equipment', transport: 'Transport', other: 'Other' },
  'hi-IN': { seeds: 'बीज', fertiliser: 'खाद', labour: 'मजदूरी', irrigation: 'सिंचाई', equipment: 'उपकरण', transport: 'परिवहन', other: 'अन्य' },
  'mr-IN': { seeds: 'बियाणे', fertiliser: 'खत', labour: 'मजुरी', irrigation: 'सिंचन', equipment: 'अवजारे', transport: 'वाहतूक', other: 'इतर' },
};
type FormMode = { type: 'crop'; crop?: Crop } | { type: 'expense' | 'task'; cropId?: string };

export default function FarmWorkspace({ state, language, busy, onPropose, onAsk, onTask, compact = false }: Props) {
  const locale = language in copy ? language as keyof typeof copy : 'en-IN';
  const t = copy[locale];
  const crops = (state as FarmState).farmCrops || [];
  const expenses = (state as FarmState).farmExpenses || [];
  const tasks = state.tasks as (State['tasks'][number] & { cropId?: string })[];
  const [form, setForm] = useState<FormMode | null>(null);
  const [cropFilter, setCropFilter] = useState('all');
  const [showAllCrops, setShowAllCrops] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const now = today();
  const currency = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
  const dateLabel = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  const cropLabel = (id?: string, general = t.general) => id ? (() => { const c = crops.find(crop => crop.id === id); return c ? `${c.crop} · ${c.plot} · ${c.sownOn}` : t.linkedMissing; })() : general;
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const openTasks = tasks.filter(task => !task.done);
  const overdueCount = openTasks.filter(task => task.date < now).length;
  const sortedTasks = tasks.filter(task => task.done === showCompleted).sort((a, b) => a.date.localeCompare(b.date));
  const selectedExpenses = expenses.filter(expense => cropFilter === 'all' || (cropFilter === 'general' ? !expense.cropId : expense.cropId === cropFilter)).sort((a, b) => b.date.localeCompare(a.date));
  const cropTotals = [...crops.map(crop => ({ id: crop.id, label: `${crop.crop} · ${crop.plot} · ${crop.sownOn}`, amount: expenses.filter(e => e.cropId === crop.id).reduce((sum, e) => sum + e.amount, 0) })), { id: 'general', label: t.general, amount: expenses.filter(e => !e.cropId).reduce((sum, e) => sum + e.amount, 0) }].filter(item => item.amount > 0);
  useEffect(() => {
    if (form) {
      formRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      formRef.current?.querySelector<HTMLInputElement>('input,select')?.focus({ preventScroll: true });
    }
  }, [form]);
  async function propose(action: unknown) { if (busy) return; if (await onPropose(action)) setForm(null); }
  const panelTitle = form?.type === 'crop' ? (form.crop ? t.editCrop : t.addCrop) : form?.type === 'expense' ? t.addExpense : t.addTask;

  return <section className={`farm-workspace${compact ? ' farm-compact' : ''}`} aria-label={t.title}>
    <div className="farm-heading"><div><span className="farm-eyebrow"><Sprout size={14} /> {t.savedOnly}</span><h2>{t.title}</h2><p>{t.subtitle}</p></div><button className="farm-button farm-primary" disabled={busy} onClick={() => setForm({ type: 'crop' })}><Plus size={16} />{t.addCrop}</button></div>
    {!compact&&<div className="farm-stats">
      <div><span className="farm-stat-icon"><Sprout size={21} /></span><div><span>{t.active}</span><strong>{crops.filter(crop => crop.stage === 'growing').length} <small>/ {crops.length} {t.countUnit}</small></strong></div></div>
      <div><span className="farm-stat-icon farm-sand"><IndianRupee size={21} /></span><div><span>{t.recorded}</span><strong>{currency(total)}</strong><small>{expenses.length} {t.expenseCount}</small></div></div>
      <div><span className="farm-stat-icon"><CalendarDays size={21} /></span><div><span>{t.pending}</span><strong>{openTasks.length}</strong><small className={overdueCount ? 'farm-overdue-text' : ''}>{overdueCount ? `${overdueCount} · ${t.overdue}` : t.tasks}</small></div></div>
    </div>}
    {form && <div className="farm-form-panel" ref={formRef}><div className="farm-panel-heading"><h3 id={`${instanceId}-form-title`}>{panelTitle}</h3><button className="farm-icon-button" aria-label={t.closeForm} disabled={busy} onClick={() => setForm(null)}><X size={19} /></button></div><FarmForm key={`${form.type}-${form.type === 'crop' ? form.crop?.id || 'new' : form.cropId || 'general'}`} mode={form} crops={crops} locale={locale} busy={busy} onSubmit={propose} onCancel={() => setForm(null)} labelledBy={`${instanceId}-form-title`} /></div>}
    <div className="farm-main-grid">
      <section className="farm-panel farm-crops"><div className="farm-panel-heading"><div><h3>{t.crops}</h3><p>{t.cropHint}</p></div><span className="farm-count">{crops.length}</span></div>
        {!crops.length ? <div className="farm-empty farm-crop-empty"><span className="farm-empty-icon"><Sprout size={32} /></span><h4>{t.noCrop}</h4><p>{t.noCropText}</p><button className="farm-button farm-primary" disabled={busy} onClick={() => setForm({ type: 'crop' })}><Plus size={16} />{t.addCrop}</button></div> : <div className="farm-crop-grid">{(showAllCrops || !compact ? crops : crops.slice(0, 2)).map(crop => <article className="farm-crop-card" key={crop.id}>
          <div className="farm-crop-top"><span className={`farm-stage farm-stage-${crop.stage}`}><i />{t[crop.stage]}</span><button className="farm-text-button" disabled={busy} onClick={() => setForm({ type: 'crop', crop })} aria-label={`${t.edit}: ${crop.crop}, ${crop.plot}`}>{t.edit}</button></div>
          <h4>{crop.crop}</h4><p className="farm-plot"><MapPin size={13} />{crop.plot}{crop.location && ` · ${crop.location}`}</p>
          <div className="farm-crop-facts"><span>{crop.area} {t[crop.areaUnit]}{crop.variety && ` · ${crop.variety}`}</span><span>{crop.stage === 'planned' ? t.plannedSowing : t.sowing} · {dateLabel(crop.sownOn)}</span></div>
          <div className="farm-crop-cost"><span>{t.cropTotal}</span><strong>{currency(expenses.filter(e => e.cropId === crop.id).reduce((sum, e) => sum + e.amount, 0))}</strong></div>
          <div className="farm-crop-actions"><button disabled={busy} onClick={() => setForm({ type: 'expense', cropId: crop.id })} title={t.expenseFor}><Plus size={14} />{t.addExpense}</button><button disabled={busy} onClick={() => setForm({ type: 'task', cropId: crop.id })} title={t.taskFor}><CalendarDays size={14} />{t.addTask}</button></div>
        </article>)}</div>}
        {compact && crops.length > 2 && <button className="farm-show-more" onClick={() => setShowAllCrops(!showAllCrops)}>{showAllCrops ? t.fewer : `${t.more} (${crops.length})`}<ChevronDown size={15} /></button>}
      </section>
      <section className="farm-panel farm-task-panel"><div className="farm-panel-heading"><div><h3>{t.tasks}</h3><p>{t.taskHint}</p></div><button className="farm-icon-button" disabled={busy} aria-label={t.addTask} onClick={() => setForm({ type: 'task' })}><Plus size={19} /></button></div>
        {!!tasks.some(task => task.done) && <button className="farm-text-button farm-task-filter" onClick={() => { setShowCompleted(!showCompleted); setShowAllTasks(false); }}>{showCompleted ? t.showOpen : `${t.showCompleted} (${tasks.filter(task => task.done).length})`}</button>}
        {!sortedTasks.length ? <div className="farm-empty farm-task-empty"><CalendarDays size={25} /><p>{t.noTasks}</p><button className="farm-text-button" disabled={busy} onClick={() => setForm({ type: 'task' })}>{t.addTask}<ArrowRight size={14} /></button></div> : <ul className="farm-tasks">{(showAllTasks ? sortedTasks : sortedTasks.slice(0, compact ? 4 : 6)).map(task => <li key={task.id} className={task.done ? 'farm-task-done' : ''}><button className="farm-task-check" disabled={busy} aria-label={`${task.done ? t.reopen : t.complete}: ${task.title}`} onClick={() => propose({ type: 'task_status', id: task.id, done: !task.done })}>{task.done && <Check size={14} />}</button><div><strong>{task.title}</strong><span>{cropLabel(task.cropId, t.generalTask)}</span><small className={!task.done && task.date < now ? 'farm-overdue-text' : ''}>{dateLabel(task.date)} · {task.done ? t.completed : task.date < now ? t.overdue : task.date === now ? t.dueToday : t.upcoming}</small></div></li>)}</ul>}
        {sortedTasks.length > (compact ? 4 : 6) && <button className="farm-show-more" onClick={() => setShowAllTasks(!showAllTasks)}>{showAllTasks ? t.fewer : `${t.more} (${sortedTasks.length})`}<ChevronDown size={15} /></button>}
      </section>
    </div>
    <section className="farm-panel farm-expenses"><div className="farm-panel-heading"><div><h3>{t.expenses}</h3><p>{t.expenseHint}</p></div><button className="farm-button" disabled={busy} onClick={() => setForm({ type: 'expense' })}><Plus size={15} />{t.addExpense}</button></div>
      {!expenses.length ? <div className="farm-expense-empty"><ReceiptText size={25} /><div><strong>{t.noExpense}</strong><p>{t.noExpenseText}</p></div></div> : <>
        <div className="farm-expense-summary"><div className="farm-expense-total"><span>{t.total}</span><strong>{currency(total)}</strong><small>{expenses.length} {t.expenseCount}</small></div><div className="farm-breakdown">{cropTotals.map(item => <button key={item.id} aria-pressed={cropFilter === item.id} onClick={() => { setCropFilter(cropFilter === item.id ? 'all' : item.id); setShowAllExpenses(false); }}><span>{item.label}</span><strong>{currency(item.amount)}</strong></button>)}</div></div>
        <div className="farm-expense-filter"><label htmlFor={`${instanceId}-filter`}>{t.linkCrop}</label><select id={`${instanceId}-filter`} value={cropFilter} onChange={event => { setCropFilter(event.target.value); setShowAllExpenses(false); }}><option value="all">{t.allCrops}</option><option value="general">{t.general}</option>{crops.map(crop => <option value={crop.id} key={crop.id}>{crop.crop} · {crop.plot} · {crop.sownOn}</option>)}</select><span>{currency(selectedExpenses.reduce((sum, e) => sum + e.amount, 0))} · {selectedExpenses.length} {t.expenseCount}</span></div>
        {!selectedExpenses.length ? <p className="farm-no-matches">{t.noMatches}</p> : <ul className="farm-expense-list">{(showAllExpenses ? selectedExpenses : selectedExpenses.slice(0, compact ? 3 : 8)).map(expense => <li key={expense.id}><span className="farm-expense-symbol"><ReceiptText size={18} /></span><div><strong>{categories[locale][expense.category]}</strong><span>{cropLabel(expense.cropId)}</span>{expense.note && <p>{expense.note}</p>}</div><div className="farm-expense-value"><strong>{currency(expense.amount)}</strong><time dateTime={expense.date}>{dateLabel(expense.date)}</time></div></li>)}</ul>}
        {selectedExpenses.length > (compact ? 3 : 8) && <button className="farm-show-more" onClick={() => setShowAllExpenses(!showAllExpenses)}>{showAllExpenses ? t.fewer : `${t.more} (${selectedExpenses.length})`}<ChevronDown size={15} /></button>}
      </>}
    </section>
    <section className="farm-guidance"><div><span className="farm-guidance-icon"><Leaf size={21} /></span><h3>{t.advice}</h3><p>{t.adviceHint}</p></div><div className="farm-guidance-actions">{[[t.cropAdvice, t.carePrompt], [t.costAdvice, t.costPrompt], [t.marketAdvice, t.marketPrompt]].map(([label, prompt]) => <button key={label} disabled={busy} onClick={() => onAsk(prompt)}>{label}<ArrowRight size={15} /></button>)}</div><p className="farm-data-note">{t.noLive}</p></section>
  </section>;
}

function FarmForm({ mode, crops, locale, busy, onSubmit, onCancel, labelledBy }: { mode: FormMode; crops: Crop[]; locale: keyof typeof copy; busy: boolean; onSubmit: (action: unknown) => void; onCancel: () => void; labelledBy: string }) {
  const t = copy[locale];
  const crop = mode.type === 'crop' ? mode.crop : undefined;
  const [stage, setStage] = useState<Crop['stage']>(crop?.stage || 'growing');
  const [error, setError] = useState('');
  const now = today();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) || '').trim();
    if (mode.type === 'crop') {
      if (!value('crop') || !value('plot') || !value('location') || !Number.isFinite(Number(value('area'))) || Number(value('area')) <= 0) { setError(t.invalid); return; }
      onSubmit({ type: 'farm_crop', ...(crop ? { id: crop.id } : {}), plot: value('plot'), crop: value('crop'), variety: value('variety'), area: Number(value('area')), areaUnit: value('areaUnit'), sownOn: value('sownOn'), location: value('location'), stage });
    } else if (mode.type === 'expense') {
      if (!Number.isFinite(Number(value('amount'))) || Number(value('amount')) <= 0) { setError(t.invalid); return; }
      onSubmit({ type: 'farm_expense', ...(value('cropId') ? { cropId: value('cropId') } : {}), category: value('category'), amount: Number(value('amount')), date: value('date'), note: value('note') });
    } else {
      if (!value('title')) { setError(t.invalid); return; }
      onSubmit({ type: 'task', title: value('title'), date: value('date'), ...(value('cropId') ? { cropId: value('cropId') } : {}) });
    }
  }
  return <form className="farm-form" onSubmit={submit} aria-labelledby={labelledBy}>
    <fieldset disabled={busy}>
      {mode.type === 'crop' ? <>
        {crop && <p className="farm-form-info">{t.editIdentity}</p>}
        <div className="farm-form-grid">
          <label>{t.crop}<input name="crop" defaultValue={crop?.crop} readOnly={!!crop} required maxLength={100} /></label>
          <label>{t.plot}<input name="plot" defaultValue={crop?.plot} readOnly={!!crop} required maxLength={100} /></label>
          <label>{t.variety}<input name="variety" defaultValue={crop?.variety} maxLength={100} /></label>
          <label>{t.location}<input name="location" defaultValue={crop?.location} required maxLength={100} /></label>
          <label>{t.area}<input name="area" type="number" min="0.0001" max="100000" step="0.0001" defaultValue={crop?.area} required inputMode="decimal" /></label>
          <label>{t.unit}<select name="areaUnit" defaultValue={crop?.areaUnit || 'acres'}><option value="acres">{t.acres}</option><option value="hectares">{t.hectares}</option></select></label>
          <label>{t.stage}<select value={stage} onChange={event => setStage(event.target.value as Crop['stage'])}><option value="planned">{t.planned}</option><option value="growing">{t.growing}</option><option value="harvested">{t.harvested}</option></select></label>
          <label>{stage === 'planned' ? t.plannedOn : t.sownOn}<input type="date" name="sownOn" readOnly={!!crop} required defaultValue={crop?.sownOn || now} max={stage === 'planned' ? undefined : now} /></label>
        </div>
      </> : <div className="farm-form-grid">
        <label className="farm-field-full">{t.linkCrop}<select name="cropId" defaultValue={mode.cropId || ''}><option value="">{mode.type === 'task' ? t.generalTask : t.general}</option>{crops.map(c => <option key={c.id} value={c.id}>{c.crop} · {c.plot} · {c.sownOn}</option>)}</select></label>
        {mode.type === 'expense' ? <><label>{t.category}<select name="category" defaultValue="seeds">{Object.entries(categories[locale]).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>{t.amount}<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required inputMode="decimal" /></label><label>{t.date}<input type="date" name="date" required defaultValue={now} max={now} /></label><label>{t.note}<input name="note" maxLength={200} /></label></> : <><label>{t.taskTitle}<input name="title" required maxLength={100} /></label><label>{t.date}<input type="date" name="date" required defaultValue={now} /></label></>}
      </div>}
      {error && <p className="farm-form-error" role="alert">{error}</p>}
      <div className="farm-form-footer"><p>{t.reviewNote}</p><div><button type="button" className="farm-button" onClick={onCancel}>{t.cancel}</button><button className="farm-button farm-primary" type="submit">{t.review}<ArrowRight size={15} /></button></div></div>
    </fieldset>
  </form>;
}
