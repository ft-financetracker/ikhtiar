import { CONFIG } from '../config.js';
import { createCareerModule } from './career.js?v=0.9.7';
import { createPortfolioModule } from './portfolio.js?v=0.9.7';
import { createJobsModule } from './jobs.js?v=0.9.7';
import { createSupportModule } from './support.js?v=0.9.7';

const ROOT = document.getElementById('app');
const TOAST = document.getElementById('toast');
const icon = (id, css = '') => `<svg class="i ${css}" aria-hidden="true"><use href="#ic-${id}"></use></svg>`;
const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Shared, accessible IKHTIAR confirmation overlay; deliberately outside ROOT so re-renders cannot destroy it.
let dialogOpen=false;
function askConfirm(message,{title='Konfirmasi Tindakan',confirmLabel='Lanjutkan',danger=false}={}){
 if(dialogOpen)return Promise.resolve(false);
 dialogOpen=true;
 const previous=document.activeElement;
 const modal=document.createElement('div');
 modal.className='ik-confirm-backdrop';
 modal.innerHTML=`<section class="ik-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="ik-confirm-title" aria-describedby="ik-confirm-message"><div class="ik-confirm-mark">${icon('shield')}</div><h2 id="ik-confirm-title">${escapeHTML(title)}</h2><p id="ik-confirm-message">${escapeHTML(message)}</p><div class="ik-confirm-actions"><button class="btn btn-outline" type="button" data-confirm-choice="cancel">Batal</button><button class="btn ${danger?'ik-confirm-danger':'btn-primary'}" type="button" data-confirm-choice="accept">${escapeHTML(confirmLabel)}</button></div></section>`;
 document.body.append(modal);
 return new Promise(resolve=>{
  const cancel=modal.querySelector('[data-confirm-choice="cancel"]');
  const accept=modal.querySelector('[data-confirm-choice="accept"]');
  const finish=(value)=>{modal.removeEventListener('click',click);document.removeEventListener('keydown',key,true);modal.remove();dialogOpen=false;if(previous?.isConnected)previous.focus({preventScroll:true});resolve(value);};
  const click=(event)=>{const target=event.target.closest('[data-confirm-choice]');if(target){finish(target.dataset.confirmChoice==='accept');return;}if(event.target===modal)finish(false);};
  const key=(event)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(false);return;}if(event.key==='Tab'){const focusables=[cancel,accept];let idx=focusables.indexOf(document.activeElement);if(!event.shiftKey&&idx===1){event.preventDefault();cancel.focus();}else if(event.shiftKey&&(idx===0||idx===-1)){event.preventDefault();accept.focus();}}};
  modal.addEventListener('click',click);document.addEventListener('keydown',key,true);cancel.focus({preventScroll:true});
 });
}
const brand = (invert=false) => `<a href="#/auth" data-action="brand-home" class="brand ${invert?'invert':''}" aria-label="IKHTIAR"><img src="./assets/brand/logo-mark.png" alt=""><span><strong>IKHTIAR</strong><small>Your Career, Your Move.</small></span></a>`;
const initialSeen = () => localStorage.getItem('ikhtiar:onboarding:done') === '1';
const THEME_MODES=['light','dark','system'];
const savedTheme=localStorage.getItem('ikhtiar:theme');
const preferredTheme=THEME_MODES.includes(savedTheme)?savedTheme:'system';
const systemDark=()=>window.matchMedia?.('(prefers-color-scheme: dark)').matches??false;
const FONT_SCALES=[1,1.1,1.2];
const storedScale=Number(localStorage.getItem('ikhtiar:font-scale'));
const STATE = {view:'splash', slide:0, mode:'login', session:null, supabase:null, authReady:false, splashDone:false, authError:'', authNotice:'', passwordVisible:false, busy:false, resendEmail:'', resendAt:0, logoutDialog:false, logoutScope:'local', busyLogout:false, localLogoutInProgress:false, sessionCheckAt:0, sessionChecking:false, demo:false, themeMode:preferredTheme, dark:preferredTheme==='dark'||(preferredTheme==='system'&&systemDark()), fontScale:FONT_SCALES.includes(storedScale)?storedScale:1, settingSection:'', adminSection:'', role:'user', roleReady:false, roleRequest:0, platformNotice:'', platformReady:false, platformBusy:false, profileBusy:false, passwordBusy:false, adminUsers:[], adminUsersTotal:0, adminUsersSearch:'', adminUsersPage:0, adminUsersBusy:false, adminUsersLoaded:false, adminUsersError:'', adminAudit:[], adminAuditBusy:false, adminAuditLoaded:false, adminAuditError:'', adminRoleDialog:null, adminRoleBusy:false, adminOverview:null, adminOverviewLoaded:false, adminOverviewBusy:false, adminOverviewError:'', dataExportBusy:false, careerProfile:null, betaItems:[], betaLoaded:false, betaLoading:false, betaError:'', betaSavingId:null, betaDrafts:{}};
const slides = [
  {tag:'01 · SHOW YOUR WORK',title:'Tunjukkan karya. <span class="grad-text">Buka peluang.</span>',desc:'Bangun portofolio profesional yang terasa seperti dirimu. Tampilkan proyek, skill, dan pencapaian melalui satu tautan yang mudah dibagikan.',top:'Portofolio Online',bottom:'Karyamu, identitasmu',caption:'Perjalanan besar dimulai dari karya kecil yang kamu banggakan.'},
  {tag:'02 · BUILT FOR YOUR CAREER',title:'CV profesional, <span class="grad-text">lebih mudah.</span>',desc:'Susun CV ATS-friendly dari profil yang sama. Pilih template minimalis, lihat pratinjau langsung, dan siapkan dokumen untuk peluang berikutnya.',top:'CV ATS Ready',bottom:'Format yang lebih rapi',caption:'Bukan sekadar terlihat bagus — informasi penting juga harus mudah ditemukan.'},
  {tag:'03 · TAKE YOUR NEXT STEP',title:'Peluang terbaik, <span class="grad-text">menunggu langkahmu.</span>',desc:'Temukan lowongan, simpan posisi menarik, dan pantau proses lamaran. Semua perjalanan kariermu di satu tempat.',top:'Cari Peluang',bottom:'Selangkah lebih dekat',caption:'Buka kemungkinan baru dan bergerak menuju karier yang kamu pilih.'},
];
function toast(message){ TOAST.textContent=message;TOAST.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>TOAST.classList.remove('show'),3500); }
function isAdmin(){return !STATE.demo&&!!STATE.session&&STATE.roleReady&&STATE.role==='super_admin';}
const career=createCareerModule({state:STATE,render,toast,go,icon,escapeHTML,getUser:userInfo,askConfirm});
const portfolio=createPortfolioModule({state:STATE,render,toast,go,icon,escapeHTML,getUser:userInfo,askConfirm});
const jobs=createJobsModule({state:STATE,render,toast,go,icon,escapeHTML,isAdmin,askConfirm,prepareCV:(company,position)=>career.prepareCV(company,position)});
const support=createSupportModule({state:STATE,render,toast,escapeHTML,icon,isAdmin});
async function go(view){
 if(STATE.view==='admin-settings'&&view!=='admin-settings'&&STATE.adminSection==='platform'){
  const noticeInput=document.querySelector('#admin-announcement-form [name="announcement"]');
  if(noticeInput&&noticeInput.value!==STATE.platformNotice&&!await askConfirm('Pengumuman belum disimpan. Tinggalkan halaman dan batalkan perubahan?'))return;
 }
 if(STATE.view==='admin-settings'&&view!=='admin-settings'&&hasBetaDraft()){
  if(!await askConfirm('Ada catatan audit beta yang belum disimpan. Tinggalkan halaman?'))return;
  STATE.betaDrafts={};
 }
 if(STATE.view==='portfolio'&&view!=='portfolio'&&STATE.session&&portfolio.hasUnsaved()){
  if(!await askConfirm(portfolio.dirtyWarning()))return;
  portfolio.discard();
 }
 if(['jobs','applications','admin-settings'].includes(STATE.view)&&view!==STATE.view&&jobs.hasUnsaved()){
  if(!await askConfirm('Ada perubahan lowongan atau lamaran yang belum disimpan. Tinggalkan halaman?'))return;
  jobs.discard();
 }
 if(STATE.view==='support'&&view!=='support'&&STATE.session&&support.hasUnsaved()){if(!await askConfirm('Laporan belum dikirim. Tinggalkan halaman dan batalkan isinya?'))return;}
 if(STATE.view==='career'&&view!=='career'&&STATE.session&&career.hasUnsaved()){
  if(!await askConfirm('Profil belum disimpan. Tinggalkan halaman dan batalkan perubahan?'))return;
 }
 if(view==='admin-settings'&&!isAdmin())view='settings';
 // Every fresh visit starts with closed accordions; never expose a random form by default.
 if(view==='settings'&&STATE.view!==view)STATE.settingSection='';
 if(view==='admin-settings'&&STATE.view!==view)STATE.adminSection='';
 if(['dashboard','settings','admin-settings','career','cv','portfolio','portfolio-preview','jobs','applications','support'].includes(view)&&!STATE.session&&!STATE.demo)view='auth';
 STATE.view=view;
 location.hash=`/${view}`;
 render();
 window.scrollTo(0,0);
 if(view==='career'||view==='cv')career.open(view);
 if(view==='portfolio'||view==='portfolio-preview'||view.startsWith('p/'))portfolio.openView(view);
 if(['jobs','applications'].includes(view))jobs.open(view);
 if(view.startsWith('resume/'))career.openPublic(view.slice(7));
 if(view==='support')support.loadOwn();
 if(view==='admin-settings'){loadPlatformSettings();if(STATE.adminSection==='users')loadAdminUsers();if(STATE.adminSection==='audit')loadAdminAudit();if(STATE.adminSection==='job-listings')jobs.loadAdmin();if(STATE.adminSection==='moderation')jobs.loadModeration();if(STATE.adminSection==='overview')loadAdminOverview();if(STATE.adminSection==='support')support.loadAdmin();if(STATE.adminSection==='readiness')loadBetaGate();}
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
 STATE.adminUsers=[];STATE.adminUsersLoaded=false;STATE.adminAudit=[];STATE.adminAuditLoaded=false;STATE.adminOverview=null;STATE.adminOverviewLoaded=false;STATE.adminRoleDialog=null;STATE.betaItems=[];STATE.betaLoaded=false;STATE.betaError='';STATE.betaDrafts={};
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
  go(['trust','privacy','terms'].includes(requested)||requested.startsWith('p/')||requested.startsWith('resume/')||['settings','admin-settings','career','cv','portfolio','portfolio-preview','jobs','applications','support'].includes(requested)?requested:'dashboard');
  return;
 }
 const requested=location.hash.replace(/^#\//,'').split('?')[0];
 if(requested.startsWith('p/')||requested.startsWith('resume/')||['trust','privacy','terms'].includes(requested)){go(requested);return;}
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
    if(session&&previousSession?.user?.id&&previousSession.user.id!==session.user.id){career.clear();portfolio.clear();jobs.clear();support.reset();}
    if(event==='SIGNED_IN'&&session){
      // Schedule asynchronous database access outside the Auth callback.
      Promise.resolve().then(()=>loadRole(session.user.id));
      Promise.resolve().then(()=>loadPlatformSettings());
      Promise.resolve().then(()=>career.load());
      Promise.resolve().then(()=>career.loadVersions());
      Promise.resolve().then(()=>portfolio.load());
      Promise.resolve().then(()=>jobs.load());
    }
    if(event==='PASSWORD_RECOVERY'){
      STATE.logoutDialog=false;
      STATE.mode='newPassword';
      go('auth');
      return;
    }
    if(event==='SIGNED_OUT'){support.reset();
      ++STATE.roleRequest;STATE.role='user';STATE.roleReady=false;STATE.platformNotice='';STATE.platformReady=false;
      STATE.adminUsers=[];STATE.adminUsersLoaded=false;STATE.adminUsersError='';STATE.adminAudit=[];STATE.adminAuditLoaded=false;STATE.adminAuditError='';STATE.adminOverview=null;STATE.adminOverviewLoaded=false;STATE.adminOverviewError='';STATE.adminRoleDialog=null;career.clear();portfolio.clear();jobs.clear();
      const intentional=STATE.localLogoutInProgress;
      STATE.logoutDialog=false;STATE.adminRoleDialog=null;
      STATE.busyLogout=false;
      if(!STATE.demo && STATE.authReady && STATE.splashDone && (['dashboard','settings','admin-settings','career','cv','portfolio','portfolio-preview','jobs','applications','support'].includes(STATE.view)||previousSession)&&!STATE.view.startsWith('resume/')&&!STATE.view.startsWith('p/')){
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
  if(STATE.session){await loadRole(STATE.session.user.id);await loadPlatformSettings();await career.load();career.loadVersions();portfolio.load();jobs.load();}
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
       if(['dashboard','settings','admin-settings','career','cv','portfolio','jobs','applications','support'].includes(STATE.view))go('auth');
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
 </div><footer class="auth-foot">IKHTIAR v0.9.7 · <button type="button" class="ik-footer-link" data-action="nav-trust">Pusat Kepercayaan</button> · <button type="button" class="ik-footer-link" data-action="nav-privacy">Privasi</button> · <button type="button" class="ik-footer-link" data-action="nav-terms">Ketentuan</button><br>Mode demo tidak menyimpan data pengguna ke Supabase.</footer></section></main>`;
}
function userInfo(){const u=STATE.session?.user;let email=u?.email||'';let meta=u?.user_metadata||{};let name=STATE.demo?'Pengguna Demo':(STATE.careerProfile?.full_name||meta.full_name||meta.name||meta.display_name||email.split('@')[0]||'Pengguna IKHTIAR');return {name,email:STATE.demo?'Akun simulasi · tanpa data asli':email, initials:String(name).trim().slice(0,1).toUpperCase()||'I'};}
function navAction(type,title,ic,isActive=false){
 const action=type==='dashboard'?'nav-dashboard':type==='settings'?'nav-settings':type==='admin-settings'?'nav-admin-settings':type==='career'?'nav-career':type==='portfolio'?'nav-portfolio':type==='cv'?'nav-cv':type==='job'?'nav-jobs':type==='applications'?'nav-applications':type==='support'?'nav-support':'placeholder';
 return `<button class="nav-item ${isActive?'active':''}" data-action="${action}" ${action==='placeholder'?`data-label="${escapeHTML(title)}"`:''} ${isActive?'aria-current="page"':''}>${icon(ic)} ${title}</button>`;
}
// IKHTIAR v0.9.2 — one moving active indicator and matching curved dock.
// Secondary routes use the Menu tab; opening Menu highlights that same tab.
const MOBILE_PRIMARY_NAV=[
 ['user','Profil','nav-career','career'],
 ['file','CV','nav-cv','cv'],
 ['home','Beranda','nav-dashboard','dashboard'],
 ['briefcase','Loker','nav-jobs','jobs'],
 ['menu','Menu','nav-mobile-menu','more']
];
function ikNavIndex(view){
 const found=MOBILE_PRIMARY_NAV.findIndex(row=>row[3]===view);
 return found<0?4:found;
}
function ikNavShapeAt(index){
 const cx=50+100*index;
 const n=value=>Number(value.toFixed(3));
 return `M0 14 H${n(cx-46)} C${n(cx-37)} 14 ${n(cx-34)} 22 ${n(cx-29)} 34 C${n(cx-22)} 61 ${n(cx+22)} 61 ${n(cx+29)} 34 C${n(cx+34)} 22 ${n(cx+37)} 14 ${n(cx+46)} 14 H500 V110 H0 Z`;
}
function ikDockPosition(nav,position){
 const bubble=nav.querySelector('.ik-mobile-nav-bubble');
 const shape=nav.querySelector('.ik-mobile-nav-surface path');
 if(bubble)bubble.style.left=`${10+20*position}%`;
 if(shape)shape.setAttribute('d',ikNavShapeAt(position));
 nav.dataset.position=String(position);
}
function ikDockSelect(nav,index,animate=true){
 if(!nav)return;
 const previous=Number(nav.dataset.position??nav.dataset.activeIndex??index);
 const end=Math.max(0,Math.min(4,index));
 if(nav._ikNavAnimation)cancelAnimationFrame(nav._ikNavAnimation);
 nav.dataset.activeIndex=String(end);
 nav.querySelectorAll('.ik-mobile-tab').forEach((tab,i)=>{
  const active=i===end;
  tab.classList.toggle('active',active);
  if(active && i!==4)tab.setAttribute('aria-current','page');
  else tab.removeAttribute('aria-current');
 });
 const bubble=nav.querySelector('.ik-mobile-nav-bubble');
 if(bubble)bubble.innerHTML=icon(MOBILE_PRIMARY_NAV[end][0]);
 if(!animate || Math.abs(previous-end)<.001 || window.matchMedia('(prefers-reduced-motion:reduce)').matches){
  ikDockPosition(nav,end);return;
 }
 const start=performance.now();
 const duration=260;
 const tick=now=>{
  if(!nav.isConnected){nav._ikNavAnimation=0;return;}
  const fraction=Math.min(1,(now-start)/duration);
  const eased=1-Math.pow(1-fraction,3);
  ikDockPosition(nav,previous+(end-previous)*eased);
  if(fraction<1)nav._ikNavAnimation=requestAnimationFrame(tick);
  else nav._ikNavAnimation=0;
 };
 nav._ikNavAnimation=requestAnimationFrame(tick);
}
function mobileBottomNav(displayName){
 const activeIndex=ikNavIndex(STATE.view);
 const nav=MOBILE_PRIMARY_NAV.map(([ic,label,action,view],index)=>{
  const active=index===activeIndex;
  return `<button type="button" class="ik-mobile-tab${active?' active':''}" data-action="${action}" aria-label="${label}${view==='more'?' dan navigasi lainnya':''}" ${active&&view!=='more'?'aria-current="page"':''} ${view==='more'?'aria-controls="ik-mobile-menu" aria-expanded="false"':''}><span class="ik-mobile-tab-icon">${icon(ic)}</span><span class="ik-mobile-tab-label">${label}</span></button>`;
 }).join('');
 const secondary=[
  ['folder','Portofolio','Karya dan tautan publik','nav-portfolio',STATE.view==='portfolio'],
  ['bookmark','Lamaran Saya','Status dan tindak lanjut','nav-applications',STATE.view==='applications'],
  ['settings','Pengaturan','Tampilan dan keamanan akun','nav-settings',STATE.view==='settings'],
  ['shield','Bantuan & Laporan','Riwayat tiket dan bantuan','nav-support',STATE.view==='support'],
  ...(isAdmin()?[['shield','Panel Super Admin','Kelola IKHTIAR','nav-admin-settings',STATE.view==='admin-settings']]:[])
 ];
 return `<nav class="bottom-nav ik-curved-bottom-nav" data-active-index="${activeIndex}" data-position="${activeIndex}" aria-label="Navigasi utama seluler">
  <svg class="ik-mobile-nav-surface" aria-hidden="true" focusable="false" viewBox="0 0 500 110" preserveAspectRatio="none"><path d="${ikNavShapeAt(activeIndex)}" /></svg>
  <div class="ik-mobile-nav-bubble" aria-hidden="true" style="left:${10+20*activeIndex}%">${icon(MOBILE_PRIMARY_NAV[activeIndex][0])}</div>
  ${nav}</nav>
 <div class="ik-mobile-menu-layer" id="ik-mobile-menu" hidden>
  <button type="button" class="ik-mobile-menu-scrim" data-action="nav-mobile-close" tabindex="-1" aria-label="Tutup menu"></button>
  <section class="ik-mobile-menu-panel" role="dialog" aria-modal="true" aria-labelledby="ik-mobile-menu-title" tabindex="-1">
   <div class="ik-mobile-menu-handle" aria-hidden="true"></div>
   <div class="ik-mobile-menu-heading"><div><span class="ik-mobile-menu-overline">IKHTIAR / WORKSPACE</span><h2 id="ik-mobile-menu-title">Menu lainnya</h2><p>${displayName} · Satu profil, banyak peluang.</p></div><button type="button" class="ik-mobile-menu-close" data-action="nav-mobile-close" aria-label="Tutup menu">&times;</button></div>
   <div class="ik-mobile-menu-list">${secondary.map(([ic,label,description,action,active])=>`<button type="button" class="ik-mobile-menu-link${active?' active':''}" data-action="${action}" ${active?'aria-current="page"':''}><span class="ik-mobile-menu-link-icon">${icon(ic)}</span><span class="ik-mobile-menu-copy"><strong>${label}</strong><small>${description}</small></span>${icon('arrow-right')}</button>`).join('')}</div>
   <button type="button" class="ik-mobile-menu-logout" data-action="logout">${icon('log-out')} Keluar dari akun</button>
  </section>
 </div>`;
}
function setMobileMenu(open,restoreIndicator=true){
 const layer=ROOT.querySelector('#ik-mobile-menu');
 if(!layer)return;
 layer.hidden=!open;
 const trigger=ROOT.querySelector('.ik-curved-bottom-nav [data-action="nav-mobile-menu"]');
 trigger?.setAttribute('aria-expanded',String(open));
 document.body.classList.toggle('ik-mobile-menu-open',open);
 const nav=ROOT.querySelector('.ik-curved-bottom-nav');
 if(open)ikDockSelect(nav,4);
 else if(restoreIndicator)ikDockSelect(nav,ikNavIndex(STATE.view));
 if(open)layer.querySelector('.ik-mobile-menu-close')?.focus();
 else trigger?.focus();
}
function dashboard(){const u=userInfo();const sample=STATE.demo;const count=sample?[3,1,12]:[portfolio.count(),career.cvCount(),jobs.stats().saved];const progress=sample?75:career.status().progress;const displayName=escapeHTML(u.name);const showingSettings=['settings','admin-settings','career','cv','portfolio','jobs','applications','support'].includes(STATE.view);
 return `<main class="dashboard ${STATE.dark?'dark':''}" style="--ik-font-mul:${STATE.fontScale}">
 <aside class="sidebar" aria-label="Navigasi dashboard" tabindex="0">${brand(true)}<div class="nav-label">WORKSPACE</div>
 ${navAction('dashboard','Beranda','home',STATE.view==='dashboard')}${navAction('career','Profil Karier','user',STATE.view==='career')}${navAction('portfolio','Portofolio','folder',STATE.view==='portfolio')}${navAction('cv','CV Studio','file',STATE.view==='cv')}${navAction('job','Cari Lowongan','briefcase',STATE.view==='jobs')}${navAction('applications','Lamaran Saya','bookmark',STATE.view==='applications')}
 <div class="nav-label" style="padding-top:17px">AKUN</div>${navAction('settings','Pengaturan','settings',STATE.view==='settings')}${navAction('support','Bantuan & Laporan','shield',STATE.view==='support')}
 ${isAdmin()?`<div class="nav-label" style="padding-top:17px">ADMINISTRASI</div>${navAction('admin-settings','Panel Super Admin','shield',STATE.view==='admin-settings')}`:''}
 <div class="side-spacer"></div><div class="side-tip"><strong>Karier yang baik dimulai dari langkah kecil ✦</strong><p>Bangun profilmu dan tunjukkan karya terbaik.</p><button class="btn btn-primary" data-action="nav-career">Mulai Perjalanan ${icon('arrow-right')}</button></div>
 <div class="sidebar-user"><div class="avatar">${escapeHTML(u.initials)}</div><div style="min-width:0"><strong>${displayName}</strong><small>${sample?'Demo Workspace':'Pengguna IKHTIAR'}</small></div></div>
 </aside>
 <div class="dashboard-main"><header class="dashboard-topbar"><button type="button" class="top-search ik-jobs-top-search" data-action="nav-jobs">${icon('search')} Cari lowongan, perusahaan, atau kata kunci...</button><div class="top-mobile-logo">${brand()}</div>
 <div class="top-actions"><button class="icon-btn" data-action="toggle-theme" title="Ganti tema" aria-label="Ganti tema">${icon(STATE.dark?'sun':'moon')}</button><button class="icon-btn" data-action="placeholder" data-label="Notifikasi" aria-label="Notifikasi">${icon('bell')}</button><button type="button" class="top-profile" data-action="nav-mobile-menu" aria-label="Buka pengaturan akun dan menu lainnya"><span class="top-avatar">${escapeHTML(u.initials)}</span><span class="top-profile-copy"><strong>${displayName}</strong><small>${sample?'Mode Demo':'Akun Aktif'}</small></span></button><button class="icon-btn" data-action="logout" title="Keluar" aria-label="Keluar">${icon('log-out')}</button></div></header>
 <div class="dashboard-content">${showingSettings ? (STATE.view==='portfolio'?portfolio.page():['career','cv'].includes(STATE.view)?career.page():['jobs','applications'].includes(STATE.view)?jobs.page():STATE.view==='support'?support.userPage():settingsPage()) : `<div class="welcome"><div><h1>Halo, ${displayName}! <span aria-hidden="true">👋</span></h1><p>Langkah kecil hari ini bisa membuka peluang besar esok nanti.</p></div><div class="date-pill">${icon('calendar')} ${new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date())}</div></div>
 ${STATE.platformNotice&&!sample?`<div class="ik-platform-banner">${icon('info')} <span>${escapeHTML(STATE.platformNotice)}</span></div>`:''}
 ${sample?`<div class="demo-alert">${icon('info')} <span><b>Dashboard demo.</b> Semua angka, aktivitas, dan lowongan di bawah hanya contoh. Tidak ada akun yang sedang login.</span></div>`:''}
 <div class="dashboard-grid"><div class="main-stack">
 <section class="panel progress-panel"><div class="progress-circle" style="--p:${progress}%" data-progress="${progress}%"></div><div class="progress-copy"><h2>Progres Profil Kamu</h2><p>${sample?'Profilmu sudah 75% lengkap. Lengkapi agar recruiter lebih mengenalmu.':progress?`Profil tersimpan ${progress}% lengkap. Satu profil ini dapat dipakai di berbagai lamaran.`:'Mulai isi data utama satu kali untuk menyiapkan CV dan portofolio.'}</p><button class="text-btn" data-action="nav-career">${progress===100?'Lihat profil':'Lengkapi profil'} ${icon('arrow-right')}</button></div></section>
 <div class="stat-grid"><div class="stat"><div class="stat-top"><span class="stat-icon mint">${icon('folder')}</span></div><strong>${count[0]}</strong><small>Total Proyek</small></div><div class="stat"><span class="stat-icon">${icon('file')}</span><strong>${count[1]}</strong><small>CV Dibuat</small></div><div class="stat"><span class="stat-icon violet">${icon('bookmark')}</span><strong>${count[2]}</strong><small>Loker Disimpan</small></div></div>
 <section class="panel"><div class="panel-head"><h2>Aksi Cepat</h2><span>Mulai dari sini</span></div><div class="quick-grid">
 ${[['folder','Buat Portofolio','Tampilkan karya terbaikmu','mint'],['file','Buat CV','Satu profil untuk banyak perusahaan',''],['briefcase','Cari Lowongan','Jelajahi peluang baru','violet']].map(row=>`<button class="quick-card" data-action="${row[1]==='Buat CV'?'nav-cv':row[1]==='Buat Portofolio'?'nav-portfolio':'nav-jobs'}" data-label="${row[1]}"><span class="stat-icon ${row[3]}">${icon(row[0])}</span><strong>${row[1]}</strong><small>${row[2]}</small></button>`).join('')}</div></section>
 <section class="panel"><div class="panel-head"><h2>Lowongan Terbaru</h2><button data-action="nav-jobs">Lihat semua →</button></div>
 ${sample?`<div class="job-row"><div class="job-logo">UI</div><div class="job-info"><strong>UI/UX Designer (Junior)</strong><small>Perusahaan Contoh · Jakarta / Hybrid</small></div><span class="job-type">Full-time</span></div><div class="job-row"><div class="job-logo mint">FE</div><div class="job-info"><strong>Frontend Developer</strong><small>Perusahaan Contoh · Remote</small></div><span class="job-type">Remote</span></div><div class="job-row"><div class="job-logo violet">CC</div><div class="job-info"><strong>Content Creator</strong><small>Perusahaan Contoh · Bandung</small></div><span class="job-type">Part-time</span></div>`:(jobs.featured().length?jobs.featured().map(j=>`<div class="job-row"><div class="job-logo">${escapeHTML(j.company_name.charAt(0).toUpperCase())}</div><div class="job-info"><strong>${escapeHTML(j.position_name)}</strong><small>${escapeHTML(j.company_name)} · ${escapeHTML(j.location_name||'Lokasi tidak dicantumkan')}</small></div><button class="ik-jobs-mini-link" data-action="nav-jobs">Detail</button></div>`).join(''):`<div class="notice-empty">Belum ada lowongan yang dipublikasikan admin. Kamu dapat menyimpan lowongan sendiri dari tautan sumber. <button type="button" class="text-btn" data-action="nav-jobs">Buka Job Explorer →</button></div>`) }
 </section></div>
 <div class="aside-stack"><section class="panel profile-card"><div class="top-avatar">${escapeHTML(u.initials)}</div><h2>${displayName}</h2><p>${escapeHTML(u.email)}</p><button class="btn btn-outline" data-action="nav-career">${icon('user')} Edit Profil</button></section>
 <section class="panel"><div class="panel-head"><h2>Aktivitas Terbaru</h2><span>${sample?'Contoh':'Pribadi'}</span></div>
 ${sample?`<div class="activity"><span class="activity-icon">${icon('folder')}</span><div><strong>Portofolio kamu dipublikasikan</strong><small>2 jam yang lalu</small></div></div><div class="activity"><span class="activity-icon">${icon('file')}</span><div><strong>CV baru berhasil dibuat</strong><small>1 hari yang lalu</small></div></div><div class="activity"><span class="activity-icon">${icon('briefcase')}</span><div><strong>Menyimpan lowongan menarik</strong><small>3 hari yang lalu</small></div></div>`:career.latestCV()?`<div class="activity"><span class="activity-icon">${icon('file')}</span><div><strong>CV untuk ${escapeHTML(career.latestCV().company_name)} dibuat</strong><small>${escapeHTML(career.latestCV().position_name)} · tersimpan di akun</small></div></div><button class="text-btn" data-action="nav-cv">Lihat CV ${icon('arrow-right')}</button>`:`<div class="notice-empty">Buat CV pertamamu dari Profil Karier untuk memulai aktivitas.</div>`}</section>
 <section class="journey">${icon('sparkles')}<h3>Your Career, Your Move.</h3><p>Satu profil, banyak peluang. Terus kembangkan dirimu dan siapkan langkah berikutnya.</p><button class="btn btn-white" data-action="nav-career">Mulai sekarang ${icon('arrow-right')}</button></section></div></div>`}
 </div></div>
 ${mobileBottomNav(displayName)}</main>`;
}
// IKHTIAR Settings v0.1.3 — interactive accordion with working personal preferences.
const SETTINGS_CARDS=[
 {id:'profile',title:'Akun & Profil',sub:'Informasi identitas dan akun',icon:'user'},
 {id:'security',title:'Keamanan Akun',sub:'Password, verifikasi, dan sesi',icon:'lock'},
 {id:'appearance',title:'Tampilan & Aksesibilitas',sub:'Tema dan kenyamanan membaca',icon:'sun'},
 {id:'privacy',title:'Privasi & Data',sub:'Penggunaan data dan kontrol akun',icon:'eye'},
 {id:'help',title:'Bantuan & Pelaporan',sub:'Laporkan kendala dan lowongan mencurigakan',icon:'shield'},
 {id:'about',title:'Tentang IKHTIAR',sub:'Versi aplikasi dan pembaruan PWA',icon:'info'}
];
const ADMIN_CARDS=[
 {id:'platform',title:'Informasi Platform',sub:'Pengumuman resmi untuk pengguna',icon:'bell'},
 {id:'readiness',title:'Audit & Kesiapan Beta',sub:'Bukti, progres dan gerbang rilis M7-C',icon:'info'},
 {id:'users',title:'Pengguna & Role',sub:'Direktori, pencarian, dan hak akses',icon:'users'},
 {id:'moderation',title:'Moderasi Lowongan',sub:'Tinjau pengajuan komunitas sebelum tayang',icon:'shield'},
 {id:'job-listings',title:'Direktori Lowongan',sub:'Kelola lowongan terbit dan draft admin',icon:'briefcase'},
 {id:'audit',title:'Audit & Sistem',sub:'Riwayat tindakan dan keamanan admin',icon:'shield'},
 {id:'overview',title:'Laporan Operasional',sub:'Indikator anonim dari seluruh platform',icon:'file'},
 {id:'support',title:'Kotak Masuk Bantuan',sub:'Tinjau laporan pengguna dan beri tanggapan',icon:'shield'}
];
function settingCard(card,expanded,admin=false){
 const active=expanded===card.id;
 return `<section class="ik-setting-card ${active?'is-open':''}">
  <button type="button" class="ik-setting-toggle" data-action="${admin?'admin-section':'settings-section'}" data-section="${card.id}" aria-expanded="${active}" ${active?`aria-controls="setting-panel-${admin?'admin-':''}${card.id}"`:''}>
   <span class="ik-setting-icon">${icon(card.icon)}</span>
   <span class="ik-setting-heading"><strong>${card.title}</strong><small>${card.sub}</small></span>
   <span class="ik-setting-toggle-status" aria-hidden="true">${active?'Tutup':'Buka'}</span>
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
  <div class="ik-settings-toolbar"><span class="ik-settings-toolbar-hint">${icon('chevron-down')} Pilih kartu untuk melihat detail. Semua kategori tertutup saat pertama dibuka.</span><span class="ik-settings-toolbar-count">${adminView?ADMIN_CARDS.length:SETTINGS_CARDS.length} kategori</span></div>
  <div class="ik-settings-grid"><div class="ik-settings-main">
   ${adminView?ADMIN_CARDS.map(c=>settingCard(c,STATE.adminSection,true)).join(''):SETTINGS_CARDS.map(c=>settingCard(c,STATE.settingSection)).join('')}
  </div><aside class="ik-settings-aside">
   <div class="ik-settings-summary"><div class="ik-settings-userline"><div class="ik-settings-avatar">${escapeHTML(u.initials)}</div><div><strong>${escapeHTML(u.name)}</strong><small>${escapeHTML(u.email)}</small></div></div>
    <div class="ik-settings-summary-divider"></div><div class="ik-settings-summary-item"><span>Hak akses</span><strong>${isAdmin()?'Super Admin':'User'}</strong></div>
    <div class="ik-settings-summary-item"><span>Versi</span><strong>v0.9.7</strong></div><div class="ik-settings-summary-item"><span>Status</span><strong>${STATE.demo?'Demo':'Akun aktif'}</strong></div></div>
   ${!adminView&&isAdmin()?`<button class="ik-settings-admin-link" data-action="nav-admin-settings">${icon('shield')} Buka Panel Super Admin ${icon('arrow-right')}</button>`:''}
   ${adminView?`<button class="ik-settings-admin-link" data-action="nav-settings">${icon('arrow-left')} Kembali ke Pengaturan Pribadi</button>`:''}
   <div class="ik-settings-hint"><strong>${icon('lock')} Privasi tetap utama</strong><p>Pengaturan pribadimu tidak memberikan akses ke data pengguna lain. Perubahan hak Super Admin hanya berlaku setelah diverifikasi oleh Supabase.</p></div>
  </aside></div>
 </section>`;
}
async function canSwitchAdminAccordion(nextId){
 if(nextId===STATE.adminSection && !STATE.adminSection)return true;
 if(STATE.adminSection==='readiness'&&hasBetaDraft()){
  if(!await askConfirm('Catatan audit beta belum disimpan. Tutup bagian ini dan batalkan perubahan?'))return false;
  STATE.betaDrafts={};
 }
 if(['job-listings','moderation'].includes(STATE.adminSection)&&jobs.hasUnsaved()){
  if(!await askConfirm('Perubahan lowongan belum disimpan. Tutup bagian ini dan batalkan perubahan?'))return false;
  jobs.discard();
 }
 if(STATE.adminSection==='platform'){
  const form=document.querySelector('#admin-announcement-form [name="announcement"]');
  if(form && form.value!==STATE.platformNotice){
   if(!await askConfirm('Pengumuman belum disimpan. Tutup bagian ini dan batalkan perubahan?'))return false;
  }
 }
 return true;
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
 if(id==='privacy')return `<div class="ik-setting-readonly"><p>Data akun digunakan untuk autentikasi dan identitas pengguna. Portofolio publik dan tautan CV online memiliki kontrol privasi masing-masing. CV tetap privat sampai pemilik mengaktifkan tautannya.</p>
  <div class="ik-info-line">${icon('shield')} Role akun dan hak akses dikendalikan melalui database, bukan disimpan sebagai preferensi browser.</div>
  <div class="ik-setting-detail"><span class="ik-detail-label">Salinan data pribadi</span><p>Unduh salinan data yang tersimpan dalam modul Profil Karier, CV, Portofolio, Lowongan Tersimpan, dan Lamaran. Unduhan berupa JSON di perangkat Anda, bukan tautan publik.</p><button type="button" class="btn btn-outline" data-action="settings-export-data" ${STATE.demo||!STATE.session||STATE.dataExportBusy?'disabled':''}>${STATE.dataExportBusy?'Menyiapkan ekspor...':`${icon('file')} Unduh Data Saya (.json)`}</button><small class="ik-export-warning">File ekspor dapat berisi nomor telepon, pengalaman kerja, catatan lamaran, dan data sensitif. Simpan secara pribadi. Sesi login dan password tidak disertakan.</small></div>
  <div class="ik-info-line">${icon('lock')} Penghapusan akun mandiri belum tersedia. Ekspor hanya mencakup data modul IKHTIAR yang terdaftar, bukan log internal penyedia layanan.</div><button class="btn btn-outline" type="button" data-action="nav-trust">${icon('shield')} Buka Pusat Kepercayaan</button></div>`;
 if(id==='help')return `<div class="ik-setting-readonly"><p>Satu tempat untuk melaporkan masalah aplikasi, bantuan data, atau lowongan mencurigakan. Riwayat laporan tersimpan di akun yang sama.</p><button type="button" class="btn btn-primary" data-action="nav-support">${icon('shield')} Buka Pusat Bantuan</button><p class="ik-setting-fineprint">Saat ini perlu login. Kanal bantuan untuk pemulihan akun terkunci masih dalam persiapan.</p></div>`;
 if(id==='about')return `<div class="ik-setting-readonly"><div class="ik-setting-detail"><span class="ik-detail-label">IKHTIAR — Your Career, Your Move.</span><p>Progressive Web App untuk membangun portofolio, menyiapkan CV ATS, Resume, dan CV Kreatif, serta mengelola perjalanan karier.</p></div><div class="ik-setting-detail"><span class="ik-detail-label">Rilis frontend</span><strong>v0.9.7 — CV Studio Guided Flow</strong></div><div class="ik-setting-detail"><span class="ik-detail-label">Pembaruan aplikasi</span><p>Periksa versi PWA terbaru tanpa menghapus Service Worker atau data browser.</p><button class="btn btn-outline" type="button" data-action="settings-check-update">${icon('settings')} Periksa Pembaruan</button></div><div class="ik-setting-detail"><span class="ik-detail-label">Informasi resmi dan privasi</span><p>Cara kerja IKHTIAR, informasi yang dipublikasikan, dan batasan fitur keamanan.</p><button class="btn btn-outline" type="button" data-action="nav-trust">${icon('shield')} Pusat Kepercayaan</button></div></div>`;
 return '';
}
function adminCardContent(id){
 if(id==='platform')return `<form id="admin-announcement-form" class="ik-settings-form"><div class="ik-settings-description">Pengumuman akan ditampilkan di Dashboard pengguna setelah disimpan di Supabase. Tidak untuk menyimpan token, rahasia, atau kredensial.</div>
  <label for="admin-announcement">Pengumuman platform</label><textarea id="admin-announcement" name="announcement" rows="3" maxlength="240" placeholder="Contoh: Selamat datang di IKHTIAR!" ${!STATE.platformReady||STATE.platformBusy?'disabled':''}>${escapeHTML(STATE.platformNotice)}</textarea><small>Maksimal 240 karakter. Kosongkan untuk menyembunyikan pengumuman.</small>
  ${!STATE.platformReady?`<div class="ik-setting-warning">Fitur ini memerlukan migrasi Supabase <code>002_settings_roles.sql</code>. Belum tersambung ke konfigurasi platform.</div>`:''}
  <div class="ik-setting-actions"><button type="submit" class="btn btn-primary" ${!STATE.platformReady||STATE.platformBusy?'disabled':''}>${STATE.platformBusy?'Menyimpan...':'Publikasikan Pengumuman'}</button></div></form>`;
 if(id==='users')return adminUsersContent();
 if(id==='audit')return adminAuditContent();
 if(id==='moderation')return jobs.moderationPage();
 if(id==='job-listings')return jobs.adminPage();
 if(id==='overview')return adminOverviewContent();
 if(id==='support')return support.adminPage();
 if(id==='readiness')return betaReadinessContent();
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
/* M7 v0.8.0: public Trust Center. Transparency content deliberately avoids unverifiable certifications and support claims. */
function trustPage(){
 const signedIn=!!STATE.session||STATE.demo;
 const backLabel=signedIn?'Kembali ke Dashboard':'Kembali ke Masuk';
 const site=escapeHTML(location.origin+location.pathname);
 return `<main class="ik-trust-page">
  <header class="ik-trust-header"><div class="ik-trust-wrap ik-trust-header-inner">${brand(true)}<button type="button" class="ik-trust-back" data-action="trust-back">${icon('arrow-left')} ${backLabel}</button></div></header>
  <div class="ik-trust-wrap"><section class="ik-trust-hero"><span class="ik-trust-eyebrow">IKHTIAR / TRANSPARANSI</span><h1>Bangun karier dengan <span>lebih tenang.</span></h1><p>Ketahui cara aplikasi bekerja, kapan data Anda bisa dibagikan, serta langkah untuk menjaga keamanan akun. Informasi ini bukan sertifikat audit keamanan atau pengganti kebijakan privasi formal.</p><div class="ik-trust-pill-row"><span>Web & PWA</span><span>Profil privat</span><span>Publikasi sesuai pilihan</span></div></section>
  <section class="ik-trust-status"><div class="ik-trust-status-icon">${icon('shield')}</div><div><strong>Alamat situs yang sedang Anda buka</strong><p><code>${site}</code></p><small>Ini adalah alamat browser saat ini, bukan bukti bahwa domain telah diverifikasi sebagai domain resmi. Periksa tautan melalui kanal resmi pengelola.</small></div></section>
  <div class="ik-trust-grid">
   <article class="ik-trust-card"><span class="ik-trust-card-icon">${icon('lock')}</span><h2>Login & keamanan akun</h2><p>Login dikelola menggunakan Supabase Auth. Anda dapat mengganti kata sandi melalui email dan mengakhiri sesi dari Pengaturan. Tidak ada jaminan sistem telah menjalani audit penetrasi independen.</p></article>
   <article class="ik-trust-card"><span class="ik-trust-card-icon">${icon('user')}</span><h2>Data yang Anda isi</h2><p>Profil Karier, pendidikan, pengalaman, CV, portofolio, serta catatan lowongan dan lamaran disimpan untuk mendukung fitur IKHTIAR. Secara normal, data kerja pribadi dibatasi per akun menggunakan RLS.</p></article>
   <article class="ik-trust-card"><span class="ik-trust-card-icon">${icon('eye')}</span><h2>Privat hingga dipublikasikan</h2><p>Portofolio dan tautan CV tidak otomatis menjadi publik. Setelah diaktifkan, siapa pun yang memiliki tautan dapat melihat data yang Anda pilih untuk ditampilkan. Matikan tautan untuk mencabut akses publik berikutnya.</p></article>
   <article class="ik-trust-card"><span class="ik-trust-card-icon">${icon('briefcase')}</span><h2>Lowongan & perusahaan</h2><p>Lowongan yang ditampilkan admin berasal dari tautan sumber yang dicantumkan. IKHTIAR bukan pemberi kerja dan tidak dapat menjamin kebenaran lowongan, diterima bekerja, atau perkembangan status seleksi.</p></article>
  </div>
  <section class="ik-trust-section"><h2>Infrastruktur & distribusi</h2><div class="ik-trust-facts"><div><strong>Frontend & PWA</strong><p>GitHub Pages, dapat digunakan di browser dan dipasang di layar utama HP. Tidak harus tersedia di Play Store.</p></div><div><strong>Identitas & database</strong><p>Supabase Auth dan PostgreSQL. Aplikasi frontend tidak seharusnya menyimpan kunci service_role.</p></div><div><strong>CV dan portofolio</strong><p>CV publik dan portofolio publik merupakan fitur pilihan pengguna, bukan verifikasi sertifikat profesional.</p></div></div></section>
  <section class="ik-trust-section"><h2>Kontrol data & batasan yang terbuka</h2><ul><li>Data profil dan lamaran dapat diperbarui dari menu pemilik masing-masing.</li><li>Di Pengaturan → Privasi & Data, pengguna login dapat mengunduh salinan data modul dalam JSON.</li><li>Penghapusan akun mandiri, permintaan data dari penyedia eksternal, dan kebijakan retensi formal belum disediakan pada tahap ini.</li><li>Kanal bantuan untuk pengguna yang tidak bisa login, peninjauan kebijakan formal, dan uji keamanan produksi harus diselesaikan sebelum peluncuran publik.</li></ul></section>
  <section class="ik-trust-caution"><div>${icon('info')}</div><div><h2>Tips menghindari penipuan rekrutmen</h2><p>Verifikasi alamat perusahaan dan sumber lowongan. Jangan membagikan OTP, kata sandi, atau kode pemulihan kepada pihak yang mengaku sebagai admin atau perekrut. Untuk kasus mencurigakan, hentikan proses dan periksa melalui kanal resmi perusahaan.</p></div></section>
  <section class="ik-trust-section ik-trust-links"><h2>Dokumen & bantuan</h2><p>Dokumen privasi dan ketentuan berikut masih berbentuk draf. Konten harus ditinjau pengelola sebelum beta publik.</p><div class="ik-trust-link-actions"><button type="button" class="btn btn-outline" data-action="nav-privacy">Kebijakan Privasi (Draf)</button><button type="button" class="btn btn-outline" data-action="nav-terms">Ketentuan Layanan (Draf)</button><button type="button" class="btn btn-primary" data-action="nav-support">Pusat Bantuan</button></div></section>
  <footer class="ik-trust-footer"><span>IKHTIAR · Your Career, Your Move. · v0.9.7</span><button type="button" data-action="trust-back">${backLabel} ${icon('arrow-right')}</button></footer></div>
 </main>`;
}
function legalPage(kind){
 const privacy=kind==='privacy';
 const title=privacy?'Kebijakan Privasi':'Ketentuan Layanan';
 const intro=privacy?'Ringkasan transparan tentang data yang digunakan IKHTIAR.':'Aturan penggunaan yang dirancang untuk melindungi pengguna dan integritas informasi karier.';
 const items=privacy?[
  ['Data yang diproses','IKHTIAR menyimpan email dan identitas autentikasi melalui Supabase Auth; informasi Profil Karier; CV; proyek portofolio; lowongan tersimpan; catatan lamaran; serta laporan bantuan yang Anda kirim.'],
  ['Tujuan pemrosesan','Data dipakai untuk login, menampilkan profil, menyusun CV, menerbitkan portofolio pilihan Anda, melacak lamaran, dan memproses laporan dukungan.'],
  ['Data yang dibagikan','Portofolio dan CV hanya menjadi publik ketika Anda mengaktifkan tautan publiknya. Pengunjung dapat menyalin informasi yang telah dipublikasikan. Kontak CV publik mengikuti pilihan pemilik.'],
  ['Penyedia infrastruktur','Aplikasi memakai GitHub Pages untuk frontend dan Supabase untuk autentikasi serta database. Detail pemrosesan oleh penyedia tunduk pada ketentuan layanannya masing-masing.'],
  ['Pilihan pengguna','Anda dapat menyunting profil, menonaktifkan tautan CV/portofolio publik, dan mengunduh salinan data melalui Pengaturan. Untuk permintaan terkait data, pengguna yang masih login dapat mengirim laporan di Pusat Bantuan.'],
  ['Retensi, penghapusan, dan kontak','Jadwal retensi, tata cara permintaan penghapusan akun, kontak resmi untuk pengguna yang tidak bisa login, dan identitas pengendali data wajib ditetapkan pengelola sebelum dokumen ini menjadi kebijakan final.']
 ]:[
  ['Ruang lingkup','IKHTIAR membantu pengguna membuat profil karier, portofolio, CV, dan catatan lamaran. IKHTIAR bukan perusahaan perekrut maupun penjamin penerimaan kerja.'],
  ['Kewajiban pengguna','Gunakan informasi yang akurat, hormati hak cipta, jangan menyamar sebagai pihak lain, dan jangan memublikasikan lowongan palsu atau tautan berbahaya.'],
  ['Publikasi atas pilihan pengguna','Pemilik akun bertanggung jawab meninjau data sebelum mengaktifkan CV atau portofolio publik. Nonaktifkan tautan jika tidak ingin dibagikan lebih lanjut.'],
  ['Penyalahgunaan & pelaporan','Lowongan yang mencurigakan dapat dilaporkan di Pusat Bantuan. Pengelola perlu memeriksa laporan sebelum mengambil tindakan. Jangan memberikan OTP, kata sandi, atau biaya rekrutmen kepada pihak tidak tepercaya.'],
  ['Batasan layanan','Fitur dan data yang disediakan pihak ketiga dapat berubah. Tautan eksternal tidak berarti IKHTIAR menjamin keamanan atau validitas kontennya.'],
  ['Status draf','Identitas operator, kanal kontak, prosedur banding/penanganan laporan, dan tanggal mulai berlakunya ketentuan ini belum ditetapkan. Dokumen perlu ditinjau sebelum peluncuran umum.']
 ];
 return `<main class="ik-trust-page ik-legal-page"><header class="ik-trust-header"><div class="ik-trust-wrap ik-trust-header-inner">${brand(true)}<button type="button" class="ik-trust-back" data-action="nav-trust">${icon('arrow-left')} Pusat Kepercayaan</button></div></header>
 <div class="ik-trust-wrap"><section class="ik-trust-hero ik-legal-hero"><span class="ik-trust-eyebrow">IKHTIAR / DOKUMEN DRAF</span><h1>${title}</h1><p>${intro}</p><span class="ik-legal-status">DRAF — belum menjadi kebijakan final / belum ditinjau secara hukum</span></section>
 <div class="ik-legal-sections">${items.map(([h,t],i)=>`<article class="ik-legal-section"><span>${String(i+1).padStart(2,'0')}</span><div><h2>${h}</h2><p>${t}</p></div></article>`).join('')}</div>
 <section class="ik-trust-links ik-legal-next"><h2>Butuh bantuan?</h2><p>Gunakan akun aktif untuk mengirim laporan. Jika tidak dapat login, kanal dukungan eksternal masih harus disediakan pengelola.</p><div class="ik-trust-link-actions"><button type="button" class="btn btn-primary" data-action="nav-support">Buka Pusat Bantuan</button><button type="button" class="btn btn-outline" data-action="nav-trust">Kembali ke Trust Center</button></div></section></div></main>`;
}
// M7-C: release gate is manual, persisted and server-authorized; never auto-publish.
const BETA_FALLBACK_CHECKS=[
 ['rls_access','Keamanan data & RLS','Uji lintas akun, akses data pribadi dan penolakan RPC admin.'],
 ['domain_https','Domain, HTTPS & Redirect','Validasi domain resmi, SSL, PWA dan redirect autentikasi.'],
 ['smtp_recovery','SMTP & Pemulihan Akun','Verifikasi email, lupa password dan pembatasan pengiriman.'],
 ['support_outside','Bantuan di Luar Login','Kontak resmi yang bisa diakses ketika akun terkunci.'],
 ['privacy_terms','Kebijakan Privasi & Ketentuan','Finalisasi draf, identitas pengelola dan retensi data.'],
 ['backup_restore','Backup, Restore & Insiden','Uji pemulihan data dan prosedur penanganan insiden.'],
 ['mobile_a11y','QA Produk & Aksesibilitas','Uji mobile, 100–200% zoom, keyboard, CV, tracker dan PWA.'],
 ['monitoring','Monitoring & Operasional','Logging, review audit, prosedur rilis serta rollback.']
];
const BETA_STATUS_LABEL={pending:'Belum diperiksa',blocked:'Terhambat',verified:'Terverifikasi'};
function hasBetaDraft(){return Object.keys(STATE.betaDrafts).length>0;}
function captureBetaDraft(input){
 const form=input.closest('form[data-beta-id]');
 if(!form)return;
 const id=form.dataset.betaId;
 if(!BETA_FALLBACK_CHECKS.some(x=>x[0]===id))return;
 STATE.betaDrafts[id]={status:form.elements.status?.value||'pending',evidence:form.elements.evidence?.value||''};
}
async function loadBetaGate(){
 if(!isAdmin()||!STATE.supabase||STATE.betaLoading)return;
 const owner=STATE.session?.user?.id;
 STATE.betaLoading=true;STATE.betaError='';
 if(STATE.view==='admin-settings'&&STATE.adminSection==='readiness')render();
 try{
  const {data,error}=await STATE.supabase.rpc('ik_beta_gate_list');
  if(error)throw error;
  if(!isAdmin()||STATE.session?.user?.id!==owner)return;
  STATE.betaItems=Array.isArray(data)?data:[];
  STATE.betaLoaded=true;
 }catch(e){
  if(!isAdmin()||STATE.session?.user?.id!==owner)return;
  STATE.betaError='Tidak dapat memuat audit. Pastikan SQL v0.8.0 sudah dijalankan dan Anda masuk sebagai Super Admin.';
  STATE.betaLoaded=false;
  console.warn('IKHTIAR beta gate:',e?.message||e);
 }finally{
  STATE.betaLoading=false;
  if(STATE.view==='admin-settings'&&STATE.adminSection==='readiness'&&isAdmin())render();
 }
}
async function saveBetaGate(form){
 if(!isAdmin()||!STATE.supabase||STATE.betaSavingId)return;
 const id=form.dataset.betaId;
 if(!BETA_FALLBACK_CHECKS.some(x=>x[0]===id))return;
 const d=new FormData(form),status=String(d.get('status')||''),evidence=String(d.get('evidence')||'').trim();
 if(!BETA_STATUS_LABEL[status]){toast('Status pemeriksaan tidak valid.');return;}
 if(evidence.length>800||(status!=='pending'&&evidence.length<12)){toast('Untuk status Terverifikasi/Terhambat, isi bukti 12–800 karakter.');return;}
 if(status==='verified'&&!await askConfirm('Pastikan bukti sudah diverifikasi secara nyata. Tandai pemeriksaan ini Terverifikasi?'))return;
 const owner=STATE.session?.user?.id;
 STATE.betaSavingId=id;
 const btn=form.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent='Menyimpan...';}
 try{
  const {error}=await STATE.supabase.rpc('ik_beta_gate_set',{p_item_id:id,p_status:status,p_evidence:evidence});
  if(error)throw error;
  if(!isAdmin()||STATE.session?.user?.id!==owner)return;
  delete STATE.betaDrafts[id];
  toast('Status audit berhasil disimpan dan dicatat.');
  await loadBetaGate();
 }catch(err){
  toast('Gagal menyimpan audit: '+String(err?.message||'Periksa koneksi Supabase.').slice(0,140));
  if(btn){btn.disabled=false;btn.textContent='Simpan Verifikasi';}
 }finally{STATE.betaSavingId=null;}
}
function exportBetaGate(){
 if(!isAdmin()||!STATE.betaLoaded||!STATE.betaItems.length)return;
 const rows=STATE.betaItems.map(x=>({id:x.item_id,title:x.title,status:x.status,evidence:x.evidence||'',updated_at:x.updated_at||null,updated_by:x.updated_by||null}));
 const report={type:'IKHTIAR M7-C beta audit',version:'v0.8.0',exported_at:new Date().toISOString(),notice:'Dokumen ini memuat penilaian manual internal, bukan sertifikasi keamanan atau izin otomatis membuka public beta.',items:rows};
 ikDownloadText('IKHTIAR-Audit-Beta-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(report,null,2),'application/json;charset=utf-8');
 toast('Laporan audit berhasil disiapkan.');
}
function betaReadinessContent(){
 const items=STATE.betaLoaded?STATE.betaItems:[];
 const verified=items.filter(x=>x.status==='verified').length;
 const blocked=items.filter(x=>x.status==='blocked').length;
 const pending=items.filter(x=>x.status==='pending').length;
 const pct=items.length?Math.round(verified/items.length*100):0;
 return `<div class="ik-beta-checks ik-beta-audit">
  <div class="ik-beta-intro"><div><span class="ik-beta-eyebrow">M7-C / INTERNAL RELEASE GATE</span><h3>Audit kesiapan public beta</h3><p>Setiap pemeriksaan memiliki status dan bukti tersimpan di Supabase. Ini daftar verifikasi internal, <strong>bukan sertifikasi keamanan</strong> atau persetujuan otomatis untuk peluncuran publik.</p></div>
   <div class="ik-beta-meter" aria-label="${verified} dari ${items.length||8} selesai"><strong>${STATE.betaLoaded?pct+'%':'—'}</strong><small>Diverifikasi</small></div></div>
  <div class="ik-beta-stat-grid"><div><strong>${verified}</strong><small>Terverifikasi</small></div><div><strong>${blocked}</strong><small>Terhambat</small></div><div><strong>${pending}</strong><small>Belum diperiksa</small></div></div>
  <div class="ik-beta-progress" role="progressbar" aria-valuenow="${verified}" aria-valuemin="0" aria-valuemax="${items.length||8}"><span style="width:${pct}%"></span></div>
  <div class="ik-beta-state">${icon('shield')} ${STATE.betaLoaded&&items.length===8&&verified===items.length&&blocked===0?'SEMUA ITEM DICATAT — KEPUTUSAN RILIS TETAP MANUAL':'STATUS: DALAM PENINJAUAN — BELUM SIAP DINYATAKAN PUBLIC BETA'}</div>
  <div class="ik-beta-tools"><button class="btn btn-outline" data-action="beta-refresh" type="button" ${STATE.betaLoading?'disabled':''}>${STATE.betaLoading?'Memuat...':'Muat Ulang Data'}</button><button class="btn btn-outline" data-action="beta-export" type="button" ${!STATE.betaLoaded?'disabled':''}>Unduh Laporan Audit</button></div>
  ${STATE.betaError?`<p class="ik-beta-error" role="alert">${escapeHTML(STATE.betaError)}</p>`:''}
  ${!STATE.betaLoaded?`<p class="ik-setting-fineprint">${STATE.betaLoading?'Sedang memuat data dari Supabase...':'Data audit belum tersedia. Jalankan SQL v0.8.0 terlebih dahulu, lalu klik Muat Ulang Data.'}</p>`:''}
  ${(STATE.betaLoaded?items:BETA_FALLBACK_CHECKS.map(([item_id,title,details])=>({item_id,title,details,status:'pending',evidence:''}))).map((item,i)=>{
    const draft=STATE.betaDrafts[item.item_id];const status=draft?.status||item.status;const evidence=draft?.evidence??item.evidence??'';
    return `<article class="ik-beta-audit-item"><div class="ik-beta-audit-head"><span class="ik-beta-num">${i+1}</span><div><strong>${escapeHTML(item.title)}</strong><p>${escapeHTML(item.details)}</p></div><span class="ik-beta-label ${escapeHTML(item.status)}">${escapeHTML(BETA_STATUS_LABEL[item.status]||'Belum diperiksa')}</span></div>
    ${STATE.betaLoaded?`<form class="ik-beta-form" data-beta-id="${escapeHTML(item.item_id)}"><div class="ik-beta-fields"><label>Status<select name="status" aria-label="Status ${escapeHTML(item.title)}">${Object.entries(BETA_STATUS_LABEL).map(([v,l])=>`<option value="${v}" ${v===status?'selected':''}>${l}</option>`).join('')}</select></label><label class="ik-beta-evidence">Catatan / bukti verifikasi<textarea name="evidence" rows="2" maxlength="800" placeholder="Ringkas hasil uji dan lokasi bukti. Jangan memasukkan password, token, atau data pribadi." aria-label="Bukti ${escapeHTML(item.title)}">${escapeHTML(evidence)}</textarea></label></div><div class="ik-beta-form-footer"><small>${item.updated_at?'Terakhir disimpan: '+escapeHTML(adminDate(item.updated_at)):'Belum pernah diperbarui'}</small><button type="submit" class="btn btn-primary" ${STATE.betaSavingId===item.item_id?'disabled':''}>Simpan Verifikasi</button></div></form>`:''}</article>`;}).join('')}
  <p class="ik-setting-fineprint">Catatan perubahan status disimpan pada histori audit database. Pastikan bukti dapat ditelusuri oleh pengelola. Informasi rahasia atau data pribadi tidak boleh dimasukkan ke kolom bukti.</p>
 </div>`;
}
const IK_EXPORT_TABLES=[
 ['career_profile','ik_career_profiles'],['cv_versions','ik_cv_versions'],['cv_shares','ik_cv_shares'],
 ['portfolio_site','ik_portfolio_sites'],['portfolio_projects','ik_portfolio_projects'],
 ['saved_jobs','ik_saved_jobs'],['job_applications','ik_job_applications'],['support_tickets','ik_support_tickets']
];
function ikDownloadText(name,content,mime){
 const objectUrl=URL.createObjectURL(new Blob([content],{type:mime}));
 const a=document.createElement('a');a.href=objectUrl;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(objectUrl),5000);
}
async function exportMyData(){
 if(!STATE.supabase||!STATE.session||STATE.demo||STATE.dataExportBusy)return;
 const owner=STATE.session.user.id;
 STATE.dataExportBusy=true;render();
 try{
  // Every query is owner-filtered and additionally checked by Supabase RLS.
  // Abort the entire download if ANY module fails: never pass an incomplete archive as a full export.
  const result={export_format:'IKHTIAR-v0.8.0',exported_at:new Date().toISOString(),scope:'IKHTIAR application modules; excludes provider logs, credentials and session tokens',account:{user_id:owner,email:STATE.session.user.email||'',created_at:STATE.session.user.created_at||null,confirmed_at:STATE.session.user.email_confirmed_at||null},data:{}};
  for(const [name,table] of IK_EXPORT_TABLES){
   const {data,error}=await STATE.supabase.from(table).select('*').eq('user_id',owner);
   if(error)throw new Error(`Tidak dapat membaca data ${name}. ${error.message||''}`);
   if(STATE.session?.user?.id!==owner)throw new Error('Akun berubah selama ekspor. Ulangi setelah login.');
   result.data[name]=data||[];
  }
  const date=new Date().toISOString().slice(0,10);
  ikDownloadText(`IKHTIAR-data-saya-${date}.json`,JSON.stringify(result,null,2),'application/json;charset=utf-8');
  toast('Data pribadi telah disiapkan untuk diunduh. Simpan file dengan aman.');
 }catch(error){toast(error?.message||'Ekspor data gagal. Coba lagi.');}
 finally{STATE.dataExportBusy=false;if(STATE.view==='settings')render();}
}
const ADMIN_OVERVIEW_ITEMS=[
 ['users','Akun Terdaftar'],['career_profiles','Profil Karier'],['cv_versions','CV Dibuat'],
 ['active_cv_links','CV Online Aktif'],['portfolio_projects','Total Karya'],['public_portfolios','Portofolio Publik'],
 ['published_jobs','Lowongan Aktif'],['saved_jobs','Lowongan Tersimpan'],['applications','Total Lamaran Tercatat'],
 ['ongoing_applications','Lamaran Berproses']
];
function adminOverviewContent(){
 const x=STATE.adminOverview;
 return `<div class="ik-admin-overview"><p class="ik-settings-description">Ringkasan agregat dari database. Tidak menampilkan nama, email, isi CV, atau isi lamaran pengguna. Statistik merupakan kondisi saat data diperiksa, bukan analitik kunjungan real-time.</p>
 <div class="ik-admin-list-heading"><strong>Statistik Platform</strong><button type="button" class="ik-admin-refresh" data-action="admin-overview-refresh" ${STATE.adminOverviewBusy?'disabled':''}>${icon('settings')} Perbarui</button></div>
 ${STATE.adminOverviewError?`<div class="ik-setting-warning" role="alert">${escapeHTML(STATE.adminOverviewError)}. Pastikan SQL M7 sudah dijalankan.</div>`:''}
 ${STATE.adminOverviewBusy?'<div class="ik-admin-empty" role="status">Menghitung ringkasan...</div>':!STATE.adminOverviewLoaded?'<div class="ik-admin-empty">Ringkasan belum dimuat. Buka kartu ini setelah SQL M7 tersedia.</div>':`<div class="ik-admin-overview-grid">${ADMIN_OVERVIEW_ITEMS.map(([key,label])=>`<div class="ik-admin-metric"><strong>${Number(x?.[key]||0).toLocaleString('id-ID')}</strong><span>${label}</span></div>`).join('')}</div><div class="ik-admin-overview-foot"><span>Data diambil: ${escapeHTML(adminDate(x?.generated_at))}</span><button type="button" class="btn btn-outline" data-action="admin-overview-export">${icon('file')} Unduh CSV Ringkasan</button></div>`}
 <div class="ik-info-line">${icon('shield')} Angka dihitung melalui fungsi Supabase yang memverifikasi role Super Admin pada server. Rekap tidak mengubah data pengguna.</div></div>`;
}
async function loadAdminOverview(){
 if(!isAdmin()||!STATE.supabase||STATE.adminOverviewBusy)return;
 const owner=STATE.session.user.id;
 STATE.adminOverviewBusy=true;STATE.adminOverviewError='';
 if(STATE.view==='admin-settings')render();
 try{
  const {data,error}=await STATE.supabase.rpc('ik_admin_overview');
  if(error)throw error;
  if(!isAdmin()||STATE.session?.user?.id!==owner)return;
  STATE.adminOverview=data||{};STATE.adminOverviewLoaded=true;
 }catch(error){
  if(STATE.session?.user?.id!==owner)return;
  STATE.adminOverview=null;STATE.adminOverviewLoaded=false;
  STATE.adminOverviewError='Tidak dapat memuat laporan agregat';
  console.warn('IKHTIAR M7 report:',error?.message||error);
 }finally{STATE.adminOverviewBusy=false;if(STATE.view==='admin-settings'&&STATE.adminSection==='overview')render();}
}
function exportAdminOverview(){
 if(!isAdmin()||!STATE.adminOverviewLoaded||!STATE.adminOverview)return;
 const rows=[['Indikator','Jumlah'],...ADMIN_OVERVIEW_ITEMS.map(([key,label])=>[label,String(Number(STATE.adminOverview[key]||0))])];
 const csv='\uFEFF'+rows.map(([a,b])=>`"${String(a).replace(/"/g,'""')}","${String(b).replace(/"/g,'""')}"`).join('\r\n');
 ikDownloadText('IKHTIAR-ringkasan-operasional-'+new Date().toISOString().slice(0,10)+'.csv',csv,'text/csv;charset=utf-8');
}
function render(){
 document.body.classList.remove('ik-mobile-menu-open');
 if(STATE.view==='career'&&career.hasUnsaved())career.syncForm();
 if(STATE.view==='portfolio'&&portfolio.hasUnsaved())portfolio.syncForm();
 document.body.classList.toggle('dark',['dashboard','settings','admin-settings','career','cv','portfolio','jobs','applications','support'].includes(STATE.view)&&STATE.dark);
 document.body.classList.toggle('security-modal-open',STATE.logoutDialog||!!STATE.adminRoleDialog);
 const sidebarPosition=ROOT.querySelector('.sidebar')?.scrollTop??0;
 const preservedMobileDock=ROOT.querySelector('nav.ik-curved-bottom-nav');
 ROOT.innerHTML=(STATE.view==='trust'?trustPage():['privacy','terms'].includes(STATE.view)?legalPage(STATE.view):STATE.view==='splash'?splash():STATE.view==='onboarding'?onboarding():STATE.view==='portfolio-preview'||STATE.view.startsWith('p/')?portfolio.publicPage():STATE.view.startsWith('resume/')?career.publicPage():['dashboard','settings','admin-settings','career','cv','portfolio','jobs','applications','support'].includes(STATE.view)?dashboard():auth())+logoutModal()+adminRoleConfirmModal();
 const sidebar=ROOT.querySelector('.sidebar');if(sidebar)sidebar.scrollTop=sidebarPosition;
 const freshDock=ROOT.querySelector('nav.ik-curved-bottom-nav');
 if(preservedMobileDock&&freshDock){
  const nextIndex=Number(freshDock.dataset.activeIndex);
  freshDock.replaceWith(preservedMobileDock);
  ikDockSelect(preservedMobileDock,nextIndex);
 }
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
 if(action==='nav-mobile-menu'){
  if(window.matchMedia('(max-width:760px)').matches)setMobileMenu(ROOT.querySelector('#ik-mobile-menu')?.hidden??true);
  else go('settings');
  return;
 }
 if(action==='nav-mobile-close'){setMobileMenu(false);return;}
 const existingMenuLayer=ROOT.querySelector('#ik-mobile-menu');
 if(existingMenuLayer&&!existingMenuLayer.hidden)setMobileMenu(false,false);
 if(action==='brand-home'){evt.preventDefault();go(STATE.demo||STATE.session?'dashboard':'auth');}
 if(action==='nav-trust')go('trust');
 if(action==='nav-privacy')go('privacy');
 if(action==='nav-terms')go('terms');
 if(action==='nav-support'){if(STATE.session&&!STATE.demo)go('support');else{toast('Masuk terlebih dahulu untuk mengirim laporan.');go('auth');}}
 if(await support.handleClick(action,actionEl))return;
 if(action==='trust-back')go(STATE.demo||STATE.session?'dashboard':'auth');
 if(action==='settings-export-data')await exportMyData();
 if(action==='admin-overview-refresh'&&isAdmin())await loadAdminOverview();
 if(action==='admin-overview-export'&&isAdmin())exportAdminOverview();
 if(action==='beta-refresh'&&isAdmin())await loadBetaGate();
 if(action==='beta-export'&&isAdmin())exportBetaGate();
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
 if(action==='view-demo'){career.clear();portfolio.clear();jobs.clear();support.reset();STATE.demo=true;STATE.role='user';STATE.roleReady=true;go('dashboard');}
 if(action==='toggle-theme')setTheme(STATE.dark?'light':'dark');
 if(await portfolio.handleClick(action,actionEl))return;
 if(await jobs.handleClick(action,actionEl))return;
 if(await career.handleClick(action,actionEl))return;
 if(action==='nav-dashboard')go('dashboard');
 if(action==='nav-settings'){STATE.settingSection='';go('settings');}
 if(action==='nav-admin-settings'){
  if(isAdmin()){STATE.adminSection='';go('admin-settings');}
  else toast('Akses hanya untuk Super Admin yang diverifikasi oleh Supabase.');
 }
 if(action==='settings-section'){
  const id=actionEl.dataset.section;
  if(SETTINGS_CARDS.some(c=>c.id===id)){STATE.settingSection=STATE.settingSection===id?'':id;render();}
 }
 if(action==='admin-section'&&isAdmin()){
  const id=actionEl.dataset.section;
  if(ADMIN_CARDS.some(c=>c.id===id)){
   if(!await canSwitchAdminAccordion(id))return;
   STATE.adminSection=STATE.adminSection===id?'':id;render();if(STATE.adminSection==='users'&&!STATE.adminUsersLoaded)loadAdminUsers();if(STATE.adminSection==='audit'&&!STATE.adminAuditLoaded)loadAdminAudit();if(STATE.adminSection==='job-listings')jobs.loadAdmin();if(STATE.adminSection==='moderation')jobs.loadModeration();if(STATE.adminSection==='overview'&&!STATE.adminOverviewLoaded)loadAdminOverview();if(STATE.adminSection==='support')support.loadAdmin();if(STATE.adminSection==='readiness')loadBetaGate();}
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
ROOT.addEventListener('input',evt=>{captureBetaDraft(evt.target);career.onInput(evt.target);portfolio.onInput(evt.target);jobs.onInput(evt.target);});
ROOT.addEventListener('change',evt=>{captureBetaDraft(evt.target);jobs.onInput(evt.target);support.handleChange(evt.target);});
// Defensive capture: all application forms are managed by JS. Never let a stray submit reload the PWA.
document.addEventListener('submit',evt=>{if(ROOT.contains(evt.target))evt.preventDefault();},true);
ROOT.addEventListener('submit',async evt=>{
 if(evt.target.matches('form[data-beta-id]')){evt.preventDefault();await saveBetaGate(evt.target);return;}
 if(['ik-help-form','ik-help-admin-form'].includes(evt.target.getAttribute('id'))){evt.preventDefault();await support.handleSubmit(evt.target);return;}
 if(['jobs-search-form','jobs-manual-form','jobs-application-form','jobs-admin-form','ik-community-form','ik-community-review-form'].includes(evt.target.getAttribute('id'))){evt.preventDefault();await jobs.handleSubmit(evt.target);return;}
 if(['ik-portfolio-site-form','ik-portfolio-project-form'].includes(evt.target.getAttribute('id'))){evt.preventDefault();await portfolio.handleSubmit(evt.target);return;}
 if(['career-form','cv-generate-form'].includes(evt.target.getAttribute('id'))){evt.preventDefault();await career.handleSubmit(evt.target);return;}
 if(evt.target.getAttribute('id')==='auth-form'){evt.preventDefault();await loginSubmit(evt.target);}
 if(evt.target.getAttribute('id')==='admin-announcement-form'){evt.preventDefault();await saveAdminAnnouncement(evt.target);}
 if(evt.target.getAttribute('id')==='admin-users-search-form'){
  evt.preventDefault();
  if(!isAdmin()||STATE.adminUsersBusy)return;
  STATE.adminUsersSearch=String(new FormData(evt.target).get('search')||'').trim().slice(0,80);
  STATE.adminUsersPage=0;
  await loadAdminUsers();
 }
});
window.addEventListener('hashchange',async ()=>{
 if(!STATE.authReady||!STATE.splashDone)return;
 const requested=location.hash.replace(/^#\//,'').split('?')[0];
 if(['trust','privacy','terms'].includes(requested)){if(STATE.view!==requested)go(requested);return;}
 if(STATE.view==='admin-settings'&&requested!=='admin-settings'&&hasBetaDraft()){if(!await askConfirm('Catatan audit beta belum disimpan. Tinggalkan halaman?')){location.hash='/admin-settings';return;}STATE.betaDrafts={};}
 if(STATE.view==='portfolio'&&requested!=='portfolio'&&STATE.session&&portfolio.hasUnsaved()){
  if(!await askConfirm(portfolio.dirtyWarning())){location.hash='/portfolio';return;}
  portfolio.discard();
 }
 if(['jobs','applications','admin-settings'].includes(STATE.view)&&requested!==STATE.view&&jobs.hasUnsaved()){
  if(!await askConfirm('Perubahan lowongan atau lamaran belum disimpan. Tinggalkan halaman?')){location.hash=`/${STATE.view}`;return;}jobs.discard();
 }
 if(STATE.view==='support'&&requested!=='support'&&STATE.session&&support.hasUnsaved()){if(!await askConfirm('Laporan belum dikirim. Tinggalkan halaman?')){location.hash='/support';return;}}
 if(STATE.view==='career'&&requested!=='career'&&STATE.session&&career.hasUnsaved()){
  if(!await askConfirm('Profil belum disimpan. Tinggalkan halaman dan batalkan perubahan?')){location.hash='/career';return;}
 }
 if(requested.startsWith('p/')){if(STATE.view!==requested){STATE.view=requested;render();portfolio.openView(requested);}return;}
 if(requested.startsWith('resume/')){if(STATE.view!==requested){STATE.view=requested;render();career.openPublic(requested.slice(7));}return;}
 if(['dashboard','settings','admin-settings','career','cv','portfolio','portfolio-preview','jobs','applications','support'].includes(requested)){
  if(!STATE.session&&!STATE.demo){go('auth');return;}
  if(requested==='admin-settings'&&!isAdmin()){go('settings');return;}
  if(STATE.view!==requested){STATE.view=requested;render();if(['career','cv'].includes(requested))career.open(requested);if(['portfolio','portfolio-preview'].includes(requested))portfolio.openView(requested);if(['jobs','applications'].includes(requested))jobs.open(requested);if(requested==='support')support.loadOwn();if(requested==='admin-settings'){loadPlatformSettings();if(STATE.adminSection==='users')loadAdminUsers();if(STATE.adminSection==='audit')loadAdminAudit();if(STATE.adminSection==='job-listings')jobs.loadAdmin();if(STATE.adminSection==='moderation')jobs.loadModeration();if(STATE.adminSection==='overview')loadAdminOverview();if(STATE.adminSection==='support')support.loadAdmin();if(STATE.adminSection==='readiness')loadBetaGate();}}
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
window.addEventListener('beforeunload',evt=>{if(STATE.session&&(career.hasUnsaved()||portfolio.hasUnsaved()||jobs.hasUnsaved()||support.hasUnsaved()||hasBetaDraft())){evt.preventDefault();evt.returnValue='';}});
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
          if(career.hasUnsaved()||portfolio.hasUnsaved()||jobs.hasUnsaved()||support.hasUnsaved()){toast('Simpan perubahan atau kirim laporan sebelum memperbarui aplikasi.');return;}
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
window.addEventListener('resize',()=>{
 if(window.innerWidth>760&&document.body.classList.contains('ik-mobile-menu-open'))setMobileMenu(false);
});
// Dialog Escape key and keyboard focus loop (prevent background navigation while More is open).
document.addEventListener('keydown',event=>{
 const layer=ROOT.querySelector('#ik-mobile-menu');
 if(!layer||layer.hidden)return;
 if(event.key==='Escape'){event.preventDefault();setMobileMenu(false);return;}
 if(event.key==='Tab'){
  const focusable=[...layer.querySelectorAll('button:not([disabled]):not([tabindex="-1"])')];
  if(!focusable.length)return;
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});

init();