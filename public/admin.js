const names={gold:['Au','Złoto'],silver:['Ag','Srebro'],platinum:['Pt','Platyna'],palladium:['Pd','Pallad']};
let config=null,prices=null,active='gold',kind='purities',dirty=false;
const $=selector=>document.querySelector(selector),money=value=>new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(value),number=value=>Number(value).toFixed(2).replace('.',',');

async function api(path,options={}){const response=await window.AdminSession.fetchAuthenticated(path,{...options,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json',...options.headers}});if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Błąd serwera')}return response.json()}
async function loadPrices(){return fetch(`/api/prices?t=${Date.now()}`,{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Nie udało się pobrać cen');return response.json()})}
async function login(){const button=$('#login-btn');button.disabled=true;$('#login-error').textContent='Sprawdzanie…';try{await api('/api/admin/login',{method:'POST',body:JSON.stringify({username:$('#username').value,password:$('#password').value})});$('#password').value='';config=await api('/api/admin/config');prices=await loadPrices();$('#login').hidden=true;$('#panel').hidden=false;render()}catch(error){$('#login-error').textContent=error.message}finally{button.disabled=false}}

function ensureKinds(){let bar=$('#admin-kinds');if(!bar){bar=document.createElement('div');bar.id='admin-kinds';bar.className='admin-kinds';$('#tabs').after(bar)}return bar}
function groupName(){return `${active}${kind==='coins'?'Coins':'Bars'}`}
function currentProducts(){return (prices?.products?.[groupName()]||[]).filter(product=>product.active!==false)}
function render(){
  const tabs=$('#tabs');
  tabs.innerHTML=Object.entries(names).map(([key,name])=>`<button data-metal="${key}" class="${key===active?'active':''}">${name[0]}<span>${name[1]}</span></button>`).join('');
  tabs.querySelectorAll('button').forEach(button=>button.onclick=()=>{active=button.dataset.metal;if(!['gold','silver'].includes(active))kind='purities';render()});
  const kinds=ensureKinds(),hasProducts=true;
  kinds.hidden=!hasProducts;
  kinds.innerHTML=hasProducts?`<button data-kind="purities" class="${kind==='purities'?'active':''}">Próby metalu</button><button data-kind="coins" class="${kind==='coins'?'active':''}">Monety</button><button data-kind="bars" class="${kind==='bars'?'active':''}">Sztabki</button>`:'';
  kinds.querySelectorAll('button').forEach(button=>button.onclick=()=>{kind=button.dataset.kind;render()});
  $('#updated').textContent=new Date(config.updatedAt).toLocaleString('pl-PL');
  $('#spot').textContent=`${money(prices.metals[active].spot)} / g`;
  const rows=$('#rows');
  rows.innerHTML=kind==='purities'?Object.entries(config.metals[active]).map(([purity,setting])=>purityRow(purity,setting)).join(''):currentProducts().map(product=>productRow(product)).join('');
  const priceHeaders=$('#rows').closest('table').querySelectorAll('thead th');const firstHeader=priceHeaders[0];firstHeader.textContent=kind==='purities'?'Próba':'Produkt';
  priceHeaders[1].textContent=kind==='purities'?'Cena giełdowa':'Wartość metalu';
  rows.querySelectorAll('.margin,.manual').forEach(input=>{input.addEventListener('input',change);input.addEventListener('change',change);input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();change(event);event.target.blur()}})});
  rows.querySelectorAll('.mode').forEach(select=>select.addEventListener('change',change));
}
function purityRow(purity,setting){const market=prices.metals[active].spot*(purity/1000),buy=setting.mode==='manual'?setting.manualPrice:market*(1-setting.margin/100);return `<tr data-purity="${purity}"><td><strong>${purity}</strong><br><small>${(purity/10).toFixed(1)}%</small></td><td>${money(market)}</td>${settingCells(setting,buy)}</tr>`}
function productRow(product){const setting=config.products[product.id],buy=setting.mode==='manual'?setting.manualPrice:product.marketValue*(1-setting.margin/100),photo=adminProductPhoto(product);return `<tr data-product="${product.id}"><td><div class="admin-product-main"><div class="admin-product-photo">${photo}</div><div class="admin-product-details"><strong>${product.name}</strong><small>${product.kind==='coin'?'Moneta':'Sztabka'} • próba ${String(product.purity).replace('.',',')} • ${formatWeight(product.grossWeight)}</small></div></div></td><td>${money(product.marketValue)}<br><small>${formatWeight(product.fineWeight)} czystego metalu</small></td>${settingCells(setting,buy)}</tr>`}
function settingCells(setting,buy){return `<td><input class="margin" type="number" min="0" max="100" step="0.5" value="${setting.margin}"> %</td><td><select class="mode"><option value="auto" ${setting.mode==='auto'?'selected':''}>Automatyczny</option><option value="manual" ${setting.mode==='manual'?'selected':''}>Ręczny</option></select></td><td><input class="live-price" type="text" value="${number(buy)} zł" readonly ${setting.mode==='manual'?'hidden':''}><input class="manual" type="number" min="0" step="0.01" value="${number(buy).replace(',','.')}" ${setting.mode==='auto'?'hidden':''}> <span ${setting.mode==='auto'?'hidden':''}>zł</span></td>`}
function change(event){const row=event.target.closest('tr'),productId=row.dataset.product,purity=row.dataset.purity,setting=productId?config.products[productId]:config.metals[active][purity],margin=Math.max(0,Math.min(100,Number(row.querySelector('.margin').value)||0));setting.margin=margin;setting.mode=row.querySelector('.mode').value;setting.manualPrice=setting.mode==='manual'?Number(row.querySelector('.manual').value)||0:null;if(event.target.classList.contains('mode'))render();else if(setting.mode==='auto'){const base=productId?currentProducts().find(item=>item.id===productId).marketValue:prices.metals[active].spot*(purity/1000),output=row.querySelector('.live-price');output.value=`${number(base*(1-margin/100))} zł`;output.classList.add('price-changed');setTimeout(()=>output.classList.remove('price-changed'),180)}markDirty()}
function markDirty(){dirty=true;$('#status').textContent='Masz nieopublikowane zmiany';$('#status').className='dirty'}
async function save(){const buttons=[$('#save'),$('#save-top')],labels=buttons.map(button=>button.textContent);buttons.forEach(button=>{button.disabled=true;button.textContent='Publikuję…';button.classList.add('is-publishing')});$('#status').textContent='Zapisywanie nowego cennika…';try{const result=await api('/api/admin/config',{method:'PUT',body:JSON.stringify(config)});config=result.config;prices=await loadPrices();dirty=false;$('#status').textContent='Cennik został opublikowany — ceny są już widoczne na stronie';$('#status').className='success';buttons.forEach(button=>{button.textContent='Opublikowano ✓';button.classList.remove('is-publishing');button.classList.add('is-published')});setTimeout(()=>buttons.forEach((button,index)=>{button.disabled=false;button.textContent=labels[index];button.classList.remove('is-published')}),1800);render()}catch(error){$('#status').textContent=`Publikacja nie powiodła się: ${error.message}`;$('#status').className='error';buttons.forEach((button,index)=>{button.disabled=false;button.textContent=labels[index];button.classList.remove('is-publishing')})}}
function formatWeight(value){return value>=1000?`${value/1000} kg`:`${Number(value).toFixed(value<10?2:1).replace('.',',').replace(/,0$/,'')} g`}

