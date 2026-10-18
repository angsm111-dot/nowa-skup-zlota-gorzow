(() => {
  let pending=null;
  const dialog=document.createElement('dialog');dialog.className='admin-reauth';dialog.setAttribute('aria-labelledby','reauth-title');
  dialog.innerHTML='<form id="reauth-form"><h2 id="reauth-title">Zaloguj się ponownie</h2><p>Serwer wymaga ponownego potwierdzenia logowania. Niezapisane zmiany pozostają w panelu.</p><label for="reauth-user">Login</label><input id="reauth-user" autocomplete="username" required><label for="reauth-pass">Hasło</label><input id="reauth-pass" type="password" autocomplete="current-password" required><p id="reauth-error" role="alert"></p><div class="reauth-actions"><button type="button" id="reauth-cancel">Anuluj</button><button type="submit" id="reauth-submit">Zaloguj i kontynuuj</button></div></form>';
  document.body.append(dialog);
  const find=id=>dialog.querySelector('#'+id);
  function reauthenticate(){
    if(pending)return pending;
    pending=new Promise((resolve,reject)=>{
      let settled=false;
      const finish=error=>{if(settled)return;settled=true;find('reauth-pass').value='';dialog.close();pending=null;error?reject(error):resolve()};
      find('reauth-user').value=document.querySelector('#username')?.value||'';
      find('reauth-pass').value='';find('reauth-error').textContent='';find('reauth-submit').disabled=false;
      find('reauth-cancel').onclick=()=>finish(Error('Logowanie anulowane. Niezapisane zmiany zachowano.'));
      dialog.oncancel=event=>{event.preventDefault();finish(Error('Logowanie anulowane. Niezapisane zmiany zachowano.'))};
      find('reauth-form').onsubmit=async event=>{
        event.preventDefault();const button=find('reauth-submit');button.disabled=true;find('reauth-error').textContent='Sprawdzanie…';
        try{
          const response=await fetch('/api/admin/login',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({username:find('reauth-user').value,password:find('reauth-pass').value})});
          const data=await response.json();if(!response.ok)throw Error(data.error||'Nie udało się zalogować');
          finish();
        }catch(error){if(!settled)find('reauth-error').textContent=error.message}finally{button.disabled=false}
      };
      dialog.showModal();(find('reauth-user').value?find('reauth-pass'):find('reauth-user')).focus();
    });
    return pending;
  }
  async function fetchAuthenticated(path,options){
    let response=await fetch(path,options);
    if(response.status===401&&path!=='/api/admin/login'&&document.querySelector('#panel')?.hidden===false){
      await reauthenticate();response=await fetch(path,options);
    }
    return response;
  }
  window.AdminSession={fetchAuthenticated};
})();
