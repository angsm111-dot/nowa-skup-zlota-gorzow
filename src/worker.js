import { mergeBoard, validateBoard, buildBoard } from "./board.mjs";
const METALS = {
  gold: { name: "Złoto", symbol: "Au", purities: [333,375,500,585,750,916,960,986,999], fallback: 337.8 },
  silver: { name: "Srebro", symbol: "Ag", purities: [999,960,925,900,875,835,830,800,600], fallback: 3.72 },
  platinum: { name: "Platyna", symbol: "Pt", purities: [999,950,900,850], fallback: 124.6 },
  palladium: { name: "Pallad", symbol: "Pd", purities: [999,950,850,500], fallback: 138.4 }
};
const PRODUCTS = {
  goldCoins: [
    ...coinFamily("krugerrand","Krugerrand",916.7,33.9305,31.1035,0,4,[1,.5,.25,.1]),
    ...coinFamily("american-eagle","Amerykański Orzeł",916.7,33.931,31.1035,1,4,[1,.5,.25,.1]),
    {id:"gold-american-buffalo-1oz",name:"Amerykański Bizon 1 oz",metal:"gold",kind:"coin",purity:999.9,grossWeight:31.1035,fineWeight:31.1004,imageKey:"american-buffalo",familyIndex:2,defaultMargin:3.5,description:"Popularna moneta bulionowa z motywem bizona."},
    ...coinFamily("maple-leaf","Kanadyjski Liść Klonowy",999.9,31.1035,31.1004,3,3.5,[1,.5,.25,.1]),
    ...coinFamily("chinese-panda","Chińska Panda",999,31.1035,31.0724,4,4,[1,.5,.25,.1,.05,.04]),
    ...coinFamily("australian-kangaroo","Australijski Kangur",999.9,31.1035,31.1004,5,3.5,[1,.5,.25,.1]),
    ...coinFamily("australian-kangaroo","Australijski Kangur",999.9,31.1035,31.1004,5,3.5,[.05,.04]),
    ...coinFamily("philharmonic","Wiedeński Filharmonik",999.9,31.1035,31.1004,6,3.5,[1,.5,.25,.1,.05,.04]),
    ...historicGoldCoins()
  ],
  silverCoins: [
    silverCoin("maple-leaf-1oz","Kanadyjski Liść Klonowy 1 oz",31.1035,0,14),
    silverCoin("krugerrand-1oz","Krugerrand 1 oz",31.1035,3,15),
    silverCoin("britannia-1oz","Brytyjska Britannia 1 oz",31.1035,2,15),
    silverCoin("american-eagle-1oz","Amerykański Orzeł 1 oz",31.1035,0,15),
    silverCoin("kangaroo-1oz","Australijski Kangur 1 oz",31.1035,0,15),
    silverCoin("philharmonic-1oz","Wiedeński Filharmonik 1 oz",31.1035,1,15),
    silverCoin("lunar-2oz","Australijski Lunar 2 oz",62.207,0,15),
    silverCoin("kookaburra-1kg","Australijska Kookaburra 1 kg",1000,0,13)
  ],
  goldBars: [31.1035,1,2.5,5,10,20,50,100].map(weight=>({id:`gold-bar-${String(weight).replace(".","-")}g`,name:weight===31.1035?"Sztabka 1 oz":"Sztabka "+String(weight).replace(".",",")+" g",metal:"gold",kind:"bar",purity:999.9,grossWeight:weight,fineWeight:weight*.9999,imageIndex:0,defaultMargin:3})),
  silverBars: [31.1035,50,100,250,500,1000].map(weight=>({id:`silver-bar-${String(weight).replace(".","-")}g`,name:weight===31.1035?"Sztabka 1 oz":weight===1000?"Sztabka 1 kg":"Sztabka "+weight+" g",metal:"silver",kind:"bar",purity:999.9,grossWeight:weight,fineWeight:weight*.9999,imageIndex:1,defaultMargin:12}))
  ,platinumCoins: [],
  platinumBars: [],
  palladiumCoins: [],
  palladiumBars: []
};
function silverCoin(id,name,grossWeight,imageIndex,defaultMargin){return {id:`silver-${id}`,name,metal:"silver",kind:"coin",purity:999.9,grossWeight,fineWeight:Math.round(grossWeight*.9999*10000)/10000,imageIndex,defaultMargin,description:"Popularna srebrna moneta bulionowa próby Ag 999,9."}}
function coinFamily(slug,label,purity,oneOzGross,oneOzFine,familyIndex,defaultMargin,fractions){
  const names={1:"1 oz",.5:"1/2 oz",.25:"1/4 oz",.1:"1/10 oz",.05:"1/20 oz",.04:"1/25 oz"};
  return fractions.map(fraction=>({id:`gold-${slug}-${String(fraction).replace(".","-")}oz`,name:`${label} ${names[fraction]}`,metal:"gold",kind:"coin",purity,grossWeight:Math.round(oneOzGross*fraction*10000)/10000,fineWeight:Math.round(oneOzFine*fraction*10000)/10000,imageKey:slug,familyIndex,defaultMargin,description:`Złota moneta bulionowa ${label}, nominał ${names[fraction]}.`}));
}
function historicCoin(id,name,purity,grossWeight,defaultMargin=6){return {id:`gold-${id}`,name,metal:"gold",kind:"coin",purity,grossWeight,fineWeight:Math.round(grossWeight*purity/1000*10000)/10000,imageKey:id,defaultMargin,description:"Złota moneta historyczna; cena zależy od zawartości czystego kruszcu i stanu zachowania."}}
function historicGoldCoins(){return [
  historicCoin("white-eagle-500-1oz","500 zł Orzeł Bielik (Polska) 1 oz",999.9,31.1035,4),historicCoin("white-eagle-200-half","200 zł Orzeł Bielik (Polska) 1/2 oz",999.9,15.5518,4),historicCoin("white-eagle-100-quarter","100 zł Orzeł Bielik (Polska) 1/4 oz",999.9,7.7759,4),historicCoin("white-eagle-50-tenth","50 zł Orzeł Bielik (Polska) 1/10 oz",999.9,3.1104,4),
  historicCoin("usa-20-dollar","20 dolarów USA",900,33.436),historicCoin("usa-10-dollar","10 dolarów USA",900,16.718),historicCoin("usa-5-dollar","5 dolarów USA",900,8.359),historicCoin("usa-2-5-dollar","2,5 dolara USA",900,4.18),
  historicCoin("russia-15-ruble","15 rubli (Rosja)",900,12.9039),historicCoin("russia-10-ruble","10 rubli (Rosja)",900,8.6026),historicCoin("russia-7-5-ruble","7,5 rubla (Rosja)",900,6.4516),historicCoin("russia-5-ruble","5 rubli (Rosja)",900,4.3013),
  historicCoin("austria-4-ducat","4 dukaty austrowęgierskie",986,13.9636),historicCoin("austria-1-ducat","1 dukat austrowęgierski",986,3.4909),
  historicCoin("germany-20-mark","20 marek (Niemcy)",900,7.965),historicCoin("germany-10-mark","10 marek (Niemcy)",900,3.982),historicCoin("germany-5-mark","5 marek (Niemcy)",900,1.991),
  historicCoin("france-switzerland-20-franc","20 franków (Francja/Szwajcaria)",900,6.4516),historicCoin("france-switzerland-10-franc","10 franków (Francja/Szwajcaria)",900,3.2258),historicCoin("uk-sovereign","1 funt (Anglia)",916.7,7.9881),
  historicCoin("austria-100-corona","100 koron (Austria)",900,33.8753),historicCoin("austria-20-corona","20 koron (Austria)",900,6.7751),historicCoin("austria-10-corona","10 koron (Austria)",900,3.3875),
  historicCoin("mexico-libertad-1oz","1 uncja (Meksyk)",999,31.1035,4),historicCoin("mexico-libertad-half","1/2 uncji (Meksyk)",999,15.5518,4),historicCoin("mexico-libertad-quarter","1/4 uncji (Meksyk)",999,7.7759,4),
  historicCoin("mexico-50-pesos","50 pesos (Meksyk)",900,41.6667),historicCoin("mexico-20-pesos","20 pesos (Meksyk)",900,16.6667),historicCoin("mexico-10-pesos","10 pesos (Meksyk)",900,8.3333),historicCoin("mexico-2-5-pesos","2,5 pesos (Meksyk)",900,2.0833),
  historicCoin("chile-100-pesos","100 pesos (Chile)",900,20.3397),historicCoin("chile-50-pesos","50 pesos (Chile)",900,10.1699),historicCoin("denmark-20-kroner","20 koron (Dania)",900,8.9606),historicCoin("netherlands-10-guilder","10 guldenów (Holandia)",900,6.729),historicCoin("austria-1000-schilling","1000 szylingów (Austria)",900,13.5),historicCoin("britannia-100-pound","100 funtów Britannia",999.9,31.1035,4),historicCoin("south-africa-2-rand","2 randy",916.7,7.9881)
]}
const SYMBOLS = { silver: "XAG", platinum: "XPT", palladium: "XPD" };
const DEFAULT_PROVIDER_URL = "https://investgold.pl/sezamcalc2.json";
const PROVIDER_ALIASES = {
  gold: ["gold", "zloto", "au"],
  silver: ["silver", "srebro", "ag"],
  platinum: ["platinum", "platyna", "pt"],
  palladium: ["palladium", "pallad", "pd"]
};
const PUBLIC_ROUTES = {
  "/cennik": "prices",
  "/kalkulator": "calculator",
  "/jak-dzialamy": "process",
  "/o-nas": "about",
  "/blog": "blog",
  "/faq": "faq",
  "/kontakt": "contact"
};
const DEFAULT_MARGINS = {
  gold:{333:22,375:20,500:16,585:14,750:11,916:9,960:8,986:7.5,999:7},
  silver:{999:18,960:19,925:20,900:21,875:22,835:24,830:24,800:26,600:30},
  platinum:{999:12,950:13,900:15,850:17},
  palladium:{999:15,950:16,850:19,500:28}
};
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const now=()=>new Date().toISOString();
const SITE_VERSION="20260810-1";

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/"&&!url.searchParams.has("wersja")){
      url.searchParams.set("wersja",SITE_VERSION);
      return new Response(null,{status:302,headers:{location:url.toString(),"cache-control":"no-store, no-cache, must-revalidate, max-age=0",pragma:"no-cache",expires:"0"}});
    }
    const publicRoute=PUBLIC_ROUTES[url.pathname.replace(/\/$/,"")];
    if(publicRoute&&request.method==="GET")return Response.redirect(`${url.origin}/#${publicRoute}`,302);
    if(url.pathname==="/api/admin/board" && ["GET","PUT"].includes(request.method))return adminBoard(request,env,ctx);
    if(url.pathname==="/api/prices"&&request.method==="GET")return publicPrices(env,ctx);
    if(url.pathname==="/api/admin/login"&&request.method==="POST")return adminLogin(request,env);
    if(url.pathname==="/api/admin/logout"&&request.method==="POST")return adminLogout();
    if(url.pathname==="/api/admin/config"&&request.method==="GET")return adminGet(request,env);
    if(url.pathname==="/api/admin/config"&&request.method==="PUT")return adminPut(request,env);
    if(url.pathname==="/api/admin/refresh"&&request.method==="POST")return adminRefresh(request,env);
    if(url.pathname==="/admin"||url.pathname==="/admin/"){const target=new URL(request.url);target.pathname="/admin.html";return serveAsset(env,new Request(target.toString(),{method:"GET",headers:request.headers}));}
    return serveAsset(env,request);
  },
  async scheduled(_event,env,ctx){ctx.waitUntil(refreshMarket(env));}
};

