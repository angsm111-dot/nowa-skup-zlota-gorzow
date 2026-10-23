import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

test('Public feed supports external calculators and uses the saved per-purity buy price',async()=>{
 const store=new Map([
  ['market:latest',JSON.stringify({fetchedAt:new Date().toISOString(),provider:'Test fixture',metals:Object.fromEntries(['gold','silver','platinum','palladium'].map(k=>[k,{spot:400,change:0,history:[]}]))})],
  ['config:pricing',JSON.stringify({metals:{gold:{585:{mode:'manual',manualPrice:222.22,margin:14}}}})]
 ]);
 const env={PRICE_STORE:{get:async k=>store.get(k)??null,put:async(k,v)=>store.set(k,v)}};
 const call=path=>worker.fetch(new Request('https://prices.test'+path,{headers:{Origin:'https://htmlpreview.github.io'}}),env,{});
 const response=await call('/api/prices');
 assert.equal(response.status,200);
 assert.equal(response.headers.get('access-control-allow-origin'),'*');
 assert.equal(response.headers.get('access-control-allow-credentials'),null);
 const data=await response.json();
 assert.equal(data.metals.gold.purities['585'].price,222.22);
 assert.equal(data.metals.gold.purities['750'].price,267);
 const config=JSON.parse(store.get('config:pricing'));config.metals.gold['585'].manualPrice=230;
 store.set('config:pricing',JSON.stringify(config));
 assert.equal((await(await call('/api/prices')).json()).metals.gold.purities['585'].price,230);
 const admin=await call('/api/admin/config');
 assert.equal(admin.status,401);
 assert.equal(admin.headers.get('access-control-allow-origin'),null);
});
