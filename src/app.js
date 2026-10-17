import { CONFIG } from '../config.js';

const ROOT = document.getElementById('app');
const TOAST = document.getElementById('toast');
const icon = (id, css = '') => `<svg class="i ${css}" aria-hidden="true"><use href="#ic-${id}"></use></svg>`;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brand = (invert=false) => `<a href="#/auth" data-action="brand-home" class="brand ${invert?'invert':''}" aria-label="IKHTIAR"><img src="./assets/brand/logo-mark.png" alt=""><span><strong>IKHTIAR</strong><small>Your Career, Your Move.</small></span></a>`;
const initialSeen = () => localStorage.getItem('ikhtiar:onboarding:done') === '1';
const STATE = {view:'splash', slide:0, mode:'login', session:null, supabase:null, authReady:false, splashDone:false, authError:'', authNotice:'', passwordVisible:false, busy:false, resendEmail:'', resendAt:0, demo:false, dark:localStorage.getItem('ikhtiar:theme')==='dark'};
const slides = [
  {tag:'01 · SHOW YOUR WORK',title:'Tunjukkan karya. <span class="grad-text">Buka peluang.</span>',desc:'Bangun portofolio profesional yang terasa seperti dirimu. Tampilkan proyek, skill, dan pencapaian melalui satu tautan yang mudah dibagikan.',top:'Portofolio Online',bottom:'Karyamu, identitasmu',caption:'Perjalanan besar dimulai dari karya kecil yang kamu banggakan.'},
  {tag:'02 · BUILT FOR YOUR CAREER',title:'CV profesional, <span class="grad-text">lebih mudah.</span>',desc:'Susun CV ATS-friendly dari profil yang sama. Pilih template minimalis, lihat pratinjau langsung, dan siapkan dokumen untuk peluang berikutnya.',top:'CV ATS Ready',bottom:'Format yang lebih rapi',caption:'Bukan sekadar terlihat bagus — informasi penting juga harus mudah ditemukan.'},
  {tag:'03 · TAKE YOUR NEXT STEP',title:'Peluang terbaik, <span class="grad-text">menunggu langkahmu.</span>',desc:'Temukan lowongan, simpan posisi menarik, dan pantau proses lamaran. Semua perjalanan kariermu di satu tempat.',top:'Cari Peluang',bottom:'Selangkah lebih dekat',caption:'Buka kemungkinan baru dan bergerak menuju karier yang kamu pilih.'},
];
function toast(message){ TOAST.textContent=message;TOAST.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>TOAST.classList.remove('show'),3500); }
function go(view){STATE.view=view; location.hash=`/${view}`; render(); window.scrollTo(0,0);}
function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(CONFIG.supabaseUrl?.trim()||'') && !!CONFIG.supabaseAnonKey?.trim();}
function startRoute(){
 if(!STATE.splashDone || !STATE.authReady) return;
 if(STATE.session){STATE.demo=false;go('dashboard');return;}
 const requested=location.hash.replace(/^#\//,'').split('?')[0];
 if(requested==='auth'){go('auth');return;}
 if(!initialSeen()){go('onboarding');return;}
 go('auth');
}
async function authInit(){
 if(!configured()){STATE.authError='Supabase belum dikonfigurasi. Masukkan project URL dan publishable/anon key di config.js untuk mengaktifkan login.';STATE.authReady=true;startRoute();return;}
 try{
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabase=createClient(CONFIG.supabaseUrl.trim(),CONFIG.supabaseAnonKey.trim(),{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  STATE.supabase=supabase;
  supabase.auth.onAuthStateChange((event,session)=>{
    STATE.session=session;
    if(event==='PASSWORD_RECOVERY'){STATE.mode='newPassword';go('auth');return;}
    if(event==='SIGNED_IN' && STATE.authReady && STATE.splashDone && STATE.view!=='dashboard')go('dashboard');
    if(event==='SIGNED_OUT' && STATE.view==='dashboard'){STATE.demo=false;go('auth');}
  });
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  STATE.session=data.session;
 }catch(err){STATE.authError='Tidak dapat menghubungkan layanan login. Periksa koneksi internet dan konfigurasi Supabase.';console.warn('IKHTIAR auth initialization:',err?.message||err);}
 STATE.authReady=true;startRoute();
}
function splash(){return `<main class="splash" aria-label="IKHTIAR sedang dimuat">
 <button class="splash-skip" data-action="skip-splash">Lewati intro ${icon('arrow-right')}</button>
 <img class="splash-logo" src="./assets/brand/logo-mark.png" alt="Logo IKHTIAR"/>
 <h1 class="splash-title">IKHTIAR</h1><p class="splash-sub">Your Career, Your Move.</p>
 <p class="splash-caption">Setiap langkah kecil membuka<br>peluang yang lebih besar.</p>
 <div class="splash-footer"><div class="splash-progress"><span></span></div><small>MEMULAI PERJALANANMU</small></div>
 </main>`}
function showcase(slide){return `<div class="showcase" aria-hidden="true">
 <div class="float-card preview-main"><div class="preview-banner"></div><div class="preview-pfp"></div><div class="preview-line"></div><div class="preview-line short"></div><div class="preview-boxes"><span></span><span></span><span></span></div></div>
 <div class="float-card float-badge"><div class="bubble">${icon(slide===0?'folder':slide===1?'file':'briefcase')}</div><div><strong>${slides[slide].top}</strong><small>Siap berkembang</small></div></div>
 <div class="float-card float-score"><div class="score-ring"></div><div><strong>${slides[slide].bottom}</strong><small>Your Career, Your Move.</small></div></div>
 </div>`}
function onboarding(){let s=slides[STATE.slide];return `<main class="onboard" aria-label="Pengenalan IKHTIAR">
 <section class="onboard-visual">${brand(true)}${showcase(STATE.slide)}<div class="visual-caption"><b>Mulai dari langkahmu hari ini.</b>${s.caption}</div></section>
 <section class="onboard-content"><div class="onboard-top"><span>IKHTIAR / ${String(STATE.slide+1).padStart(2,'0')}—03</span><button data-action="finish-onboard">Lewati ${icon('arrow-right')}</button></div>
 <div class="onboard-body"><span class="pill">${icon('sparkles')} ${s.tag}</span><h1>${s.title}</h1><p>${s.desc}</p></div>
 <div class="onboard-actions"><div class="dots" aria-label="Langkah onboarding">${slides.map((_,i)=>`<button aria-label="Halaman ${i+1}" data-action="go-slide" data-index="${i}" class="${i===STATE.slide?'active':''}"></button>`).join('')}</div>
 <div class="onboard-buttons">${STATE.slide!==0?`<button class="btn btn-quiet" data-action="prev-slide">${icon('arrow-left')} Kembali</button>`:''}<button class="btn btn-primary btn-lg" data-action="next-slide">${STATE.slide===2?'Mulai Sekarang':'Lanjut'} ${icon('arrow-right')}</button></div></div>
 </section></main>`}
function formError(){return STATE.authNotice?`<div class="${STATE.authError?'auth-form-error':'auth-form-success'}" role="alert">${escapeHTML(STATE.authNotice)}</div>`:''}
function field(id,label,type,iconName,auto='',req=true){return `<div class="auth-field"><label for="${id}">${label}</label><div class="input-wrap">${icon(iconName)}<input class="input" id="${id}" name="${id}" ${req?'required':''} ${auto?`autocomplete="${auto}"`:''} ${type==='password'?`minlength="8" type="${STATE.passwordVisible?'text':'password'}"`: `type="${type}"`} placeholder="${label}" ${type==='password'?'style="padding-right:50px"':''}/>${type==='password'?`<button type="button" class="pass-btn" data-action="toggle-password" aria-label="${STATE.passwordVisible?'Sembunyikan':'Tampilkan'} kata sandi">${icon(STATE.passwordVisible?'eye-off':'eye')}</button>`:''}</div></div>`}
function auth(){const isLogin=STATE.mode==='login';const isRegister=STATE.mode==='register';const isForgot=STATE.mode==='forgot';const isNewPassword=STATE.mode==='newPassword';
 const heading=isLogin?'Selamat datang kembali!':isRegister?'Buat akun IKHTIAR':isForgot?'Pulihkan kata sandi':'Buat kata sandi baru';
 const desc=isLogin?'Lanjutkan perjalanan kariermu dari satu tempat.':isRegister?'Mulai bangun portofolio, CV, dan peluangmu.':isForgot?'Masukkan email akun agar kami mengirim tautan pemulihan.':'Masukkan kata sandi baru untuk akunmu.';
 return `<main class="auth-page"><section class="auth-aside">${brand(true)}<div class="auth-big"><span class="pill">${icon('sparkles')} ALL-IN-ONE CAREER PLATFORM</span><h1>Lebih dari sekadar mencari <em>pekerjaan.</em></h1><p>Bangun profil, tunjukkan karya terbaikmu, dan mulai langkah menuju peluang baru bersama IKHTIAR.</p><div class="auth-features"><span>${icon('check')} Portofolio Online</span><span>${icon('check')} CV ATS</span><span>${icon('check')} Info Loker</span></div></div><div class="auth-aside-bottom">IKHTIAR — Your Career, Your Move.<br>Career Platform by Qulaimun.id</div></section>
 <section class="auth-main"><div class="auth-top"><button class="btn btn-quiet" data-action="replay-onboard">${icon('arrow-left')} Lihat pengenalan</button></div>
 <div class="auth-card"><span class="pill">${icon('lock')} ${isLogin?'MASUK AKUN':isRegister?'PENDAFTARAN':isForgot?'BANTUAN AKUN':'KEAMANAN AKUN'}</span><h2 style="margin-top:20px">${heading}</h2><p class="subtitle">${desc}</p>
 ${(isLogin||isRegister)?`<div class="auth-tabs" role="tablist"><button role="tab" aria-selected="${isLogin}" class="${isLogin?'active':''}" data-action="auth-login">Masuk</button><button role="tab" aria-selected="${isRegister}" class="${isRegister?'active':''}" data-action="auth-register">Daftar</button></div>`:''}
 ${formError()}
 <form id="auth-form">
 ${isRegister?field('fullName','Nama lengkap','text','user','name'):''}
 ${isNewPassword?'':field('email','Alamat email','email','mail','email')}
 ${(!isForgot)?field('password',isNewPassword?'Kata sandi baru':'Kata sandi','password','lock',isNewPassword?'new-password':isRegister?'new-password':'current-password'):''}
 ${isLogin?`<div class="auth-help"><button type="button" class="text-btn" data-action="auth-forgot">Lupa kata sandi?</button></div>`:''}
 ${isLogin||isRegister?`<div class="auth-help" style="margin-top:10px"><button type="button" class="text-btn" data-action="resend-verification" ${!STATE.supabase||STATE.busy?'disabled':''}>${STATE.busy?'Memproses...':'Kirim ulang email verifikasi'}</button></div>`:''}
 <button class="btn btn-primary btn-lg btn-wide" type="submit" ${!STATE.supabase||STATE.busy?'disabled':''}>${STATE.busy?'Memproses...':isLogin?'Masuk ke Dashboard':isRegister?'Buat Akun':isForgot?'Kirim Link Pemulihan':'Simpan Kata Sandi'} ${icon('arrow-right')}</button>
 </form>
 ${(isLogin||isRegister)?`<div class="auth-sep">atau lanjutkan dengan</div><button class="btn btn-outline btn-wide" data-action="google-login" ${!STATE.supabase||STATE.busy?'disabled':''}><span class="google-icon">G</span> Lanjutkan dengan Google</button>`:`<button class="btn btn-quiet btn-wide" style="margin-top:14px" data-action="auth-login">Kembali ke Login</button>`}
 ${!STATE.supabase?`<div class="auth-note">${icon('info')} Mode pratinjau. Login asli belum aktif hingga Supabase dikonfigurasi. Gunakan dashboard demo untuk meninjau tampilan.</div>`:''}
 <button class="btn btn-quiet btn-wide" data-action="view-demo" style="margin-top:15px">${icon('eye')} Lihat Dashboard Demo ${icon('arrow-right')}</button>
 </div><footer class="auth-foot">Prototype Foundation v0.1. Kebijakan privasi dan syarat layanan disiapkan sebelum rilis publik.<br>Mode demo tidak menyimpan data pengguna.</footer></section></main>`;
}
function userInfo(){const u=STATE.session?.user;let email=u?.email||'';let meta=u?.user_metadata||{};let name=STATE.demo?'Pengguna Demo':(meta.full_name||meta.name||meta.display_name||email.split('@')[0]||'Pengguna IKHTIAR');return {name,email:STATE.demo?'Akun simulasi · tanpa data asli':email, initials:String(name).trim().slice(0,1).toUpperCase()||'I'};}
function navAction(type,title,ic,isActive=false){return `<button class="nav-item ${isActive?'active':''}" data-action="${type==='dashboard'?'nav-dashboard':'placeholder'}" ${type!=='dashboard'?`data-label="${escapeHTML(title)}"`:''}>${icon(ic)} ${title}</button>`}
function dashboard(){const u=userInfo();const sample=STATE.demo;const count=sample?[3,1,12]:[0,0,0];const progress=sample?75:0;const displayName=escapeHTML(u.name);
 return `<main class="dashboard ${STATE.dark?'dark':''}">
 <aside class="sidebar" aria-label="Navigasi dashboard">${brand(true)}<div class="nav-label">WORKSPACE</div>
 ${navAction('dashboard','Beranda','home',true)}${navAction('portfolio','Portofolio','folder')}${navAction('cv','CV ATS','file')}${navAction('job','Cari Lowongan','briefcase')}${navAction('applications','Lamaran Saya','bookmark')}
 <div class="nav-label" style="padding-top:17px">AKUN</div>${navAction('settings','Pengaturan','settings')}
 <div class="side-spacer"></div><div class="side-tip"><strong>Karier yang baik dimulai dari langkah kecil ✦</strong><p>Bangun profilmu dan tunjukkan karya terbaik.</p><button class="btn btn-primary" data-action="placeholder" data-label="Career Profile">Mulai Perjalanan ${icon('arrow-right')}</button></div>
 <div class="sidebar-user"><div class="avatar">${escapeHTML(u.initials)}</div><div style="min-width:0"><strong>${displayName}</strong><small>${sample?'Demo Workspace':'Pengguna IKHTIAR'}</small></div></div>
 </aside>
 <div class="dashboard-main"><header class="dashboard-topbar"><div class="top-search">${icon('search')} Cari lowongan, perusahaan, atau kata kunci...</div><div class="top-mobile-logo">${brand()}</div>
 <div class="top-actions"><button class="icon-btn" data-action="toggle-theme" title="Ganti tema" aria-label="Ganti tema">${icon(STATE.dark?'sun':'moon')}</button><button class="icon-btn" data-action="placeholder" data-label="Notifikasi" aria-label="Notifikasi">${icon('bell')}</button><div class="top-profile"><div class="top-avatar">${escapeHTML(u.initials)}</div><div><strong>${displayName}</strong><small>${sample?'Mode Demo':'Akun Aktif'}</small></div></div><button class="icon-btn" data-action="logout" title="Keluar" aria-label="Keluar">${icon('log-out')}</button></div></header>
 <div class="dashboard-content"><div class="welcome"><div><h1>Halo, ${displayName}! <span aria-hidden="true">👋</span></h1><p>Langkah kecil hari ini bisa membuka peluang besar esok nanti.</p></div><div class="date-pill">${icon('calendar')} ${new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}</div></div>
 ${sample?`<div class="demo-alert">${icon('info')} <span><b>Dashboard demo.</b> Semua angka, aktivitas, dan lowongan di bawah hanya contoh. Tidak ada akun yang sedang login.</span></div>`:''}
 <div class="dashboard-grid"><div class="main-stack">
 <section class="panel progress-panel"><div class="progress-circle" style="--p:${progress}%" data-progress="${progress}%"></div><div class="progress-copy"><h2>Progres Profil Kamu</h2><p>${sample?'Profilmu sudah 75% lengkap. Lengkapi agar recruiter lebih mengenalmu.':'Profil kariermu belum dilengkapi. Mulai dari informasi dasar untuk menyiapkan CV dan portofolio.'}</p><button class="text-btn" data-action="placeholder" data-label="Career Profile">Lengkapi profil ${icon('arrow-right')}</button></div></section>
 <div class="stat-grid"><div class="stat"><div class="stat-top"><span class="stat-icon mint">${icon('folder')}</span></div><strong>${count[0]}</strong><small>Total Proyek</small></div><div class="stat"><span class="stat-icon">${icon('file')}</span><strong>${count[1]}</strong><small>CV Dibuat</small></div><div class="stat"><span class="stat-icon violet">${icon('bookmark')}</span><strong>${count[2]}</strong><small>Loker Disimpan</small></div></div>
 <section class="panel"><div class="panel-head"><h2>Aksi Cepat</h2><span>Mulai dari sini</span></div><div class="quick-grid">
 ${[['folder','Buat Portofolio','Tampilkan karya terbaikmu','mint'],['file','Buat CV ATS','CV profesional untuk melamar',''],['briefcase','Cari Lowongan','Jelajahi peluang baru','violet']].map(row=>`<button class="quick-card" data-action="placeholder" data-label="${row[1]}"><span class="stat-icon ${row[3]}">${icon(row[0])}</span><strong>${row[1]}</strong><small>${row[2]}</small></button>`).join('')}</div></section>
 <section class="panel"><div class="panel-head"><h2>Rekomendasi Lowongan</h2><button data-action="placeholder" data-label="Job Explorer">Lihat semua →</button></div>
 ${sample?`<div class="job-row"><div class="job-logo">UI</div><div class="job-info"><strong>UI/UX Designer (Junior)</strong><small>Perusahaan Contoh · Jakarta / Hybrid</small></div><span class="job-type">Full-time</span></div><div class="job-row"><div class="job-logo mint">FE</div><div class="job-info"><strong>Frontend Developer</strong><small>Perusahaan Contoh · Remote</small></div><span class="job-type">Remote</span></div><div class="job-row"><div class="job-logo violet">CC</div><div class="job-info"><strong>Content Creator</strong><small>Perusahaan Contoh · Bandung</small></div><span class="job-type">Part-time</span></div>`:`<div class="notice-empty">Lowongan akan muncul di sini setelah modul Job Explorer tersedia. Tidak ada data lowongan yang ditampilkan sebagai fakta.</div>`}
 </section></div>
 <div class="aside-stack"><section class="panel profile-card"><div class="top-avatar">${escapeHTML(u.initials)}</div><h2>${displayName}</h2><p>${escapeHTML(u.email)}</p><button class="btn btn-outline" data-action="placeholder" data-label="Profil Saya">${icon('user')} Edit Profil</button></section>
 <section class="panel"><div class="panel-head"><h2>Aktivitas Terbaru</h2><span>${sample?'Contoh':'Pribadi'}</span></div>
 ${sample?`<div class="activity"><span class="activity-icon">${icon('folder')}</span><div><strong>Portofolio kamu dipublikasikan</strong><small>2 jam yang lalu</small></div></div><div class="activity"><span class="activity-icon">${icon('file')}</span><div><strong>CV baru berhasil dibuat</strong><small>1 hari yang lalu</small></div></div><div class="activity"><span class="activity-icon">${icon('briefcase')}</span><div><strong>Menyimpan lowongan menarik</strong><small>3 hari yang lalu</small></div></div>`:`<div class="notice-empty">Aktivitas akunmu nantinya akan tercatat di bagian ini.</div>`}</section>
 <section class="journey">${icon('sparkles')}<h3>Your Career, Your Move.</h3><p>Satu profil, banyak peluang. Terus kembangkan dirimu dan siapkan langkah berikutnya.</p><button class="btn btn-white" data-action="placeholder" data-label="Career Profile">Mulai sekarang ${icon('arrow-right')}</button></section></div></div>
 </div></div>
 <nav class="bottom-nav" aria-label="Navigasi bawah">${[['home','Beranda','nav-dashboard'],['briefcase','Loker','placeholder'],['file','CV','placeholder'],['user','Profil','placeholder']].map(([ic,label,act],idx)=>`<button class="${idx===0?'active':''}" data-action="${act}" ${act==='placeholder'?`data-label="${label}"`:''}>${icon(ic)}${label}</button>`).join('')}</nav></main>`;
}
function render(){document.body.classList.toggle('dark',STATE.view==='dashboard'&&STATE.dark);ROOT.innerHTML=STATE.view==='splash'?splash():STATE.view==='onboarding'?onboarding():STATE.view==='dashboard'?dashboard():auth();}
function finishOnboarding(){localStorage.setItem('ikhtiar:onboarding:done','1');STATE.mode='login';STATE.authNotice='';STATE.authError='';go('auth');}
function setMode(mode){STATE.mode=mode;STATE.authNotice='';STATE.authError='';STATE.passwordVisible=false;render();}
async function loginSubmit(form){
 if(!STATE.supabase){toast('Hubungkan Supabase di config.js untuk mengaktifkan login.');return;}
 const data=new FormData(form),email=String(data.get('email')||'').trim(),password=String(data.get('password')||''),fullName=String(data.get('fullName')||'').trim();
 STATE.busy=true;STATE.authNotice='';render();
 try{
  let result;
  if(STATE.mode==='login')result=await STATE.supabase.auth.signInWithPassword({email,password});
  else if(STATE.mode==='register')
  result=await STATE.supabase.auth.signUp({
    email,
    password,
    options:{
      data:{full_name:fullName},
      emailRedirectTo:location.origin+location.pathname
    }
  });
  else if(STATE.mode==='forgot')result=await STATE.supabase.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  else result=await STATE.supabase.auth.updateUser({password});
  if(result.error)throw result.error;
  if(STATE.mode==='forgot'){STATE.authNotice='Jika alamat terdaftar, tautan pemulihan telah dikirim. Silakan periksa email dan folder spam.';}
  else if(STATE.mode==='newPassword'){STATE.authNotice='Kata sandi berhasil diperbarui.';STATE.mode='login';await STATE.supabase.auth.signOut();}
  else if(STATE.mode==='register'&&!result.data?.session){STATE.authNotice='Pendaftaran diterima. Silakan cek email untuk verifikasi, kemudian masuk.';STATE.mode='login';}
  else if(result.data?.session){STATE.session=result.data.session;go('dashboard');}
 }catch(err){STATE.authError='submit';STATE.authNotice=err?.message||'Proses gagal. Silakan coba lagi.';}
 finally{STATE.busy=false;render();}
}
async function resendVerification(){
 if(!STATE.supabase||STATE.busy)return;
 const email=String(document.getElementById('email')?.value||'').trim();
 if(!email||!document.getElementById('email').checkValidity()){
  STATE.authError='resend';STATE.authNotice='Masukkan alamat email yang valid terlebih dahulu.';render();return;
 }
 const wait=60_000-(Date.now()-STATE.resendAt);
 if(wait>0){toast(`Tunggu sekitar ${Math.ceil(wait/1000)} detik sebelum meminta ulang.`);return;}
 STATE.busy=true;STATE.authError='';STATE.authNotice='';
 const btn=document.querySelector('[data-action="resend-verification"]');
 if(btn){btn.disabled=true;btn.textContent='Mengirim...';}
 try{
  const {error}=await STATE.supabase.auth.resend({
   type:'signup',email,
   options:{emailRedirectTo:location.origin+location.pathname}
  });
  if(error)throw error;
  STATE.resendAt=Date.now();
  STATE.authNotice='Jika akun memerlukan konfirmasi, email verifikasi baru telah diminta. Periksa inbox dan spam.';
 }catch(err){STATE.authError='resend';STATE.authNotice=err?.message||'Gagal meminta email verifikasi. Coba lagi nanti.';}
 finally{STATE.busy=false;render();}
}
async function googleLogin(){if(!STATE.supabase){toast('Supabase belum dikonfigurasi.');return;}try{const {error}=await STATE.supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)throw error;}catch(e){STATE.authError='oauth';STATE.authNotice=e?.message||'Tidak dapat masuk dengan Google.';render();}}
async function logout(){if(STATE.demo){STATE.demo=false;go('auth');return;}if(STATE.supabase){const {error}=await STATE.supabase.auth.signOut();if(error){toast('Logout gagal. Coba lagi.');return;}}STATE.session=null;go('auth');}
ROOT.addEventListener('click',async evt=>{
 const actionEl=evt.target.closest('[data-action]');if(!actionEl)return;
 const action=actionEl.dataset.action;
 if(action==='brand-home'){evt.preventDefault();go(STATE.demo||STATE.session?'dashboard':'auth');}
 if(action==='skip-splash'){STATE.splashDone=true;startRoute();}
 if(action==='finish-onboard')finishOnboarding();
 if(action==='prev-slide'){STATE.slide=Math.max(0,STATE.slide-1);render();}
 if(action==='next-slide'){if(STATE.slide<2){STATE.slide++;render();}else finishOnboarding();}
 if(action==='go-slide'){STATE.slide=Math.min(2,Math.max(0,Number(actionEl.dataset.index)||0));render();}
 if(action==='replay-onboard'){STATE.slide=0;go('onboarding');}
 if(action==='auth-login')setMode('login');
 if(action==='auth-register')setMode('register');
 if(action==='auth-forgot')setMode('forgot');
 if(action==='resend-verification')await resendVerification();
 if(action==='toggle-password'){const input=document.getElementById('password');const oldPos=input?.selectionStart;STATE.passwordVisible=!STATE.passwordVisible;if(input){input.type=STATE.passwordVisible?'text':'password';input.focus();try{input.setSelectionRange(oldPos,oldPos)}catch{}}const btn=actionEl;btn.innerHTML=icon(STATE.passwordVisible?'eye-off':'eye');btn.setAttribute('aria-label',STATE.passwordVisible?'Sembunyikan kata sandi':'Tampilkan kata sandi');}
 if(action==='google-login')await googleLogin();
 if(action==='view-demo'){STATE.demo=true;go('dashboard');}
 if(action==='toggle-theme'){STATE.dark=!STATE.dark;localStorage.setItem('ikhtiar:theme',STATE.dark?'dark':'light');render();}
 if(action==='logout')await logout();
 if(action==='placeholder')toast(`${actionEl.dataset.label||'Fitur ini'} akan tersedia pada milestone berikutnya. Foundation v0.1 fokus pada alur akun dan dashboard.`);
});
ROOT.addEventListener('submit',async evt=>{if(evt.target.id==='auth-form'){evt.preventDefault();const form=evt.target;await loginSubmit(form);}});
function init(){render();authInit();setTimeout(()=>{STATE.splashDone=true;startRoute()},1200);if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('SW:',err.message)));}
init();