async function publicPrices(env,ctx){
  let market=await readJson(env,"market:latest");
  const maxAge=Number(env.CACHE_SECONDS||300)*1000;
  if(!market||Date.now()-new Date(market.fetchedAt).getTime()>maxAge){
    market=await refreshMarket(env).catch(()=>market);
    if(!market)market=fallbackMarket();
  }
  const config=await getConfig(env),dailyHistory=await readJson(env,"market:daily-history:v1")||{},metals={};
  for(const [key,meta] of Object.entries(METALS)){
    const spot=Number(market.metals[key]?.spot||meta.fallback),change=Number(market.metals[key]?.change||0),purities={};
    for(const purity of meta.purities){
      const setting=config.metals[key][purity],auto=spot*(purity/1000)*(1-setting.margin/100);
      purities[purity]={price:round(setting.mode==="manual"&&setting.manualPrice!==null?setting.manualPrice:auto),margin:setting.margin,mode:setting.mode};
    }
    metals[key]={name:meta.name,symbol:meta.symbol,spot:round(spot),change,history:mergeHistory(market.metals[key]?.history,dailyHistory[key]),purities};
  }
  const products={};
  for(const [group,list] of Object.entries(allProductGroups(config)))products[group]=list.map(product=>{const setting=config.products[product.id],spot=Number(market.metals[product.metal]?.spot||METALS[product.metal].fallback),marketValue=spot*product.fineWeight,auto=marketValue*(1-setting.margin/100);return {...product,marketValue:round(marketValue),price:round(setting.mode==="manual"&&setting.manualPrice!==null?setting.manualPrice:auto),margin:setting.margin,mode:setting.mode}});
  const board=buildBoard(mergeBoard(await readJson(env,"config:board:v1"),products,metals),products,metals);
  return json({board,status:"ok",fetchedAt:market.fetchedAt,provider:market.provider,configUpdatedAt:config.updatedAt,metals,products},200,{"cache-control":"no-store, no-cache, must-revalidate, max-age=0","cdn-cache-control":"no-store","cloudflare-cdn-cache-control":"no-store",pragma:"no-cache",expires:"0"});
}

