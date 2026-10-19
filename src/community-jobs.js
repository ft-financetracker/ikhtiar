/* IKHTIAR v0.9.4 / M8-A+B — Community submissions, revision and admin moderation.
 * Publication happens ONLY through ik_job_review after server-side super_admin check.
 * The user's browser has no INSERT/UPDATE privilege on the public jobs directory.
 */
export function createCommunityJobsModule({state,render,toast,icon,escapeHTML,isAdmin}){
 const E=escapeHTML;
 const own=()=>state.session?.user?.id;
 const ready=()=>!!own()&&!state.demo&&!!state.supabase;
 const STATUSES={pending:'Menunggu pemeriksaan',reviewing:'Sedang diperiksa',needs_revision:'Perlu revisi',rejected:'Ditolak',published:'Tayang',taken_down:'Diturunkan'};
 const RELATION=[['sharing','Membagikan dari sumber resmi'],['hr','HR / perwakilan perusahaan'],['owner','Pemilik usaha'],['agency','Agensi / pihak perekrut']];
 const MODES=[['unspecified','Belum ditentukan'],['onsite','On-site'],['hybrid','Hybrid'],['remote','Remote']];
 const TYPES=[['unspecified','Belum ditentukan'],['fulltime','Full-time'],['parttime','Part-time'],['contract','Kontrak'],['internship','Magang'],['freelance','Freelance']];
 const ACTIONS=[['review','Mulai pemeriksaan'],['revision','Minta revisi'],['reject','Tolak pengajuan'],['publish','Setujui & tayangkan'],['takedown','Turunkan lowongan']];
 const safeUrl=v=>{try{const u=new URL(String(v||'').trim());return u.protocol==='https:'&&u.hostname?u.href:'';}catch{return ''}};
 const time=v=>{const d=new Date(v||'');return Number.isNaN(+d)?'—':new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric'}).format(d)};
 const options=(values,value)=>values.map(([k,v])=>`<option value="${E(k)}" ${k===value?'selected':''}>${E(v)}</option>`).join('');
 const blank=()=>({company_name:'',position_name:'',location_name:'',work_mode:'unspecified',employment_type:'unspecified',details:'',source_name:'',source_url:'',closing_date:'',submitter_relation:'sharing',verification_note:''});
 let mine=[],mineLoaded=false,mineLoading=false,mineError='',mineRequest=0,selectedId='',events=[],eventLoadedId='';
 let form=null,formDirty=false,formBusy=false,formError='';
 let admin=[],adminLoaded=false,adminLoading=false,adminError='',adminRequest=0,adminFilter='waiting',adminSelected='',adminAction='review',adminReason='',adminBusy=false,adminDirty=false;
 const canRenderMine=()=>state.view==='jobs';
 const canRenderAdmin=()=>state.view==='admin-settings'&&state.adminSection==='moderation'&&isAdmin();
 function clear(){mineRequest++;adminRequest++;mine=[];mineLoaded=false;mineLoading=false;mineError='';selectedId='';events=[];eventLoadedId='';form=null;formDirty=false;formBusy=false;formError='';admin=[];adminLoaded=false;adminLoading=false;adminError='';adminSelected='';adminReason='';adminAction='review';adminDirty=false;adminBusy=false;}
 function hasUnsaved(){return (!!form&&formDirty)||adminDirty;}
 function discard(){form=null;formDirty=false;formError='';adminReason='';adminDirty=false;}
 async function loadMine(force=false){if(!ready()||mineLoading||(mineLoaded&&!force))return;const user=own(),token=++mineRequest;mineLoading=true;mineError='';
  try{const {data,error}=await state.supabase.from('ik_job_submissions').select('id,user_id,company_name,position_name,location_name,work_mode,employment_type,details,source_name,source_url,closing_date,submitter_relation,verification_note,status,admin_note,reviewed_at,published_listing_id,created_at,updated_at').eq('user_id',user).order('updated_at',{ascending:false}).limit(100);if(error)throw error;if(token!==mineRequest||own()!==user)return;mine=data||[];mineLoaded=true;}
  catch(e){if(token===mineRequest&&own()===user){console.warn('IKHTIAR community owner:',e?.message||e);mineError='Pengajuan belum dapat dimuat. Pastikan SQL M8 sudah dijalankan.';}}
  finally{if(token===mineRequest&&own()===user){mineLoading=false;if(canRenderMine()&&!form)render();}}
 }
 async function loadEvents(id){if(!ready()||!mine.some(x=>x.id===id))return;const user=own();selectedId=id;eventLoadedId='';events=[];
  try{const {data,error}=await state.supabase.from('ik_job_submission_events').select('event_type,from_status,to_status,note,created_at').eq('submission_id',id).order('created_at',{ascending:false}).limit(30);if(error)throw error;if(user!==own()||selectedId!==id)return;events=data||[];eventLoadedId=id;}
  catch(e){console.warn('IKHTIAR history:',e?.message||e);}
  finally{if(user===own()&&canRenderMine())render();}
 }
 async function loadAdmin(force=false){if(!ready()||!isAdmin()||adminLoading||(adminLoaded&&!force))return;const user=own(),token=++adminRequest;adminLoading=true;adminError='';
  try{const {data,error}=await state.supabase.from('ik_job_submissions').select('id,user_id,company_name,position_name,location_name,work_mode,employment_type,details,source_name,source_url,closing_date,submitter_relation,verification_note,status,admin_note,reviewed_at,published_listing_id,created_at,updated_at').order('updated_at',{ascending:false}).limit(200);if(error)throw error;if(token!==adminRequest||own()!==user||!isAdmin())return;admin=data||[];adminLoaded=true;}
  catch(e){if(token===adminRequest&&own()===user){console.warn('IKHTIAR community admin:',e?.message||e);adminError='Antrean moderasi belum dapat dimuat. Periksa SQL dan hak Super Admin.';}}
  finally{if(token===adminRequest&&own()===user){adminLoading=false;if(canRenderAdmin()&&!adminBusy)render();}}
 }
 function badge(status){return `<span class="ik-community-status s-${E(status||'pending')}">${E(STATUSES[status]||status)}</span>`;}
 function promo(){return `<div class="ik-community-promo"><span>${icon('sparkles')} Promosi lowongan</span><span class="ik-community-soon">Coming Soon</span><small>Penempatan berbayar belum tersedia. Membayar tidak akan melewati moderasi.</small></div>`;}
 function mineCard(j){const canEdit=['pending','needs_revision'].includes(j.status);const open=selectedId===j.id;
  return `<article class="ik-community-item"><div class="ik-community-item-top"><span class="ik-community-mark">${E(j.company_name.charAt(0).toUpperCase())}</span><div class="ik-community-item-name"><strong>${E(j.position_name)}</strong><small>${E(j.company_name)} · ${time(j.created_at)}</small></div>${badge(j.status)}</div>
  ${j.admin_note?`<p class="ik-community-admin-note">${icon('info')} ${E(j.admin_note)}</p>`:''}
  <div class="ik-community-row-actions"><button type="button" class="ik-community-link" data-action="community-history" data-id="${E(j.id)}">${open?'Tutup':'Riwayat'} ${icon('chevron-down')}</button>${canEdit?`<button type="button" class="ik-community-link" data-action="community-edit" data-id="${E(j.id)}">${icon('file')} ${j.status==='needs_revision'?'Kirim perbaikan':'Edit pengajuan'}</button>`:''}${safeUrl(j.source_url)?`<a href="${E(safeUrl(j.source_url))}" target="_blank" rel="noopener noreferrer" class="ik-community-link">Sumber ${icon('arrow-right')}</a>`:''}</div>
  ${open?`<div class="ik-community-timeline"><strong>Riwayat keputusan</strong>${eventLoadedId!==j.id?'<p>Memuat riwayat...</p>':events.length?events.map(e=>`<div><span>${time(e.created_at)} · ${E(STATUSES[e.to_status]||e.to_status)}</span>${e.note?`<p>${E(e.note)}</p>`:''}</div>`).join(''):'<p>Belum ada aktivitas tambahan.</p>'}</div>`:''}</article>`;
 }
 function field(name,key,value,{type='text',required=false,wide=false,max=120,placeholder=''}={}){return `<label class="ik-community-field ${wide?'wide':''}"><span>${name}${required?' <b>*</b>':''}</span><input name="${key}" type="${type}" value="${E(value??'')}" maxlength="${max}" ${required?'required':''} placeholder="${E(placeholder)}"></label>`;}
 function selectField(name,key,value,values,wide=false){return `<label class="ik-community-field ${wide?'wide':''}"><span>${name}</span><select name="${key}">${options(values,value)}</select></label>`;}
 function editor(){const d=form||blank();return `<section class="ik-community-editor" aria-labelledby="ik-community-editor-heading"><div class="ik-community-editor-heading"><div><span class="ik-community-eyebrow">AJUKAN LOWONGAN</span><h2 id="ik-community-editor-heading">${d.id?'Perbaiki pengajuan':'Bagikan peluang kerja'}</h2><p>Cukup isi informasi yang bisa diperiksa. Lowongan tidak langsung tayang.</p></div><button type="button" class="ik-community-close" data-action="community-close" aria-label="Tutup formulir">×</button></div>
  <form id="ik-community-form" class="ik-community-form"><div class="ik-community-formgrid">
   ${field('Nama perusahaan','company_name',d.company_name,{required:true,placeholder:'Contoh: PT Nusantara'})}
   ${field('Posisi tersedia','position_name',d.position_name,{required:true,placeholder:'Contoh: Finance Staff'})}
   ${selectField('Kamu mengajukan sebagai','submitter_relation',d.submitter_relation,RELATION,true)}
   ${field('Tautan sumber resmi (HTTPS)','source_url',d.source_url,{required:true,type:'url',wide:true,max:600,placeholder:'https://perusahaan.com/karier'})}
   <label class="ik-community-field wide"><span>Detail pekerjaan <b>*</b></span><textarea name="details" rows="4" minlength="40" maxlength="2500" required placeholder="Tuliskan tugas, syarat, dan cara melamar sesuai sumber. Minimal 40 karakter.">${E(d.details)}</textarea><small>Jangan meminta OTP, password, deposit, atau biaya rekrutmen.</small></label>
  </div>
  <details class="ik-community-extra"><summary>Detail tambahan <span>Opsional</span>${icon('chevron-down')}</summary><div class="ik-community-formgrid">${field('Lokasi','location_name',d.location_name,{placeholder:'Jakarta / Indonesia'})}${field('Nama situs sumber','source_name',d.source_name,{max:100,placeholder:'Karier resmi perusahaan'})}${selectField('Pola kerja','work_mode',d.work_mode,MODES)}${selectField('Jenis pekerjaan','employment_type',d.employment_type,TYPES)}${field('Batas lamaran','closing_date',d.closing_date,{type:'date'})}<label class="ik-community-field wide"><span>Bukti / keterangan sumber</span><textarea name="verification_note" rows="2" maxlength="700" placeholder="Dari mana informasi diperoleh dan bagaimana kami bisa memeriksanya?">${E(d.verification_note)}</textarea></label></div></details>
  ${formError?`<p class="ik-community-error" role="alert">${E(formError)}</p>`:''}
  <p class="ik-community-consent">${icon('shield')} Semua pengajuan masuk <strong>Pending</strong>. Admin berhak meminta revisi, menolak, atau menurunkan lowongan. Pengajuan tidak membuktikan bahwa kamu mewakili perusahaan.</p>
  <div class="ik-community-form-actions"><button type="button" class="btn btn-outline" data-action="community-close">Batal</button><button type="submit" class="btn btn-primary" ${formBusy?'disabled':''}>${formBusy?'Mengirim...':d.id?'Kirim ulang untuk diperiksa':'Ajukan Lowongan'}</button></div></form></section>`;}
 function page(){const waiting=mine.filter(x=>['pending','reviewing','needs_revision'].includes(x.status)).length;
  return `<div class="ik-community-page"><div class="ik-community-head"><div><h2>Lowongan Saya</h2><p>Ajukan lowongan dan pantau status pemeriksaannya tanpa perlu akun perusahaan.</p></div>${!form?`<button class="btn btn-primary" type="button" data-action="community-new">${icon('plus')} Pasang Lowongan</button>`:''}</div>
  <div class="ik-community-summary"><div><strong>${mine.length}</strong><small>Total pengajuan</small></div><div><strong>${waiting}</strong><small>Menunggu / diperiksa</small></div><div><strong>${mine.filter(x=>x.status==='published').length}</strong><small>Sudah tayang</small></div></div>
  ${mineError?`<div class="ik-community-error" role="alert">${E(mineError)} <button type="button" data-action="community-refresh">Coba lagi</button></div>`:''}
  ${form?editor():mineLoading&&!mineLoaded?'<div class="ik-community-empty">Memuat pengajuan...</div>':mine.length?`<div class="ik-community-list">${mine.map(mineCard).join('')}</div>`:`<div class="ik-community-empty">${icon('briefcase')}<strong>Belum ada pengajuan</strong><p>Kamu bisa membagikan lowongan dari sumber yang sah. Admin akan memeriksanya sebelum tayang.</p><button class="btn btn-primary" type="button" data-action="community-new">Pasang Lowongan Pertama</button></div>`}
  ${promo()}<div class="ik-community-trust">${icon('shield')} <span>Lowongan tidak otomatis terbit. IKHTIAR tidak menjamin setiap rekrutmen bebas risiko. Selalu cek sumber aslinya.</span></div></div>`;}
 function adminCard(j){const selected=adminSelected===j.id;return `<article class="ik-community-admin-item ${selected?'selected':''}"><div class="ik-community-item-top"><span class="ik-community-mark">${E(j.company_name.charAt(0).toUpperCase())}</span><div class="ik-community-item-name"><strong>${E(j.position_name)}</strong><small>${E(j.company_name)} · ${time(j.created_at)}</small></div>${badge(j.status)}</div><div class="ik-community-row-actions"><button type="button" data-action="community-admin-select" data-id="${E(j.id)}" class="ik-community-link">${selected?'Tutup detail':'Periksa pengajuan'} ${icon('chevron-down')}</button></div>
 ${selected?`<div class="ik-community-review"><div class="ik-community-facts"><div><span>Pengaju</span><strong>${E(RELATION.find(x=>x[0]===j.submitter_relation)?.[1]||'Pengguna')}</strong></div><div><span>Pola kerja</span><strong>${E(j.work_mode)}</strong></div><div><span>Sumber</span><a href="${E(safeUrl(j.source_url))}" target="_blank" rel="noopener noreferrer">Buka tautan resmi ${icon('arrow-right')}</a></div></div><p>${E(j.details)}</p>${j.verification_note?`<div class="ik-community-verification"><strong>Keterangan pengaju</strong><p>${E(j.verification_note)}</p></div>`:''}${j.admin_note?`<div class="ik-community-verification"><strong>Catatan admin sebelumnya</strong><p>${E(j.admin_note)}</p></div>`:''}
 ${['rejected','taken_down'].includes(j.status)?'<p class="ik-community-locked">Pengajuan selesai. Jika perlu lowongan baru, pengguna harus mengirim pengajuan kembali.</p>':`<form id="ik-community-review-form"><input type="hidden" name="id" value="${E(j.id)}"><label class="ik-community-field"><span>Tindakan moderasi</span><select name="action">${options(j.status==='published'?ACTIONS.filter(x=>x[0]==='takedown'):j.status==='needs_revision'?ACTIONS.filter(x=>x[0]==='reject'):ACTIONS.filter(x=>x[0]!=='takedown'),adminAction)}</select></label><label class="ik-community-field"><span>Hasil pemeriksaan / alasan</span><textarea name="reason" rows="3" maxlength="1000" placeholder="Sebutkan sumber yang diperiksa atau alasan revisi/penolakan.">${E(adminReason)}</textarea></label><div class="ik-community-review-actions"><button type="submit" class="btn btn-primary" ${adminBusy?'disabled':''}>${adminBusy?'Memproses...':'Konfirmasi Keputusan'}</button></div><small>Publikasi perlu catatan verifikasi ≥15 karakter. Revisi, penolakan, dan takedown perlu alasan ≥10 karakter. Semua tindakan tercatat.</small></form>`}</div>`:''}</article>`;}
 function adminPage(){if(!isAdmin())return '<p>Hanya Super Admin dapat melihat moderasi.</p>';
  const items=admin.filter(x=>adminFilter==='all'||(adminFilter==='waiting'?['pending','reviewing','needs_revision'].includes(x.status):x.status===adminFilter));
  return `<div class="ik-community-admin"><div class="ik-community-head"><div><h2>Moderasi Lowongan</h2><p>Setiap pengajuan diperiksa terlebih dahulu. Pembayaran tidak dapat membeli persetujuan.</p></div><button type="button" class="ik-community-refresh" data-action="community-admin-refresh" ${adminLoading?'disabled':''}>${icon('refresh-cw')} Segarkan</button></div>
  <div class="ik-community-admin-stats"><div><strong>${admin.filter(x=>['pending','reviewing','needs_revision'].includes(x.status)).length}</strong><span>Menunggu</span></div><div><strong>${admin.filter(x=>x.status==='published').length}</strong><span>Tayang</span></div><div><strong>${admin.length}</strong><span>Total (maks. 200)</span></div></div>
  <div class="ik-community-filters" role="group" aria-label="Filter status pengajuan">${[['waiting','Menunggu'],['published','Tayang'],['rejected','Ditolak'],['taken_down','Diturunkan'],['all','Semua']].map(([k,v])=>`<button type="button" data-action="community-admin-filter" data-value="${k}" class="${adminFilter===k?'active':''}" aria-pressed="${adminFilter===k}">${v}</button>`).join('')}</div>
  ${adminError?`<p class="ik-community-error" role="alert">${E(adminError)}</p>`:''}
  ${adminLoading&&!adminLoaded?'<p>Memuat antrean...</p>':items.length?`<div class="ik-community-admin-list">${items.map(adminCard).join('')}</div>`:'<div class="ik-community-empty"><strong>Tidak ada pengajuan pada filter ini.</strong><p>Permintaan baru akan muncul di sini setelah dikirim pengguna.</p></div>'}
  ${promo()}</div>`;
 }
 function onInput(el){if(el.closest?.('#ik-community-form')){if(form){form[el.name]=el.value;formDirty=true;}return true;}if(el.closest?.('#ik-community-review-form')){if(el.name==='action')adminAction=el.value;if(el.name==='reason')adminReason=el.value;adminDirty=true;return true;}return false;}
 async function submit(formElement){if(!ready()||formBusy)return true;const f=new FormData(formElement);const payload={};for(const key of ['company_name','position_name','location_name','work_mode','employment_type','details','source_name','source_url','closing_date','submitter_relation','verification_note'])payload[key]=String(f.get(key)||'').trim();
  const url=safeUrl(payload.source_url);
  if(payload.company_name.length<2||payload.position_name.length<2||!url||payload.details.length<40){formError='Lengkapi perusahaan, posisi, detail minimal 40 karakter, dan tautan HTTPS yang sah.';render();return true;}
  payload.source_url=url;
  formBusy=true;formError='';const user=own();try{const {error}=await state.supabase.rpc('ik_job_submit',{p_data:payload,p_id:form?.id||null});if(error)throw error;if(user!==own())return true;form=null;formDirty=false;mineLoaded=false;selectedId='';toast('Pengajuan terkirim. Status Pending hingga diperiksa admin.');await loadMine(true);}
  catch(err){console.warn('IKHTIAR community submit:',err?.message||err);formError=err?.message||'Pengajuan belum berhasil dikirim.';}
  finally{formBusy=false;if(user===own()&&canRenderMine())render();}return true;
 }
 async function review(formElement){if(!ready()||!isAdmin()||adminBusy)return true;const f=new FormData(formElement),id=String(f.get('id')||''),action=String(f.get('action')||''),reason=String(f.get('reason')||'').trim();
  if(action==='publish'&&reason.length<15){adminError='Tuliskan minimal 15 karakter bukti pengecekan sumber sebelum tayang.';render();return true;}
  if(['revision','reject','takedown'].includes(action)&&reason.length<10){adminError='Tambahkan alasan minimal 10 karakter.';render();return true;}
  if(['publish','takedown'].includes(action)&&!window.confirm(action==='publish'?'Sudah memeriksa sumber independen dan mengizinkan lowongan ini tayang?':'Turunkan lowongan ini dari Job Explorer?'))return true;
  adminBusy=true;adminError='';const user=own();try{const {error}=await state.supabase.rpc('ik_job_review',{p_id:id,p_action:action,p_reason:reason});if(error)throw error;if(user!==own())return true;adminReason='';adminDirty=false;adminSelected='';adminLoaded=false;mineLoaded=false;toast(action==='publish'?'Lowongan disetujui dan tayang.':action==='takedown'?'Lowongan diturunkan.':'Keputusan tersimpan dan tercatat.');await loadAdmin(true);}
  catch(err){console.warn('IKHTIAR community review:',err?.message||err);adminError=err?.message||'Keputusan tidak dapat disimpan.';}
  finally{adminBusy=false;if(user===own()&&canRenderAdmin())render();}return true;
 }
 async function handleClick(action,el){if(action==='community-new'){if(!ready()){toast('Masuk akun untuk mengajukan lowongan.');return true;}form=blank();formDirty=false;formError='';render();return true;}
  if(action==='community-close'){if(formDirty&&!window.confirm('Batalkan perubahan pengajuan yang belum dikirim?'))return true;form=null;formDirty=false;formError='';render();return true;}
  if(action==='community-edit'){const j=mine.find(x=>x.id===el.dataset.id);if(j&&['pending','needs_revision'].includes(j.status)){form={...j,closing_date:j.closing_date||''};formDirty=false;formError='';render();}return true;}
  if(action==='community-refresh'){mineLoaded=false;await loadMine(true);return true;}
  if(action==='community-history'){const id=el.dataset.id;if(selectedId===id){selectedId='';events=[];eventLoadedId='';render();}else await loadEvents(id);return true;}
  if(action==='community-admin-refresh'){adminLoaded=false;await loadAdmin(true);return true;}
  if(action==='community-admin-filter'){if(adminDirty&&!window.confirm('Buang catatan moderasi yang belum disimpan?'))return true;adminFilter=el.dataset.value;adminSelected='';adminAction='review';adminReason='';adminDirty=false;render();return true;}
  if(action==='community-admin-select'){if(adminDirty&&!window.confirm('Buang catatan moderasi yang belum disimpan?'))return true;adminSelected=adminSelected===el.dataset.id?'':el.dataset.id;const j=admin.find(x=>x.id===adminSelected);adminAction=j?.status==='published'?'takedown':j?.status==='needs_revision'?'reject':'review';adminReason='';adminDirty=false;adminError='';render();return true;}
  return false;
 }
 async function handleSubmit(form){if(form.id==='ik-community-form')return await submit(form);if(form.id==='ik-community-review-form')return await review(form);return false;}
 return {clear,discard,hasUnsaved,loadMine,loadAdmin,page,adminPage,handleClick,handleSubmit,onInput};
}
