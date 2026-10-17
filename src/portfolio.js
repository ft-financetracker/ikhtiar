/* IKHTIAR v0.3.0 — portfolio builder, private-first with whitelisted public RPC.
 * One canonical Career Profile; no duplicated identity editor.
 */
export function createPortfolioModule({state,render,toast,go,icon,escapeHTML,getUser}) {
 const E=escapeHTML;
 const blankSite=()=>({slug:'',intro:'',is_public:false});
 const blankProject=()=>({id:null,title:'',category:'',role:'',summary:'',outcome:'',external_url:'',image_url:'',tags:'',featured:false,sort_order:0});
 const safeLink=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'?u.href:'';}catch{return '';}};
 const slugify=value=>String(value||'').normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);
 const me=()=>state.session?.user?.id;
 const usable=()=>Boolean(me()&&!state.demo&&state.supabase);
 const toTags=value=>[...new Set(String(value||'').split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean))].slice(0,8);
 const siteURL=slug=>location.origin+location.pathname+'#/p/'+encodeURIComponent(slug);
 let request=0,publicRequest=0,site=blankSite(),siteDraft=blankSite(),projects=[],loaded=false,loading=false,error='',siteSaving=false,siteDirty=false,projectDirty=false;
 let editing=null,editingOpen=false,projectSaving=false,deletingId='',publishBusy=false,publicSlug='',publicBusy=false,publicData=null,publicError='',preview=false;
 function clear(){request++;publicRequest++;site=blankSite();siteDraft=blankSite();projects=[];loaded=false;loading=false;error='';siteSaving=false;siteDirty=false;projectDirty=false;editing=null;editingOpen=false;projectSaving=false;deletingId='';publishBusy=false;publicSlug='';publicBusy=false;publicData=null;publicError='';preview=false;}
 function count(){return projects.length;}
 function hasUnsaved(){return siteDirty||projectDirty;}
 function dirtyWarning(){return hasUnsaved()?'Ada perubahan Portofolio yang belum disimpan. Tinggalkan halaman dan batalkan perubahan?':'';}
 function discard(){siteDraft={...site};siteDirty=false;editing=null;editingOpen=false;projectDirty=false;}
 function normalizeProject(p){return {...blankProject(),...p,tags:Array.isArray(p.tags)?p.tags.join(', '):String(p.tags||'')};}
 async function load(){
  if(!usable()||loading)return;
  const id=me(),serial=++request;loading=true;error='';if(state.view==='portfolio')render();
  try{
   const [a,b]=await Promise.all([
    state.supabase.from('ik_portfolio_sites').select('slug,intro,is_public').eq('user_id',id).maybeSingle(),
    state.supabase.from('ik_portfolio_projects').select('id,title,category,role,summary,outcome,external_url,image_url,tags,featured,sort_order,created_at').eq('user_id',id).order('sort_order',{ascending:true}).order('created_at',{ascending:false}).limit(50)
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   if(serial!==request||id!==me())return;
   site={...blankSite(),...(a.data||{})};if(!siteDirty){const suggestion=slugify(state.careerProfile?.full_name||getUser().name);siteDraft={...site,slug:site.slug||(suggestion.length>=4?suggestion:'karya-'+(suggestion||'saya'))};}
   projects=Array.isArray(b.data)?b.data:[];loaded=true;error='';
  }catch(e){if(serial===request&&id===me()){error='Portofolio belum dapat dimuat. Pastikan SQL v0.3.0 sudah dijalankan dan koneksi tersedia.';console.warn('IKHTIAR portfolio load:',e?.message||e);}}
  finally{if(serial===request){loading=false;if(state.view==='portfolio')render();}}
 }
 function open(){if(!loaded&&!loading&&usable())load();}
 function syncForm(){
  const siteForm=document.getElementById('ik-portfolio-site-form');
  if(siteForm){const f=new FormData(siteForm);siteDraft.slug=String(f.get('slug')||'').trim().toLowerCase();siteDraft.intro=String(f.get('intro')||'');}
  const projectForm=document.getElementById('ik-portfolio-project-form');
  if(projectForm&&editing){const f=new FormData(projectForm);for(const k of ['title','category','role','summary','outcome','external_url','image_url','tags'])editing[k]=String(f.get(k)||'');editing.featured=f.has('featured');}
 }
 function onInput(el){
  if(el.closest?.('#ik-portfolio-site-form')){siteDirty=true;const hint=document.getElementById('ik-port-site-hint');if(hint)hint.textContent='Ada perubahan yang belum disimpan';return true;}
  if(el.closest?.('#ik-portfolio-project-form')){projectDirty=true;const hint=document.getElementById('ik-port-project-hint');if(hint)hint.textContent='Belum disimpan';return true;}
  return false;
 }
 function controls(){
  const isPublic=site.is_public,hasSite=!!site.slug,canPublish=hasSite&&projects.length>0&&!!state.careerProfile?.full_name;
  return `<section class="ik-port-card ik-port-publish" aria-label="Publikasi portofolio"><div class="ik-port-publish-head"><div><span class="ik-port-eyebrow">TAUTAN PORTOFOLIO</span><h3>${icon('link')} Bagikan karya lewat satu link</h3></div><span class="ik-port-badge ${isPublic?'published':'private'}">${isPublic?'Publik':'Privat'}</span></div>
  <p>Portofolio menggunakan data Profil Karier yang sudah kamu simpan. Nama, ringkasan, keahlian, dan proyek publik akan bisa dilihat siapa pun yang memiliki tautannya.</p>
  <form id="ik-portfolio-site-form"><label class="ik-port-field"><span>Alamat portofolio</span><div class="ik-port-slugrow"><span class="ik-port-slugprefix">#/p/</span><input name="slug" value="${E(siteDraft.slug)}" placeholder="nama-kamu" maxlength="40" autocomplete="off" pattern="[a-z0-9]+(-[a-z0-9]+)*" required></div><small>4–40 karakter: huruf kecil, angka, atau tanda hubung. Tautan berubah jika alamat diganti.</small></label>
  <label class="ik-port-field"><span>Kalimat pembuka (opsional)</span><textarea name="intro" rows="3" maxlength="400" placeholder="Contoh: Saya senang membangun solusi digital yang bermanfaat.">${E(siteDraft.intro)}</textarea></label>
  <div class="ik-port-formfoot"><small id="ik-port-site-hint" role="status">${siteDirty?'Ada perubahan yang belum disimpan':'Pengaturan halaman portofolio'}</small><button type="submit" class="btn btn-primary" ${siteSaving||!usable()?'disabled':''}>${siteSaving?'Menyimpan...':'Simpan Pengaturan'}</button></div></form>
  <div class="ik-port-publish-steps"><strong>Siap dibagikan jika:</strong><span>${icon('check')} Nama pada Profil Karier tersimpan</span><span>${icon('check')} Minimal satu proyek berhasil disimpan</span><span>${icon('check')} Alamat portofolio sudah disimpan</span></div>
  ${isPublic?`<div class="ik-port-live-link"><span>${E(siteURL(site.slug))}</span><button type="button" data-action="port-copy">${icon('copy')} Salin</button></div><div class="ik-port-publish-actions"><button type="button" class="btn btn-outline" data-action="port-public-open">${icon('external-link')} Lihat publik</button><button type="button" class="btn ik-port-danger" data-action="port-toggle-publish" ${publishBusy?'disabled':''}>${publishBusy?'Memproses...':'Jadikan Privat'}</button></div>`:`<div class="ik-port-publish-actions"><button type="button" class="btn btn-outline" data-action="port-preview">${icon('eye')} Pratinjau</button><button type="button" class="btn btn-primary" data-action="port-toggle-publish" ${!canPublish||publishBusy||siteDirty?'disabled':''}>${publishBusy?'Memproses...':'Publikasikan Portofolio'}</button></div>${!canPublish?`<small class="ik-port-tip">Lengkapi nama Profil Karier, simpan alamat, dan tambahkan minimal satu proyek untuk mengaktifkan publikasi.</small>`:''}`}
  <div class="ik-port-privacy">${icon('shield')} Email, nomor telepon, data login, dan riwayat CV tidak ditampilkan pada halaman publik.</div></section>`;
 }
 function img(p){const src=safeLink(p.image_url);return src?`<div class="ik-port-cover"><img loading="lazy" referrerpolicy="no-referrer" src="${E(src)}" alt="Ilustrasi proyek ${E(p.title)}" onerror="this.parentElement.classList.add('ik-port-img-missing');this.remove()"></div>`:`<div class="ik-port-cover ik-port-cover-empty"><span>${icon('folder')}</span><small>Karya &amp; proyek</small></div>`;}
 function projectCard(p){const tags=Array.isArray(p.tags)?p.tags:toTags(p.tags);return `<article class="ik-port-project">${img(p)}<div class="ik-port-project-body"><div class="ik-port-project-meta"><span>${E(p.category||'Proyek')}</span>${p.featured?`<span class="ik-port-featured">${icon('sparkles')} Unggulan</span>`:''}</div><h3>${E(p.title)}</h3>${p.role?`<p class="ik-port-role">${E(p.role)}</p>`:''}<p class="ik-port-description">${E(p.summary)}</p>${tags.length?`<div class="ik-port-tags">${tags.map(t=>`<span>${E(t)}</span>`).join('')}</div>`:''}<div class="ik-port-project-actions"><button type="button" data-action="port-project-edit" data-id="${E(p.id)}">${icon('edit')} Edit</button><button type="button" data-action="port-project-delete" data-id="${E(p.id)}" class="danger">Hapus</button></div></div></article>`;}
 function projectForm(){if(!editingOpen||!editing)return '';
  const p=editing;
  const field=(label,key,opts={})=>`<label class="ik-port-field ${opts.wide?'wide':''}"><span>${label}${opts.req?' *':''}</span><input name="${key}" maxlength="${opts.max||180}" value="${E(p[key]||'')}" placeholder="${E(opts.ph||'')}" ${opts.req?'required':''}></label>`;
  const ta=(label,key,max,ph)=>`<label class="ik-port-field wide"><span>${label}</span><textarea name="${key}" maxlength="${max}" rows="${key==='summary'?4:3}" placeholder="${E(ph||'')}">${E(p[key]||'')}</textarea></label>`;
  return `<section class="ik-port-card ik-port-editor" id="ik-port-editor"><div class="ik-port-cardhead"><div><span class="ik-port-eyebrow">EDITOR PROYEK</span><h2>${p.id?'Edit Karya':'Tambah Karya Baru'}</h2><p>Tampilkan apa yang kamu kerjakan, peranmu, dan hasilnya. Cukup satu kali mengisi.</p></div><button type="button" class="ik-port-close" data-action="port-project-cancel" aria-label="Tutup editor">×</button></div><form id="ik-portfolio-project-form"><div class="ik-port-fields">
  ${field('Judul karya','title',{req:true,max:120,ph:'Contoh: Dashboard Keuangan Pondok',wide:true})}
  ${field('Kategori','category',{max:70,ph:'Web App / Desain / Analisis'})}
  ${field('Peranmu','role',{max:100,ph:'Frontend Developer / Finance Analyst'})}
  ${ta('Ceritakan proyeknya *','summary',1600,'Masalah yang diselesaikan, solusi, dan apa yang kamu kerjakan.')}
  ${ta('Hasil atau pencapaian (opsional)','outcome',700,'Contoh: Proses rekap lebih cepat, atau hasil terukur lain yang benar-benar kamu capai.')}
  ${field('Tautan karya (HTTPS, opsional)','external_url',{max:400,ph:'https://contoh.com',wide:true})}
  ${field('URL gambar sampul (HTTPS, opsional)','image_url',{max:600,ph:'https://.../gambar.png',wide:true})}
  ${field('Keahlian terkait (opsional)','tags',{max:260,ph:'Excel, JavaScript, Desain',wide:true})}
  <label class="ik-port-feature-toggle wide"><input type="checkbox" name="featured" ${p.featured?'checked':''}><span>Jadikan proyek unggulan</span></label>
  </div><div class="ik-port-editor-foot"><small id="ik-port-project-hint" role="status">${projectDirty?'Belum disimpan':'Data proyek tersimpan secara terpisah dari profil utama'}</small><div class="ik-port-btnpair"><button type="button" class="btn btn-outline" data-action="port-project-cancel">Batal</button><button type="submit" class="btn btn-primary" ${projectSaving?'disabled':''}>${projectSaving?'Menyimpan...':p.id?'Simpan Perubahan':'Simpan Proyek'}</button></div></div></form></section>`;
 }
 function page(){
  const u=getUser();
  return `<section class="ik-port-page"><header class="ik-port-hero"><div class="ik-port-hero-copy"><span class="ik-port-eyebrow">IKHTIAR / PORTFOLIO BUILDER</span><h1>Portofoliomu, <span>cerita karyamu.</span></h1><p>Satu tempat untuk memamerkan proyek terbaik. Identitas otomatis mengikuti Profil Karier—tidak perlu isi ulang.</p><div class="ik-port-hero-tags"><span>${icon('folder')} ${projects.length} proyek</span><span>${icon('shield')} ${site.is_public?'Tautan publik aktif':'Privat sampai diterbitkan'}</span></div></div><div class="ik-port-hero-art" aria-hidden="true"><div class="ik-port-orbit"><span>${icon('folder')}</span></div></div></header>
  ${state.demo?`<div class="ik-port-notice">Mode Demo: masuk dengan akun asli untuk menyimpan karya dan membagikan portofolio.</div>`:''}
  ${error?`<div class="ik-port-notice error">${E(error)} <button type="button" data-action="port-retry">Coba lagi</button></div>`:''}
  ${loading&&!loaded?`<div class="ik-port-loading">Memuat portofolio...</div>`:`<div class="ik-port-layout"><div class="ik-port-work"><section class="ik-port-card ik-port-list"><div class="ik-port-cardhead"><div><span class="ik-port-eyebrow">KARYA PILIHANMU</span><h2>Proyek & Karya</h2><p>${projects.length?'Pilih karya untuk diedit kapan saja. Perubahan tidak menghapus riwayat Profil Karier.':'Tambahkan karya pertama, lalu terbitkan tautan portofoliomu.'}</p></div><button type="button" class="btn btn-primary" data-action="port-project-new" ${!usable()||projects.length>=30?'disabled':''}>${icon('plus')} Tambah Proyek</button></div>
  ${projects.length?`<div class="ik-port-grid">${projects.map(projectCard).join('')}</div>`:`<div class="ik-port-empty"><div>${icon('folder')}</div><h3>Belum ada karya</h3><p>Mulai dari satu proyek nyata. Tugas kuliah, desain, aplikasi, dan pekerjaan profesional semuanya boleh ditampilkan.</p><button type="button" class="btn btn-primary" data-action="port-project-new" ${!usable()||projects.length>=30?'disabled':''}>Tambah Karya Pertama</button></div>`}</section>${projectForm()}</div><aside class="ik-port-side">${controls()}<div class="ik-port-sidehint"><strong>${icon('user')} Satu identitas, banyak hasil</strong><p>Butuh mengubah nama, ringkasan profesional, atau keahlian? Lakukan hanya di Profil Karier. Portofolio akan mengikuti data tersimpan terbaru.</p><button type="button" data-action="nav-career">Buka Profil Karier ${icon('arrow-right')}</button></div></aside></div>`}
  </section>`;
 }
 async function saveSite(form){
  if(!usable()||siteSaving)return;
  syncForm();const slug=slugify(siteDraft.slug),intro=siteDraft.intro.trim().slice(0,400);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<4||slug.length>40){toast('Alamat harus 4–40 karakter, huruf kecil, angka, atau tanda hubung.');return;}
  if(['admin','auth','ikhtiar','dashboard','login','profile','portfolio','settings','help','support'].includes(slug)){toast('Alamat ini dicadangkan. Pilih nama lain.');return;}
  if(site.is_public&&slug!==site.slug&&!window.confirm('Mengubah alamat akan membuat tautan portofolio lama tidak berlaku. Lanjutkan?'))return;
  siteSaving=true;render();const id=me();
  try{
   const {data,error:dbError}=await state.supabase.from('ik_portfolio_sites').upsert({user_id:id,slug,intro,is_public:site.is_public},{onConflict:'user_id'}).select('slug,intro,is_public').single();
   if(dbError)throw dbError;if(id!==me())return;
   site={...blankSite(),...data};siteDraft={...site};siteDirty=false;toast('Pengaturan portofolio tersimpan.');
  }catch(e){console.warn('IKHTIAR site save:',e?.message||e);toast(e?.code==='23505'?'Alamat sudah digunakan pengguna lain. Coba nama berbeda.':'Gagal menyimpan. Periksa SQL, koneksi, dan alamat portofolio.');}
  finally{siteSaving=false;if(state.view==='portfolio'&&id===me())render();}
 }
 function showEditor(id){
  if(projectDirty&&!window.confirm('Perubahan proyek belum disimpan. Buang perubahan?'))return;
  if(!loaded||!usable())return;
  if(!id&&projects.length>=30){toast('Maksimal 30 proyek per akun untuk versi ini.');return;}
  const p=id?projects.find(x=>x.id===id):null;
  editing=p?normalizeProject(p):blankProject();editingOpen=true;projectDirty=false;render();
  document.getElementById('ik-port-editor')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
 function hideEditor(){if(projectDirty&&!window.confirm('Perubahan proyek belum disimpan. Batalkan?'))return;editingOpen=false;editing=null;projectDirty=false;render();}
 async function saveProject(form){
  if(!usable()||projectSaving||!editing)return;
  syncForm();const p={...editing};p.title=p.title.trim();p.summary=p.summary.trim();
  if(p.title.length<3||p.summary.length<12){toast('Isi judul minimal 3 karakter dan deskripsi minimal 12 karakter.');return;}
  for(const key of ['external_url','image_url'])if(p[key]?.trim()&&!safeLink(p[key].trim())){toast('Tautan karya dan gambar harus berupa alamat HTTPS yang valid.');return;}
  const payload={user_id:me(),title:p.title.slice(0,120),category:p.category.trim().slice(0,70),role:p.role.trim().slice(0,100),summary:p.summary.slice(0,1600),outcome:p.outcome.trim().slice(0,700),external_url:p.external_url.trim().slice(0,400),image_url:p.image_url.trim().slice(0,600),tags:toTags(p.tags),featured:!!p.featured,sort_order:p.id?Number(p.sort_order)||0:projects.length};
  projectSaving=true;render();const id=me();
  try{
   let q;if(p.id)q=state.supabase.from('ik_portfolio_projects').update(payload).eq('id',p.id).eq('user_id',id);else q=state.supabase.from('ik_portfolio_projects').insert(payload);
   const {data,error:dbError}=await q.select('id,title,category,role,summary,outcome,external_url,image_url,tags,featured,sort_order,created_at').single();
   if(dbError)throw dbError;if(id!==me())return;
   if(p.id)projects=projects.map(x=>x.id===p.id?data:x);else projects=[...projects,data];
   projects.sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
   editing=null;editingOpen=false;projectDirty=false;toast('Proyek tersimpan ke portofolio.');
  }catch(e){console.warn('IKHTIAR project save:',e?.message||e);toast('Proyek belum tersimpan. Periksa koneksi dan ketentuan input.');}
  finally{projectSaving=false;if(state.view==='portfolio'&&id===me())render();}
 }
 async function removeProject(id){
  const p=projects.find(x=>x.id===id);if(!p||!usable()||deletingId)return;
  if(!window.confirm('Hapus karya "'+p.title+'" dari portofolio? Tindakan ini tidak dapat dibatalkan.'))return;
  deletingId=id;const owner=me();
  try{
   const {error:dbError}=await state.supabase.from('ik_portfolio_projects').delete().eq('id',id).eq('user_id',owner);
   if(dbError)throw dbError;if(owner!==me())return;
   projects=projects.filter(x=>x.id!==id);toast('Proyek dihapus.');
   if(!projects.length&&site.is_public){await setPublished(false,{silent:true});toast('Portofolio otomatis dibuat privat karena semua proyek dihapus.');}
  }catch(e){toast('Gagal menghapus proyek. Silakan coba lagi.');}
  finally{deletingId='';if(owner===me()&&state.view==='portfolio')render();}
 }
 async function setPublished(value,{silent=false}={}){
  if(!usable()||publishBusy)return;
  if(value&&(!site.slug||!projects.length||!state.careerProfile?.full_name||siteDirty)){toast('Lengkapi profil, proyek, dan simpan alamat terlebih dahulu.');return;}
  if(value&&!window.confirm('Portofolio publik dapat diakses siapa pun yang memiliki tautan. Email, telepon, dan CV tidak ditampilkan. Publikasikan sekarang?'))return;
  if(!value&&!silent&&!window.confirm('Jadikan portofolio privat? Tautan publik akan langsung berhenti berfungsi.'))return;
  publishBusy=true;render();const id=me();
  try{const {data,error:dbError}=await state.supabase.from('ik_portfolio_sites').update({is_public:value}).eq('user_id',id).select('slug,intro,is_public').single();if(dbError)throw dbError;if(id!==me())return;
   site={...site,...data};siteDraft={...site};siteDirty=false;if(!silent)toast(value?'Portofolio dipublikasikan. Tautannya siap dibagikan.':'Portofolio sekarang privat.');
  }catch(e){console.warn('IKHTIAR portfolio publish:',e?.message||e);toast('Perubahan publikasi gagal. Periksa koneksi dan aturan database.');}
  finally{publishBusy=false;if(id===me()&&state.view==='portfolio')render();}
 }
 function safeCareer(){const p=state.careerProfile||{};return {full_name:String(p.full_name||getUser().name||'Kreator IKHTIAR'),headline:String(p.headline||p.target_role||''),summary:String(p.summary||''),skills:Array.isArray(p.skills)?p.skills:[]};}
 function previewData(){return {slug:site.slug||'pratinjau',intro:siteDraft.intro,profile:safeCareer(),projects:projects.filter(x=>x.title)};}
 async function openPublic(slug){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>40||slug.length<4){publicError='Alamat portofolio tidak valid.';publicData=null;publicBusy=false;return;}
  const serial=++publicRequest;publicSlug=slug;preview=false;publicData=null;publicError='';publicBusy=true;if(state.view.startsWith('p/'))render();
  try{
   if(!state.supabase)throw new Error('Supabase belum terhubung');
   const {data,error:dbError}=await state.supabase.rpc('ik_portfolio_public',{p_slug:slug});
   if(dbError)throw dbError;if(serial!==publicRequest)return;
   if(!data){publicError='Portofolio tidak ditemukan atau sedang privat.';}else publicData=data;
  }catch(e){if(serial===publicRequest){publicError='Portofolio belum bisa dibuka. Silakan coba beberapa saat lagi.';console.warn('IKHTIAR public portfolio:',e?.message||e);}}
  finally{if(serial===publicRequest){publicBusy=false;if(state.view.startsWith('p/'))render();}}
 }
 function publicProject(p){const tags=Array.isArray(p.tags)?p.tags:[];const link=safeLink(p.external_url);
  return `<article class="ik-port-public-project">${img(p)}<div class="ik-port-public-project-body"><div class="ik-port-public-category">${E(p.category||'Karya Terpilih')}${p.featured?' · Unggulan':''}</div><h2>${E(p.title)}</h2>${p.role?`<p class="ik-port-public-role">${E(p.role)}</p>`:''}<p>${E(p.summary)}</p>${p.outcome?`<div class="ik-port-outcome"><strong>Hasil karya</strong><span>${E(p.outcome)}</span></div>`:''}${tags.length?`<div class="ik-port-tags">${tags.slice(0,8).map(t=>`<span>${E(t)}</span>`).join('')}</div>`:''}${link?`<a class="ik-port-external" href="${E(link)}" target="_blank" rel="noopener noreferrer">Lihat Karya ${icon('arrow-right')}</a>`:''}</div></article>`;
 }
 function publicPage(){
  const p=preview?previewData():publicData;
  const profile=p?.profile||{},items=Array.isArray(p?.projects)?p.projects:[];
  const initials=String(profile.full_name||'I').trim().slice(0,1).toUpperCase();
  return `<main class="ik-port-public-page"><nav class="ik-port-public-nav"><div class="ik-port-public-brand"><img src="./assets/brand/logo-mark.png" alt=""><strong>IKHTIAR<span> / PORTFOLIO</span></strong></div><button type="button" data-action="${preview?'nav-portfolio':'port-public-exit'}">${icon('arrow-left')} ${preview?'Kembali ke Editor':state.session?'Ke Dashboard':'Masuk IKHTIAR'}</button></nav>
  ${preview?'<div class="ik-port-preview-ribbon">PRATINJAU • Hanya terlihat olehmu. Belum menjadi tautan publik.</div>':''}
  ${publicBusy&&!preview?`<div class="ik-port-public-loading">Memuat portofolio...</div>`:!p?`<div class="ik-port-public-missing"><h1>Portofolio tidak tersedia</h1><p>${E(publicError||'Tautan ini tidak dapat dibuka.')}</p><button type="button" data-action="port-public-retry">Coba lagi</button></div>`:`<div class="ik-port-public-shell"><section class="ik-port-public-hero"><div class="ik-port-public-overline">PORTFOLIO • ${E(p.slug||'IKHTIAR')}</div><div class="ik-port-public-initial">${E(initials)}</div><h1>${E(profile.full_name||'Kreator IKHTIAR')}</h1><div class="ik-port-public-title">${E(profile.headline||'Karya dan perjalanan profesional')}</div><p>${E(p.intro||profile.summary||'Selamat datang di portofolio saya.')}</p>${Array.isArray(profile.skills)&&profile.skills.length?`<div class="ik-port-public-skills">${profile.skills.slice(0,12).map(s=>`<span>${E(s)}</span>`).join('')}</div>`:''}</section>
  <section class="ik-port-public-works"><div class="ik-port-public-sectiontitle"><span>SELECTED WORK</span><h2>Karya yang saya bangun<span>.</span></h2><p>Setiap karya adalah langkah dalam perjalanan belajar dan berkarya.</p></div><div class="ik-port-public-grid">${items.length?items.map(publicProject).join(''):'<p>Belum ada karya yang ditampilkan.</p>'}</div></section><footer>Made with <strong>IKHTIAR</strong> · Your Career, Your Move.</footer></div>`}
  </main>`;
 }
 async function handleClick(action,el){
  if(action==='nav-portfolio'){go('portfolio');return true;}
  if(action==='port-project-new'){showEditor(null);return true;}
  if(action==='port-project-edit'){showEditor(el.dataset.id);return true;}
  if(action==='port-project-cancel'){hideEditor();return true;}
  if(action==='port-project-delete'){await removeProject(el.dataset.id);return true;}
  if(action==='port-toggle-publish'){await setPublished(!site.is_public);return true;}
  if(action==='port-preview'){if(!siteDirty){preview=true;go('portfolio-preview');}else toast('Simpan pengaturan dahulu agar pratinjau akurat.');return true;}
  if(action==='port-public-open'){if(site.is_public){window.open(siteURL(site.slug),'_blank','noopener,noreferrer');}return true;}
  if(action==='port-copy'){if(!site.is_public)return true;try{await navigator.clipboard.writeText(siteURL(site.slug));toast('Tautan portofolio berhasil disalin.');}catch{toast('Salin alamat secara manual: '+siteURL(site.slug));}return true;}
  if(action==='port-public-exit'){go(state.session?'dashboard':'auth');return true;}
  if(action==='port-public-retry'){await openPublic(publicSlug);return true;}
  if(action==='port-retry'){error='';loaded=false;await load();return true;}
  return false;
 }
 async function handleSubmit(form){if(form.id==='ik-portfolio-site-form'){await saveSite(form);return true;}if(form.id==='ik-portfolio-project-form'){await saveProject(form);return true;}return false;}
 function openView(view){if(view==='portfolio')open();else if(view==='portfolio-preview'){preview=true;}else if(view.startsWith('p/'))openPublic(view.slice(2));}
 return {clear,load,openView,page,publicPage,handleClick,handleSubmit,onInput,syncForm,hasUnsaved,dirtyWarning,discard,count,status:()=>({loaded,count:projects.length,published:site.is_public,slug:site.slug})};
}
