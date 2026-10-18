(() => {
  const titles={bullion:'Złote monety bulionowe',historical:'Złote monety historyczne',other:'Złote monety pozostałe',goldBars:'Złote sztabki LBMA',scrap:'Złom złota',silverCoins:'Srebrne monety',silverBars:'Srebrne sztabki'};
  const panel=document.querySelector('#panel'), container=document.createElement('section');
  container.className='board-admin';
  container.innerHTML='<h2>Tablica w lokalu</h2><p>Osobne ustawienia tablicy. Ceny skupu na dotychczasowych stronach pozostają bez zmian. Sprzedaż i dostawa = wartość czystego kruszcu według spot + narzut.</p><button type="button" id="board-load">Otwórz ustawienia tablicy</button><div id="board-editor" hidden><label>Termin dostawy (dni) <input id="board-days" type="number" min="1" max="365" required></label><p>Wspólna numeracja trzech sekcji złotych monet. Wagi jednej monety mają wspólny numer i nazwę. Pozostałe sekcje mają własną numerację.</p><label>Sekcja <select id="board-section"></select></label><label>Szukaj produktu <input id="board-search" type="search" placeholder="np. Krugerrand 1 oz"></label><div id="board-section-options"></div><div class="board-table-wrap"><table><thead><tr><th>Produkt w katalogu</th><th>Na tablicy</th><th>Kategoria</th><th>Numer</th><th>Nazwa na tablicy</th><th>Grupa monety / waga</th><th>Skup</th><th>Sprzedaż / narzut</th><th>Dostawa / narzut</th></tr></thead><tbody id="board-rows"></tbody></table></div></div><p id="board-message" role="status" aria-live="polite"></p>';
  panel.querySelector('#tabs').before(container);
  const saveButton=document.createElement('button');saveButton.type='button';saveButton.id='board-save';saveButton.hidden=true;
  const footerMessage=document.createElement('span');footerMessage.id='board-save-status';footerMessage.setAttribute('role','status');footerMessage.setAttribute('aria-live','polite');footerMessage.hidden=true;
  const boardActions=document.createElement('div');boardActions.id='board-footer-actions';boardActions.append(saveButton,footerMessage);
  panel.querySelector(':scope > footer').insertBefore(boardActions,document.querySelector('#save'));
  let state=null, savedState=null, products={}, selected='bullion', changed=false;
  const allOption=document.createElement('option');allOption.value='all';allOption.textContent='Wszystkie produkty';container.querySelector('#board-section').append(allOption);
  const find=id=>container.querySelector('#'+id);
  for(const [key,title] of Object.entries(titles)){const option=document.createElement('option');option.value=key;option.textContent=title;find('board-section').append(option)}
  const message=text=>{find('board-message').textContent=text;footerMessage.textContent=text};
  async function request(method,body){const r=await fetch('/api/admin/board',{method,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'Błąd serwera');return data}
  function input(value,type,change,label){const e=document.createElement('input');e.type=type;e.setAttribute('aria-label',label);if(type==='checkbox')e.checked=value;else e.value=value;e.addEventListener('change',()=>{if(!e.checkValidity()){e.reportValidity();return}change(type==='checkbox'?e.checked:type==='number'?Number(e.value):e.value.trim());changed=true;message('Masz niezapisane ustawienia tablicy.');});return e}
  function check(label,value,callback){const e=document.createElement('label');e.append(input(value,'checkbox',callback,label),document.createTextNode(' '+label));return e}
  function render(){
    saveButton.textContent=selected==='all'?'Zapisz tablicę — wszystkie sekcje':'Zapisz tablicę — '+titles[selected].toLocaleLowerCase('pl-PL');
    find('board-days').value=state.deliveryDays;
    const opts=find('board-section-options');opts.replaceChildren();
    if(selected!=='all')for(const [key,label] of Object.entries({visible:'Pokaż sekcję',buy:'Pokaż skup',sell:'Pokaż sprzedaż',...(['bullion','goldBars'].includes(selected)?{delivery:'Przyjmuj zamówienia z dostawą'}:{})}))opts.append(check(label,state.sections[selected][key],v=>state.sections[selected][key]=v));
    const body=find('board-rows');body.replaceChildren();
    const query=find('board-search').value.trim().toLocaleLowerCase('pl-PL');
    Object.entries(state.entries).filter(([id,v])=>(query||selected==='all'||v.section===selected)&&(!query||(products[id]?.name+' '+v.label+' '+v.weight).toLocaleLowerCase('pl-PL').includes(query))).sort((a,b)=>a[1].number-b[1].number).forEach(([id,entry])=>{
      const tr=document.createElement('tr');
      const cell=(...children)=>{const td=document.createElement('td');td.append(...children);tr.append(td);return td};
      const productCell=cell(document.createTextNode(products[id]?.name||entry.label));if(products[id]?.active===false){const note=document.createElement('small');note.textContent='Ukryty na pozostałych stronach. Widoczność na tablicy ustawiasz osobno.';productCell.append(note)}
      cell(check('Pokaż',entry.visible,v=>entry.visible=v));
      const select=document.createElement('select');select.setAttribute('aria-label','Kategoria '+entry.label);
      const categories=['bullion','historical','other'].includes(entry.section)?['bullion','historical','other']:[entry.section];
      categories.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=titles[k];o.selected=k===entry.section;select.append(o)});
      select.onchange=()=>{const family=entry.family;for(const item of Object.values(state.entries))if(item.family===family&&categories.includes(item.section))item.section=select.value;changed=true;message('Zmieniono kategorię. Zapisz ustawienia.');render()};cell(select);
      const sync=(key,value)=>{const oldFamily=entry.family;entry[key]=value;if(categories.length>1&&['number','label'].includes(key))for(const other of Object.values(state.entries))if(other.family===oldFamily)other[key]=value;render()};
      const n=input(entry.number,'number',v=>sync('number',v),'Numer gablotowy');n.min=1;n.max=9999;n.required=true;cell(n);
      const name=input(entry.label,'text',v=>sync('label',v),'Nazwa na tablicy');name.required=true;name.maxLength=120;cell(name);
      const family=document.createElement('select');family.setAttribute('aria-label','Grupa monety');
      const choices=new Map(Object.values(state.entries).filter(e=>['bullion','historical','other'].includes(e.section)).map(e=>[e.family,e]));
      for(const [key,item] of choices){const o=document.createElement('option');o.value=key;o.textContent=item.number+'. '+item.label;o.selected=key===entry.family;family.append(o)}
      family.onchange=()=>{const target=choices.get(family.value);entry.family=family.value;entry.number=target.number;entry.label=target.label;entry.section=target.section;changed=true;render();message('Przypisano wagę do grupy monety. Zapisz ustawienia.')};
      const weight=input(entry.weight,'text',v=>entry.weight=v,'Waga wyświetlana');weight.maxLength=120;
      if(categories.length>1)cell(family,weight);else cell(document.createTextNode('—'));
      cell(check('Skup',entry.buy,v=>entry.buy=v));
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
  find('board-load').onclick=async()=>{try{message('Pobieranie…');const data=await request('GET');state=data.config;savedState=structuredClone(data.config);changed=false;saveButton.hidden=false;footerMessage.hidden=false;products=Object.fromEntries(Object.values(data.products).flat().map(p=>[p.id,p]));window.boardMetalSpot=data.metals.gold.spot;find('board-editor').hidden=false;render();message('Ustawienia pobrane. Wyłączenie ceny pokazuje kreskę, bez usuwania produktu.')}catch(e){message(e.message)}};
  find('board-search').oninput=()=>render();
  find('board-section').onchange=e=>{selected=e.target.value;render()};
  find('board-days').onchange=e=>{if(e.target.checkValidity()){state.deliveryDays=Number(e.target.value);changed=true;message('Zapisz nowy termin dostawy.')}else e.target.reportValidity()};
  saveButton.onclick=async()=>{
    if(!state||![...container.querySelectorAll('input')].every(e=>e.reportValidity()))return;
    saveButton.disabled=true;
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
    }catch(e){message('Nie zapisano: '+e.message)}finally{saveButton.disabled=false}
  };
  window.addEventListener('beforeunload',e=>{if(changed){e.preventDefault();e.returnValue=''}});
})();
