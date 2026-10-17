import { CONFIG } from '../config.js';
import { createCareerModule } from './career.js?v=0.3.0';
import { createPortfolioModule } from './portfolio.js?v=0.3.0';

const ROOT = document.getElementById('app');
const TOAST = document.getElementById('toast');
const icon = (id, css = '') => `<svg class="i ${css}" aria-hidden="true"><use href="#ic-${id}"></use></svg>`;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brand = (invert=false) => `<a href="#/auth" data-action="brand-home" class="brand ${invert?'invert':''}" aria-label="IKHTIAR"><img src="./assets/brand/logo-mark.png" alt=""><span><strong>IKHTIAR</strong><small>Your Career, Your Move.</small></span></a>`;
const initialSeen = () => localStorage.getItem('ikhtiar:onboarding:done') === '1';
const THEME_MODES=['light','dark','system'];
const savedTheme=localStorage.getItem('ikhtiar:theme');
const preferredTheme=THEME_MODES.includes(savedTheme)?savedTheme:'system';
const systemDark=()=>window.matchMedia?.('(prefers-color-scheme: dark)').matches??false;
const FONT_SCALES=[1,1.1,1.2];
const storedScale=Number(localStorage.getItem('ikhtiar:font-scale'));
const STATE = {view:'splash', slide:0, mode:'login', session:null, supabase:null, authReady:false, splashDone:false, authError:'', authNotice:'', passwordVisible:false, busy:false, resendEmail:'', resendAt:0, logoutDialog:false, logoutScope:'local', busyLogout:false, localLogoutInProgress:false, sessionCheckAt:0, sessionChecking:false, demo:false, themeMode:preferredTheme, dark:preferredTheme==='dark'||(preferredTheme==='system'&&systemDark()), fontScale:FONT_SCALES.includes(storedScale)?storedScale:1, settingSection:'profile', adminSection:'platform', role:'user', roleReady:false, roleRequest:0, platformNotice:'', platformReady:false, platformBusy:false, profileBusy:false, passwordBusy:false, adminUsers:[], adminUsersTotal:0, adminUsersSearch:'', adminUsersPage:0, adminUsersBusy:false, adminUsersLoaded:false, adminUsersError:'', adminAudit:[], adminAuditBusy:false, adminAuditLoaded:false, adminAuditError:'', adminRoleDialog:null, adminRoleBusy:false, careerProfile:null};
const slides = [
  {tag:'01 · SHOW YOUR WORK',title:'Tunjukkan karya. <span class="grad-text">Buka peluang.</span>',desc:'Bangun portofolio profesional yang terasa seperti dirimu. Tampilkan proyek, skill, dan pencapaian melalui satu tautan yang mudah dibagikan.',top:'Portofolio Online',bottom:'Karyamu, identitasmu',caption:'Perjalanan besar dimulai dari karya kecil yang kamu banggakan.'},
  {tag:'02 · BUILT FOR YOUR CAREER',title:'CV profesional, <span class="grad-text">lebih mudah.</span>',desc:'Susun CV ATS-friendly dari profil yang sama. Pilih template minimalis, lihat pratinjau langsung, dan siapkan dokumen untuk peluang berikutnya.',top:'CV ATS Ready',bottom:'Format yang lebih rapi',caption:'Bukan sekadar terlihat bagus — informasi penting juga harus mudah ditemukan.'},
  {tag:'03 · TAKE YOUR NEXT STEP',title:'Peluang terbaik, <span class="grad-text">menunggu langkahmu.</span>',desc:'Temukan lowongan, simpan posisi menarik, dan pantau proses lamaran. Semua perjalanan kariermu di satu tempat.',top:'Cari Peluang',bottom:'Selangkah lebih dekat',caption:'Buka kemungkinan baru dan bergerak menuju karier yang kamu pilih.'},
];
function toast(message){ TOAST.textContent=message;TOAST.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>TOAST.classList.remove('show'),3500); }
function isAdmin(){return !STATE.demo&&!!STATE.session&&STATE.roleReady&&STATE.role==='super_admin';}
const career=createCareerModule({state:STATE,render,toast,go,icon,escapeHTML,getUser:userInfo});
const portfolio=createPortfolioModule({state:STATE,render,toast,go,icon,escapeHTML,getUser:userInfo});
function go(view){
 if(STATE.view==='portfolio'&&view!=='portfolio'&&STATE.session&&portfolio.hasUnsaved()){
  if(!window.confirm(portfolio.dirtyWarning()))return;
  portfolio.discard();
 }
 if(STATE.view==='career'&&view!=='career'&&STATE.session&&career.hasUnsaved()){
  if(!window.confirm('Profil belum disimpan. Tinggalkan halaman dan batalkan perubahan?'))return;
 }
 if(view==='admin-settings'&&!isAdmin())view='settings';
 if(['dashboard','settings','admin-settings','career','cv','portfolio','portfolio-preview'].includes(view)&&!STATE.session&&!STATE.demo)view='auth';
 STATE.view=view;
 location.hash=`/${view}`;
 render();
 window.scrollTo(0,0);
 if(view==='career'||view==='cv')career.open(view);
 if(view==='portfolio'||view==='portfolio-preview'||view.startsWith('p/'))portfolio.openView(view);
 if(view==='admin-settings'){loadPlatformSettings();if(STATE.adminSection==='users')loadAdminUsers();if(STATE.adminSection==='audit')loadAdminAudit();}
}
function setTheme(mode){
 if(!THEME_MODES.includes(mode))return;
 STATE.themeMode=mode;
 localStorage.setItem('ikhtiar:theme',mode);
 STATE.dark=mode==='dark'||(mode==='system'&&systemDark());
 render();
}
async function loadRole(userId){
 const request=++STATE.roleRequest;
 STATE.role='user';STATE.roleReady=false;
 STATE.adminUsers=[];STATE.adminUsersLoaded=false;STATE.adminAudit=[];STATE.adminAuditLoaded=false;STATE.adminRoleDialog=null;
 if(!userId||!STATE.supabase||STATE.demo){STATE.roleReady=true;return;}
 try{
  const {data,error}=await STATE.supabase.from('account_roles').select('role').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(STATE.session?.user?.id!==userId||request!==STATE.roleRequest)return;
  STATE.role=data?.role==='super_admin'?'super_admin':'user';
 }catch(error){
  // No database role means ordinary User. A missing migration never grants admin access.
  console.warn('IKHTIAR role lookup:',error?.message||error);
 }finally{
  if(STATE.session?.user?.id===userId&&request===STATE.roleRequest){
   STATE.roleReady=true;
   if(STATE.view==='admin-settings'&&!isAdmin())go('settings');
   else if(['dashboard','settings','admin-settings','career','cv','portfolio'].includes(STATE.view))render();
  }
 }
}
async function loadPlatformSettings(){
 if(!STATE.supabase||!STATE.session||STATE.demo)return;
 try{
  const {data,error}=await STATE.supabase.from('platform_settings').select('announcement').eq('id','main').maybeSingle();
  if(error)throw error;
  STATE.platformNotice=String(data?.announcement||'');
  STATE.platformReady=!!data;
 }catch(error){
  STATE.platformReady=false;
  console.warn('IKHTIAR platform settings:',error?.message||error);
 }
 if(['dashboard','settings','admin-settings'].includes(STATE.view))render();
}

