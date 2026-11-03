const $ = id => document.getElementById(id);
const PROPERTIES = ['CUNQR - Hilton','CUNWA - Waldorf','Cluster'];
const DEPARTMENTS = ['F&B','Ingeniería','Seguridad','Finanzas','Compras','Almacén','IT','Cocina','RH','Ventas','Grupos','Marketing','Steward','Recepción-Concierge-PBX','HouseKeeping-Lavandería','Administrativo','Reservaciones','Entretenimiento'];
$('property').innerHTML = PROPERTIES.map(x => `<option>${x}</option>`).join('');
$('department').innerHTML = DEPARTMENTS.map(x => `<option>${x}</option>`).join('');

async function compressedImage() {
  const file = $('openingImage').files[0];
  if (!file) return null;
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen supera 8 MB');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = dataUrl;
  });
  const scale = Math.min(1, 1600 / image.width, 1600 / image.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.72));
}

$('openingImage').onchange = async () => {
  try {
    const blob = await compressedImage();
    $('preview').innerHTML = blob ? `<img src="${URL.createObjectURL(blob)}" alt="Vista previa">` : '';
  } catch (e) { alert(e.message); $('openingImage').value = ''; $('preview').innerHTML = ''; }
};

async function uploadImage(blob, ticketNumber) {
  if (!blob) return null;
  const path = `${ticketNumber}/apertura-${Date.now()}.jpg`;
  const { error } = await db.storage.from('ticket-images').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return db.storage.from('ticket-images').getPublicUrl(path).data.publicUrl;
}

$('ticketForm').onsubmit = async event => {
  event.preventDefault();
  const button = $('submitButton'); const message = $('formMessage');
  button.disabled = true; message.textContent = 'Guardando ticket...';
  try {
    const { data: ticket, error } = await db.from('tickets').insert({
      nombre: $('requester').value.trim(), propiedad: $('property').value,
      departamento: $('department').value, asset: $('asset').value.trim() || null,
      problema: $('problem').value.trim(), description: $('description').value.trim(),
      estatus: 'En proceso', responsable: 'Mauricio Villalobos', prioridad: 'Media'
    }).select().single();
    if (error) throw error;
    try {
      const imageUrl = await uploadImage(await compressedImage(), ticket.ticket_number);
      if (imageUrl) {
        const { error: updateError } = await db.from('tickets').update({ imagen_creacion_url: imageUrl }).eq('id', ticket.id);
        if (updateError) throw updateError;
      }
    } catch (imageError) {
      console.error(imageError); message.textContent = 'Ticket creado; la imagen no pudo subirse.';
    }
    $('folio').textContent = '#' + ticket.ticket_number;
    $('success').showModal(); event.target.reset(); $('preview').innerHTML = '';
    if (!message.textContent.includes('imagen')) message.textContent = '';
  } catch (error) {
    console.error(error); message.textContent = 'No se pudo crear el ticket: ' + error.message;
  } finally { button.disabled = false; }
};