async function serveAsset(env,request){
  const response=await env.ASSETS.fetch(request),url=new URL(request.url),headers=new Headers(response.headers);
  const dynamicAsset=url.pathname==="/"||/\.(?:html|js|css)$/i.test(url.pathname);
  if(dynamicAsset){headers.set("cache-control","no-store, no-cache, must-revalidate, max-age=0");headers.set("cdn-cache-control","no-store");headers.set("cloudflare-cdn-cache-control","no-store");headers.set("pragma","no-cache");headers.set("expires","0")}
  headers.set("x-content-type-options","nosniff");
  headers.set("referrer-policy","strict-origin-when-cross-origin");
  headers.set("permissions-policy","camera=(), microphone=(), geolocation=()");
  if(url.pathname==="/admin"||url.pathname==="/admin/"||url.pathname==="/admin.html"){
    headers.set("content-security-policy","default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: https://commons.wikimedia.org https://upload.wikimedia.org https://www.usmint.gov https://www.muenzeoesterreich.at https://www.royalmint.com; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
    headers.set("x-frame-options","DENY");
    headers.set("referrer-policy","no-referrer");
  }
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

async function refreshMarket(env){
  const previous=await readJson(env,"market:latest");
  let market;
  if(env.PROVIDER_URL||DEFAULT_PROVIDER_URL)market=await fetchCustomProvider(env);
  else market=await fetchDefaultProviders();
  const marketDate=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Warsaw"}).format(new Date()),storedAnchor=await readJson(env,"market:day-anchor");
  let anchor=storedAnchor;
  if(!anchor||anchor.date!==marketDate){const metals={};for(const [key,item] of Object.entries(market.metals||{}))metals[key]=Number(previous?.metals?.[key]?.spot||item.spot);anchor={date:marketDate,metals};await writeJson(env,"market:day-anchor",anchor)}
  for(const [key,item] of Object.entries(market.metals||{}))item.change=delta(item.spot,Number(anchor.metals?.[key]||item.spot));
  await recordDailyHistory(env,market,marketDate);
  await writeJson(env,"market:latest",market);
  return market;
}

// Adapter do podmiany po otrzymaniu dokumentacji dostawcy.
// Oczekiwany wynik wewnętrzny: { gold:{spot,change,history}, silver:{...}, ... }, PLN za gram.
async function fetchCustomProvider(env){
  const headers={accept:"application/json"};
  if(env.PROVIDER_API_KEY)headers.authorization=`Bearer ${env.PROVIDER_API_KEY}`;
  const providerUrl=env.PROVIDER_URL||DEFAULT_PROVIDER_URL;
  const response=await fetch(providerUrl,{headers,cf:{cacheTtl:0,cacheEverything:false}});
  if(!response.ok)throw new Error(`Dostawca: ${response.status}`);
  const raw=await response.json();
  const metals={};
  for(const key of Object.keys(METALS)){
    const item=findMetalItem(raw,key);
    if(!item)continue;
    const spot=extractSpot(item);
    if(!Number.isFinite(spot)||spot<=0)continue;
    const suppliedChange=item.change_percent??item.changePercent??item.change;
    metals[key]={spot,change:suppliedChange==null?null:Number(suppliedChange),history:Array.isArray(item.history)?item.history:[]};
  }
  if(!Object.keys(metals).length)throw new Error("Nie rozpoznano cen w danych dostawcy");
  if(metals.gold&&metals.gold.history.length<2){
    try{
      const goldHistory=await fetch("https://api.nbp.pl/api/cenyzlota/last/90/?format=json").then(check).then(r=>r.json());
      metals.gold.history=goldHistory.map(x=>({date:x.data,value:Number(x.cena)}));
      metals.gold.change=delta(goldHistory.at(-1).cena,goldHistory.at(-2).cena);
    }catch{metals.gold.history=[]}
  }
  return {fetchedAt:now(),provider:"Invest Gold",metals};
}

function findMetalItem(raw,key){
  const aliases=PROVIDER_ALIASES[key],queue=[raw];
  while(queue.length){
    const node=queue.shift();
    if(!node||typeof node!=="object")continue;
    for(const [name,value] of Object.entries(node)){
      if(aliases.includes(normalizeKey(name)))return typeof value==="number"?{price:value}:value;
      if(value&&typeof value==="object")queue.push(value);
    }
  }
  return null;
}

function extractSpot(item){
  if(typeof item==="number"||typeof item==="string")return parsePrice(item);
  for(const value of [item.price_pln_g,item.pricePlnG,item.spot,item.price,item.cena,item.value,item.kurs]){
    const parsed=parsePrice(value);if(Number.isFinite(parsed)&&parsed>0)return parsed;
  }
  const purityPrices=[];
  for(const [name,value] of Object.entries(item)){
    const purity=Number(String(name).replace(/\D/g,""));
    const price=parsePrice(typeof value==="object"?(value.price??value.cena??value.value):value);
    if(purity>=300&&purity<=1000&&Number.isFinite(price)&&price>0)purityPrices.push({purity,price});
  }
  purityPrices.sort((a,b)=>b.purity-a.purity);
  return purityPrices.length?purityPrices[0].price/(purityPrices[0].purity/1000):NaN;
}

function parsePrice(value){
  if(typeof value==="number")return value;
  if(typeof value!=="string")return NaN;
  return Number(value.replace(/\s/g,"").replace(",",".").replace(/[^0-9.-]/g,""));
}
function normalizeKey(value){return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"")}

async function fetchDefaultProviders(){
  const [gold,usd]=await Promise.all([
    fetch("https://api.nbp.pl/api/cenyzlota/last/90/?format=json").then(check).then(r=>r.json()),
    fetch("https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json").then(check).then(r=>r.json())
  ]);
  const usdPln=Number(usd.rates[0].mid),metals={gold:{spot:Number(gold.at(-1).cena),change:delta(gold.at(-1).cena,gold.at(-2).cena),history:gold.map(x=>({date:x.data,value:Number(x.cena)}))}};
  await Promise.all(Object.entries(SYMBOLS).map(async([key,symbol])=>{
    try{const d=await fetch(`https://api.gold-api.com/price/${symbol}`).then(check).then(r=>r.json());const spot=Number(d.price)*usdPln/31.1034768;metals[key]={spot,change:Number(d.changePercentage??d.change_percent??0),history:[]}}
    catch{metals[key]={spot:METALS[key].fallback,change:0,history:[]}}
  }));
  return {fetchedAt:now(),provider:"NBP + Gold API",metals};
}

async function adminLogin(request,env){
  const ip=request.headers.get("cf-connecting-ip")||"unknown",key=`auth:fail:${ip}`,attempt=await readJson(env,key)||{count:0,blockedUntil:0};
  if(Number(attempt.blockedUntil)>Date.now())return json({error:"Zbyt wiele prób. Spróbuj ponownie za kilkanaście minut."},429,{"retry-after":"900"});
  const body=await request.json().catch(()=>({})),validUser=await secureEquals(String(body.username||""),String(env.ADMIN_USERNAME||"")),validPassword=await secureEquals(String(body.password||""),String(env.ADMIN_PASSWORD||""));
  if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD||!validUser||!validPassword){
    const count=Number(attempt.count||0)+1,blockedUntil=count>=5?Date.now()+15*60*1000:0;
    if(env.PRICE_STORE)await env.PRICE_STORE.put(key,JSON.stringify({count,blockedUntil}),{expirationTtl:900});
    return json({error:"Nieprawidłowe dane logowania"},401);
  }
  if(env.PRICE_STORE)await env.PRICE_STORE.delete(key);
  const session=await createAdminSession(env);
  return json({ok:true},200,{"set-cookie":`admin_session=${session}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=1800`});
}
function adminLogout(){return json({ok:true},200,{"set-cookie":"admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"})}
async function adminGet(request,env){if(!await authorized(request,env))return json({error:"Brak dostępu"},401);return json(await getConfig(env));}
async function adminPut(request,env){
  if(!await authorized(request,env))return json({error:"Brak dostępu"},401);
  const body=await request.json().catch(()=>null);if(!body?.metals)return json({error:"Nieprawidłowe dane"},400);
  const current=await getConfig(env);
  current.customProducts=sanitizeCustomProducts(body.customProducts);
  for(const [metal,meta] of Object.entries(METALS))for(const purity of meta.purities){const s=body.metals?.[metal]?.[purity];if(!s)continue;current.metals[metal][purity]={margin:clamp(Number(s.margin),0,100),mode:s.mode==="manual"?"manual":"auto",manualPrice:s.mode==="manual"?Math.max(0,Number(s.manualPrice)||0):null};}
  for(const list of Object.values(allProductGroups(current)))for(const product of list){const s=body.products?.[product.id];if(!s)continue;current.products[product.id]={margin:clamp(Number(s.margin),0,100),mode:s.mode==="manual"?"manual":"auto",manualPrice:s.mode==="manual"?Math.max(0,Number(s.manualPrice)||0):null};}
  const previous=await readJson(env,"config:pricing");if(previous)await writeJson(env,"backup:pricing:"+Date.now(),previous);
  current.updatedAt=now();current.updatedBy="panel";await writeJson(env,"config:pricing",current);return json({ok:true,config:current});
}
async function adminRefresh(request,env){if(!await authorized(request,env))return json({error:"Brak dostępu"},401);return json({ok:true,market:await refreshMarket(env)});}
async function authorized(request,env){
  const cookie=request.headers.get("cookie")||"",session=cookie.match(/(?:^|;\s*)admin_session=([^;]+)/)?.[1]||"";
  return verifyAdminSession(session,env);
}
async function createAdminSession(env){
  const payload=toBase64Url(JSON.stringify({exp:Date.now()+30*60*1000,nonce:crypto.randomUUID()}));
  return `${payload}.${await signSession(payload,env)}`;
}
async function verifyAdminSession(session,env){
  if(!session||!env.ADMIN_PASSWORD)return false;
  const [payload,signature,...extra]=session.split(".");if(!payload||!signature||extra.length)return false;
  if(!await secureEquals(signature,await signSession(payload,env)))return false;
  try{return Number(JSON.parse(fromBase64Url(payload)).exp)>Date.now()}catch{return false}
}
async function signSession(value,env){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(String(env.ADMIN_SESSION_SECRET||env.ADMIN_PASSWORD)),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value))));
}
async function secureEquals(a,b){
  const [da,db]=await Promise.all([a,b].map(value=>crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));
  const aa=new Uint8Array(da),bb=new Uint8Array(db);let diff=aa.length^bb.length;for(let i=0;i<Math.max(aa.length,bb.length);i++)diff|=(aa[i%aa.length]||0)^(bb[i%bb.length]||0);return diff===0;
}
function toBase64Url(value){return bytesToBase64Url(new TextEncoder().encode(value))}
function bytesToBase64Url(bytes){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"")}
function fromBase64Url(value){const normalized=value.replace(/-/g,"+").replace(/_/g,"/");return decodeURIComponent(Array.from(atob(normalized+"=".repeat((4-normalized.length%4)%4))).map(char=>`%${char.charCodeAt(0).toString(16).padStart(2,"0")}`).join(""))}
async function getConfig(env){const stored=await readJson(env,"config:pricing"),metals={},products={},customProducts=sanitizeCustomProducts(stored?.customProducts);for(const [key,meta] of Object.entries(METALS)){metals[key]={};for(const purity of meta.purities){const saved=stored?.metals?.[key]?.[purity];metals[key][purity]=saved?{margin:clamp(Number(saved.margin),0,100),mode:saved.mode==="manual"?"manual":"auto",manualPrice:saved.mode==="manual"?Math.max(0,Number(saved.manualPrice)||0):null}:{margin:DEFAULT_MARGINS[key][purity],mode:"auto",manualPrice:null}}}for(const list of Object.values(allProductGroups({customProducts})))for(const product of list){const saved=stored?.products?.[product.id];products[product.id]=saved?{margin:clamp(Number(saved.margin),0,100),mode:saved.mode==="manual"?"manual":"auto",manualPrice:saved.mode==="manual"?Math.max(0,Number(saved.manualPrice)||0):null}:{margin:product.defaultMargin??10,mode:"auto",manualPrice:null}}return {updatedAt:stored?.updatedAt||now(),updatedBy:stored?.updatedBy||"defaults",metals,products,customProducts};}

