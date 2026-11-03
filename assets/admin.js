const $ = id => document.getElementById(id);
let tickets = [];
const statuses = ['En proceso','En revisión','Detenido','Terminado'];
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function loadTickets() {
  const { data, error } = await db.from('tickets').select('*').order('ticket_number', { ascending: false });
  if (error) throw error; tickets = data || []; renderAll();
}
function row(t, editable=false) {
  const image = t.imagen_creacion_url ? `<a href="${esc(t.imagen_creacion_url)}" target="_blank" rel="noopener">Imagen inicial</a>` : '';
  if (!editable) return `<div class="row"><b>#${t.ticket_number}</b><span>${esc(t.problema)}<small> · ${esc(t.nombre)} · ${esc(t.propiedad)}</small></span><span>${esc(t.estatus)}</span></div>`;
  return `<div class="row ticket-edit" data-id="${t.id}">
    <b>#${t.ticket_number}</b><span><strong>${esc(t.problema)}</strong><small> · ${esc(t.nombre)} · ${esc(t.propiedad)} · ${esc(t.departamento)}</small><br>${esc(t.description)} ${image}</span>
    <label>Estatus<select class="status">${statuses.map(s=>`<option ${s===t.estatus?'selected':''}>${s}</option>`).join('')}</select></label>
    <label>Prioridad<select class="priority">${['Baja','Media','Alta','Crítica'].map(p=>`<option ${p===t.prioridad?'selected':''}>${p}</option>`).join('')}</select></label>
    <label>Responsable<input class="assignee" value="${esc(t.responsable)}"></label>
    <label>Solución<textarea class="solution">${esc(t.solucion)}</textarea></label>
    <label>Imagen de cierre<input class="closingImage" type="file" accept="image/*"></label>
    <button class="saveTicket">Guardar</button></div>`;
}
function renderAll() {
  $('kpis').innerHTML = [['Total',tickets.length],...statuses.map(s=>[s,tickets.filter(t=>t.estatus===s).length])].map(x=>`<div class="kpi"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('');
  $('dashboardTickets').innerHTML = tickets.slice(0,10).map(t=>row(t)).join('') || '<p>No hay tickets.</p>';
  $('openTickets').innerHTML = tickets.filter(t=>t.estatus!=='Terminado').map(t=>row(t,true)).join('') || '<p>No hay tickets abiertos.</p>';
  $('closedTickets').innerHTML = tickets.filter(t=>t.estatus==='Terminado').map(t=>row(t,true)).join('') || '<p>No hay tickets terminados.</p>';
  document.querySelectorAll('.saveTicket').forEach(b=>b.onclick=saveTicket);
}
async function uploadClosing(file, ticketNumber) {
  if (!file) return null; if (file.size > 8*1024*1024) throw new Error('La imagen supera 8 MB');
  const path=`${ticketNumber}/cierre-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const { error }=await db.storage.from('ticket-images').upload(path,file,{upsert:false}); if(error) throw error;
  return db.storage.from('ticket-images').getPublicUrl(path).data.publicUrl;
}
async function saveTicket(event) {
  const card=event.target.closest('[data-id]'), id=Number(card.dataset.id), current=tickets.find(t=>t.id===id);
  event.target.disabled=true; $('adminMessage').textContent='Guardando...';
  try {
    const status=card.querySelector('.status').value;
    const changes={estatus:status, prioridad:card.querySelector('.priority').value, responsable:card.querySelector('.assignee').value.trim()||null, solucion:card.querySelector('.solution').value.trim()||null, updated_at:new Date().toISOString(), terminado_en:status==='Terminado'?(current.terminado_en||new Date().toISOString()):null};
    const file=card.querySelector('.closingImage').files[0]; if(file) changes.imagen_terminado_url=await uploadClosing(file,current.ticket_number);
    const {error}=await db.from('tickets').update(changes).eq('id',id); if(error) throw error;
    $('adminMessage').textContent='Ticket actualizado.'; await loadTickets();
  } catch(e) { console.error(e); $('adminMessage').textContent='Error: '+e.message; } finally { event.target.disabled=false; }
}
function dl(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
$('csv').onclick=()=>{const rows=[['Ticket','Creación','Solicitante','Propiedad','Departamento','Equipo','Problema','Descripción','Estatus','Prioridad','Responsable','Solución'],...tickets.map(t=>[t.ticket_number,t.created_at,t.nombre,t.propiedad,t.departamento,t.asset,t.problema,t.description,t.estatus,t.prioridad,t.responsable,t.solucion])];dl('tickets.csv','\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n'),'text/csv')};
$('backup').onclick=()=>dl('respaldo.json',JSON.stringify(tickets,null,2),'application/json');
function changeView(){const key=(location.hash||'#dashboard').slice(1);const map={dashboard:'Dashboard',admin:'Administración',closed:'Terminados',reports:'Reportes',config:'Configuración'};document.querySelectorAll('.view').forEach(v=>v.hidden=true);$(key+'View').hidden=false;$('pageTitle').textContent=map[key]||'Dashboard'}
window.addEventListener('hashchange',changeView); changeView();
loadTickets().catch(e=>{$('adminMessage').textContent='No se pudieron cargar los tickets: '+e.message;console.error(e)});
// Actualización automática cuando cambia la tabla.
db.channel('tickets-live').on('postgres_changes',{event:'*',schema:'public',table:'tickets'},()=>loadTickets()).subscribe();