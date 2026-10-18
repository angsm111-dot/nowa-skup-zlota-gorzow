(() => {
  const titles={bullion:'Monety złote bulionowe',historical:'Monety złote historyczne',other:'Monety złote pozostałe',goldBars:'Sztabki złote LBMA',scrap:'Złom złota',silverCoins:'Monety srebrne',silverBars:'Sztabki srebrne'};
  const panel=document.querySelector('#panel'), container=document.createElement('section');
  container.className='board-admin';
  container.innerHTML='<h2>Tablica w lokalu</h2><p>Osobne ustawienia tablicy. Ceny skupu na dotychczasowych stronach pozostają bez zmian. Sprzedaż i dostawa = wartość czystego kruszcu według spot + narzut.</p><button type="button" id="board-load" aria-controls="board-editor" aria-expanded="false">Otwórz ustawienia tablicy</button> <button type="button" id="board-close" disabled>Zamknij ustawienia tablicy</button><div id="board-editor" hidden><p id="board-prices-time"></p><label>Termin dostawy (dni) <input id="board-days" type="number" min="1" max="365" required></label><p>Każda kolumna ma osobną numerację od 1, zgodną z kolejnością widocznych pozycji. Wagi tej samej złotej monety grupują się automatycznie i mają wspólny numer. Aby pokazać monetę, zaznacz Pokaż przy właściwym produkcie w katalogu. Przesuwanie, ukrywanie i dodawanie pozycji automatycznie przelicza numery w danej kolumnie.</p><label>Sekcja <select id="board-section"></select></label><label>Szukaj produktu <input id="board-search" type="search" placeholder="np. Krugerrand 1 oz"></label><div id="board-section-options"></div><div class="board-table-wrap"><table><thead><tr><th>Produkt w katalogu</th><th>Kolejność</th><th>Na tablicy</th><th>Kategoria</th><th>Numer</th><th>Nazwa na tablicy</th><th>Waga na tablicy</th><th>Skup</th><th>Sprzedaż / narzut</th><th>Dostawa / narzut</th></tr></thead><tbody id="board-rows"></tbody></table></div></div><p id="board-message" role="status" aria-live="polite"></p>';
  panel.querySelector('#tabs').before(container);
  const saveButton=document.createElement('button');saveButton.type='button';saveButton.id='board-save';saveButton.hidden=true;
  const footerMessage=document.createElement('span');footerMessage.id='board-save-status';footerMessage.setAttribute('role','status');footerMessage.setAttribute('aria-live','polite');footerMessage.hidden=true;
  const boardActions=document.createElement('div');boardActions.id='board-footer-actions';boardActions.append(saveButton,footerMessage);
  panel.querySelector(':scope > footer').insertBefore(boardActions,document.querySelector('#save'));
  let state=null, savedState=null, products={}, boardMetals={}, selected='bullion', changed=false, savePhase='';
  const allOption=document.createElement('option');allOption.value='all';allOption.textContent='Wszystkie produkty';container.querySelector('#board-section').append(allOption);
  const find=id=>container.querySelector('#'+id);
  for(const [key,title] of Object.entries(titles)){const option=document.createElement('option');option.value=key;option.textContent=title;find('board-section').append(option)}
  const message=text=>{find('board-message').textContent=text;footerMessage.textContent=text};
  async function request(method,body){const r=await window.AdminSession.fetchAuthenticated('/api/admin/board',{method,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'Błąd serwera');return data}
  function input(value,type,change,label){const e=document.createElement('input');e.type=type;e.setAttribute('aria-label',label);if(type==='checkbox')e.checked=value;else e.value=value;e.addEventListener('change',()=>{if(!e.checkValidity()){e.reportValidity();return}change(type==='checkbox'?e.checked:type==='number'?Number(e.value):e.value.trim());changed=true;message('Masz niezapisane ustawienia tablicy.');});return e}
  function check(label,value,callback){const e=document.createElement('label');e.append(input(value,'checkbox',callback,label),document.createTextNode(' '+label));return e}
  const entryOrder=entry=>entry.order??entry.number*1000;
  const unitKey=(id,entry)=>['bullion','historical','other'].includes(entry.section)?entry.family:id;
  function unitsInSection(section){
    const units=new Map();
    for(const [id,entry] of Object.entries(state.entries).filter(([,e])=>e.section===section).sort((a,b)=>entryOrder(a[1])-entryOrder(b[1])||a[1].number-b[1].number)){
      const key=unitKey(id,entry);if(!units.has(key))units.set(key,[]);units.get(key).push(id);
    }
    return [...units.values()];
  }
  function moveEntry(id,direction){
    const entry=state.entries[id],units=unitsInSection(entry.section),index=units.findIndex(ids=>ids.includes(id)),target=index+direction;
    if(target<0||target>=units.length)return;
    [units[index],units[target]]=[units[target],units[index]];
    units.forEach((ids,index)=>ids.forEach(key=>state.entries[key].order=index*1000));
    changed=true;render();message('Zmieniono kolejność. '+(['goldBars','silverBars'].includes(entry.section)?'Numery sztabek dopasowano do kolejności.':'Numery dopasowano do kolejności.')+' Zapisz sekcję na dolnej belce.');
  }
  function renumberBars(){
    for(const section of Object.keys(state.sections)){
      let number=0;
      for(const ids of unitsInSection(section)){
        const visible=ids.some(id=>state.entries[id].visible);
        if(visible)number++;
        for(const id of ids){state.entries[id].number=visible?number:1;state.entries[id].numberAssigned=visible;}
      }
    }
  }
  function assignCoinNumber(){renumberBars()}
  function updateSaveButton(){
    saveButton.disabled=!!savePhase;
    saveButton.classList.toggle('is-publishing',savePhase==='saving');
    saveButton.classList.toggle('is-published',savePhase==='saved');
    saveButton.setAttribute('aria-busy',String(savePhase==='saving'));
    saveButton.textContent=savePhase==='saving'?'Zapisuję…':savePhase==='saved'?'Zapisano ✓':selected==='all'?'Zapisz tablicę — wszystkie sekcje':'Zapisz tablicę — '+titles[selected].toLocaleLowerCase('pl-PL');
  }
  function render(){
    renumberBars();updateSaveButton();
    find('board-days').value=state.deliveryDays;
    const opts=find('board-section-options');opts.replaceChildren();
    if(selected!=='all')for(const [key,label] of Object.entries({visible:'Pokaż sekcję',buy:'Pokaż skup',sell:'Pokaż sprzedaż',...(['bullion','goldBars'].includes(selected)?{delivery:'Przyjmuj zamówienia z dostawą'}:{})}))opts.append(check(label,state.sections[selected][key],v=>{state.sections[selected][key]=v;render()}));
    const body=find('board-rows');body.replaceChildren();
    const query=find('board-search').value.trim().toLocaleLowerCase('pl-PL');
    Object.entries(state.entries).filter(([id,v])=>(query||selected==='all'||v.section===selected)&&(!query||(products[id]?.name+' '+v.label+' '+v.weight).toLocaleLowerCase('pl-PL').includes(query))).sort((a,b)=>entryOrder(a[1])-entryOrder(b[1])||a[1].number-b[1].number||(products[b[0]]?.fineWeight??0)-(products[a[0]]?.fineWeight??0)).forEach(([id,entry])=>{
      const tr=document.createElement('tr');tr.dataset.boardId=id;
      const cell=(...children)=>{const td=document.createElement('td');td.append(...children);tr.append(td);return td};
      const productCell=cell(document.createTextNode(products[id]?.name||entry.label));if(products[id]?.active===false){const note=document.createElement('small');note.textContent='Ukryty na pozostałych stronach. Widoczność na tablicy ustawiasz osobno.';productCell.append(note)}
      const units=unitsInSection(entry.section),position=units.findIndex(ids=>ids.includes(id));
      const buttons=[[-1,'↑ Wyżej','Przesuń wyżej'],[1,'↓ Niżej','Przesuń niżej']].map(([step,text,title])=>{const b=document.createElement('button');b.type='button';b.className='board-move';b.textContent=text;b.setAttribute('aria-label',title+' — '+(products[id]?.name||entry.label));b.title=title+(['bullion','historical','other'].includes(entry.section)?' (cała grupa monety)':'');b.disabled=position+step<0||position+step>=units.length;b.onclick=()=>moveEntry(id,step);return b});cell(...buttons);
      cell(check('Pokaż',entry.visible,v=>{entry.visible=v;if(v&&['bullion','historical','other'].includes(entry.section))assignCoinNumber(entry);render()}));
      const select=document.createElement('select');select.setAttribute('aria-label','Kategoria '+entry.label);
      const categories=['bullion','historical','other'].includes(entry.section)?['bullion','historical','other']:[entry.section];
      categories.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=titles[k];o.selected=k===entry.section;select.append(o)});
      select.onchange=()=>{const family=entry.family;for(const item of Object.values(state.entries))if(item.family===family&&categories.includes(item.section))item.section=select.value;changed=true;message('Zmieniono kategorię. Zapisz ustawienia.');render()};cell(select);
      const sync=(key,value)=>{const oldFamily=entry.family;entry[key]=value;if(categories.length>1&&['number','label'].includes(key))for(const other of Object.values(state.entries))if(other.family===oldFamily){other[key]=value;if(key==='number')other.numberAssigned=true;}render()};
      const isCoin=categories.length>1;
      const n=input(entry.number,'number',v=>{if(v>=1)sync('number',v)},'Numer na tablicy');n.min=1;n.max=9999;n.required=!isCoin||entry.numberAssigned||entry.visible;
      if(isCoin&&!entry.numberAssigned){n.value='';n.placeholder='Automatycznie';}
      n.readOnly=true;n.title='Numer wynika z kolejności widocznych pozycji w tej kolumnie';
      if(!entry.visible){n.value='';n.placeholder='Ukryta';}
      cell(n);
      const name=input(entry.label,'text',v=>sync('label',v),'Nazwa na tablicy');name.required=true;name.maxLength=120;cell(name);
      const weight=input(entry.weight,'text',v=>entry.weight=v,'Waga wyświetlana');weight.maxLength=120;
      if(categories.length>1)cell(weight);else cell(document.createTextNode('—'));
      const buyPrice=products[id]?.price??(id.startsWith('scrap-')?boardMetals.gold?.purities?.[id.slice(6)]?.price:null);
      const buyPreview=document.createElement('small');buyPreview.className='board-buy-price';
      buyPreview.textContent=Number.isFinite(buyPrice)?'Skup: '+buyPrice.toLocaleString('pl-PL',{useGrouping:false,minimumFractionDigits:2,maximumFractionDigits:2})+' zł, tablica: '+(entry.buy&&state.sections[entry.section].buy?Math.round(buyPrice)+' zł':'—'):'Cena skupu niedostępna';
      cell(check('Skup',entry.buy,v=>{entry.buy=v;render()}),buyPreview);
      for(const [flag,field,label] of [['sell','sellPercent','Sprzedaż'],['delivery','deliveryPercent','Dostawa']]){
        if(flag==='delivery'&&!['bullion','goldBars'].includes(entry.section)){cell(document.createTextNode('—'));continue}
        const percent=input(entry[field],'number',v=>entry[field]=v,label+' — narzut względem spot (%)');percent.min=0;percent.max=1000;percent.step='0.1';percent.required=true;
        const price=document.createElement('small'),p=products[id];
        const base=p?.marketValue??(Number(id.slice(6))*window.boardMetalSpot/1000);
        price.textContent=Number.isFinite(base)?'Spot + '+entry[field]+'% = '+Math.round(base*(1+entry[field]/100))+' zł':'';
        cell(check(label,entry[flag],v=>entry[flag]=v),percent,document.createTextNode(' %'),price);
      }
      body.append(tr);
    });
  }
  function openEditor(){find('board-editor').hidden=false;find('board-close').disabled=false;find('board-load').setAttribute('aria-expanded','true');saveButton.hidden=false;footerMessage.hidden=false;}
  find('board-close').onclick=()=>{find('board-editor').hidden=true;find('board-close').disabled=true;find('board-load').setAttribute('aria-expanded','false');saveButton.hidden=true;footerMessage.hidden=true;message(changed?'Zamknięto ustawienia. Niezapisane zmiany zachowano do ponownego otwarcia.':'Ustawienia tablicy zamknięte.');};
  find('board-load').onclick=async()=>{if(state&&changed){openEditor();render();message('Przywrócono niezapisane ustawienia.');return}try{message('Pobieranie…');const data=await request('GET');state=data.config;savedState=structuredClone(data.config);changed=false;saveButton.hidden=false;footerMessage.hidden=false;products=Object.fromEntries(Object.values(data.products).flat().map(p=>[p.id,p]));boardMetals=data.metals;window.boardMetalSpot=data.metals.gold.spot;find('board-prices-time').textContent='Ceny według notowań z: '+(data.fetchedAt?new Date(data.fetchedAt).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'}):'—')+'. Tablica odświeża się co minutę; podgląd w panelu po ponownym otwarciu ustawień.';openEditor();render();message('Ustawienia pobrane. Wyłączenie ceny pokazuje kreskę, bez usuwania produktu.')}catch(e){message(e.message)}};
  find('board-search').oninput=()=>render();
  find('board-section').onchange=e=>{selected=e.target.value;render()};
  find('board-days').onchange=e=>{if(e.target.checkValidity()){state.deliveryDays=Number(e.target.value);changed=true;message('Zapisz nowy termin dostawy.')}else e.target.reportValidity()};
  saveButton.onclick=async()=>{
    if(!state||![...container.querySelectorAll('input')].every(e=>e.reportValidity()))return;
    if(savePhase)return;
    savePhase='saving';updateSaveButton();
    const payload=selected==='all'?structuredClone(state):structuredClone(savedState);
    if(selected!=='all'){
      payload.deliveryDays=state.deliveryDays;
      payload.sections[selected]=structuredClone(state.sections[selected]);
      for(const [id,entry] of Object.entries(state.entries))if(entry.section===selected||savedState.entries[id]?.section===selected)payload.entries[id]=structuredClone(entry);
    }
    try{
      const local=structuredClone(state),data=await request('PUT',payload);
      state=structuredClone(data.config);savedState=structuredClone(data.config);
      for(const key of ['entries','sections'])for(const [id,value] of Object.entries(local[key]))if(JSON.stringify(value)!==JSON.stringify(payload[key][id]))state[key][id]=value;
      changed=JSON.stringify(state)!==JSON.stringify(savedState);render();
      message('Zapisano '+(selected==='all'?'wszystkie sekcje':titles[selected])+'.'+(changed?' W pozostałych sekcjach są niezapisane zmiany.':' Tablica pobierze zmiany przy najbliższym odświeżeniu.'));
      savePhase='saved';updateSaveButton();
      setTimeout(()=>{savePhase='';updateSaveButton()},1800);
    }catch(e){savePhase='';updateSaveButton();message('Nie zapisano: '+e.message)}
  };
  window.addEventListener('beforeunload',e=>{if(changed){e.preventDefault();e.returnValue=''}});
})();
