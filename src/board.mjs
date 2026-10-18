export const BOARD_SECTIONS = ['bullion','historical','other','goldBars','scrap','silverCoins','silverBars'];
const families = {
  krugerrand:[1,'Krugerrand'], 'australian-kangaroo':[2,'Australijski Kangur'],
  'american-buffalo':[3,'Bizon'], 'american-eagle':[4,'Amerykański Orzeł'],
  'britannia-100-pound':[5,'Britannia'], 'maple-leaf':[6,'Liść Klonowy'], philharmonic:[7,'Wiedeński Filharmonik']
};
const history = ['germany-20-mark','denmark-20-kroner','austria-4-ducat','austria-1-ducat','russia-5-ruble','russia-10-ruble','russia-15-ruble','germany-10-mark','germany-5-mark','france-switzerland-20-franc','france-switzerland-10-franc'];
const clean = value => String(value ?? '').trim().slice(0,120);
// Numbers describe the current visible order within each independent column.
export function renumberBars(config){
  for(const section of BOARD_SECTIONS){
    const groups=new Map();
    const list=Object.entries(config.entries).filter(([,entry])=>entry.section===section).sort((a,b)=>(a[1].order??a[1].number*1000)-(b[1].order??b[1].number*1000)||a[0].localeCompare(b[0]));
    for(const [id,entry] of list){
      const key=['bullion','historical','other'].includes(section)?entry.family:id;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(entry);
    }
    let number=0;
    for(const entries of groups.values()){
      const visible=entries.some(entry=>entry.visible);
      if(visible)number++;
      for(const entry of entries){entry.number=visible?number:1;entry.numberAssigned=visible;}
    }
  }
  return config;
}
export function boardDefaults(products, metals) {
  const entries = {};
  for (const [group,list] of Object.entries(products)) for (const [index,p] of list.entries()) {
    if (!['goldCoins','goldBars','silverCoins','silverBars'].includes(group)) continue;
    let section=group==='goldCoins'?'historical':group, number=index+1, label=p.name, family=p.id, weight='', visible=group!=='goldCoins';
    if (group==='goldCoins') {
      const idSlug=p.id.replace(/^gold-/, '').replace(/-(?:1|0-5|0-25|0-1|0-05|0-04)oz$/, '');
      const slug=families[idSlug]||history.includes(idSlug)||['chinese-panda','south-africa-2-rand'].includes(idSlug)?idSlug:p.imageKey, match=families[slug];
      if (match) {
        section='bullion'; [number,label]=match; family='gold-family-'+slug;
        const fraction=p.id.match(/-(1|0-5|0-25|0-1|0-05|0-04)oz$/)?.[1];
        weight=({'1':'1 oz','0-5':'1/2 oz','0-25':'1/4 oz','0-1':'1/10 oz','0-05':'1/20 oz','0-04':'1/25 oz'})[fraction] || p.name.match(/(1(?:\/\d+)? oz)$/)?.[1] || '1 oz';
        visible=!['1/20 oz','1/25 oz'].includes(weight);
      } else if (slug==='chinese-panda' || slug==='south-africa-2-rand') {
        section='other';number=slug==='chinese-panda'?19:20;
        visible=slug!=='chinese-panda' || p.id==='gold-chinese-panda-1oz';
      } else {
        const i=history.indexOf(slug);number=i>=0?i+8:index+21;visible=i>=0;
      }
    }
    if (group==='goldBars') {const ids=['gold-bar-1g','gold-bar-2-5g','gold-bar-5g','gold-bar-10g','gold-bar-20g','gold-bar-31-1035g','gold-bar-50g','gold-bar-100g'];const i=ids.indexOf(p.id);number=i>=0?i+1:ids.length+index+1;label=p.id==='gold-bar-31-1035g'?'1 oz':String(p.grossWeight).replace('.',',')+' g';}
    if (group==='silverBars') {label=p.grossWeight===31.1035?'1 oz':String(p.grossWeight).replace('.',',')+' g';}
    if (p.custom) visible=false;
    const order=['goldBars','silverBars'].includes(section)?Math.round(p.grossWeight*1000):number*1000;
    entries[p.id]={section,order,number,numberAssigned:visible,label,family,weight,visible,buy:true,sell:false,delivery:false,sellPercent:2,deliveryPercent:1};
  }
  for(const [index,purity] of Object.keys(metals.gold.purities).entries()) entries['scrap-'+purity]={section:'scrap',order:(index+1)*1000,number:index+1,numberAssigned:true,label:'Próba '+purity,family:'scrap-'+purity,weight:'',visible:true,buy:true,sell:false,delivery:false,sellPercent:2,deliveryPercent:1};
  return renumberBars({version:1,deliveryDays:10,sections:Object.fromEntries(BOARD_SECTIONS.map(key=>[key,{visible:true,buy:true,sell:true,delivery:true}])),entries});
}
export function mergeBoard(stored, products, metals) {
  const defaults=boardDefaults(products,metals);
  if(!stored)return defaults;
  const entries=Object.fromEntries(Object.entries(defaults.entries).map(([id,value])=>{
    const saved=stored.entries?.[id],entry={...value,...saved};
    // Recover rows relabelled through the old group selector. Preserve prices and visibility.
    if(saved&&saved.family!==value.family){
      entry.family=value.family;entry.label=value.label;entry.weight=value.weight;entry.section=value.section;
      const sibling=Object.entries(defaults.entries).find(([otherId,other])=>otherId!==id&&other.family===value.family&&stored.entries?.[otherId]?.family===value.family);
      entry.order=sibling?stored.entries[sibling[0]].order??value.order:value.order;
    }
    return [id,entry];
  }));
  return renumberBars({...defaults,deliveryDays:stored.deliveryDays??10,updatedAt:stored.updatedAt??null,sections:Object.fromEntries(BOARD_SECTIONS.map(key=>[key,{...defaults.sections[key],...stored.sections?.[key]}])),entries});
}
export function assignNewCoinNumbers(input,current){
  const result=structuredClone(input);
  for(const [id,entry] of Object.entries(current.entries))result.entries[id]??=structuredClone(entry);
  return renumberBars(result);
}
export function validateBoard(input, current, products) {
  const fail=message=>{throw Error(message)};
  const integer=(value,min,max,label)=>{if(!Number.isInteger(value)||value<min||value>max)fail(label);return value};
  const boolean=value=>{if(typeof value!=='boolean')fail('Nieprawidłowy przełącznik');return value};
  const percent=value=>{if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000)fail('Narzut musi wynosić od 0 do 1000%');return value};
  if(!input?.entries||!input?.sections)fail('Brak ustawień tablicy');
  input=assignNewCoinNumbers(input,current);
  const result={version:1,deliveryDays:integer(input.deliveryDays,1,365,'Termin dostawy: od 1 do 365 dni'),sections:{},entries:{},updatedAt:new Date().toISOString()};
  for(const key of BOARD_SECTIONS){const v=input.sections[key];if(!v)fail('Brak sekcji '+key);result.sections[key]=Object.fromEntries(['visible','buy','sell','delivery'].map(k=>[k,boolean(v[k])]))}
  const groups=new Map(Object.entries(products).flatMap(([g,list])=>list.map(p=>[p.id,g])));
  const numbers=new Map(),familiesSeen=new Map();
  for(const [id,previous] of Object.entries(current.entries)){
    const v=input.entries[id]||previous,group=groups.get(id);
    const allowed=id.startsWith('scrap-')?['scrap']:group==='goldCoins'?['bullion','historical','other']:[group];
    if(v.family!==previous.family)fail('Grupa monety wynika automatycznie z produktu. Odśwież panel.');
    if(!allowed.includes(v.section))fail('Niewłaściwa sekcja produktu '+id);
    const entry={section:v.section,order:integer(v.order??previous.order,0,1000000000,'Nieprawidłowa kolejność'),numberAssigned:v.numberAssigned===true,number:integer(v.number,1,9999,'Numer gablotowy: od 1 do 9999'),label:clean(v.label),family:clean(v.family),weight:clean(v.weight),visible:boolean(v.visible),buy:boolean(v.buy),sell:boolean(v.sell),delivery:boolean(v.delivery),sellPercent:percent(v.sellPercent),deliveryPercent:percent(v.deliveryPercent)};
    if(!entry.label||!entry.family)fail('Uzupełnij nazwę i identyfikator rodziny');
    if(!['bullion','goldBars'].includes(entry.section))entry.delivery=false;
    if(entry.visible){
      const scope=entry.section;
      const key=scope+':'+entry.number, owner=['bullion','historical','other'].includes(scope)?entry.family:id;
      if(!['goldBars','silverBars'].includes(scope)&&numbers.has(key)&&numbers.get(key)!==owner)fail('Powtórzony numer gablotowy '+entry.number);
      numbers.set(key,owner);
      if(['bullion','historical','other'].includes(scope)){
        const signature=entry.section+'|'+entry.number+'|'+entry.label;
        if(familiesSeen.has(entry.family)&&familiesSeen.get(entry.family)!==signature)fail('Wagi tej samej monety muszą mieć tę samą kategorię, nazwę i numer');
        familiesSeen.set(entry.family,signature);
      }
    }
    result.entries[id]=entry;
  }
  return renumberBars(result);
}
export function buildBoard(config, products, metals) {
  const lookup=new Map(Object.values(products).flat().map(p=>[p.id,p])), rows=[];
  for(const [id,entry] of Object.entries(config.entries)){
    const section=config.sections[entry.section],p=lookup.get(id),purity=id.startsWith('scrap-')?id.slice(6):null;
    if(!entry.visible||!section?.visible||(!purity&&!p))continue;
    const base=purity?metals.gold.spot*Number(purity)/1000:p.marketValue;
    const buy=purity?metals.gold.purities[purity]?.price:p.price;
    const valid=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
    const price=(enabled,value)=>enabled&&valid(value)?Math.round(value*100)/100:null;
    rows.push({id,section:entry.section,order:entry.order??entry.number*1000,number:entry.number,label:entry.label,family:entry.family,weight:entry.weight,buy:price(entry.buy&&section.buy,buy),sell:price(entry.sell&&section.sell,base*(1+entry.sellPercent/100)),delivery:price(entry.delivery&&section.delivery&&['bullion','goldBars'].includes(entry.section),base*(1+entry.deliveryPercent/100)),fineWeight:p?.fineWeight??0});
  }
  rows.sort((a,b)=>a.order-b.order||a.number-b.number||b.fineWeight-a.fineWeight||a.id.localeCompare(b.id));
  const counts=new Map(),groups=new Map();
  for(const row of rows){
    const key=row.section+':'+(['bullion','historical','other'].includes(row.section)?row.family:row.id);
    if(!groups.has(key)){const next=(counts.get(row.section)??0)+1;counts.set(row.section,next);groups.set(key,next)}
    row.number=groups.get(key);
  }
  return {version:1,deliveryDays:config.deliveryDays,sections:config.sections,updatedAt:config.updatedAt??null,rows};
}
