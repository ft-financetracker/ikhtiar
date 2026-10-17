/* IKHTIAR v0.2.0 — one canonical Career Profile, reusable across company CVs.
 * No external AI, no invented experience, no public sharing. Supabase RLS owns access.
 */
export function createCareerModule({state,render,toast,go,icon,escapeHTML,getUser}){
 const E=escapeHTML;
 const plain=()=>({full_name:'',headline:'',target_role:'',city:'',phone:'',linkedin_url:'',website_url:'',summary:'',skills:'',education:[],experience:[]});
 let profile=plain(), draft=plain(), saved=false, loaded=false, loading=false, error='', dirty=false, step=0, saving=false, request=0;
 let versions=[],cvLoaded=false,cvBusy=false,cvError='',cvCompany='',cvPosition='',cvKeywords='',currentCV=null,cvSaving=false;
 const me=()=>state.session?.user?.id;
 const usable=()=>!!me()&&!state.demo&&!!state.supabase;
 const clone=o=>JSON.parse(JSON.stringify(o));
 const sanitizeArray=(arr,kind)=>Array.isArray(arr)?arr.slice(0,kind==='experience'?12:8).map(x=>kind==='experience'?{
  title:String(x?.title||'').slice(0,120),company:String(x?.company||'').slice(0,120),period:String(x?.period||'').slice(0,80),description:String(x?.description||'').slice(0,1200)
 }:{school:String(x?.school||'').slice(0,120),degree:String(x?.degree||'').slice(0,120),period:String(x?.period||'').slice(0,80),description:String(x?.description||'').slice(0,1000)}):[];
 function fromDB(row){
  const p=plain();for(const k of ['full_name','headline','target_role','city','phone','linkedin_url','website_url','summary'])p[k]=String(row?.[k]||'');
  p.skills=Array.isArray(row?.skills)?row.skills.join(', '):'';
  p.education=sanitizeArray(row?.education,'education');p.experience=sanitizeArray(row?.experience,'experience');
  return p;
 }
 function pack(p){
  const skills=[...new Set(String(p.skills||'').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean))].slice(0,30);
  return {
   full_name:String(p.full_name||'').trim().slice(0,80),headline:String(p.headline||'').trim().slice(0,120),
   target_role:String(p.target_role||'').trim().slice(0,120),city:String(p.city||'').trim().slice(0,100),
   phone:String(p.phone||'').trim().slice(0,35),linkedin_url:String(p.linkedin_url||'').trim().slice(0,350),
   website_url:String(p.website_url||'').trim().slice(0,350),summary:String(p.summary||'').trim().slice(0,2000),skills,
   education:sanitizeArray(p.education,'education').filter(x=>Object.values(x).some(v=>v.trim())),
   experience:sanitizeArray(p.experience,'experience').filter(x=>Object.values(x).some(v=>v.trim()))
  };
 }
 function clear(){request++;profile=plain();draft=plain();saved=false;loaded=false;loading=false;error='';dirty=false;step=0;saving=false;versions=[];cvLoaded=false;cvBusy=false;cvError='';cvCompany='';cvPosition='';cvKeywords='';currentCV=null;cvSaving=false;state.careerProfile=null;}
 function fallbackName(){const u=state.session?.user;return String(u?.user_metadata?.full_name||u?.user_metadata?.name||u?.email?.split('@')[0]||'').trim().slice(0,80);}
 async function load(){
  if(!usable()||loading||loaded)return;
  loading=true;error='';const id=me(),serial=++request;
  try{
   const {data,error:dbError}=await state.supabase.from('ik_career_profiles').select('*').eq('user_id',id).maybeSingle();
   if(dbError)throw dbError;
   if(id!==me()||serial!==request)return;
   profile=fromDB(data);saved=!!data;
   if(!profile.full_name)profile.full_name=fallbackName();
   draft=clone(profile);state.careerProfile=saved?pack(profile):null;loaded=true;dirty=false;
  }catch(e){if(id===me()&&serial===request){error='Profil belum dapat dimuat. Pastikan SQL Career Profile v0.2.0 sudah dijalankan di Supabase.';console.warn('IKHTIAR Career Profile:',e?.message||e);}}
  finally{if(id===me()&&serial===request){loading=false;if(['career','cv','dashboard','settings'].includes(state.view))render();}}
 }
 async function loadVersions(){
  if(!usable()||cvBusy||cvLoaded)return;
  cvBusy=true;cvError='';const id=me();
  try{const {data,error:dbError}=await state.supabase.from('ik_cv_versions').select('id,company_name,position_name,job_keywords,profile_snapshot,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(30);if(dbError)throw dbError;if(id===me()){versions=data||[];cvLoaded=true;}}
  catch(e){if(id===me()){cvError='Riwayat CV belum dapat dibuka. Periksa migrasi SQL v0.2.0.';console.warn('IKHTIAR CV:',e?.message||e);}}
  finally{cvBusy=false;if(id===me()&&state.view==='cv')render();}
 }
 function open(view){if(!loaded&&!loading)load();if(view==='cv'&&!cvLoaded&&!cvBusy)loadVersions();if(view==='cv'&&!cvPosition&&profile.target_role)cvPosition=profile.target_role;}
 function progress(p=profile){
  // Optional links, phone, and work history should not penalize fresh graduates.
  const x=pack(p);const essentials=[x.full_name,x.target_role,x.city,x.summary,x.skills.length,(x.education.length||x.experience.length)];
  return Math.round(essentials.filter(Boolean).length/essentials.length*100);
 }
 const status=()=>({loaded,saved,error,dirty,progress:progress(profile),name:state.careerProfile?.full_name||''});
 function f(label,name,value,{placeholder='',type='text',max=120,required=false,help='',wide=false}={}){
  return `<label class="ik-career-field ${wide?'wide':''}"><span>${label}${required?' <em>*</em>':''}</span><input name="${name}" type="${type}" value="${E(value)}" maxlength="${max}" placeholder="${E(placeholder)}" ${required?'required':''} autocomplete="off">${help?`<small>${help}</small>`:''}</label>`;
 }
 function textarea(label,name,value,max,placeholder='',help=''){
  return `<label class="ik-career-field wide"><span>${label}</span><textarea name="${name}" maxlength="${max}" rows="4" placeholder="${E(placeholder)}">${E(value)}</textarea>${help?`<small>${help}</small>`:''}</label>`;
 }
 function listing(type){
  const isExp=type==='experience',arr=draft[type],limit=isExp?12:8;
  return `<div class="ik-career-repeat">${arr.map((item,i)=>`<section class="ik-career-repeat-item"><div class="ik-career-repeat-top"><strong>${isExp?'Pengalaman':'Pendidikan'} ${i+1}</strong><button type="button" class="ik-career-remove" data-action="career-remove" data-type="${type}" data-index="${i}">Hapus</button></div><div class="ik-career-fields">${isExp?f('Posisi / jabatan',`${type}:${i}:title`,item.title,{placeholder:'Contoh: Staf Administrasi',max:120}):f('Sekolah / kampus',`${type}:${i}:school`,item.school,{placeholder:'Nama institusi',max:120})}${isExp?f('Nama perusahaan / organisasi',`${type}:${i}:company`,item.company,{placeholder:'Nama tempat kerja',max:120}):f('Program / jurusan',`${type}:${i}:degree`,item.degree,{placeholder:'Contoh: S1 Akuntansi Syariah',max:120})}${f('Periode',`${type}:${i}:period`,item.period,{placeholder:'Contoh: 2024 – Sekarang',max:80,wide:true})}${textarea('Pencapaian / aktivitas utama',`${type}:${i}:description`,item.description,isExp?1200:1000,'Jelaskan hal nyata yang sudah kamu lakukan. Gunakan baris baru untuk setiap pencapaian.')}</div></section>`).join('')}<button type="button" class="ik-career-add" data-action="career-add" data-type="${type}" ${arr.length>=limit?'disabled':''}>+ Tambah ${isExp?'pengalaman':'pendidikan'}</button></div>`;
 }
 function steps(){
  if(step===0)return `<div class="ik-career-panel-head"><span class="ik-career-stepnum">01</span><div><h2>Identitas & tujuan karier</h2><p>Isi sekali untuk dipakai pada semua CV dan portofolio nanti.</p></div></div><div class="ik-career-fields">${f('Nama lengkap', 'full_name',draft.full_name,{placeholder:'Nama sesuai identitas profesional',max:80,required:true})}${f('Posisi yang kamu tuju','target_role',draft.target_role,{placeholder:'Contoh: Finance Staff',max:120,required:true})}${f('Kota / domisili','city',draft.city,{placeholder:'Contoh: Jakarta',max:100})}${f('Nomor telepon','phone',draft.phone,{placeholder:'08xx ...',type:'tel',max:35})}${f('LinkedIn (opsional)','linkedin_url',draft.linkedin_url,{placeholder:'https://linkedin.com/in/username',type:'url',max:350})}${f('Portofolio / website (opsional)','website_url',draft.website_url,{placeholder:'https://...',type:'url',max:350})}</div><p class="ik-career-tip">Email CV otomatis mengikuti email akun. Hindari mencantumkan NIK, alamat lengkap, atau data sensitif yang tidak diperlukan.</p>`;
  if(step===1)return `<div class="ik-career-panel-head"><span class="ik-career-stepnum">02</span><div><h2>Ringkasan & keahlian</h2><p>Sampaikan kemampuan yang benar-benar kamu miliki.</p></div></div><div class="ik-career-fields">${f('Headline profesional','headline',draft.headline,{placeholder:'Contoh: Fresh Graduate | Administrasi & Keuangan',max:120,wide:true})}${textarea('Tentang dirimu','summary',draft.summary,2000,'Ceritakan keahlian, pengalaman relevan, dan tujuan karier dalam 2–4 kalimat.','Ringkasan ini akan menjadi dasar CV. Jangan perlu ditulis ulang tiap melamar.')}${textarea('Keahlian','skills',draft.skills,1400,'Excel, Administrasi, Pembukuan, Komunikasi','Pisahkan dengan koma. Maksimal 30 keahlian; hindari klaim yang tidak benar.')}</div>`;
  return `<div class="ik-career-panel-head"><span class="ik-career-stepnum">03</span><div><h2>Riwayat & bukti pengalaman</h2><p>Bagian ini opsional. Fresh graduate bisa fokus pada pendidikan dan organisasi.</p></div></div><h3 class="ik-career-subhead">Pengalaman kerja / organisasi</h3>${listing('experience')}<h3 class="ik-career-subhead">Pendidikan</h3>${listing('education')}`;
 }
 function page(){
  if(state.view==='cv')return cvPage();
  if(!usable())return `<section class="ik-career-page"><div class="ik-career-head"><h1>Profil Karier</h1><p>Masuk dengan akun untuk menyimpan profil.</p></div><div class="ik-career-notice">Mode demo tidak menyimpan data pribadi. Masuk untuk mulai mengisi.</div></section>`;
  if(error)return `<section class="ik-career-page"><div class="ik-career-head"><h1>Profil Karier</h1></div><div class="ik-career-notice error">${E(error)} <button type="button" class="btn btn-outline" data-action="career-retry">Coba lagi</button></div></section>`;
  if(!loaded)return `<section class="ik-career-page"><div class="ik-career-head"><h1>Profil Karier</h1><p>Sedang memuat data aman dari Supabase...</p></div><div class="ik-career-loading"></div></section>`;
  const pct=progress(profile);
  return `<section class="ik-career-page"><div class="ik-career-head"><div><span class="ik-career-eyebrow">IKHTIAR / PROFIL UTAMA</span><h1>Satu profil, banyak peluang.</h1><p>Lengkapi data di sini saja. Saat melamar perusahaan lain, kamu tidak perlu mengisi ulang.</p></div><button type="button" class="ik-career-link" data-action="nav-cv">Buat CV ATS ${icon('arrow-right')}</button></div><div class="ik-career-hero"><div><span class="ik-career-hero-label">PROFIL KARIER KAMU</span><h2>${E(draft.full_name||getUser().name)}</h2><p>${E(draft.target_role||'Tentukan posisi tujuanmu untuk memulai.')}</p><span class="ik-career-herochip">${icon('shield')} Pribadi · hanya pemilik akun</span></div><div class="ik-career-progress" style="--p:${pct}%"><strong>${pct}%</strong><small>Kesiapan</small></div></div><div class="ik-career-layout"><div class="ik-career-main"><div class="ik-career-steps" role="tablist" aria-label="Bagian Profil Karier">${[['Identitas','user'],['Keahlian','sparkles'],['Riwayat','briefcase']].map(([label,ic],i)=>`<button type="button" class="ik-career-step ${step===i?'active':''}" role="tab" aria-selected="${step===i}" data-action="career-step" data-step="${i}"><span>${icon(ic)}</span><strong>${label}</strong></button>`).join('')}</div><form id="career-form" class="ik-career-form" novalidate>${steps()}<div class="ik-career-footer"><span class="ik-career-save-status" id="ik-career-save-status">${dirty?'Ada perubahan yang belum disimpan':saved?'Tersimpan di akunmu':'Belum ada profil tersimpan'}</span><div class="ik-career-footer-actions">${step>0?`<button type="button" class="btn btn-outline" data-action="career-prev">Kembali</button>`:''}${step<2?`<button type="button" class="btn btn-outline" data-action="career-next">Lanjut ${icon('arrow-right')}</button>`:''}<button type="submit" class="btn btn-primary" ${saving?'disabled':''}>${saving?'Menyimpan...':`${icon('shield')} Simpan Profil`}</button></div></div></form></div><aside class="ik-career-aside"><div class="ik-career-aside-card"><span class="ik-career-aside-icon">${icon('file')}</span><h3>Isi sekali. Gunakan berkali-kali.</h3><p>Nama, kontak, keahlian, dan riwayat akan menjadi sumber data untuk setiap CV.</p><button type="button" data-action="nav-cv">Generate CV khusus perusahaan ${icon('arrow-right')}</button></div><div class="ik-career-aside-note"><strong>${icon('info')} Tanpa data buatan</strong><p>IKHTIAR tidak membuat pengalaman atau sertifikasi palsu. Kamu tetap meninjau hasil sebelum melamar.</p></div></aside></div></section>`;
 }
 function syncForm(){
  const form=document.getElementById('career-form');if(!form)return;
  for(const el of form.querySelectorAll('input[name],textarea[name]')){
   const n=el.name;if(!n)continue;
   if(n.includes(':')){const [section,idx,key]=n.split(':');if(Array.isArray(draft[section])&&draft[section][Number(idx)])draft[section][Number(idx)][key]=el.value;}
   else if(Object.prototype.hasOwnProperty.call(draft,n))draft[n]=el.value;
  }
 }
 function onInput(el){
  if(el.closest?.('#cv-generate-form')){
   if(el.name==='company')cvCompany=el.value;if(el.name==='position')cvPosition=el.value;if(el.name==='keywords')cvKeywords=el.value;return true;
  }
  if(!el.closest?.('#career-form'))return false;dirty=true;const label=document.getElementById('ik-career-save-status');if(label)label.textContent='Ada perubahan yang belum disimpan';return true;
 }
 async function save(form){
  if(!usable()||saving||!loaded)return;
  syncForm();const data=pack(draft);
  if(data.full_name.length<2||data.target_role.length<2){toast('Isi nama lengkap dan posisi tujuan terlebih dahulu.');step=0;render();return;}
  for(const key of ['linkedin_url','website_url'])if(data[key]&&!/^https:\/\//i.test(data[key])){toast('Tautan LinkedIn dan website harus diawali https://');step=0;render();return;}
  if(data.skills.some(x=>x.length>80)){toast('Setiap keahlian maksimal 80 karakter.');step=1;render();return;}
  saving=true;render();const id=me();
  try{
   const {data:row,error:dbError}=await state.supabase.from('ik_career_profiles').upsert({user_id:id,...data},{onConflict:'user_id'}).select('*').single();
   if(dbError)throw dbError;
   if(id!==me())return;
   profile=fromDB(row);draft=clone(profile);state.careerProfile=pack(profile);saved=true;dirty=false;
   toast('Profil Karier tersimpan. Data ini siap dipakai untuk CV berikutnya.');
  }catch(e){console.warn('IKHTIAR career save:',e?.message||e);toast(e?.message||'Gagal menyimpan profil. Periksa koneksi atau SQL.');}
  finally{saving=false;if(state.view==='career'&&id===me())render();}
 }
 function snapshot(){if(!saved||!state.careerProfile)return null;return clone({...state.careerProfile,email:state.session?.user?.email||''});}
 function cvPage(){
  if(!usable())return `<section class="ik-career-page"><div class="ik-career-head"><h1>CV ATS</h1><p>Login untuk membuat CV dari profil kamu.</p></div></section>`;
  const ready=saved&&!!state.careerProfile?.full_name&&!!state.careerProfile?.target_role;
  return `<section class="ik-career-page"><div class="ik-career-head"><div><span class="ik-career-eyebrow">IKHTIAR / CV ATS</span><h1>CV untuk setiap peluang.</h1><p>Satu profil tersimpan → masukkan nama perusahaan → buat CV khusus untuk lamaranmu.</p></div><button type="button" class="ik-career-link" data-action="nav-career">${icon('user')} Edit Profil Utama</button></div><div class="ik-cv-layout"><div class="ik-career-main"><div class="ik-cv-builder"><div class="ik-cv-top"><span class="ik-career-aside-icon">${icon('file')}</span><div><h2>Generate CV ATS</h2><p>Format satu kolom. Bisa dicetak atau disimpan sebagai PDF lewat browser.</p></div></div>${error?`<div class="ik-career-notice error">${E(error)}</div>`:!loaded?`<div class="ik-career-notice">Sedang menyiapkan Profil Karier...</div>`:!ready?`<div class="ik-career-notice">Lengkapi dan simpan minimal nama lengkap serta posisi tujuan di Profil Karier. <button type="button" data-action="nav-career">Isi Profil →</button></div>`:''}<form id="cv-generate-form" class="ik-career-fields"><label class="ik-career-field wide"><span>Nama perusahaan <em>*</em></span><input name="company" value="${E(cvCompany)}" maxlength="120" placeholder="Contoh: PT Nusantara Teknologi" required ${!ready?'disabled':''}></label><label class="ik-career-field wide"><span>Posisi dilamar</span><input name="position" value="${E(cvPosition||profile.target_role)}" maxlength="120" placeholder="Mengikuti posisi tujuan profil" ${!ready?'disabled':''}></label><label class="ik-career-field wide"><span>Kata kunci lowongan (opsional)</span><textarea name="keywords" maxlength="500" rows="3" placeholder="Contoh: Excel, laporan keuangan, komunikasi" ${!ready?'disabled':''}>${E(cvKeywords)}</textarea><small>Untuk mengurutkan skill yang relevan, bukan menciptakan pengalaman baru.</small></label><button class="btn btn-primary ik-cv-generate" type="submit" ${!ready||cvSaving?'disabled':''}>${cvSaving?'Menyimpan...':`${icon('sparkles')} Generate & Simpan CV`}</button></form></div>${currentCV?`<section class="ik-cv-result"><div class="ik-cv-result-bar"><div><strong>Pratinjau CV</strong><small>${E(currentCV.company_name)} · ${E(currentCV.position_name)}</small></div><button type="button" class="btn btn-primary" data-action="cv-print">${icon('file')} Cetak / PDF</button></div>${cvMarkup(currentCV)}</section>`:''}</div><aside class="ik-career-aside"><div class="ik-career-aside-card"><h3>${icon('folder')} CV yang pernah dibuat</h3><p>Setiap versi menyimpan salinan profil saat CV dibuat. Memperbarui profil tidak mengubah CV lama.</p>${cvError?`<p class="ik-cv-error">${E(cvError)}</p>`:''}${cvBusy?`<p>Memuat riwayat...</p>`:versions.length?`<div class="ik-cv-history">${versions.map(v=>`<div class="ik-cv-history-row"><div><strong>${E(v.company_name)}</strong><small>${E(v.position_name)}</small></div><button type="button" data-action="cv-open" data-id="${E(v.id)}">Buka</button><button type="button" class="ik-cv-delete" aria-label="Hapus CV untuk ${E(v.company_name)}" data-action="cv-delete" data-id="${E(v.id)}">×</button></div>`).join('')}</div>`:`<p class="ik-cv-empty">Belum ada versi CV. Mulai dengan perusahaan pertama.</p>`}</div><div class="ik-career-aside-note"><strong>${icon('shield')} Data tetap privat</strong><p>Belum ada tautan CV publik. Berkas dapat diunduh melalui menu Cetak / PDF; berbagi ke perusahaan dilakukan oleh kamu sendiri.</p></div></aside></div></section>`;
 }
 function cvMarkup(cv){
  const p=cv.profile_snapshot||{},skills=Array.isArray(p.skills)?p.skills:[],exp=Array.isArray(p.experience)?p.experience:[],edu=Array.isArray(p.education)?p.education:[];
  const terms=String(cv.job_keywords||'').toLowerCase().split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
  const ranked=[...skills].sort((a,b)=>Number(terms.some(t=>String(b).toLowerCase().includes(t)))-Number(terms.some(t=>String(a).toLowerCase().includes(t))));
  const url=s=>/^https:\/\//i.test(s||'')?`<span>${E(s)}</span>`:'';
  return `<article class="ik-cv-paper"><header><h2>${E(p.full_name||'')}</h2><p class="ik-cv-paper-role">${E(p.headline||cv.position_name)}</p><p class="ik-cv-paper-contact">${[p.city,p.phone,p.email].filter(Boolean).map(E).join(' · ')}</p><p class="ik-cv-paper-contact">${[p.linkedin_url,p.website_url].filter(Boolean).map(url).join(' · ')}</p></header><div class="ik-cv-target">Lamaran: ${E(cv.position_name)} · ${E(cv.company_name)}</div>${p.summary?`<section><h3>Ringkasan Profesional</h3><p>${E(p.summary)}</p></section>`:''}${ranked.length?`<section><h3>Keahlian</h3><p>${ranked.map(E).join(' · ')}</p></section>`:''}${exp.length?`<section><h3>Pengalaman</h3>${exp.map(x=>`<div class="ik-cv-entry"><div class="ik-cv-entry-head"><strong>${E(x.title||'Pengalaman')}</strong><small>${E(x.period||'')}</small></div><p>${E(x.company||'')}</p>${x.description?`<p class="ik-cv-lines">${E(x.description)}</p>`:''}</div>`).join('')}</section>`:''}${edu.length?`<section><h3>Pendidikan</h3>${edu.map(x=>`<div class="ik-cv-entry"><div class="ik-cv-entry-head"><strong>${E(x.school||'Pendidikan')}</strong><small>${E(x.period||'')}</small></div><p>${E(x.degree||'')}</p>${x.description?`<p class="ik-cv-lines">${E(x.description)}</p>`:''}</div>`).join('')}</section>`:''}</article>`;
 }
 async function generate(form){
  if(!usable()||cvSaving||!loaded||!saved){toast('Simpan Profil Karier dahulu.');return;}
  const fd=new FormData(form),company=String(fd.get('company')||'').trim().slice(0,120),position=String(fd.get('position')||'').trim().slice(0,120)||profile.target_role,keywords=String(fd.get('keywords')||'').trim().slice(0,500);
  cvCompany=company;cvPosition=position;cvKeywords=keywords;
  if(company.length<2||position.length<2){toast('Isi nama perusahaan dan posisi tujuan.');return;}
  const snap=snapshot();if(!snap){toast('Profil belum siap. Simpan profil dahulu.');return;}
  const payload={user_id:me(),company_name:company,position_name:position,job_keywords:keywords,profile_snapshot:snap};
  cvSaving=true;render();const id=me();
  try{
   const {data,error:dbError}=await state.supabase.from('ik_cv_versions').insert(payload).select('id,company_name,position_name,job_keywords,profile_snapshot,created_at').single();
   if(dbError)throw dbError;if(id!==me())return;
   currentCV=data;versions=[data,...versions].slice(0,30);cvLoaded=true;toast('CV khusus perusahaan tersimpan. Periksa hasil lalu cetak atau simpan PDF.');
  }catch(e){console.warn('IKHTIAR CV generation:',e?.message||e);currentCV={...payload};toast('Pratinjau tersedia, tetapi penyimpanan gagal. Periksa koneksi atau SQL.');}
  finally{cvSaving=false;if(state.view==='cv'&&id===me())render();}
 }
 async function removeVersion(id){
  if(!usable()||!versions.some(v=>v.id===id))return;
  if(!window.confirm('Hapus versi CV ini dari akun? Tindakan ini tidak dapat dibatalkan.'))return;
  const {error:dbError}=await state.supabase.from('ik_cv_versions').delete().eq('id',id).eq('user_id',me());
  if(dbError){toast('Gagal menghapus versi CV.');return;}
  versions=versions.filter(v=>v.id!==id);if(currentCV?.id===id)currentCV=null;render();toast('Versi CV dihapus.');
 }
 function print(){
  if(!currentCV)return;
  const win=window.open('','_blank');if(!win){toast('Izinkan pop-up untuk mencetak CV, atau coba melalui browser.');return;}
  const content=cvMarkup(currentCV);
  win.document.open();win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CV - ${E(currentCV.profile_snapshot?.full_name||'IKHTIAR')} - ${E(currentCV.company_name)}</title><style>body{font:11pt/1.45 Arial,sans-serif;max-width:750px;margin:32px auto;color:#17243a;padding:0 18px}.ik-cv-paper header{text-align:left;border-bottom:2px solid #17243a;padding-bottom:12px}.ik-cv-paper h2{font-size:23px;margin:0 0 4px}.ik-cv-paper-role{font-weight:bold}.ik-cv-paper-contact{font-size:10pt;word-wrap:break-word}.ik-cv-target{margin:14px 0;font-size:10pt}.ik-cv-paper h3{font-size:12pt;text-transform:uppercase;border-bottom:1px solid #aab6c5;padding-bottom:3px;margin:20px 0 8px}.ik-cv-paper p{margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}.ik-cv-entry{margin:8px 0 14px;break-inside:avoid}.ik-cv-entry-head{display:flex;justify-content:space-between;gap:12px}.ik-cv-entry-head small{color:#566}@page{size:A4;margin:15mm}@media print{body{margin:0;padding:0;max-width:none}}</style></head><body>${content}</body></html>`);win.document.close();win.focus();win.setTimeout(()=>win.print(),350);
 }
 async function handleClick(action,el){
  if(action==='career-retry'){error='';loaded=false;await load();return true;}
  if(action==='nav-career'){go('career');return true;}
  if(action==='nav-cv'){go('cv');return true;}
  if(action==='career-step'||action==='career-next'||action==='career-prev'){
   syncForm();const next=action==='career-step'?Number(el.dataset.step):step+(action==='career-next'?1:-1);step=Math.min(2,Math.max(0,next));render();return true;
  }
  if(action==='career-add'||action==='career-remove'){
   syncForm();const type=el.dataset.type;if(!['education','experience'].includes(type))return true;
   const list=draft[type];if(action==='career-add'&&list.length<(type==='experience'?12:8))list.push(type==='experience'?{title:'',company:'',period:'',description:''}:{school:'',degree:'',period:'',description:''});
   if(action==='career-remove'){const idx=Number(el.dataset.index);if(Number.isInteger(idx)&&idx>=0&&idx<list.length)list.splice(idx,1);}
   dirty=true;render();return true;
  }
  if(action==='cv-open'){const v=versions.find(x=>x.id===el.dataset.id);if(v){currentCV=v;render();}return true;}
  if(action==='cv-delete'){await removeVersion(el.dataset.id);return true;}
  if(action==='cv-print'){print();return true;}
  return false;
 }
 async function handleSubmit(form){if(form.id==='career-form'){await save(form);return true;}if(form.id==='cv-generate-form'){await generate(form);return true;}return false;}
 return {clear,load,loadVersions,open,page,progress,status,cvCount:()=>versions.length,latestCV:()=>versions[0]||null,handleClick,handleSubmit,onInput,hasUnsaved:()=>dirty,syncForm};
}