function sanitizeCustomProducts(input){
  const baseIds=new Set(Object.values(PRODUCTS).flat().map(product=>product.id));
  return (Array.isArray(input)?input:[]).slice(0,250).map((item,index)=>{
    const allowedMetals=["gold","silver","platinum","palladium"],metal=allowedMetals.includes(item?.metal)?item.metal:"gold",kind=item?.kind==="bar"?"bar":"coin",purity=clamp(Number(item?.purity),1,999.9),grossWeight=clamp(Number(item?.grossWeight),.01,100000),calculatedFine=grossWeight*(purity/1000),fineWeight=clamp(Number(item?.fineWeight)||calculatedFine,.001,grossWeight),rawImage=String(item?.imageData||""),id=String(item?.id||`custom-${Date.now()}-${index}`).replace(/[^a-z0-9_-]/gi,"-").slice(0,80),builtIn=baseIds.has(id);
    const imageData=/^data:image\/(?:webp|jpeg|png);base64,/i.test(rawImage)&&rawImage.length<=500000?rawImage:"";
    return {id,name:String(item?.name||"Produkt bez nazwy").replace(/[<>&\"]/g,"").trim().slice(0,100),description:String(item?.description||"").replace(/[<>&]/g,"").trim().slice(0,300),metal,kind,purity:round(purity),grossWeight:round(grossWeight),fineWeight:round(fineWeight),imageData,imageKey:String(item?.imageKey||"").replace(/[^a-z0-9-]/gi,"").slice(0,80),imageIndex:clamp(Number(item?.imageIndex)||0,0,20),order:clamp(Number(item?.order??index),0,10000),active:item?.active!==false,custom:!builtIn,overridden:builtIn,defaultMargin:clamp(Number(item?.defaultMargin??10),0,100)};
  }).filter(item=>item.name);
}
function allProductGroups(config){
  const groups=Object.fromEntries(Object.entries(PRODUCTS).map(([key,list])=>[key,list.map(product=>({...product,description:product.description||"",custom:false,overridden:false,active:true}))]));
  for(const product of config?.customProducts||[]){
    const group=`${product.metal}${product.kind==="coin"?"Coins":"Bars"}`;if(!groups[group])continue;
    const existing=groups[group].findIndex(item=>item.id===product.id);
    if(existing>=0)groups[group][existing]={...groups[group][existing],...product,custom:false,overridden:true};else groups[group].push(product);
  }
  for(const list of Object.values(groups))list.sort((a,b)=>(Number(a.order??10000)-Number(b.order??10000))||(PRODUCTS[`${a.metal}${a.kind==="coin"?"Coins":"Bars"}`]?.findIndex(item=>item.id===a.id)??0)-(PRODUCTS[`${b.metal}${b.kind==="coin"?"Coins":"Bars"}`]?.findIndex(item=>item.id===b.id)??0));
  return groups;
}
async function readJson(env,key){if(!env.PRICE_STORE)return null;const v=await env.PRICE_STORE.get(key);return v?JSON.parse(v):null}
async function writeJson(env,key,value){if(env.PRICE_STORE)await env.PRICE_STORE.put(key,JSON.stringify(value));}
async function recordDailyHistory(env,market,date){
  if(!env.PRICE_STORE)return;
  const stored=await readJson(env,"market:daily-history:v1")||{};
  let changed=false;
  for(const key of Object.keys(METALS)){
    const spot=Number(market.metals?.[key]?.spot);
    if(!Number.isFinite(spot)||spot<=0)continue;
    const history=normalizeHistory(stored[key]?.length?stored[key]:market.metals[key]?.history);
    if(history.some(point=>point.date===date)){stored[key]=history;continue}
    stored[key]=[...history,{date,value:round(spot)}].slice(-730);
    changed=true;
  }
  if(changed)await writeJson(env,"market:daily-history:v1",stored);
}
function normalizeHistory(input){
  const byDate=new Map();
  for(const point of Array.isArray(input)?input:[]){
    const date=String(point?.date||point?.data||"").slice(0,10),value=Number(point?.value??point?.cena);
    if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(value)&&value>0)byDate.set(date,{date,value:round(value)});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-730);
}
function mergeHistory(providerHistory,storedHistory){return normalizeHistory([...(Array.isArray(providerHistory)?providerHistory:[]),...(Array.isArray(storedHistory)?storedHistory:[])]).slice(-730)}
function fallbackMarket(){const metals={};for(const [k,v] of Object.entries(METALS))metals[k]={spot:v.fallback,change:0,history:[]};return {fetchedAt:now(),provider:"Dane zapasowe",metals}}
function check(r){if(!r.ok)throw new Error(String(r.status));return r}function round(v){return Math.round(v*100)/100}function clamp(v,a,b){return Math.max(a,Math.min(b,Number.isFinite(v)?v:a))}function delta(a,b){return b?(Number(a)-Number(b))/Number(b)*100:0}


async function adminBoard(request,env,ctx){
  if(!await authorized(request,env))return json({error:"Brak dostępu"},401);
  if(request.method==="PUT"&&!env.PRICE_STORE)return json({error:"Brak magazynu ustawień. Nie zapisano zmian."},503);
  const response=await publicPrices(env,ctx),payload=await response.json();
  const current=mergeBoard(await readJson(env,"config:board:v1"),payload.products,payload.metals);
  if(request.method==="GET")return json({config:current,products:payload.products,metals:payload.metals,fetchedAt:payload.fetchedAt},200,{"cache-control":"no-store"});
  try{
    const input=await request.json();
    if((input.updatedAt??null)!==(current.updatedAt??null))return json({error:"Ustawienia zmieniono w innym oknie. Pobierz je ponownie."},409);
    const config=validateBoard(input,current,payload.products);
    const previous=await readJson(env,"config:board:v1");
    if(previous)await writeJson(env,"backup:board:"+Date.now(),previous);
    await writeJson(env,"config:board:v1",config);
    return json({ok:true,config},200,{"cache-control":"no-store"});
  }catch(error){return json({error:error.message||"Nieprawidłowe dane"},400)}
}
