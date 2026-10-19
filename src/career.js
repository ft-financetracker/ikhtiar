import {cvMarkup,cvPrintHTML,cvTypes,cvType as savedType,atsReadiness} from './cv-studio.js?v=0.9.6';

/* IKHTIAR v0.2.0 — one canonical Career Profile, reusable across company CVs.
 * No external AI, no invented experience, no public sharing. Supabase RLS owns access.
 */
export function createCareerModule({state,render,toast,go,icon,escapeHTML,getUser,askConfirm}){
 const E=escapeHTML;
 const plain=()=>({full_name:'',headline:'',target_role:'',city:'',phone:'',linkedin_url:'',website_url:'',summary:'',skills:'',languages:'',certifications:[],projects:[],education:[],experience:[]});
 let profile=plain(), draft=plain(), saved=false, loaded=false, loading=false, error='', dirty=false, step=0, extrasOpen=false, saving=false, request=0;
 let versions=[],cvLoaded=false,cvBusy=false,cvError='',cvCompany='',cvPosition='',cvKeywords='',cvFormat='ats',currentCV=null,cvSaving=false;
 let cvShares={},shareBusy=false,shareError='';
 let publicCV=null,publicBusy=false,publicError='',publicToken='',publicRequest=0;
 const me=()=>state.session?.user?.id;
 const usable=()=>!!me()&&!state.demo&&!!state.supabase;
 const clone=o=>JSON.parse(JSON.stringify(o));
 const sanitizeArray=(arr,kind)=>Array.isArray(arr)?arr.slice(0,kind==='experience'?12:8).map(x=>kind==='experience'?{
  title:String(x?.title||'').slice(0,120),company:String(x?.company||'').slice(0,120),period:String(x?.period||'').slice(0,80),description:String(x?.description||'').slice(0,1200)
 }:{school:String(x?.school||'').slice(0,120),degree:String(x?.degree||'').slice(0,120),period:String(x?.period||'').slice(0,80),description:String(x?.description||'').slice(0,1000)}):[];
 function sanitiseExtra(arr,kind){
  const max=kind==='projects'?6:8;
  return Array.isArray(arr)?arr.slice(0,max).map(x=>kind==='projects'?{
   title:String(x?.title||'').slice(0,120),role:String(x?.role||'').slice(0,100),description:String(x?.description||'').slice(0,1000),url:String(x?.url||'').slice(0,350)
  }:{name:String(x?.name||'').slice(0,120),issuer:String(x?.issuer||'').slice(0,120),year:String(x?.year||'').slice(0,30)}):[];
 }
 function fromDB(row){
  const p=plain();for(const k of ['full_name','headline','target_role','city','phone','linkedin_url','website_url','summary'])p[k]=String(row?.[k]||'');
  p.skills=Array.isArray(row?.skills)?row.skills.join(', '):'';p.languages=Array.isArray(row?.languages)?row.languages.join(', '):'';
  p.education=sanitizeArray(row?.education,'education');p.experience=sanitizeArray(row?.experience,'experience');p.certifications=sanitiseExtra(row?.certifications,'certifications');p.projects=sanitiseExtra(row?.projects,'projects');
  return p;
 }
 function pack(p){
  const skills=[...new Set(String(p.skills||'').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean))].slice(0,30);
  const languages=[...new Set(String(p.languages||'').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean))].slice(0,20);
  return {
   full_name:String(p.full_name||'').trim().slice(0,80),headline:String(p.headline||'').trim().slice(0,120),
   target_role:String(p.target_role||'').trim().slice(0,120),city:String(p.city||'').trim().slice(0,100),
   phone:String(p.phone||'').trim().slice(0,35),linkedin_url:String(p.linkedin_url||'').trim().slice(0,350),
   website_url:String(p.website_url||'').trim().slice(0,350),summary:String(p.summary||'').trim().slice(0,2000),skills,
   education:sanitizeArray(p.education,'education').filter(x=>Object.values(x).some(v=>v.trim())),
   experience:sanitizeArray(p.experience,'experience').filter(x=>Object.values(x).some(v=>v.trim())),
   languages,certifications:sanitiseExtra(p.certifications,'certifications').filter(x=>x.name.trim()),
   projects:sanitiseExtra(p.projects,'projects').filter(x=>x.title.trim())
  };
 }
 function clear(){request++;profile=plain();draft=plain();saved=false;loaded=false;loading=false;error='';dirty=false;step=0;extrasOpen=false;saving=false;versions=[];cvLoaded=false;cvBusy=false;cvError='';cvCompany='';cvPosition='';cvKeywords='';cvFormat='ats';currentCV=null;cvSaving=false;cvShares={};shareBusy=false;shareError='';publicCV=null;publicBusy=false;publicError='';publicToken='';publicRequest++;state.careerProfile=null;}
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
  try{const {data,error:dbError}=await state.supabase.from('ik_cv_versions').select('id,company_name,position_name,job_keywords,profile_snapshot,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(30);if(dbError)throw dbError;if(id===me()){
    versions=data||[];cvLoaded=true;
    const {data:links,error:linksError}=await state.supabase.from('ik_cv_shares').select('cv_id,public_id,is_active,show_email,show_phone').eq('user_id',id);
    if(linksError){console.warn('IKHTIAR CV shares:',linksError?.message||linksError);shareError='Fitur tautan CV membutuhkan SQL M5 v0.4.0.';}
    else {cvShares=Object.fromEntries((links||[]).map(row=>[row.cv_id,row]));shareError='';}
   }}
  catch(e){if(id===me()){cvError='Riwayat CV belum dapat dibuka. Periksa migrasi SQL v0.2.0.';console.warn('IKHTIAR CV:',e?.message||e);}}
  finally{cvBusy=false;if(id===me()&&state.view==='cv')render();}
 }
 function prepareCV(company,position){cvCompany=String(company||'').trim().slice(0,120);cvPosition=String(position||'').trim().slice(0,120);cvKeywords='';cvFormat='ats';currentCV=null;}
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
 function extraListing(kind){
  const isProject=kind==='projects',items=draft[kind];
  return `<div class="ik-career-repeat">${items.map((x,i)=>`<section class="ik-career-repeat-item"><div class="ik-career-repeat-top"><strong>${isProject?'Proyek':'Sertifikasi'} ${i+1}</strong><button type="button" class="ik-career-remove" data-action="career-remove" data-type="${kind}" data-index="${i}">Hapus</button></div><div class="ik-career-fields">${isProject?`${f('Nama proyek',`${kind}:${i}:title`,x.title,{max:120})}${f('Peran',`${kind}:${i}:role`,x.role,{max:100})}${f('Tautan HTTPS',`${kind}:${i}:url`,x.url,{type:'url',max:350,wide:true})}${textarea('Hasil / kontribusi',`${kind}:${i}:description`,x.description,1000,'Gunakan hasil yang benar-benar pernah dicapai.')}`:`${f('Nama sertifikasi / pelatihan',`${kind}:${i}:name`,x.name,{max:120})}${f('Penyelenggara',`${kind}:${i}:issuer`,x.issuer,{max:120})}${f('Tahun',`${kind}:${i}:year`,x.year,{max:30,wide:true})}`}</div></section>`).join('')}<button type="button" class="ik-career-add" data-action="career-add" data-type="${kind}" ${items.length>=(isProject?6:8)?'disabled':''}>+ Tambah ${isProject?'proyek':'sertifikasi'}</button></div>`;
 }
 function steps(){
  if(step===0)return `<div class="ik-career-panel-head"><span class="ik-career-stepnum">01</span><div><h2>Identitas & tujuan karier</h2><p>Isi sekali untuk dipakai pada semua CV dan portofolio nanti.</p></div></div><div class="ik-career-fields">${f('Nama lengkap', 'full_name',draft.full_name,{placeholder:'Nama sesuai identitas profesional',max:80,required:true})}${f('Posisi yang kamu tuju','target_role',draft.target_role,{placeholder:'Contoh: Finance Staff',max:120,required:true})}${f('Kota / domisili','city',draft.city,{placeholder:'Contoh: Jakarta',max:100})}${f('Nomor telepon','phone',draft.phone,{placeholder:'08xx ...',type:'tel',max:35})}${f('LinkedIn (opsional)','linkedin_url',draft.linkedin_url,{placeholder:'https://linkedin.com/in/username',type:'url',max:350})}${f('Portofolio / website (opsional)','website_url',draft.website_url,{placeholder:'https://...',type:'url',max:350})}</div><p class="ik-career-tip">Email CV otomatis mengikuti email akun. Hindari mencantumkan NIK, alamat lengkap, atau data sensitif yang tidak diperlukan.</p>`;
  if(step===1)return `<div class="ik-career-panel-head"><span class="ik-career-stepnum">02</span><div><h2>Ringkasan & keahlian</h2><p>Sampaikan kemampuan yang benar-benar kamu miliki.</p></div></div><div class="ik-career-fields">${f('Headline profesional','headline',draft.headline,{placeholder:'Contoh: Fresh Graduate | Administrasi & Keuangan',max:120,wide:true})}${textarea('Tentang dirimu','summary',draft.summary,2000,'Ceritakan keahlian, pengalaman relevan, dan tujuan karier dalam 2–4 kalimat.','Ringkasan ini akan menjadi dasar CV. Jangan perlu ditulis ulang tiap melamar.')}${textarea('Keahlian','skills',draft.skills,1400,'Excel, Administrasi, Pembukuan, Komunikasi','Pisahkan dengan koma. Maksimal 30 keahlian; hindari klaim yang tidak benar.')}</div>`;
  return `<div class="ik-career-panel-head"><span class="ik-career-stepnum">03</span><div><h2>Riwayat & bukti pengalaman</h2><p>Pendidikan dan pengalaman menjadi dasar seluruh format CV.</p></div></div><h3 class="ik-career-subhead">Pengalaman kerja / organisasi</h3>${listing('experience')}<h3 class="ik-career-subhead">Pendidikan</h3>${listing('education')}<details class="ik-career-extras" ${extrasOpen?'open':''}><summary data-action="career-extras-toggle">Pelengkap CV <small>Bahasa, sertifikasi & proyek (opsional)</small></summary><div class="ik-career-extras-content">${textarea('Bahasa yang dikuasai','languages',draft.languages,1200,'Indonesia (aktif), Inggris (menengah)','Cantumkan tingkat kemampuan dengan jujur. Pisahkan koma.') }<h3 class="ik-career-subhead">Sertifikasi & pelatihan</h3>${extraListing('certifications')}<h3 class="ik-career-subhead">Proyek relevan</h3>${extraListing('projects')}</div></details>`;
 }
 function page(){
  if(state.view==='cv')return cvPage();
  if(!usable())return `<section class="ik-career-page"><div class="ik-career-head"><h1>Profil Karier</h1><p>Masuk dengan akun untuk menyimpan profil.</p></div><div class="ik-career-notice">Mode demo tidak menyimpan data pribadi. Masuk untuk mulai mengisi.</div></section>`;
  if(error)return `<section class="ik-career-page"><div class="ik-career-head"><h1>Profil Karier</h1></div><div class="ik-career-notice error">${E(error)} <button type="button" class="btn btn-outline" data-action="career-retry">Coba lagi</button></div></section>`;
  if(!loaded)return `<section class="ik-career-page"><div class="ik-career-head"><h1>Profil Karier</h1><p>Sedang memuat data aman dari Supabase...</p></div><div class="ik-career-loading"></div></section>`;
  const pct=progress(profile);
  return `<section class="ik-career-page"><div class="ik-career-head"><div><span class="ik-career-eyebrow">IKHTIAR / PROFIL UTAMA</span><h1>Satu profil, banyak peluang.</h1><p>Lengkapi data di sini saja. Saat melamar perusahaan lain, kamu tidak perlu mengisi ulang.</p></div><button type="button" class="ik-career-link" data-action="nav-cv">Buat CV ${icon('arrow-right')}</button></div><div class="ik-career-hero"><div><span class="ik-career-hero-label">PROFIL KARIER KAMU</span><h2>${E(draft.full_name||getUser().name)}</h2><p>${E(draft.target_role||'Tentukan posisi tujuanmu untuk memulai.')}</p><span class="ik-career-herochip">${icon('shield')} Pribadi · hanya pemilik akun</span></div><div class="ik-career-progress" style="--p:${pct}%"><strong>${pct}%</strong><small>Kesiapan</small></div></div><div class="ik-career-layout"><div class="ik-career-main"><div class="ik-career-steps" role="tablist" aria-label="Bagian Profil Karier">${[['Identitas','user'],['Keahlian','sparkles'],['Riwayat','briefcase']].map(([label,ic],i)=>`<button type="button" class="ik-career-step ${step===i?'active':''}" role="tab" aria-selected="${step===i}" data-action="career-step" data-step="${i}"><span>${icon(ic)}</span><strong>${label}</strong></button>`).join('')}</div><form id="career-form" class="ik-career-form" novalidate>${steps()}<div class="ik-career-footer"><span class="ik-career-save-status" id="ik-career-save-status">${dirty?'Ada perubahan yang belum disimpan':saved?'Tersimpan di akunmu':'Belum ada profil tersimpan'}</span><div class="ik-career-footer-actions">${step>0?`<button type="button" class="btn btn-outline" data-action="career-prev">Kembali</button>`:''}${step<2?`<button type="button" class="btn btn-outline" data-action="career-next">Lanjut ${icon('arrow-right')}</button>`:''}<button type="submit" class="btn btn-primary" ${saving?'disabled':''}>${saving?'Menyimpan...':`${icon('shield')} Simpan Profil`}</button></div></div></form></div><aside class="ik-career-aside"><div class="ik-career-aside-card"><span class="ik-career-aside-icon">${icon('file')}</span><h3>Isi sekali. Gunakan berkali-kali.</h3><p>Nama, kontak, keahlian, dan riwayat akan menjadi sumber data untuk setiap CV.</p><button type="button" data-action="nav-cv">Generate CV khusus perusahaan ${icon('arrow-right')}</button></div><div class="ik-career-aside-note"><strong>${icon('info')} Tanpa data buatan</strong><p>IKHTIAR tidak membuat pengalaman atau sertifikasi palsu. Kamu tetap meninjau hasil sebelum melamar.</p></div></aside></div></section>`;
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
  if(data.skills.some(x=>x.length>80)||data.languages.some(x=>x.length>80)){toast('Setiap keahlian atau bahasa maksimal 80 karakter.');step=1;render();return;}
  if(data.projects.some(x=>x.url&&!/^https:\/\//i.test(x.url))){toast('Tautan proyek harus memakai HTTPS.');step=2;render();return;}
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
 function shareLink(row){return `${location.origin}${location.pathname}#/resume/${encodeURIComponent(row.public_id)}`;}
 function shareControl(){
  if(!currentCV)return '';
  if(!currentCV.id)return `<div class="ik-cv-share-help">CV belum tersimpan, jadi belum bisa dibagikan. Simpan ulang saat koneksi tersedia.</div>`;
  const rec=cvShares[currentCV.id],live=!!rec?.is_active;
  return `<section class="ik-cv-share" aria-labelledby="ik-cv-share-title">
    <div class="ik-cv-share-title"><span class="ik-cv-share-symbol">${icon('shield')}</span><div><h3 id="ik-cv-share-title">Tautan CV online</h3><p>Kontrol siapa yang bisa membuka CV untuk ${E(currentCV.company_name)}.</p></div><span class="ik-cv-status ${live?'public':'private'}">${live?'Tautan aktif':'Privat'}</span></div>
    ${shareError?`<p class="ik-cv-error">${E(shareError)}</p>`:''}
    ${live?`<div class="ik-cv-share-url"><input aria-label="Tautan CV aktif" readonly value="${E(shareLink(rec))}"/><button type="button" data-action="cv-copy-link">${icon('file')} Salin</button><button type="button" data-action="cv-open-link" aria-label="Lihat CV publik">${icon('external')} Buka</button></div>`:`<p class="ik-cv-share-help">Hanya kamu yang bisa melihat CV ini sampai tautan diaktifkan. Orang yang memiliki tautan aktif dapat membuka CV tanpa login.</p>`}
    <div class="ik-cv-share-checks"><label><input type="checkbox" id="cv-share-email" ${rec?.show_email?'checked':''} ${shareBusy?'disabled':''}/> Tampilkan email pada CV online</label><label><input type="checkbox" id="cv-share-phone" ${rec?.show_phone?'checked':''} ${shareBusy?'disabled':''}/> Tampilkan nomor telepon pada CV online</label></div>
    <div class="ik-cv-share-actions">${live?`<button type="button" class="btn btn-outline" data-action="cv-share-save" ${shareBusy?'disabled':''}>${shareBusy?'Menyimpan...':'Simpan privasi kontak'}</button><button type="button" class="btn ik-cv-revoke" data-action="cv-share-disable" ${shareBusy?'disabled':''}>Nonaktifkan tautan</button>`:`<button type="button" class="btn btn-primary" data-action="cv-share-enable" ${shareBusy||!!shareError?'disabled':''}>${shareBusy?'Memproses...':`${icon('external')} Aktifkan tautan CV`}</button>`}</div>
    <p class="ik-cv-share-footnote">Saat tautan aktif, siapa pun yang memilikinya dapat membaca nama, ringkasan, keahlian, riwayat pendidikan/pengalaman, proyek, sertifikasi, bahasa, dan perusahaan tujuan. Jangan bagikan data rahasia. Menonaktifkan tautan membuat URL lama tidak dapat digunakan kembali.</p>
  </section>`;
 }
 function cvPage(){
  if(!usable())return `<section class="ik-career-page"><div class="ik-career-head"><h1>CV Studio</h1><p>Masuk untuk membuat CV profesional dari profil kamu.</p></div></section>`;
  const ready=saved&&!!state.careerProfile?.full_name&&!!state.careerProfile?.target_role;
  const quality=atsReadiness(state.careerProfile||{},state.session?.user?.email||'');
  const opts=Object.entries(cvTypes).map(([type,item])=>`<button class="ik-cv-type-card ${cvFormat===type?'is-selected':''}" type="button" data-action="cv-template" data-type="${type}" aria-pressed="${cvFormat===type}"><span class="ik-cv-type-symbol">${type==='ats'?icon('file'):type==='resume'?icon('bookmark'):icon('sparkles')}</span><strong>${item.title}</strong><small>${item.hint}</small><span class="ik-cv-type-indicator">${cvFormat===type?'Dipilih':'Pilih format'}</span></button>`).join('');
  return `<section class="ik-career-page"><div class="ik-career-head"><div><span class="ik-career-eyebrow">IKHTIAR / CV STUDIO</span><h1>Satu profil. Tiga format CV.</h1><p>Pilih format, sesuaikan perusahaan, lalu tinjau sebelum mengunduh. Informasi tetap dari profil asli.</p></div><button type="button" class="ik-career-link" data-action="nav-career">${icon('user')} Kelola Profil Karier</button></div>
  <div class="ik-cv-layout"><div class="ik-career-main"><div class="ik-cv-builder"><div class="ik-cv-top"><span class="ik-career-aside-icon">${icon('file')}</span><div><h2>CV Studio</h2><p>Tentukan gaya dokumen yang paling sesuai dengan kebutuhan lamaran.</p></div></div>
  <div class="ik-cv-type-choices" role="group" aria-label="Pilih format dokumen">${opts}</div>
  <div class="ik-cv-ats-check"><div class="ik-cv-ats-heading"><strong>${icon('shield')} Kesiapan data CV</strong><span>${quality.score}%</span></div><div class="ik-cv-ats-check-grid">${quality.checks.map(c=>`<span class="${c.ok?'is-ready':'is-missing'}">${c.ok?'✓':'○'} ${E(c.label)}</span>`).join('')}</div><p>${quality.ready?'Data inti tersedia. Tetap periksa kesesuaian isi dengan lowongan.':'Lengkapi data bertanda belum terpenuhi di Profil Karier. CV ATS memerlukan ringkasan, keahlian, serta riwayat yang dapat dipahami perekrut.'}</p>${!quality.ready?`<button type="button" class="ik-cv-quality-link" data-action="nav-career">Lengkapi Profil Karier →</button>`:''}</div>
  ${error?`<div class="ik-career-notice error">${E(error)}</div>`:!loaded?`<div class="ik-career-notice">Sedang menyiapkan Profil Karier...</div>`:!ready?`<div class="ik-career-notice">Simpan minimal nama dan posisi tujuan di Profil Karier. <button type="button" data-action="nav-career">Isi Profil →</button></div>`:''}
  <form id="cv-generate-form" class="ik-career-fields"><label class="ik-career-field wide"><span>Nama perusahaan <em>*</em></span><input name="company" value="${E(cvCompany)}" maxlength="120" placeholder="Contoh: PT Nusantara Teknologi" required ${!ready?'disabled':''}></label><label class="ik-career-field wide"><span>Posisi dilamar <em>*</em></span><input name="position" value="${E(cvPosition||profile.target_role)}" maxlength="120" placeholder="Mengikuti posisi di profil" required ${!ready?'disabled':''}></label><label class="ik-career-field wide"><span>Kata kunci lowongan (opsional)</span><textarea name="keywords" maxlength="500" rows="2" placeholder="Excel, laporan keuangan, komunikasi" ${!ready?'disabled':''}>${E(cvKeywords)}</textarea><small>Hanya mengurutkan keahlian yang sudah kamu punya. Tidak menambah fakta atau klaim buatan.</small></label><button class="btn btn-primary ik-cv-generate" type="submit" ${!ready||cvSaving||(cvFormat==='ats'&&!quality.ready)?'disabled':''}>${cvSaving?'Menyimpan...':`${icon('sparkles')} Buat & Simpan ${cvTypes[cvFormat].title}`}</button></form></div>
  ${currentCV?`<section class="ik-cv-result"><div class="ik-cv-result-bar"><div><strong>Pratinjau ${cvTypes[savedType(currentCV)].title}</strong><small>${E(currentCV.company_name)} · ${E(currentCV.position_name)}</small></div><button type="button" class="btn btn-primary" data-action="cv-print">${icon('file')} Cetak / Simpan PDF</button></div>${cvMarkup(currentCV)}<p class="ik-cv-output-note">Gunakan Save as PDF dengan ukuran A4 dan skala 100%. Untuk ATS, pilih PDF berbasis teks, bukan gambar atau hasil screenshot.</p></section>${shareControl()}`:''}</div>
  <aside class="ik-career-aside"><div class="ik-career-aside-card"><h3>${icon('folder')} Riwayat CV</h3><p>Versi per perusahaan tetap tersimpan. Jenis format juga disimpan bersama isi CV, jadi CV lama tidak berubah ketika profil diedit.</p>${cvError?`<p class="ik-cv-error">${E(cvError)}</p>`:''}${cvBusy?`<p>Memuat riwayat...</p>`:versions.length?`<div class="ik-cv-history">${versions.map(v=>`<div class="ik-cv-history-row ${currentCV?.id===v.id?'ik-cv-row-selected':''}"><div><strong>${E(v.company_name)}</strong><small>${E(v.position_name)}</small><small class="ik-cv-mini-status">${cvTypes[savedType(v)].title} · ${cvShares[v.id]?.is_active?'● Tautan aktif':'○ Privat'}</small></div><button type="button" data-action="cv-open" data-id="${E(v.id)}">Buka</button><button type="button" class="ik-cv-delete" aria-label="Hapus CV untuk ${E(v.company_name)}" data-action="cv-delete" data-id="${E(v.id)}">×</button></div>`).join('')}</div>`:`<p class="ik-cv-empty">Belum ada CV. Buat versi pertama untuk perusahaan tujuan.</p>`}</div><div class="ik-career-aside-note"><strong>${icon('shield')} ATS bukan jaminan diterima</strong><p>Template ATS memakai struktur teks linear dan font standar. Setiap sistem rekrutmen berbeda; selalu periksa PDF dan cocokkan isinya dengan lowongan.</p></div></aside></div></section>`;
 }

 async function openPublic(token){
  publicToken=String(token||'').trim().toLowerCase();publicError='';publicCV=null;
  const serial=++publicRequest;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(publicToken)){
   publicError='Alamat CV tidak valid.';publicBusy=false;render();return;
  }
  if(!state.supabase){publicError='Layanan CV belum terhubung. Coba muat ulang halaman.';publicBusy=false;render();return;}
  publicBusy=true;render();
  try{
   const {data,error:rpcError}=await state.supabase.rpc('ik_cv_public',{p_public_id:publicToken});
   if(rpcError)throw rpcError;
   if(serial!==publicRequest)return;
   publicCV=data||null;
   if(!data)publicError='Tautan sudah tidak aktif, kedaluwarsa, atau tidak ditemukan.';
  }catch(e){if(serial===publicRequest){console.warn('IKHTIAR CV Public:',e?.message||e);publicError='CV belum dapat dibuka. Coba lagi nanti.';}}
  finally{if(serial===publicRequest){publicBusy=false;if(state.view.startsWith('resume/'))render();}}
 }
 function publicPage(){
  const cv=publicCV;
  return `<main class="ik-cv-public-page"><nav class="ik-cv-public-nav"><a href="./#/auth" class="ik-cv-public-brand"><img alt="" src="./assets/brand/logo-mark.png"><strong>IKHTIAR <span>/ CV ONLINE</span></strong></a><button type="button" data-action="cv-public-back">${icon('arrow-left')} ${state.session?'Dashboard':'Ke IKHTIAR'}</button></nav>
  <div class="ik-cv-public-shell">${publicBusy?`<div class="ik-cv-public-state"><h1>Menyiapkan CV...</h1><p>Sedang memeriksa tautan.</p></div>`:!cv?`<div class="ik-cv-public-state"><span>${icon('lock')}</span><h1>CV tidak tersedia</h1><p>${E(publicError||'Tautan tidak ditemukan.')}</p><button class="btn btn-primary" data-action="cv-public-retry">Coba lagi</button></div>`:`<header class="ik-cv-public-hero"><div><span>${E(cvTypes[savedType(cv)].title.toUpperCase())} / IKHTIAR</span><h1>${E(cv.profile_snapshot?.full_name||'CV Profesional')}</h1><p>${E(cv.position_name||'')}</p></div><button type="button" class="btn btn-primary" data-action="cv-public-print">${icon('file')} Cetak / Simpan PDF</button></header><p class="ik-cv-public-note">CV ini dibagikan oleh pemilik melalui tautan. Data hanya memuat informasi yang dipilih untuk ditampilkan.</p>${cvMarkup(cv)}<footer>Disusun menggunakan <strong>IKHTIAR</strong> · Your Career, Your Move.</footer>`}</div></main>`;
 }
 async function setShare(active){
  if(!usable()||shareBusy||!currentCV?.id)return;
  if(!active&&!await askConfirm('Nonaktifkan tautan CV ini? Orang yang memiliki tautan lama tidak dapat mengaksesnya lagi.'))return;
  const cvId=currentCV.id,id=me();
  const email=active&&!!document.getElementById('cv-share-email')?.checked;
  const phone=active&&!!document.getElementById('cv-share-phone')?.checked;
  if(active&&(email||phone)&&!await askConfirm('Email atau nomor telepon akan terlihat oleh siapa pun yang memiliki tautan. Tetap publikasikan?'))return;
  shareBusy=true;
  try{
   const {data,error:rpcError}=await state.supabase.rpc('ik_cv_share_set',{p_cv_id:cvId,p_active:active,p_show_email:email,p_show_phone:phone});
   if(rpcError)throw rpcError;
   if(id!==me())return;
   if(data?.public_id){cvShares[cvId]={...data,cv_id:cvId};shareError='';toast(active?'Tautan CV aktif. Salin tautan untuk dibagikan.':'Tautan CV dinonaktifkan.');}
   else throw new Error('Tanggapan Supabase tidak lengkap.');
  }catch(e){console.warn('IKHTIAR CV share:',e?.message||e);shareError='Gagal menyimpan status tautan. Periksa SQL M5 dan koneksi.';toast('Pengaturan tautan gagal disimpan.');}
  finally{shareBusy=false;if(state.view==='cv'&&id===me())render();}
 }
 async function copyShare(){
  const s=cvShares[currentCV?.id];if(!s?.is_active)return;
  const url=shareLink(s);
  try{await navigator.clipboard.writeText(url);toast('Tautan CV tersalin.');}
  catch{toast('Tidak dapat menyalin otomatis. Salin dari kolom tautan.');}
 }

 async function generate(form){
  if(!usable()||cvSaving||!loaded||!saved){toast('Simpan Profil Karier dahulu.');return;}
  const fd=new FormData(form),company=String(fd.get('company')||'').trim().slice(0,120),position=String(fd.get('position')||'').trim().slice(0,120)||profile.target_role,keywords=String(fd.get('keywords')||'').trim().slice(0,500);
  cvCompany=company;cvPosition=position;cvKeywords=keywords;
  if(company.length<2||position.length<2){toast('Isi nama perusahaan dan posisi tujuan.');return;}
  const snap=snapshot();if(!snap){toast('Profil belum siap. Simpan profil dahulu.');return;}
  const quality=atsReadiness(snap,state.session?.user?.email||'');
  if(cvFormat==='ats'&&!quality.ready){toast('Lengkapi data inti Profil Karier sebelum membuat CV ATS.');return;}
  snap.cv_design={type:cvFormat,version:'0.9.6'};
  const payload={user_id:me(),company_name:company,position_name:position,job_keywords:keywords,profile_snapshot:snap};
  cvSaving=true;render();const id=me();
  try{
   const {data,error:dbError}=await state.supabase.from('ik_cv_versions').insert(payload).select('id,company_name,position_name,job_keywords,profile_snapshot,created_at').single();
   if(dbError)throw dbError;if(id!==me())return;
   currentCV=data;versions=[data,...versions].slice(0,30);cvLoaded=true;shareError='';toast('CV tersimpan. Tinjau, cetak PDF, atau aktifkan tautan jika diperlukan.');
  }catch(e){console.warn('IKHTIAR CV generation:',e?.message||e);currentCV={...payload};toast('Pratinjau tersedia, tetapi penyimpanan gagal. Periksa koneksi atau SQL.');}
  finally{cvSaving=false;if(state.view==='cv'&&id===me())render();}
 }
 async function removeVersion(id){
  if(!usable()||!versions.some(v=>v.id===id))return;
  if(!await askConfirm('Hapus versi CV ini dari akun? Tindakan ini tidak dapat dibatalkan.'))return;
  const {error:dbError}=await state.supabase.from('ik_cv_versions').delete().eq('id',id).eq('user_id',me());
  if(dbError){toast('Gagal menghapus versi CV.');return;}
  versions=versions.filter(v=>v.id!==id);delete cvShares[id];if(currentCV?.id===id)currentCV=null;render();toast('CV dihapus. Tautan publiknya juga tidak berlaku lagi.');
 }
 function print(cv=currentCV){
  if(!cv)return;
  const win=window.open('','_blank');if(!win){toast('Izinkan pop-up untuk mencetak CV, atau coba melalui browser.');return;}
  win.document.open();win.document.write(cvPrintHTML(cv));win.document.close();win.focus();win.setTimeout(()=>win.print(),400);
 }

 async function handleClick(action,el){
  if(action==='career-extras-toggle'){extrasOpen=!extrasOpen;return true;}
  if(action==='career-retry'){error='';loaded=false;await load();return true;}
  if(action==='nav-career'){go('career');return true;}
  if(action==='nav-cv'){go('cv');return true;}
  if(action==='career-step'||action==='career-next'||action==='career-prev'){
   syncForm();const next=action==='career-step'?Number(el.dataset.step):step+(action==='career-next'?1:-1);step=Math.min(2,Math.max(0,next));render();return true;
  }
  if(action==='career-add'||action==='career-remove'){
   syncForm();const type=el.dataset.type;if(!['education','experience','certifications','projects'].includes(type))return true;
   const list=draft[type];if(action==='career-add'&&list.length<(type==='experience'?12:type==='projects'?6:8))list.push(type==='experience'?{title:'',company:'',period:'',description:''}:type==='education'?{school:'',degree:'',period:'',description:''}:type==='projects'?{title:'',role:'',description:'',url:''}:{name:'',issuer:'',year:''});
   if(action==='career-remove'){const idx=Number(el.dataset.index);if(Number.isInteger(idx)&&idx>=0&&idx<list.length)list.splice(idx,1);}
   dirty=true;render();return true;
  }
  if(action==='cv-template'){const type=el.dataset.type;if(cvTypes[type]){cvFormat=type;render();}return true;}
  if(action==='cv-open'){const v=versions.find(x=>x.id===el.dataset.id);if(v){currentCV=v;cvFormat=savedType(v);shareError='';render();}return true;}
  if(action==='cv-delete'){await removeVersion(el.dataset.id);return true;}
  if(action==='cv-print'){print();return true;}
  if(action==='cv-share-enable'){await setShare(true);return true;}
  if(action==='cv-share-save'){await setShare(true);return true;}
  if(action==='cv-share-disable'){await setShare(false);return true;}
  if(action==='cv-copy-link'){await copyShare();return true;}
  if(action==='cv-open-link'){const share=cvShares[currentCV?.id];if(share?.is_active)window.open(shareLink(share),'_blank','noopener,noreferrer');return true;}
  if(action==='cv-public-print'){print(publicCV);return true;}
  if(action==='cv-public-retry'){await openPublic(publicToken);return true;}
  if(action==='cv-public-back'){go(state.session?'dashboard':'auth');return true;}
  return false;
 }
 async function handleSubmit(form){if(form.getAttribute('id')==='career-form'){await save(form);return true;}if(form.getAttribute('id')==='cv-generate-form'){await generate(form);return true;}return false;}
 return {clear,load,loadVersions,prepareCV,open,openPublic,publicPage,page,progress,status,cvCount:()=>versions.length,latestCV:()=>versions[0]||null,handleClick,handleSubmit,onInput,hasUnsaved:()=>dirty,syncForm};
}