$('#login-btn').onclick=login;
$('#username').onkeydown=event=>{if(event.key==='Enter')$('#password').focus()};
$('#password').onkeydown=event=>{if(event.key==='Enter')login()};
$('#save').onclick=$('#save-top').onclick=save;
$('#logout').onclick=async()=>{await api('/api/admin/logout',{method:'POST'}).catch(()=>{});location.reload()};
$('#refresh').onclick=async()=>{const button=$('#refresh'),label=button.textContent;button.disabled=true;button.textContent='Odświeżam…';$('#status').textContent='Pobieranie najnowszych cen…';try{await api('/api/admin/refresh',{method:'POST'});prices=await loadPrices();render();$('#status').textContent=`Ceny odświeżone: ${new Date().toLocaleTimeString('pl-PL')}`}catch(error){$('#status').textContent=`Nie udało się odświeżyć: ${error.message}`}finally{button.disabled=false;button.textContent=label}};
$('#bulk-apply').onclick=()=>{const value=Number($('#bulk-margin').value);if(!Number.isFinite(value))return;if(kind==='purities')Object.values(config.metals[active]).forEach(setting=>setting.margin=value);else currentProducts().forEach(product=>config.products[product.id].margin=value);markDirty();render()};
api('/api/admin/config').then(result=>{config=result;return loadPrices()}).then(result=>{prices=result;$('#login').hidden=true;$('#panel').hidden=false;render()}).catch(()=>{})

