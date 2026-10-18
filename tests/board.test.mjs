import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import {mergeBoard,validateBoard,buildBoard} from '../src/board.mjs';
function instance(){
 const store=new Map([['market:latest',JSON.stringify({fetchedAt:new Date().toISOString(),provider:'Test',metals:Object.fromEntries(['gold','silver','platinum','palladium'].map(k=>[k,{spot:100,change:0,history:[]}]))})]]);
 const env={ADMIN_USERNAME:'test',ADMIN_PASSWORD:'test-only-password',PRICE_STORE:{get:async k=>store.get(k)??null,put:async(k,v)=>store.set(k,v),delete:async k=>store.delete(k)}};
 const call=(path,options={})=>worker.fetch(new Request('https://test.local'+path,options),env,{});
 const login=async()=>{const r=await call('/api/admin/login',{method:'POST',body:JSON.stringify({username:'test',password:'test-only-password'})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]};
 return {store,env,call,login};
}
test('Legacy prices and all silver products remain identical when board settings change',async()=>{
 const {call,login,store}=instance(),before=await (await call('/api/prices')).json(),cookie=await login();
 const response=await call('/api/admin/board',{headers:{cookie}});assert.equal(response.status,200);
 const {config}=await response.json();
 const id='gold-krugerrand-1oz',row=config.entries[id];row.sell=true;row.sellPercent=2;row.delivery=true;row.deliveryPercent=1;
 const save=await call('/api/admin/board',{method:'PUT',headers:{cookie},body:JSON.stringify(config)});assert.equal(save.status,200);
 const after=await (await call('/api/prices')).json();
 assert.deepEqual(after.products,before.products);assert.deepEqual(after.metals,before.metals);assert.equal(store.has('config:pricing'),false);
 const gold=after.products.goldCoins.find(p=>p.id===id),actual=after.board.rows.find(p=>p.id===id);
 assert.equal(actual.buy,gold.price);assert.equal(actual.sell,Math.round(gold.marketValue*1.02*100)/100);assert.equal(actual.delivery,Math.round(gold.marketValue*1.01*100)/100);
});
test('Board write requires authentication',async()=>{const {call}=instance();assert.equal((await call('/api/admin/board',{method:'PUT',body:'{}'})).status,401)});
test('Defaults group weights under one stable number and classify selected historic coins',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json();
 const rows=data.board.rows;
 const weights=rows.filter(p=>p.family==='gold-family-krugerrand');assert.equal(weights.length,4);assert.ok(weights.every(p=>p.number===1&&p.label==='Krugerrand'));
 assert.equal(rows.find(p=>p.id==='gold-russia-5-ruble').section,'historical');assert.equal(rows.find(p=>p.id==='gold-russia-5-ruble').number,5);
 assert.equal(rows.find(p=>p.id==='gold-chinese-panda-1oz').section,'other');
});
test('Section switches hide prices without removing products; hidden rows are omitted',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),config=mergeBoard(null,data.products,data.metals);
 const id='gold-bar-1g';config.entries[id].sell=true;config.sections.goldBars.buy=false;
 let board=buildBoard(config,data.products,data.metals),row=board.rows.find(p=>p.id===id);assert.equal(row.buy,null);assert.equal(typeof row.sell,'number');
 config.entries[id].visible=false;assert.ok(!buildBoard(config,data.products,data.metals).rows.some(p=>p.id===id));
});
test('Each gold column starts at one and legacy duplicate numbers are normalized',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),config=mergeBoard(null,data.products,data.metals);
 for(const e of Object.values(config.entries))e.number=63;
 const saved=validateBoard(config,config,data.products),board=buildBoard(saved,data.products,data.metals);
 for(const section of ['bullion','historical','other'])assert.equal(board.rows.find(r=>r.section===section).number,1);
 assert.equal(saved.entries['gold-russia-5-ruble'].number,5);
});
test('Separate sections can reuse numbers and negative markup is rejected',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),config=mergeBoard(null,data.products,data.metals);
 assert.doesNotThrow(()=>validateBoard(config,config,data.products));
 config.entries['gold-bar-1g'].sellPercent=-2;assert.throws(()=>validateBoard(config,config,data.products),/Narzut/);
});
test('Stale writes are rejected and previous board settings are backed up',async()=>{
 const {call,login,store}=instance(),cookie=await login(),headers={cookie};
 const {config}=await(await call('/api/admin/board',{headers})).json();
 let r=await call('/api/admin/board',{method:'PUT',headers,body:JSON.stringify(config)});assert.equal(r.status,200);const saved=(await r.json()).config;
 r=await call('/api/admin/board',{method:'PUT',headers,body:JSON.stringify(config)});assert.equal(r.status,409);
 saved.deliveryDays=12;r=await call('/api/admin/board',{method:'PUT',headers,body:JSON.stringify(saved)});assert.equal(r.status,200);
 assert.ok([...store.keys()].some(k=>k.startsWith('backup:board:')));
});
test('Scrap sale is per gram of alloy, delivery prohibited for historical coins',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),config=mergeBoard(null,data.products,data.metals);
 config.entries['scrap-585'].sell=true;config.entries['scrap-585'].sellPercent=2;
 config.entries['gold-russia-5-ruble'].delivery=true;
 const validated=validateBoard(config,config,data.products),board=buildBoard(validated,data.products,data.metals);
 assert.equal(board.rows.find(p=>p.id==='scrap-585').sell,59.67);
 assert.equal(board.rows.find(p=>p.id==='gold-russia-5-ruble').delivery,null);
});
test('A whole family can move to another gold category without renumbering its weights',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),config=mergeBoard(null,data.products,data.metals);
 for(const entry of Object.values(config.entries))if(entry.family==='gold-family-krugerrand')entry.section='other';
 const board=buildBoard(validateBoard(config,config,data.products),data.products,data.metals);
 const rows=board.rows.filter(r=>r.family==='gold-family-krugerrand');assert.equal(rows.length,4);assert.ok(rows.every(r=>r.section==='other'&&r.number===1));
});
test('Edited built-in bar weights do not collide in the default display numbering',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json();
 const products=structuredClone(data.products);products.goldBars.find(p=>p.id==='gold-bar-31-1035g').grossWeight=31.1;
 const config=mergeBoard(null,products,data.metals);
 assert.equal(config.entries['gold-bar-31-1035g'].number,6);
 assert.notEqual(config.entries['gold-bar-31-1035g'].number,config.entries['gold-bar-50g'].number);
});
test('Editing photo metadata or a display name cannot move Krugerrand out of bullion',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json();
 const products=structuredClone(data.products),p=products.goldCoins.find(p=>p.id==='gold-krugerrand-1oz');p.imageKey='';p.name='Krugerrand';
 const config=mergeBoard(null,products,data.metals),entry=config.entries[p.id];
 assert.equal(entry.section,'bullion');assert.equal(entry.visible,true);assert.equal(entry.weight,'1 oz');
});
test('Board visibility is independent of catalogue visibility, including small Kangaroo weights',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),products=structuredClone(data.products);
 const ids=['gold-australian-kangaroo-0-05oz','gold-australian-kangaroo-0-04oz','gold-krugerrand-1oz'];
 for(const id of ids)products.goldCoins.find(p=>p.id===id).active=false;
 const config=mergeBoard(null,products,data.metals);
 for(const id of ids)config.entries[id].visible=true;
 let rows=buildBoard(validateBoard(config,config,products),products,data.metals).rows;
 for(const id of ids)assert.ok(rows.some(r=>r.id===id),'Missing enabled '+id);
 config.entries[ids[0]].visible=false;rows=buildBoard(config,products,data.metals).rows;
 assert.ok(!rows.some(r=>r.id===ids[0]));assert.ok(rows.some(r=>r.id===ids[1]));
 assert.equal(products.goldCoins.find(p=>p.id===ids[1]).active,false);
});
test('Visible bars start at one and follow the chosen order, even in legacy settings',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),products=structuredClone(data.products);
 products.goldBars.push({id:'custom-half-gram',name:'Sztabka 0,5 g',metal:'gold',kind:'bar',custom:true,grossWeight:0.5,fineWeight:0.4995,marketValue:49.95,price:48});
 const legacy=mergeBoard(null,products,data.metals);for(const entry of Object.values(legacy.entries))delete entry.order;
 legacy.entries['custom-half-gram'].visible=true;legacy.entries['custom-half-gram'].number=25;
 const config=mergeBoard(legacy,products,data.metals),rows=buildBoard(config,products,data.metals).rows.filter(r=>r.section==='goldBars');
 assert.equal(rows[0].id,'custom-half-gram');assert.equal(rows[0].number,1);
 config.entries['gold-bar-100g'].order=0;
 const saved=validateBoard(config,config,products),reloaded=mergeBoard(saved,products,data.metals);
 assert.equal(buildBoard(reloaded,products,data.metals).rows.filter(r=>r.section==='goldBars')[0].id,'gold-bar-100g');
 assert.equal(reloaded.entries['custom-half-gram'].number,2);
});
test('Thirty-minute session expires for board and pricing; fresh login restores access',async()=>{
 const {call,login}=instance(),cookie=await login(),realNow=Date.now;
 try{
  const time=realNow();Date.now=()=>time+31*60000;
  assert.equal((await call('/api/admin/board',{headers:{cookie}})).status,401);
  assert.equal((await call('/api/admin/config',{headers:{cookie}})).status,401);
 }finally{Date.now=realNow}
 const renewed=await login();assert.equal((await call('/api/admin/board',{headers:{cookie:renewed}})).status,200);
});
test('Adding, hiding and moving a coin renumbers only its column without gaps',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),current=mergeBoard(null,data.products,data.metals),id='gold-russia-7-5-ruble';
 const input=structuredClone(current);input.entries[id].visible=true;
 let saved=validateBoard(input,current,data.products);assert.equal(saved.entries[id].number,12);
 for(const [key,e] of Object.entries(current.entries))if(e.section!=='historical')assert.equal(saved.entries[key].number,e.number);
 let next=structuredClone(saved);next.entries[id].order=0;saved=validateBoard(next,saved,data.products);
 let rows=buildBoard(saved,data.products,data.metals).rows.filter(r=>r.section==='historical');
 assert.equal(rows[0].id,id);assert.deepEqual(rows.map(r=>r.number),Array.from({length:rows.length},(_,i)=>i+1));
 next=structuredClone(saved);next.entries[id].visible=false;saved=validateBoard(next,saved,data.products);
 rows=buildBoard(saved,data.products,data.metals).rows.filter(r=>r.section==='historical');
 assert.deepEqual(rows.map(r=>r.number),Array.from({length:rows.length},(_,i)=>i+1));
});
test('Every column has consecutive numbers and bullion weights retain a shared number',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),config=mergeBoard(null,data.products,data.metals);
 config.entries['gold-russia-5-ruble'].section='other';
 const saved=validateBoard(config,config,data.products),rows=buildBoard(saved,data.products,data.metals).rows;
 for(const section of Object.keys(config.sections)){
  const unique=[...new Set(rows.filter(r=>r.section===section).map(r=>r.number))];
  assert.deepEqual(unique,Array.from({length:unique.length},(_,i)=>i+1));
 }
 const krugerrand=rows.filter(r=>r.family==='gold-family-krugerrand');
 assert.equal(krugerrand.length,4);assert.ok(krugerrand.every(r=>r.number===1));
});
test('Legacy group reassignment is repaired without changing product prices or visibility',async()=>{
 const {call}=instance(),data=await(await call('/api/prices')).json(),original=mergeBoard(null,data.products,data.metals),stored=structuredClone(original);
 const id='gold-krugerrand-1oz',entry=stored.entries[id];
 Object.assign(entry,{family:'gold-family-american-buffalo',label:'Bizon',weight:'inna waga',section:'historical',buy:false,sell:true,sellPercent:7,visible:true});
 const repaired=mergeBoard(stored,data.products,data.metals),row=buildBoard(repaired,data.products,data.metals).rows.find(r=>r.id===id);
 assert.equal(row.family,'gold-family-krugerrand');assert.equal(row.label,'Krugerrand');assert.equal(row.weight,'1 oz');assert.equal(row.section,'bullion');
 assert.equal(row.buy,null);assert.equal(repaired.entries[id].sellPercent,7);assert.equal(repaired.entries[id].visible,true);
 assert.equal(row.sell,Math.round(data.products.goldCoins.find(p=>p.id===id).marketValue*1.07*100)/100);
 const invalid=structuredClone(repaired);invalid.entries[id].family='gold-family-american-buffalo';
 assert.throws(()=>validateBoard(invalid,repaired,data.products),/Grupa monety wynika automatycznie/);
 assert.deepEqual(mergeBoard(repaired,data.products,data.metals),repaired);
});