function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(CONFIG.supabaseUrl?.trim()||'') && !!CONFIG.supabaseAnonKey?.trim();}
function startRoute(){
 if(!STATE.splashDone || !STATE.authReady) return;
 if(STATE.session){
  STATE.demo=false;
  const requested=location.hash.replace(/^#\//,'').split('?')[0];
  go(requested.startsWith('p/')||['settings','admin-settings','career','cv','portfolio','portfolio-preview'].includes(requested)?requested:'dashboard');
  return;
 }
 const requested=location.hash.replace(/^#\//,'').split('?')[0];
 if(requested.startsWith('p/')){go(requested);return;}
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
  // Supabase synchronizes auth state across tabs that share this browser's storage.
  // A login from a different device does NOT automatically revoke this session.
  supabase.auth.onAuthStateChange((event,session)=>{
    const previousSession=STATE.session;
    STATE.session=session;
    if(session&&previousSession?.user?.id&&previousSession.user.id!==session.user.id){career.clear();portfolio.clear();}
    if(event==='SIGNED_IN'&&session){
      // Schedule asynchronous database access outside the Auth callback.
      Promise.resolve().then(()=>loadRole(session.user.id));
      Promise.resolve().then(()=>loadPlatformSettings());
      Promise.resolve().then(()=>career.load());
      Promise.resolve().then(()=>career.loadVersions());
      Promise.resolve().then(()=>portfolio.load());
    }
    if(event==='PASSWORD_RECOVERY'){
      STATE.logoutDialog=false;
      STATE.mode='newPassword';
      go('auth');
      return;
    }
    if(event==='SIGNED_OUT'){
      ++STATE.roleRequest;STATE.role='user';STATE.roleReady=false;STATE.platformNotice='';STATE.platformReady=false;
      STATE.adminUsers=[];STATE.adminUsersLoaded=false;STATE.adminUsersError='';STATE.adminAudit=[];STATE.adminAuditLoaded=false;STATE.adminAuditError='';STATE.adminRoleDialog=null;career.clear();portfolio.clear();
      const intentional=STATE.localLogoutInProgress;
      STATE.logoutDialog=false;STATE.adminRoleDialog=null;
      STATE.busyLogout=false;
      if(!STATE.demo && STATE.authReady && STATE.splashDone && (['dashboard','settings','admin-settings','career','cv','portfolio','portfolio-preview'].includes(STATE.view)||previousSession)){
        STATE.mode='login';
        STATE.authError='';
        STATE.authNotice=intentional?'':'Sesi akun Anda telah berakhir atau telah keluar dari tab lain. Silakan masuk kembali.';
        go('auth');
      }
      return;
    }
    if(event==='SIGNED_IN' && session && STATE.authReady && STATE.splashDone && ['auth','splash','onboarding'].includes(STATE.view) && STATE.mode!=='newPassword'){
      STATE.authNotice='';
      STATE.authError='';
      go('dashboard');
      return;
    }
    if(event==='USER_UPDATED' && session && ['dashboard','settings','admin-settings'].includes(STATE.view) && !STATE.logoutDialog)render();
  });
  const {data,error}=await supabase.auth.getSession();
  if(error) throw error;
  STATE.session=data.session;
  if(STATE.session){await loadRole(STATE.session.user.id);await loadPlatformSettings();await career.load();career.loadVersions();portfolio.load();}
 }catch(err){STATE.authError='Tidak dapat menghubungkan layanan login. Periksa koneksi internet dan konfigurasi Supabase.';console.warn('IKHTIAR auth initialization:',err?.message||err);}
 STATE.authReady=true;startRoute();
}
// Check server-side session validity on focus/return to tab. Offline/network errors are
// never treated as evidence of compromise or grounds for forced logout.
function invalidSessionError(error){
 if(!error)return false;
 const code=String(error.code||'').toLowerCase();
 const name=String(error.name||'');
 const message=String(error.message||'');
 return name==='AuthSessionMissingError' ||
   ['session_not_found','refresh_token_not_found','refresh_token_already_used','invalid_jwt'].includes(code) ||
   (Number(error.status)===401 && /jwt|refresh token|session|invalid token/i.test(message));
}
async function checkSession(){
 if(!STATE.supabase||!STATE.authReady||!STATE.session||STATE.demo||STATE.sessionChecking||!navigator.onLine||document.visibilityState==='hidden')return;
 const now=Date.now();
 if(now-STATE.sessionCheckAt<60_000)return;
 STATE.sessionCheckAt=now;
 STATE.sessionChecking=true;
 try{
   const {data,error}=await STATE.supabase.auth.getUser();
   if(error){
     if(invalidSessionError(error)){
       // Local sign-out clears this browser's credentials only. If the token is
       // already invalid, show login even if Supabase cannot contact the server.
       try{await STATE.supabase.auth.signOut({scope:'local'});}catch(e){console.warn('IKHTIAR sign-out:',e?.message||e);}
       STATE.session=null;
       STATE.logoutDialog=false;
       STATE.mode='login';
       STATE.authError='';
       STATE.authNotice='Sesi login sudah tidak berlaku. Silakan masuk kembali.';
       if(['dashboard','settings','admin-settings'].includes(STATE.view))go('auth');
     }else{
       console.warn('IKHTIAR session check unavailable:',error?.message||error);
     }
   }else if(data?.user && STATE.session?.user && data.user.id!==STATE.session.user.id){
     STATE.session=null;
     STATE.logoutDialog=false;
     STATE.mode='login';
     STATE.authError='';
     STATE.authNotice='Identitas sesi berubah. Silakan masuk kembali.';
     go('auth');
   }
 }catch(error){console.warn('IKHTIAR session check:',error?.message||error);}
 finally{STATE.sessionChecking=false;}
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
function auth(){const isLogin=STATE.mode==='login';const isRegister=STATE.mode==='register';const isForgot=STATE.mode==='forgot';const isNewPassword=STATE.mode==='newPassword';const isVerify=STATE.mode==='verify';
 const heading=isLogin?'Selamat datang kembali!':isRegister?'Buat akun IKHTIAR':isForgot?'Pulihkan kata sandi':isVerify?'Verifikasi email':'Buat kata sandi baru';
 const desc=isLogin?'Lanjutkan perjalanan kariermu dari satu tempat.':isRegister?'Mulai bangun portofolio, CV, dan peluangmu.':isForgot?'Masukkan email akun agar kami mengirim tautan pemulihan.':isVerify?'Masukkan email yang digunakan saat mendaftar untuk meminta tautan verifikasi baru.':'Masukkan kata sandi baru untuk akunmu.';
 return `<main class="auth-page"><section class="auth-aside">${brand(true)}<div class="auth-big"><span class="pill">${icon('sparkles')} ALL-IN-ONE CAREER PLATFORM</span><h1>Lebih dari sekadar mencari <em>pekerjaan.</em></h1><p>Bangun profil, tunjukkan karya terbaikmu, dan mulai langkah menuju peluang baru bersama IKHTIAR.</p><div class="auth-features"><span>${icon('check')} Portofolio Online</span><span>${icon('check')} CV ATS</span><span>${icon('check')} Info Loker</span></div></div><div class="auth-aside-bottom">IKHTIAR — Your Career, Your Move.<br>Career Platform by Qulaimun.id</div></section>
 <section class="auth-main"><div class="auth-top"><button class="btn btn-quiet" data-action="replay-onboard">${icon('arrow-left')} Lihat pengenalan</button></div>
 <div class="auth-card"><span class="pill">${icon('lock')} ${isLogin?'MASUK AKUN':isRegister?'PENDAFTARAN':isForgot?'BANTUAN AKUN':isVerify?'VERIFIKASI EMAIL':'KEAMANAN AKUN'}</span><h2 style="margin-top:20px">${heading}</h2><p class="subtitle">${desc}</p>
 ${(isLogin||isRegister)?`<div class="auth-tabs" role="tablist"><button role="tab" aria-selected="${isLogin}" class="${isLogin?'active':''}" data-action="auth-login">Masuk</button><button role="tab" aria-selected="${isRegister}" class="${isRegister?'active':''}" data-action="auth-register">Daftar</button></div>`:''}
 ${formError()}
 <form id="auth-form">
 ${isRegister?field('fullName','Nama lengkap','text','user','name'):''}
 ${isNewPassword?'':field('email','Alamat email','email','mail','email')}
 ${(!isForgot&&!isVerify)?field('password',isNewPassword?'Kata sandi baru':'Kata sandi','password','lock',isNewPassword?'new-password':isRegister?'new-password':'current-password'):''}
 ${(isLogin||isRegister)?`<div class="auth-help-row">${isLogin?`<button type="button" class="text-btn" data-action="auth-forgot">Lupa kata sandi?</button>`:'<span aria-hidden="true"></span>'}<button type="button" class="text-btn" data-action="auth-verify">Kirim ulang email verifikasi</button></div>`:''}
 <button class="btn btn-primary btn-lg btn-wide" type="submit" ${!STATE.supabase||STATE.busy?'disabled':''}>${STATE.busy?'Memproses...':isLogin?'Masuk ke Dashboard':isRegister?'Buat Akun':isForgot?'Kirim Link Pemulihan':isVerify?'Kirim Tautan Verifikasi':'Simpan Kata Sandi'} ${icon('arrow-right')}</button>
 </form>
 ${(isLogin||isRegister)?`<div class="auth-sep">atau lanjutkan dengan</div><button class="btn btn-outline btn-wide" data-action="google-login" ${!STATE.supabase||STATE.busy?'disabled':''}><span class="google-icon">G</span> Lanjutkan dengan Google</button>`:`<button class="btn btn-quiet btn-wide" style="margin-top:14px" data-action="auth-login">Kembali ke Login</button>`}
 ${!STATE.supabase?`<div class="auth-note">${icon('info')} Mode pratinjau. Login asli belum aktif hingga Supabase dikonfigurasi. Gunakan dashboard demo untuk meninjau tampilan.</div>`:''}
 <button class="btn btn-quiet btn-wide" data-action="view-demo" style="margin-top:15px">${icon('eye')} Lihat Dashboard Demo ${icon('arrow-right')}</button>
 </div><footer class="auth-foot">Prototype Foundation v0.1. Kebijakan privasi dan syarat layanan disiapkan sebelum rilis publik.<br>Mode demo tidak menyimpan data pengguna.</footer></section></main>`;
}
function userInfo(){const u=STATE.session?.user;let email=u?.email||'';let meta=u?.user_metadata||{};let name=STATE.demo?'Pengguna Demo':(STATE.careerProfile?.full_name||meta.full_name||meta.name||meta.display_name||email.split('@')[0]||'Pengguna IKHTIAR');return {name,email:STATE.demo?'Akun simulasi · tanpa data asli':email, initials:String(name).trim().slice(0,1).toUpperCase()||'I'};}
function navAction(type,title,ic,isActive=false){
 const action=type==='dashboard'?'nav-dashboard':type==='settings'?'nav-settings':type==='admin-settings'?'nav-admin-settings':type==='career'?'nav-career':type==='portfolio'?'nav-portfolio':type==='cv'?'nav-cv':'placeholder';
 return `<button class="nav-item ${isActive?'active':''}" data-action="${action}" ${action==='placeholder'?`data-label="${escapeHTML(title)}"`:''} ${isActive?'aria-current="page"':''}>${icon(ic)} ${title}</button>`;
}
function dashboard(){const u=userInfo();const sample=STATE.demo;const count=sample?[3,1,12]:[portfolio.count(),career.cvCount(),0];const progress=sample?75:career.status().progress;const displayName=escapeHTML(u.name);const showingSettings=['settings','admin-settings','career','cv','portfolio'].includes(STATE.view);
 return `<main class="dashboard ${STATE.dark?'dark':''}" style="--ik-font-mul:${STATE.fontScale}">
 <aside class="sidebar" aria-label="Navigasi dashboard">${brand(true)}<div class="nav-label">WORKSPACE</div>
 ${navAction('dashboard','Beranda','home',STATE.view==='dashboard')}${navAction('career','Profil Karier','user',STATE.view==='career')}${navAction('portfolio','Portofolio','folder',STATE.view==='portfolio')}${navAction('cv','CV ATS','file',STATE.view==='cv')}${navAction('job','Cari Lowongan','briefcase')}${navAction('applications','Lamaran Saya','bookmark')}
 <div class="nav-label" style="padding-top:17px">AKUN</div>${navAction('settings','Pengaturan','settings',STATE.view==='settings')}
 ${isAdmin()?`<div class="nav-label" style="padding-top:17px">ADMINISTRASI</div>${navAction('admin-settings','Panel Super Admin','shield',STATE.view==='admin-settings')}`:''}
 <div class="side-spacer"></div><div class="side-tip"><strong>Karier yang baik dimulai dari langkah kecil ✦</strong><p>Bangun profilmu dan tunjukkan karya terbaik.</p><button class="btn btn-primary" data-action="nav-career">Mulai Perjalanan ${icon('arrow-right')}</button></div>
 <div class="sidebar-user"><div class="avatar">${escapeHTML(u.initials)}</div><div style="min-width:0"><strong>${displayName}</strong><small>${sample?'Demo Workspace':'Pengguna IKHTIAR'}</small></div></div>
 </aside>
 <div class="dashboard-main"><header class="dashboard-topbar"><div class="top-search">${icon('search')} Cari lowongan, perusahaan, atau kata kunci...</div><div class="top-mobile-logo">${brand()}</div>
 <div class="top-actions"><button class="icon-btn" data-action="toggle-theme" title="Ganti tema" aria-label="Ganti tema">${icon(STATE.dark?'sun':'moon')}</button><button class="icon-btn" data-action="placeholder" data-label="Notifikasi" aria-label="Notifikasi">${icon('bell')}</button><div class="top-profile"><div class="top-avatar">${escapeHTML(u.initials)}</div><div><strong>${displayName}</strong><small>${sample?'Mode Demo':'Akun Aktif'}</small></div></div><button class="icon-btn" data-action="logout" title="Keluar" aria-label="Keluar">${icon('log-out')}</button></div></header>
 <div class="dashboard-content">${showingSettings ? (STATE.view==='portfolio'?portfolio.page():['career','cv'].includes(STATE.view)?career.page():settingsPage()) : `<div class="welcome"><div><h1>Halo, ${displayName}! <span aria-hidden="true">👋</span></h1><p>Langkah kecil hari ini bisa membuka peluang besar esok nanti.</p></div><div class="date-pill">${icon('calendar')} ${new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}</div></div>
 ${STATE.platformNotice&&!sample?`<div class="ik-platform-banner">${icon('info')} <span>${escapeHTML(STATE.platformNotice)}</span></div>`:''}
 ${sample?`<div class="demo-alert">${icon('info')} <span><b>Dashboard demo.</b> Semua angka, aktivitas, dan lowongan di bawah hanya contoh. Tidak ada akun yang sedang login.</span></div>`:''}
 <div class="dashboard-grid"><div class="main-stack">
 <section class="panel progress-panel"><div class="progress-circle" style="--p:${progress}%" data-progress="${progress}%"></div><div class="progress-copy"><h2>Progres Profil Kamu</h2><p>${sample?'Profilmu sudah 75% lengkap. Lengkapi agar recruiter lebih mengenalmu.':progress?`Profil tersimpan ${progress}% lengkap. Satu profil ini dapat dipakai di berbagai lamaran.`:'Mulai isi data utama satu kali untuk menyiapkan CV dan portofolio.'}</p><button class="text-btn" data-action="nav-career">${progress===100?'Lihat profil':'Lengkapi profil'} ${icon('arrow-right')}</button></div></section>
 <div class="stat-grid"><div class="stat"><div class="stat-top"><span class="stat-icon mint">${icon('folder')}</span></div><strong>${count[0]}</strong><small>Total Proyek</small></div><div class="stat"><span class="stat-icon">${icon('file')}</span><strong>${count[1]}</strong><small>CV Dibuat</small></div><div class="stat"><span class="stat-icon violet">${icon('bookmark')}</span><strong>${count[2]}</strong><small>Loker Disimpan</small></div></div>
 <section class="panel"><div class="panel-head"><h2>Aksi Cepat</h2><span>Mulai dari sini</span></div><div class="quick-grid">
 ${[['folder','Buat Portofolio','Tampilkan karya terbaikmu','mint'],['file','Buat CV ATS','Satu profil untuk banyak perusahaan',''],['briefcase','Cari Lowongan','Jelajahi peluang baru','violet']].map(row=>`<button class="quick-card" data-action="${row[1]==='Buat CV ATS'?'nav-cv':row[1]==='Buat Portofolio'?'nav-portfolio':'placeholder'}" data-label="${row[1]}"><span class="stat-icon ${row[3]}">${icon(row[0])}</span><strong>${row[1]}</strong><small>${row[2]}</small></button>`).join('')}</div></section>
 <section class="panel"><div class="panel-head"><h2>Rekomendasi Lowongan</h2><button data-action="placeholder" data-label="Job Explorer">Lihat semua →</button></div>
 ${sample?`<div class="job-row"><div class="job-logo">UI</div><div class="job-info"><strong>UI/UX Designer (Junior)</strong><small>Perusahaan Contoh · Jakarta / Hybrid</small></div><span class="job-type">Full-time</span></div><div class="job-row"><div class="job-logo mint">FE</div><div class="job-info"><strong>Frontend Developer</strong><small>Perusahaan Contoh · Remote</small></div><span class="job-type">Remote</span></div><div class="job-row"><div class="job-logo violet">CC</div><div class="job-info"><strong>Content Creator</strong><small>Perusahaan Contoh · Bandung</small></div><span class="job-type">Part-time</span></div>`:`<div class="notice-empty">Lowongan akan muncul di sini setelah modul Job Explorer tersedia. Tidak ada data lowongan yang ditampilkan sebagai fakta.</div>`}
 </section></div>
 <div class="aside-stack"><section class="panel profile-card"><div class="top-avatar">${escapeHTML(u.initials)}</div><h2>${displayName}</h2><p>${escapeHTML(u.email)}</p><button class="btn btn-outline" data-action="nav-career">${icon('user')} Edit Profil</button></section>
 <section class="panel"><div class="panel-head"><h2>Aktivitas Terbaru</h2><span>${sample?'Contoh':'Pribadi'}</span></div>
 ${sample?`<div class="activity"><span class="activity-icon">${icon('folder')}</span><div><strong>Portofolio kamu dipublikasikan</strong><small>2 jam yang lalu</small></div></div><div class="activity"><span class="activity-icon">${icon('file')}</span><div><strong>CV baru berhasil dibuat</strong><small>1 hari yang lalu</small></div></div><div class="activity"><span class="activity-icon">${icon('briefcase')}</span><div><strong>Menyimpan lowongan menarik</strong><small>3 hari yang lalu</small></div></div>`:career.latestCV()?`<div class="activity"><span class="activity-icon">${icon('file')}</span><div><strong>CV untuk ${escapeHTML(career.latestCV().company_name)} dibuat</strong><small>${escapeHTML(career.latestCV().position_name)} · tersimpan di akun</small></div></div><button class="text-btn" data-action="nav-cv">Lihat CV ${icon('arrow-right')}</button>`:`<div class="notice-empty">Buat CV pertamamu dari Profil Karier untuk memulai aktivitas.</div>`}</section>
 <section class="journey">${icon('sparkles')}<h3>Your Career, Your Move.</h3><p>Satu profil, banyak peluang. Terus kembangkan dirimu dan siapkan langkah berikutnya.</p><button class="btn btn-white" data-action="nav-career">Mulai sekarang ${icon('arrow-right')}</button></section></div></div>`}
 </div></div>
 <nav class="bottom-nav" aria-label="Navigasi bawah">${[['home','Beranda','nav-dashboard'],['user','Profil','nav-career'],['folder','Karya','nav-portfolio'],['file','CV','nav-cv'],['settings','Pengaturan','nav-settings']].map(([ic,label,act],idx)=>`<button class="${act==='nav-dashboard'&&STATE.view==='dashboard'||act==='nav-settings'&&STATE.view==='settings'||act==='nav-career'&&STATE.view==='career'||act==='nav-portfolio'&&STATE.view==='portfolio'||act==='nav-cv'&&STATE.view==='cv'?'active':''}" data-action="${act}" ${act==='placeholder'?`data-label="${label}"`:''}>${icon(ic)}${label}</button>`).join('')}</nav></main>`;
}
// IKHTIAR Settings v0.1.3 — interactive accordion with working personal preferences.
const SETTINGS_CARDS=[
 {id:'profile',title:'Akun & Profil',sub:'Informasi identitas dan akun',icon:'user'},
 {id:'security',title:'Keamanan Akun',sub:'Password, verifikasi, dan sesi',icon:'lock'},
 {id:'appearance',title:'Tampilan & Aksesibilitas',sub:'Tema dan kenyamanan membaca',icon:'sun'},
 {id:'privacy',title:'Privasi & Data',sub:'Penggunaan data dan kontrol akun',icon:'eye'},
 {id:'about',title:'Tentang IKHTIAR',sub:'Versi aplikasi dan pembaruan PWA',icon:'info'}
];
const ADMIN_CARDS=[
 {id:'platform',title:'Informasi Platform',sub:'Pengumuman resmi untuk pengguna',icon:'bell'},
 {id:'users',title:'Pengguna & Role',sub:'Direktori, pencarian, dan hak akses',icon:'users'},
 {id:'audit',title:'Audit & Sistem',sub:'Riwayat tindakan dan keamanan admin',icon:'shield'}
];
function settingCard(card,expanded,admin=false){
 const active=expanded===card.id;
 return `<section class="ik-setting-card ${active?'is-open':''}">
  <button type="button" class="ik-setting-toggle" data-action="${admin?'admin-section':'settings-section'}" data-section="${card.id}" aria-expanded="${active}" aria-controls="setting-panel-${admin?'admin-':''}${card.id}">
   <span class="ik-setting-icon">${icon(card.icon)}</span>
   <span class="ik-setting-heading"><strong>${card.title}</strong><small>${card.sub}</small></span>
   <span class="ik-setting-chevron">${icon('chevron-down')}</span>
  </button>
  ${active?`<div class="ik-setting-panel" id="setting-panel-${admin?'admin-':''}${card.id}">${admin?adminCardContent(card.id):settingsCardContent(card.id)}</div>`:''}
 </section>`;
}
function settingsPage(){
 const adminView=STATE.view==='admin-settings'&&isAdmin();
 const u=userInfo();
 return `<section class="ik-settings-page" aria-labelledby="ik-settings-heading">
  <div class="ik-settings-heading"><div class="ik-settings-eyebrow">${adminView?'WORKSPACE / ADMINISTRASI':'WORKSPACE / AKUN'}</div>
   <h1 id="ik-settings-heading">${adminView?'Panel Super Admin':'Pengaturan'}</h1>
   <p>${adminView?'Konfigurasi platform dan pengelolaan hak akses yang dipisahkan dari akun pribadi.':'Sesuaikan akun, keamanan, dan pengalaman menggunakan IKHTIAR.'}</p>${!adminView&&isAdmin()?`<button type="button" class="ik-settings-mobile-admin" data-action="nav-admin-settings">${icon('shield')} Panel Super Admin ${icon('arrow-right')}</button>`:''}</div>
  ${STATE.demo?`<div class="ik-settings-callout">${icon('info')} Mode demo: perubahan profil dan keamanan membutuhkan akun login asli.</div>`:''}
  <div class="ik-settings-grid"><div class="ik-settings-main">
   ${adminView?ADMIN_CARDS.map(c=>settingCard(c,STATE.adminSection,true)).join(''):SETTINGS_CARDS.map(c=>settingCard(c,STATE.settingSection)).join('')}
  </div><aside class="ik-settings-aside">
   <div class="ik-settings-summary"><div class="ik-settings-userline"><div class="ik-settings-avatar">${escapeHTML(u.initials)}</div><div><strong>${escapeHTML(u.name)}</strong><small>${escapeHTML(u.email)}</small></div></div>
    <div class="ik-settings-summary-divider"></div><div class="ik-settings-summary-item"><span>Hak akses</span><strong>${isAdmin()?'Super Admin':'User'}</strong></div>
    <div class="ik-settings-summary-item"><span>Versi</span><strong>v0.3.0</strong></div><div class="ik-settings-summary-item"><span>Status</span><strong>${STATE.demo?'Demo':'Akun aktif'}</strong></div></div>
   ${!adminView&&isAdmin()?`<button class="ik-settings-admin-link" data-action="nav-admin-settings">${icon('shield')} Buka Panel Super Admin ${icon('arrow-right')}</button>`:''}
   ${adminView?`<button class="ik-settings-admin-link" data-action="nav-settings">${icon('arrow-left')} Kembali ke Pengaturan Pribadi</button>`:''}
   <div class="ik-settings-hint"><strong>${icon('lock')} Privasi tetap utama</strong><p>Pengaturan pribadimu tidak memberikan akses ke data pengguna lain. Perubahan hak Super Admin hanya berlaku setelah diverifikasi oleh Supabase.</p></div>
  </aside></div>
 </section>`;
}
function settingsCardContent(id){const u=userInfo();
 if(id==='profile')return `<div class="ik-setting-readonly"><p>Identitas profesional cukup diperbarui di <strong>Profil Karier</strong>. Nama pada dashboard dan CV menggunakan data yang sama sehingga tidak perlu diperbarui dua kali.</p><div class="ik-setting-detail"><span class="ik-detail-label">Nama di IKHTIAR</span><strong>${escapeHTML(u.name)}</strong></div><div class="ik-setting-detail"><span class="ik-detail-label">Email untuk login</span><strong>${escapeHTML(u.email)}</strong></div><button type="button" class="btn btn-primary" data-action="nav-career">${icon('user')} Buka Profil Karier</button></div>`;
 if(id==='security')return `<div class="ik-settings-security">
  <div class="ik-setting-detail"><span class="ik-detail-label">Email terverifikasi</span><strong>${STATE.demo?'Demo':STATE.session?.user?.email_confirmed_at?'Sudah terverifikasi':'Belum terverifikasi'}</strong></div>
  <div class="ik-setting-detail"><span class="ik-detail-label">Pemulihan kata sandi</span><p>Kirim tautan pemulihan ke email akun yang sedang digunakan. Pengiriman mengikuti batas Supabase.</p><button class="btn btn-outline" type="button" data-action="settings-password-reset" ${STATE.demo||STATE.passwordBusy?'disabled':''}>${STATE.passwordBusy?'Mengirim...':'Kirim Tautan Ubah Password'}</button></div>
  <div class="ik-setting-detail"><span class="ik-detail-label">Kelola sesi</span><p>Keluar dari perangkat ini atau cabut sesi lain. Sesi lain dapat tetap aktif sampai token aksesnya kedaluwarsa.</p><div class="ik-security-actions"><button class="btn btn-outline" type="button" data-action="logout">Keluar dari perangkat ini</button><button class="btn ik-danger-outline" type="button" data-action="settings-logout-all" ${STATE.demo?'disabled':''}>Keluar dari Semua Perangkat</button></div></div>
 </div>`;
 if(id==='appearance')return `<div class="ik-setting-options"><div class="ik-setting-option-heading"><strong>Tema aplikasi</strong><p>Pilih tema atau ikuti pengaturan perangkat.</p></div>
  <div class="ik-segment-group" role="group" aria-label="Tema aplikasi">${[['light','Terang'],['dark','Gelap'],['system','Otomatis']].map(([v,l])=>`<button type="button" class="ik-segment ${STATE.themeMode===v?'selected':''}" data-action="settings-theme" data-value="${v}" aria-pressed="${STATE.themeMode===v}">${l}</button>`).join('')}</div>
  <div class="ik-setting-option-heading"><strong>Ukuran teks</strong><p>Sesuaikan ukuran teks antarmuka dashboard dan pengaturan.</p></div><div class="ik-segment-group" role="group" aria-label="Ukuran teks">${[[1,'Normal'],[1.1,'Besar'],[1.2,'Ekstra']].map(([v,l])=>`<button type="button" class="ik-segment ${STATE.fontScale===v?'selected':''}" data-action="settings-font" data-value="${v}" aria-pressed="${STATE.fontScale===v}">${l}</button>`).join('')}</div>
  <p class="ik-setting-fineprint">Preferensi tampilan tersimpan di browser ini, bukan disinkronkan ke perangkat lain.</p></div>`;
 if(id==='privacy')return `<div class="ik-setting-readonly"><p>Data akun digunakan untuk autentikasi dan identitas pengguna. Portofolio serta CV akan memiliki pengaturan privasi tersendiri ketika modulnya dirilis.</p>
  <div class="ik-info-line">${icon('shield')} Role akun dan hak akses dikendalikan melalui database, bukan disimpan sebagai preferensi browser.</div>
  <div class="ik-info-line">${icon('lock')} Fitur ekspor seluruh data dan penghapusan akun mandiri belum diaktifkan. Tidak ada tombol yang menjanjikan operasi tersebut sebelum backend tersedia.</div></div>`;
 if(id==='about')return `<div class="ik-setting-readonly"><div class="ik-setting-detail"><span class="ik-detail-label">IKHTIAR — Your Career, Your Move.</span><p>Progressive Web App untuk membangun portofolio, menyiapkan CV ATS, dan mengelola perjalanan karier.</p></div><div class="ik-setting-detail"><span class="ik-detail-label">Rilis frontend</span><strong>v0.3.0 — Portfolio Builder</strong></div><div class="ik-setting-detail"><span class="ik-detail-label">Pembaruan aplikasi</span><p>Periksa versi PWA terbaru tanpa menghapus Service Worker atau data browser.</p><button class="btn btn-outline" type="button" data-action="settings-check-update">${icon('settings')} Periksa Pembaruan</button></div></div>`;
 return '';
}
function adminCardContent(id){
 if(id==='platform')return `<form id="admin-announcement-form" class="ik-settings-form"><div class="ik-settings-description">Pengumuman akan ditampilkan di Dashboard pengguna setelah disimpan di Supabase. Tidak untuk menyimpan token, rahasia, atau kredensial.</div>
  <label for="admin-announcement">Pengumuman platform</label><textarea id="admin-announcement" name="announcement" rows="3" maxlength="240" placeholder="Contoh: Selamat datang di IKHTIAR!" ${!STATE.platformReady||STATE.platformBusy?'disabled':''}>${escapeHTML(STATE.platformNotice)}</textarea><small>Maksimal 240 karakter. Kosongkan untuk menyembunyikan pengumuman.</small>
  ${!STATE.platformReady?`<div class="ik-setting-warning">Fitur ini memerlukan migrasi Supabase <code>002_settings_roles.sql</code>. Belum tersambung ke konfigurasi platform.</div>`:''}
  <div class="ik-setting-actions"><button type="submit" class="btn btn-primary" ${!STATE.platformReady||STATE.platformBusy?'disabled':''}>${STATE.platformBusy?'Menyimpan...':'Publikasikan Pengumuman'}</button></div></form>`;
 if(id==='users')return adminUsersContent();
 if(id==='audit')return adminAuditContent();
 return '';
}
// IKHTIAR v0.1.4 — Privileged account directory, role workflow, and audit.
// All privileged operations are Supabase RPC calls that recheck Super Admin server-side.
const ADMIN_PAGE_SIZE=10;
function adminDate(value){
 if(!value)return 'Belum ada';
 const date=new Date(value);
 return Number.isNaN(date.valueOf())?'—':new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(date);
}
function adminRoleBadge(role){return `<span class="ik-admin-badge ${role==='super_admin'?'ik-admin-badge-admin':''}">${role==='super_admin'?'Super Admin':'User'}</span>`;}
function adminUsersContent(){
 const users=STATE.adminUsers;
 const total=STATE.adminUsersTotal;
 const from=users.length?STATE.adminUsersPage*ADMIN_PAGE_SIZE+1:0;
 const to=users.length?from+users.length-1:0;
 return `<div class="ik-admin-users" aria-label="Manajemen pengguna">
  <p class="ik-settings-description">Cari akun yang sudah terdaftar dan kelola role melalui Supabase. Perubahan role memerlukan konfirmasi dan dicatat dalam audit.</p>
  <form id="admin-users-search-form" class="ik-admin-search" role="search">
   <label class="ik-admin-search-label" for="admin-user-query">Cari email atau nama</label>
   <div class="ik-admin-search-row"><input id="admin-user-query" name="search" type="search" maxlength="80" autocomplete="off" placeholder="Cari nama atau email..." value="${escapeHTML(STATE.adminUsersSearch)}"><button class="btn btn-primary" type="submit" ${STATE.adminUsersBusy?'disabled':''}>${icon('search')} Cari</button></div>
  </form>
  ${STATE.adminUsersError?`<div class="ik-setting-warning" role="alert">${escapeHTML(STATE.adminUsersError)}<br>Pastikan SQL v0.1.4 telah dijalankan di Supabase.</div>`:''}
  <div class="ik-admin-list-heading"><span>${STATE.adminUsersLoaded?`${total} akun ditemukan`:'Direktori pengguna'}</span><button type="button" class="ik-admin-refresh" data-action="admin-refresh-users" ${STATE.adminUsersBusy?'disabled':''}>${icon('settings')} Refresh</button></div>
  ${STATE.adminUsersBusy?'<div class="ik-admin-empty" role="status">Memuat data pengguna...</div>':!STATE.adminUsersLoaded?'<div class="ik-admin-empty">Daftar akun ditampilkan setelah fungsi Supabase v0.1.4 siap.</div>':users.length===0?'<div class="ik-admin-empty">Tidak ada pengguna sesuai pencarian.</div>':`<div class="ik-admin-user-list">${users.map(user=>{
    const own=user.user_id===STATE.session?.user?.id;
    const newRole=user.role==='super_admin'?'user':'super_admin';
    const actionLabel=user.role==='super_admin'?'Cabut Super Admin':'Jadikan Super Admin';
    return `<article class="ik-admin-user-row"><div class="ik-admin-user-main"><span class="ik-admin-mini-avatar">${escapeHTML((user.display_name||user.email||'U').trim().charAt(0).toUpperCase())}</span><div class="ik-admin-user-identity"><strong>${escapeHTML(user.display_name||'Pengguna')}${own?' <span class="ik-admin-self">(Anda)</span>':''}</strong><small>${escapeHTML(user.email||'—')}</small><span class="ik-admin-user-date">Bergabung ${escapeHTML(adminDate(user.created_at))}</span></div></div><div class="ik-admin-user-controls">${adminRoleBadge(user.role)}<button type="button" class="ik-admin-role-button ${newRole==='user'?'is-revoke':''}" data-action="admin-change-role" data-user-id="${escapeHTML(user.user_id)}" ${own?'disabled title="Tidak dapat mengubah role akun sendiri"':''}>${own?'Akun sendiri':actionLabel}</button></div></article>`;
  }).join('')}</div>`}
  ${STATE.adminUsersLoaded&&!STATE.adminUsersBusy?`<div class="ik-admin-pagination"><small>Menampilkan ${from}–${to} dari ${total} akun</small><div><button type="button" class="ik-admin-page" data-action="admin-page-prev" ${STATE.adminUsersPage<=0?'disabled':''}>${icon('arrow-left')} Sebelumnya</button><button type="button" class="ik-admin-page" data-action="admin-page-next" ${to>=total?'disabled':''}>Berikutnya ${icon('arrow-right')}</button></div></div>`:''}
  <p class="ik-setting-fineprint">Email dan aktivitas login hanya dapat diakses oleh Super Admin yang terverifikasi. Role tidak dapat diubah melalui metadata pengguna atau localStorage.</p>
 </div>`;
}
function adminAuditContent(){
 return `<div class="ik-admin-audit"><p class="ik-settings-description">Riwayat perubahan role dan pengumuman platform sejak migrasi SQL v0.1.4 dipasang. Log lama sebelum migrasi tidak dibuat secara retroaktif.</p>
  <div class="ik-admin-list-heading"><strong>20 aktivitas terbaru</strong><button type="button" class="ik-admin-refresh" data-action="admin-refresh-audit" ${STATE.adminAuditBusy?'disabled':''}>${icon('settings')} Refresh</button></div>
  ${STATE.adminAuditError?`<div class="ik-setting-warning" role="alert">${escapeHTML(STATE.adminAuditError)}<br>Periksa migrasi SQL v0.1.4 di Supabase.</div>`:''}
  ${STATE.adminAuditBusy?'<div class="ik-admin-empty" role="status">Memuat riwayat admin...</div>':!STATE.adminAuditLoaded?'<div class="ik-admin-empty">Riwayat akan dimuat setelah fungsi audit tersedia.</div>':!STATE.adminAudit.length?'<div class="ik-admin-empty">Belum ada perubahan admin yang tercatat sejak migrasi dipasang.</div>':`<div class="ik-admin-audit-list">${STATE.adminAudit.map(item=>`<article class="ik-admin-audit-row"><div class="ik-admin-audit-icon">${icon(item.event_type==='role_changed'?'shield':'bell')}</div><div class="ik-admin-audit-copy"><strong>${item.event_type==='role_changed'?'Perubahan hak akses':'Pengumuman diperbarui'}</strong><p>${item.event_type==='role_changed'?`${escapeHTML(item.target_email||'Akun tidak tersedia')}: ${escapeHTML(item.old_value||'user')} → ${escapeHTML(item.new_value||'user')}`:'Pengumuman platform telah diubah'}</p><small>Oleh ${escapeHTML(item.actor_email||'Sistem')} · ${escapeHTML(adminDate(item.occurred_at))}</small></div></article>`).join('')}</div>`}
  <div class="ik-info-line">${icon('lock')} Log hanya dapat dibaca Super Admin. Tidak ada tombol hapus atau edit riwayat.</div>
 </div>`;
}
async function loadAdminUsers(){
 if(!isAdmin()||!STATE.supabase||STATE.adminUsersBusy)return;
 const accountId=STATE.session.user.id;
 STATE.adminUsersBusy=true;STATE.adminUsersError='';
 if(STATE.view==='admin-settings')render();
 try{
  const {data,error}=await STATE.supabase.rpc('ik_admin_list_users',{p_search:STATE.adminUsersSearch,p_page:STATE.adminUsersPage});
  if(error)throw error;
  if(!isAdmin()||STATE.session?.user?.id!==accountId)return;
  STATE.adminUsers=Array.isArray(data)?data:[];
  STATE.adminUsersTotal=Number(STATE.adminUsers[0]?.total_count||0);
  STATE.adminUsersLoaded=true;
 }catch(error){
  if(!isAdmin()||STATE.session?.user?.id!==accountId)return;
  console.warn('IKHTIAR admin users:',error?.message||error);
  STATE.adminUsers=[];STATE.adminUsersTotal=0;STATE.adminUsersLoaded=false;
  STATE.adminUsersError='Tidak dapat mengambil direktori pengguna.';
 }finally{STATE.adminUsersBusy=false;if(isAdmin()&&STATE.view==='admin-settings'&&STATE.adminSection==='users')render();}
}
async function loadAdminAudit(){
 if(!isAdmin()||!STATE.supabase||STATE.adminAuditBusy)return;
 const accountId=STATE.session.user.id;
 STATE.adminAuditBusy=true;STATE.adminAuditError='';
 if(STATE.view==='admin-settings')render();
 try{
  const {data,error}=await STATE.supabase.rpc('ik_admin_list_audit',{p_limit:20});
  if(error)throw error;
  if(!isAdmin()||STATE.session?.user?.id!==accountId)return;
  STATE.adminAudit=Array.isArray(data)?data:[];
  STATE.adminAuditLoaded=true;
 }catch(error){
  if(!isAdmin()||STATE.session?.user?.id!==accountId)return;
  console.warn('IKHTIAR admin audit:',error?.message||error);
  STATE.adminAudit=[];STATE.adminAuditLoaded=false;
  STATE.adminAuditError='Tidak dapat memuat riwayat aktivitas admin.';
 }finally{STATE.adminAuditBusy=false;if(isAdmin()&&STATE.view==='admin-settings'&&STATE.adminSection==='audit')render();}
}
function openAdminRoleDialog(id){
 if(!isAdmin()||STATE.adminRoleBusy)return;
 const user=STATE.adminUsers.find(x=>x.user_id===id);
 if(!user||id===STATE.session?.user?.id)return;
 STATE.adminRoleDialog={userId:user.user_id,email:user.email,displayName:user.display_name,currentRole:user.role,newRole:user.role==='super_admin'?'user':'super_admin'};
 render();
 ROOT.querySelector('[data-action="admin-role-cancel"]')?.focus();
}
function closeAdminRoleDialog(){if(STATE.adminRoleBusy)return;STATE.adminRoleDialog=null;render();}
function adminRoleConfirmModal(){
 const dlg=STATE.adminRoleDialog;
 if(!dlg||!isAdmin())return '';
 const promote=dlg.newRole==='super_admin';
 return `<div class="security-modal-backdrop ik-admin-modal-overlay" data-action="admin-role-backdrop"><section class="security-modal" role="dialog" aria-modal="true" aria-labelledby="admin-role-title" aria-describedby="admin-role-description">
  <div class="security-modal-header"><span class="security-modal-symbol">${icon('shield')}</span><button type="button" class="security-modal-close" data-action="admin-role-cancel" aria-label="Tutup dialog" ${STATE.adminRoleBusy?'disabled':''}>×</button></div>
  <h2 id="admin-role-title">${promote?'Jadikan Super Admin?':'Cabut hak Super Admin?'}</h2>
  <p id="admin-role-description">Akun <strong>${escapeHTML(dlg.email||dlg.displayName)}</strong> akan ${promote?'mendapat akses ke data akun dan konfigurasi administrasi':'kehilangan hak mengelola platform'}. Perubahan dicatat pada Audit & Sistem.</p>
  <div class="security-modal-actions"><button type="button" class="btn security-modal-cancel" data-action="admin-role-cancel" ${STATE.adminRoleBusy?'disabled':''}>Batal</button><button type="button" class="btn ${promote?'security-modal-confirm':'ik-admin-revoke-confirm'}" data-action="admin-role-confirm" ${STATE.adminRoleBusy?'disabled':''}>${STATE.adminRoleBusy?'Memproses...':promote?'Ya, Berikan Akses':'Ya, Cabut Akses'}</button></div>
 </section></div>`;
}
async function confirmAdminRoleChange(){
 const dlg=STATE.adminRoleDialog;
 if(!dlg||!isAdmin()||STATE.adminRoleBusy)return;
 STATE.adminRoleBusy=true;render();
 try{
  const {error}=await STATE.supabase.rpc('ik_admin_set_role',{p_target_user_id:dlg.userId,p_new_role:dlg.newRole});
  if(error)throw error;
  STATE.adminRoleDialog=null;
  STATE.adminUsersLoaded=false;
  STATE.adminAuditLoaded=false;
  toast(dlg.newRole==='super_admin'?'Hak Super Admin berhasil diberikan.':'Hak Super Admin berhasil dicabut.');
  await loadAdminUsers();
 }catch(error){
  console.warn('IKHTIAR role mutation:',error?.message||error);
  STATE.adminRoleDialog=null;
  toast(error?.message||'Perubahan hak akses gagal. Pastikan SQL v0.1.4 sudah terpasang.');
 }finally{STATE.adminRoleBusy=false;if(isAdmin()&&STATE.view==='admin-settings')render();}
}

async function sendSettingsPasswordReset(){
 if(STATE.passwordBusy||STATE.demo||!STATE.supabase||!STATE.session?.user?.email)return;
 STATE.passwordBusy=true;render();
 try{
  const {error}=await STATE.supabase.auth.resetPasswordForEmail(STATE.session.user.email,{redirectTo:location.origin+location.pathname});
  if(error)throw error;
  toast('Jika pengiriman tersedia, tautan pemulihan dikirim ke email akun.');
 }catch(error){toast(/rate limit/i.test(error?.message||'')?'Batas pengiriman email tercapai. Coba lagi nanti.':error?.message||'Pengiriman gagal.');}
 finally{STATE.passwordBusy=false;render();}
}
async function saveAdminAnnouncement(form){
 if(!isAdmin()||!STATE.supabase||!STATE.platformReady||STATE.platformBusy)return;
 const announcement=String(new FormData(form).get('announcement')||'').trim();
 if(announcement.length>240){toast('Pengumuman maksimal 240 karakter.');return;}
 STATE.platformBusy=true;
 try{
  const {data,error}=await STATE.supabase.from('platform_settings').update({announcement}).eq('id','main').select('announcement').single();
  if(error)throw error;
  STATE.platformNotice=String(data.announcement||'');
  toast('Pengumuman resmi berhasil dipublikasikan.');
 }catch(error){toast(error?.message||'Gagal menyimpan pengumuman. Pastikan izin Super Admin dan RLS sudah benar.');}
 finally{STATE.platformBusy=false;render();}
}
async function checkPWAUpdate(){
 if(!('serviceWorker' in navigator)){toast('Browser ini belum mendukung Service Worker.');return;}
 try{
  const reg=await navigator.serviceWorker.getRegistration('./');
  if(!reg){toast('Service Worker belum terpasang. Coba buka kembali IKHTIAR.');return;}
  await reg.update();
  toast(reg.waiting?'Update siap. Gunakan banner Perbarui Sekarang.':'Pemeriksaan pembaruan selesai.');
 }catch(error){toast('Tidak dapat memeriksa pembaruan. Periksa koneksi internet.');}
}

function logoutModal(){
 if(!STATE.logoutDialog)return '';
 const pending=STATE.busyLogout;const global=STATE.logoutScope==='global';
 return `<div class="security-modal-backdrop" data-action="logout-backdrop">
   <section class="security-modal" role="dialog" aria-modal="true" aria-labelledby="logout-dialog-title" aria-describedby="logout-dialog-description">
     <div class="security-modal-header"><span class="security-modal-symbol">${icon('log-out')}</span>
       <button type="button" class="security-modal-close" data-action="cancel-logout" aria-label="Tutup dialog" ${pending?'disabled':''}>×</button></div>
     <h2 id="logout-dialog-title">${global?'Keluar dari semua perangkat?':'Keluar dari IKHTIAR?'}</h2>
     <p id="logout-dialog-description">${STATE.demo?'Anda akan keluar dari dashboard demo.':global?'Refresh token akun akan dicabut pada semua perangkat. Sesi lain mungkin masih aktif sampai token aksesnya kedaluwarsa.':'Sesi akun di browser ini akan diakhiri. Anda perlu masuk lagi untuk membuka dashboard.'}</p>
     <div class="security-modal-actions">
       <button type="button" class="btn security-modal-cancel" data-action="cancel-logout" ${pending?'disabled':''}>Batal</button>
       <button type="button" class="btn security-modal-confirm" data-action="confirm-logout" ${pending?'disabled':''}>${pending?'Sedang keluar...':`${icon('log-out')} Ya, Keluar`}</button>
     </div>
   </section>
 </div>`;
}
function render(){
 if(STATE.view==='career'&&career.hasUnsaved())career.syncForm();
 if(STATE.view==='portfolio'&&portfolio.hasUnsaved())portfolio.syncForm();
 document.body.classList.toggle('dark',['dashboard','settings','admin-settings','career','cv','portfolio'].includes(STATE.view)&&STATE.dark);
 document.body.classList.toggle('security-modal-open',STATE.logoutDialog||!!STATE.adminRoleDialog);
 ROOT.innerHTML=(STATE.view==='splash'?splash():STATE.view==='onboarding'?onboarding():STATE.view==='portfolio-preview'||STATE.view.startsWith('p/')?portfolio.publicPage():['dashboard','settings','admin-settings','career','cv','portfolio'].includes(STATE.view)?dashboard():auth())+logoutModal()+adminRoleConfirmModal();
}
function openLogoutDialog(scope='local'){
 if(STATE.busyLogout || STATE.logoutDialog)return;
 STATE.logoutScope=scope==='global'?'global':'local';
 STATE.logoutDialog=true;
 render();
 ROOT.querySelector('[data-action="cancel-logout"]')?.focus();
}
function closeLogoutDialog(){
 if(!STATE.logoutDialog||STATE.busyLogout)return;
 STATE.logoutDialog=false;
 render();
 ROOT.querySelector('[data-action="logout"]')?.focus();
}
function finishOnboarding(){localStorage.setItem('ikhtiar:onboarding:done','1');STATE.mode='login';STATE.authNotice='';STATE.authError='';go('auth');}
function setMode(mode){STATE.mode=mode;STATE.authNotice='';STATE.authError='';STATE.passwordVisible=false;render();}
async function loginSubmit(form){
 if(!STATE.supabase){toast('Hubungkan Supabase di config.js untuk mengaktifkan login.');return;}
 if(STATE.mode==='verify'){await resendVerification(form);return;}
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
async function resendVerification(form){
 if(!STATE.supabase||STATE.busy)return;
 const email=String(new FormData(form).get('email')||'').trim();
 if(!email||!form.querySelector('#email')?.checkValidity()){
  STATE.authError='resend';STATE.authNotice='Masukkan alamat email yang valid.';render();return;
 }
 const wait=60_000-(Date.now()-STATE.resendAt);
 if(wait>0){toast(`Tunggu sekitar ${Math.ceil(wait/1000)} detik sebelum meminta ulang.`);return;}
 STATE.busy=true;STATE.authError='';STATE.authNotice='';render();
 try{
  const {error}=await STATE.supabase.auth.resend({
   type:'signup',email,
   options:{emailRedirectTo:location.origin+location.pathname}
  });
  if(error)throw error;
  STATE.resendAt=Date.now();
  STATE.authNotice='Jika akun masih menunggu konfirmasi, permintaan email verifikasi telah diproses. Periksa inbox dan spam.';
 }catch(err){
  STATE.authError='resend';
  STATE.authNotice=/rate limit|too many requests/i.test(err?.message||'')
   ?'Batas pengiriman email Supabase tercapai. Tunggu hingga kuota pulih, lalu coba kembali. Menghapus akun tidak mengatur ulang batas ini.'
   :(err?.message||'Gagal meminta email verifikasi. Coba lagi nanti.');
 }finally{STATE.busy=false;render();}
}
async function googleLogin(){if(!STATE.supabase){toast('Supabase belum dikonfigurasi.');return;}try{const {error}=await STATE.supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});if(error)throw error;}catch(e){STATE.authError='oauth';STATE.authNotice=e?.message||'Tidak dapat masuk dengan Google.';render();}}
async function confirmLogout(){
 if(STATE.busyLogout||!STATE.logoutDialog)return;
 STATE.busyLogout=true;
 STATE.localLogoutInProgress=true;
 render();
 try{
   if(!STATE.demo){
     if(!STATE.supabase)throw new Error('Layanan autentikasi tidak tersedia.');
     // Explicit local scope: logout on this browser; other devices stay signed in.
     const {error}=await STATE.supabase.auth.signOut({scope:STATE.logoutScope});
     if(error)throw error;
   }
   STATE.demo=false;
   STATE.session=null;
   STATE.logoutDialog=false;
   STATE.busyLogout=false;
   STATE.mode='login';
   STATE.authNotice='';
   STATE.authError='';
   go('auth');
   toast('Anda berhasil keluar dari IKHTIAR.');
 }catch(error){
   STATE.busyLogout=false;
   STATE.logoutDialog=true;
   render();
   toast(error?.message||'Logout gagal. Silakan coba lagi.');
 }finally{STATE.localLogoutInProgress=false;}
}
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
 if(action==='auth-verify')setMode('verify');
 if(action==='toggle-password'){const input=document.getElementById('password');const oldPos=input?.selectionStart;STATE.passwordVisible=!STATE.passwordVisible;if(input){input.type=STATE.passwordVisible?'text':'password';input.focus();try{input.setSelectionRange(oldPos,oldPos)}catch{}}const btn=actionEl;btn.innerHTML=icon(STATE.passwordVisible?'eye-off':'eye');btn.setAttribute('aria-label',STATE.passwordVisible?'Sembunyikan kata sandi':'Tampilkan kata sandi');}
 if(action==='google-login')await googleLogin();
 if(action==='view-demo'){career.clear();portfolio.clear();STATE.demo=true;STATE.role='user';STATE.roleReady=true;go('dashboard');}
 if(action==='toggle-theme')setTheme(STATE.dark?'light':'dark');
 if(await portfolio.handleClick(action,actionEl))return;
 if(await career.handleClick(action,actionEl))return;
 if(action==='nav-dashboard')go('dashboard');
 if(action==='nav-settings'){STATE.settingSection='profile';go('settings');}
 if(action==='nav-admin-settings'){
  if(isAdmin()){STATE.adminSection='platform';go('admin-settings');}
  else toast('Akses hanya untuk Super Admin yang diverifikasi oleh Supabase.');
 }
 if(action==='settings-section'){
  const id=actionEl.dataset.section;
  if(SETTINGS_CARDS.some(c=>c.id===id)){STATE.settingSection=STATE.settingSection===id?'':id;render();}
 }
 if(action==='admin-section'&&isAdmin()){
  const id=actionEl.dataset.section;
  if(ADMIN_CARDS.some(c=>c.id===id)){STATE.adminSection=STATE.adminSection===id?'':id;render();if(STATE.adminSection==='users'&&!STATE.adminUsersLoaded)loadAdminUsers();if(STATE.adminSection==='audit'&&!STATE.adminAuditLoaded)loadAdminAudit();}
 }
 if(action==='admin-refresh-users'&&isAdmin())await loadAdminUsers();
 if(action==='admin-refresh-audit'&&isAdmin())await loadAdminAudit();
 if(action==='admin-page-prev'&&isAdmin()&&STATE.adminUsersPage>0){STATE.adminUsersPage--;await loadAdminUsers();}
 if(action==='admin-page-next'&&isAdmin()&&((STATE.adminUsersPage+1)*ADMIN_PAGE_SIZE)<STATE.adminUsersTotal){STATE.adminUsersPage++;await loadAdminUsers();}
 if(action==='admin-change-role'&&isAdmin())openAdminRoleDialog(actionEl.dataset.userId);
 if(action==='admin-role-cancel')closeAdminRoleDialog();
 if(action==='admin-role-backdrop'&&evt.target===actionEl)closeAdminRoleDialog();
 if(action==='admin-role-confirm')await confirmAdminRoleChange();
 if(action==='settings-theme')setTheme(actionEl.dataset.value);
 if(action==='settings-font'){
  const n=Number(actionEl.dataset.value);
  if(FONT_SCALES.includes(n)){STATE.fontScale=n;localStorage.setItem('ikhtiar:font-scale',String(n));render();}
 }
 if(action==='settings-password-reset')await sendSettingsPasswordReset();
 if(action==='settings-check-update')await checkPWAUpdate();
 if(action==='settings-logout-all')openLogoutDialog('global');
 if(action==='logout')openLogoutDialog('local');
 if(action==='cancel-logout')closeLogoutDialog();
 if(action==='logout-backdrop' && evt.target===actionEl)closeLogoutDialog();
 if(action==='confirm-logout')await confirmLogout();
 if(action==='placeholder')toast(`${actionEl.dataset.label||'Fitur ini'} akan tersedia pada milestone berikutnya. Modul ini sedang disiapkan pada milestone berikutnya.`);
});
ROOT.addEventListener('input',evt=>{career.onInput(evt.target);portfolio.onInput(evt.target);});
ROOT.addEventListener('submit',async evt=>{
 if(['ik-portfolio-site-form','ik-portfolio-project-form'].includes(evt.target.id)){evt.preventDefault();await portfolio.handleSubmit(evt.target);return;}
 if(['career-form','cv-generate-form'].includes(evt.target.id)){evt.preventDefault();await career.handleSubmit(evt.target);return;}
 if(evt.target.id==='auth-form'){evt.preventDefault();await loginSubmit(evt.target);}
 if(evt.target.id==='admin-announcement-form'){evt.preventDefault();await saveAdminAnnouncement(evt.target);}
 if(evt.target.id==='admin-users-search-form'){
  evt.preventDefault();
  if(!isAdmin()||STATE.adminUsersBusy)return;
  STATE.adminUsersSearch=String(new FormData(evt.target).get('search')||'').trim().slice(0,80);
  STATE.adminUsersPage=0;
  await loadAdminUsers();
 }
});
window.addEventListener('hashchange',()=>{
 if(!STATE.authReady||!STATE.splashDone)return;
 const requested=location.hash.replace(/^#\//,'').split('?')[0];
 if(STATE.view==='portfolio'&&requested!=='portfolio'&&STATE.session&&portfolio.hasUnsaved()){
  if(!window.confirm(portfolio.dirtyWarning())){location.hash='/portfolio';return;}
  portfolio.discard();
 }
 if(STATE.view==='career'&&requested!=='career'&&STATE.session&&career.hasUnsaved()){
  if(!window.confirm('Profil belum disimpan. Tinggalkan halaman dan batalkan perubahan?')){location.hash='/career';return;}
 }
 if(requested.startsWith('p/')){if(STATE.view!==requested){STATE.view=requested;render();portfolio.openView(requested);}return;}
 if(['dashboard','settings','admin-settings','career','cv','portfolio','portfolio-preview'].includes(requested)){
  if(!STATE.session&&!STATE.demo){go('auth');return;}
  if(requested==='admin-settings'&&!isAdmin()){go('settings');return;}
  if(STATE.view!==requested){STATE.view=requested;render();if(['career','cv'].includes(requested))career.open(requested);if(['portfolio','portfolio-preview'].includes(requested))portfolio.openView(requested);if(requested==='admin-settings'){loadPlatformSettings();if(STATE.adminSection==='users')loadAdminUsers();if(STATE.adminSection==='audit')loadAdminAudit();}}
 }else if(requested==='auth'&&!STATE.session&&STATE.view!=='auth'){STATE.view='auth';render();}
});
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{
 if(STATE.themeMode==='system'){STATE.dark=systemDark();render();}
});
document.addEventListener('keydown',evt=>{
 if(!STATE.logoutDialog&&!STATE.adminRoleDialog)return;
 if(evt.key==='Escape'){evt.preventDefault();if(STATE.adminRoleDialog)closeAdminRoleDialog();else closeLogoutDialog();return;}
 if(evt.key!=='Tab')return;
 const nodes=[...ROOT.querySelectorAll('.security-modal button:not(:disabled)')];
 if(!nodes.length){evt.preventDefault();return;}
 const first=nodes[0],last=nodes[nodes.length-1],active=document.activeElement;
 if(!nodes.includes(active)){evt.preventDefault();first.focus();return;}
 if(evt.shiftKey&&active===first){evt.preventDefault();last.focus();}
 else if(!evt.shiftKey&&active===last){evt.preventDefault();first.focus();}
});
window.addEventListener('beforeunload',evt=>{if(STATE.session&&(career.hasUnsaved()||portfolio.hasUnsaved())){evt.preventDefault();evt.returnValue='';}});
window.addEventListener('focus',checkSession);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkSession();});
window.addEventListener('online',checkSession);
function init(){
 render();
 authInit();
 setTimeout(()=>{STATE.splashDone=true;startRoute()},1200);
 setInterval(checkSession,5*60_000);
 if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      let acceptingUpdate=false;
      const showUpdate=()=>{
        if(!reg.waiting || !navigator.serviceWorker.controller || document.getElementById('ik-update-banner'))return;
        const bar=document.createElement('aside');
        bar.id='ik-update-banner';bar.className='ik-update-banner';bar.setAttribute('role','status');
        bar.innerHTML='<span>Versi baru IKHTIAR tersedia.</span><button type="button" id="ik-update-apply">Perbarui sekarang</button><button type="button" id="ik-update-later" aria-label="Nanti">Nanti</button>';
        document.body.append(bar);
        bar.querySelector('#ik-update-later').addEventListener('click',()=>bar.remove());
        bar.querySelector('#ik-update-apply').addEventListener('click',()=>{
          if(career.hasUnsaved()||portfolio.hasUnsaved()){toast('Simpan perubahan Profil Karier atau Portofolio sebelum memperbarui aplikasi.');return;}
          acceptingUpdate=true;bar.querySelector('#ik-update-apply').disabled=true;
          reg.waiting?.postMessage({type:'SKIP_WAITING'});
        });
      };
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(acceptingUpdate)location.reload();
      });
      reg.addEventListener('updatefound',()=>{
        const worker=reg.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed')showUpdate();});
      });
      showUpdate();
      const check=()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});};
      document.addEventListener('visibilitychange',check);
      window.addEventListener('focus',check);
      setInterval(check,60*60*1000);
      check();
    }catch(err){console.warn('SW:',err.message);}
  });
}
}
init();