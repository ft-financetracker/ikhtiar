/* IKHTIAR v0.9.5 — semantic, profile-based CV templates.
 * No external assets, AI-generated claims, third-party PDF services or tracking.
 * A single saved career profile feeds ATS, concise resume and creative CV.
 */
const TYPES = Object.freeze({
 ats: {title:'CV ATS',hint:'Satu kolom, urutan baca linear, font standar; untuk sistem rekrutmen.'},
 resume: {title:'Resume',hint:'Ringkas dan fokus pada pencapaian relevan; ideal untuk pengantar lamaran.'},
 creative: {title:'CV Kreatif',hint:'Visual editorial dengan aksen warna; untuk perekrut yang membaca langsung.'}
});
const LIMIT = (s,n=2000)=>String(s??'').slice(0,n);
export const cvTypes = TYPES;
export function cvType(cv){const type=cv?.profile_snapshot?.cv_design?.type;return TYPES[type]?type:'ats';}
export function atsReadiness(profile={},email=''){
 const skills=Array.isArray(profile.skills)?profile.skills:[];
 const experience=Array.isArray(profile.experience)?profile.experience:[];
 const education=Array.isArray(profile.education)?profile.education:[];
 const checks=[
  {id:'name',label:'Nama profesional',ok:LIMIT(profile.full_name).trim().length>=2,critical:true},
  {id:'role',label:'Posisi tujuan',ok:LIMIT(profile.target_role).trim().length>=2,critical:true},
  {id:'contact',label:'Kontak aktif (email atau telepon)',ok:!!LIMIT(email||profile.email||profile.phone).trim(),critical:true},
  {id:'summary',label:'Ringkasan profesional yang spesifik',ok:LIMIT(profile.summary).trim().length>=40,critical:true},
  {id:'skills',label:'Keahlian relevan (minimal 2)',ok:skills.filter(x=>LIMIT(x).trim()).length>=2,critical:true},
  {id:'history',label:'Pendidikan atau pengalaman',ok:experience.some(x=>x.title&&x.company)||education.some(x=>x.school),critical:true},
  {id:'achievement',label:'Uraian tanggung jawab atau pencapaian',ok:experience.some(x=>LIMIT(x.description).trim().length>=25)||education.some(x=>LIMIT(x.description).trim().length>=25),critical:false}
 ];
 return {checks,ready:checks.every(c=>!c.critical||c.ok),score:Math.round(checks.filter(c=>c.ok).length/checks.length*100)};
}
const plain=s=>LIMIT(s).trim();
const html=s=>LIMIT(s,10000).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=s=>/^https:\/\//i.test(plain(s))?plain(s):'';
const listLines=(s,max=8)=>LIMIT(s,6000).split(/\r?\n/).map(x=>x.replace(/^\s*[-•*]\s*/,'').trim()).filter(Boolean).slice(0,max);
const blocks=(text,max)=>{const lines=listLines(text,max);return !lines.length?'':lines.length===1?`<p>${html(lines[0])}</p>`:`<ul>${lines.map(line=>`<li>${html(line)}</li>`).join('')}</ul>`;};
const heading=(title,content)=>content?`<section class="cv-section"><h3>${title}</h3>${content}</section>`:'';
const linkLine=(label,value)=>{const url=safeURL(value);return url?`<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(label)}: ${html(url)}</a>`:'';};
export function cvMarkup(cv,{type=cvType(cv)}={}){
 if(!TYPES[type])type='ats';
 const p=cv?.profile_snapshot||{},compact=type==='resume';
 const skills=Array.isArray(p.skills)?p.skills.filter(x=>plain(x)):[];
 const edu=Array.isArray(p.education)?p.education.filter(x=>x?.school||x?.degree):[];
 const exp=Array.isArray(p.experience)?p.experience.filter(x=>x?.title||x?.company):[];
 const cert=Array.isArray(p.certifications)?p.certifications.filter(x=>x?.name):[];
 const projects=Array.isArray(p.projects)?p.projects.filter(x=>x?.title):[];
 const langs=Array.isArray(p.languages)?p.languages.filter(x=>plain(x)):[];
 const key=plain(cv?.job_keywords).toLowerCase().split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
 const ranked=[...skills].sort((a,b)=>Number(key.some(x=>plain(b).toLowerCase().includes(x)))-Number(key.some(x=>plain(a).toLowerCase().includes(x))));
 const experience=exp.slice(0,compact?3:12).map(item=>`<div class="cv-entry"><div class="cv-entry-title"><strong>${html(item.title||'Pengalaman')}</strong>${item.period?`<span>${html(item.period)}</span>`:''}</div>${item.company?`<p class="cv-entry-sub">${html(item.company)}</p>`:''}${blocks(item.description,compact?3:9)}</div>`).join('');
 const education=edu.slice(0,compact?2:8).map(item=>`<div class="cv-entry"><div class="cv-entry-title"><strong>${html(item.school||'Pendidikan')}</strong>${item.period?`<span>${html(item.period)}</span>`:''}</div>${item.degree?`<p class="cv-entry-sub">${html(item.degree)}</p>`:''}${blocks(item.description,compact?2:6)}</div>`).join('');
 const certificates=cert.slice(0,compact?3:8).map(x=>`<div class="cv-entry cv-entry-small"><strong>${html(x.name)}</strong>${x.issuer?`<span> — ${html(x.issuer)}</span>`:''}${x.year?`<span> (${html(x.year)})</span>`:''}</div>`).join('');
 const showcases=projects.slice(0,compact?2:8).map(x=>`<div class="cv-entry"><div class="cv-entry-title"><strong>${html(x.title)}</strong>${x.role?`<span>${html(x.role)}</span>`:''}</div>${blocks(x.description,compact?2:6)}${safeURL(x.url)?`<p class="cv-entry-link">${linkLine('Proyek',x.url)}</p>`:''}</div>`).join('');
 const contact=[p.city,p.phone,p.email].map(plain).filter(Boolean);
 const contacts=contact.length?`<p class="cv-contact">${contact.map(html).join(' · ')}</p>`:'';
 const urls=[linkLine('LinkedIn',p.linkedin_url),linkLine('Portfolio',p.website_url)].filter(Boolean);
 const role=plain(cv?.position_name)||plain(p.target_role);
 const professional=plain(p.headline)||role;
 const title=type==='resume'?'Resume':type==='ats'?'Curriculum Vitae':'Creative Curriculum Vitae';
 return `<article class="ik-cv-paper ik-cv-template-${type}" data-cv-type="${type}" aria-label="${title}">
  <header class="cv-document-head"><p class="cv-document-kicker">${html(title)}</p><h2>${html(p.full_name||'Nama Profesional')}</h2><p class="cv-role">${html(professional)}</p>${contacts}${urls.length?`<p class="cv-links">${urls.join(' · ')}</p>`:''}</header>
  ${heading('Ringkasan Profesional',plain(p.summary)?`<p>${html(p.summary)}</p>`:'')}
  ${heading('Pengalaman Kerja & Organisasi',experience)}
  ${heading('Pendidikan',education)}
  ${heading('Keahlian',ranked.length?`<p class="cv-skills">${ranked.map(html).join(' · ')}</p>`:'')}
  ${heading('Proyek Terpilih',showcases)}
  ${heading('Sertifikasi & Pelatihan',certificates)}
  ${heading('Bahasa',langs.length?`<p>${langs.map(html).join(' · ')}</p>`:'')}
 </article>`;
}
const printCSS=String.raw`
:root{color-scheme:light}*,*::before,*::after{box-sizing:border-box}
html{background:#fff}body{font:10.5pt/1.45 Arial,Helvetica,sans-serif;color:#1e293b;margin:0;background:#fff}
.ik-cv-paper{width:100%;max-width:190mm;margin:0 auto;padding:7mm 4mm;background:white;color:#1e293b;overflow-wrap:break-word;word-break:normal}
.cv-document-head{border-bottom:2px solid #1e293b;padding-bottom:10pt;margin-bottom:15pt}
.cv-document-kicker{display:none}.cv-document-head h2{font:700 21pt/1.15 Arial,Helvetica,sans-serif;margin:0 0 6pt;color:#172138}
.cv-role{font-weight:700;margin:0 0 5pt}.cv-contact,.cv-links{font-size:9.3pt;margin:3pt 0;line-height:1.4}
a{color:inherit;text-decoration:none}.cv-section{margin:0 0 15pt;break-inside:auto}
.cv-section h3{font:700 10.5pt Arial,Helvetica,sans-serif;letter-spacing:.025em;margin:0 0 7pt;text-transform:uppercase;border-bottom:1px solid #cbd5e1;padding:0 0 4pt;break-after:avoid}
.cv-section p{margin:3pt 0;white-space:pre-wrap;overflow-wrap:break-word}.cv-entry{margin:0 0 10pt;break-inside:avoid-page}
.cv-entry-title{display:flex;align-items:baseline;justify-content:space-between;gap:12pt}
.ik-cv-template-ats .cv-entry-title{display:block}.ik-cv-template-ats .cv-entry-title span{display:block;text-align:left;margin-top:2pt}.cv-entry-title strong{font-weight:700}.cv-entry-title span{color:#475569;font-size:9pt;text-align:right}
.cv-entry-sub{color:#475569;margin:2pt 0 3pt}.cv-entry ul{margin:5pt 0;padding-left:16pt;list-style-type:disc}.cv-entry li{padding-left:1pt;margin:2pt 0}
.cv-entry-small{margin-bottom:5pt}.cv-entry-link{font-size:9pt}.cv-skills{line-height:1.6}
.ik-cv-template-resume{font-size:10pt}.ik-cv-template-resume .cv-document-head h2{font-size:19pt}
.ik-cv-template-resume .cv-section{margin-bottom:10pt}.ik-cv-template-resume .cv-entry{margin-bottom:7pt}
.ik-cv-template-creative{padding:12mm;background:#fff}.ik-cv-template-creative .cv-document-head{background:#102a4c;color:#fff;border:0;padding:20pt;margin:-12mm -12mm 18pt;border-radius:0}
.ik-cv-template-creative .cv-document-kicker{display:block;letter-spacing:.15em;font-size:9pt;text-transform:uppercase;color:#94f0df;margin:0 0 8pt}
.ik-cv-template-creative .cv-document-head h2{color:#fff;font-size:24pt}.ik-cv-template-creative .cv-role{color:#d7e8ff}
.ik-cv-template-creative .cv-section h3{color:#1558a9;border-bottom:2pt solid #1bbdaa;padding-bottom:5pt}
@page{size:A4;margin:14mm 15mm}
@media print{html,body{background:white!important;print-color-adjust:exact;-webkit-print-color-adjust:exact}.ik-cv-paper{width:100%;max-width:none;margin:0;padding:0;box-shadow:none!important;border:0!important}.ik-cv-template-creative .cv-document-head{margin:0 0 18pt;padding:16pt}.cv-section h3{break-after:avoid-page}}
`;
export function cvPrintHTML(cv,{type=cvType(cv)}={}){
 const title=html(`${TYPES[type]?.title||'CV ATS'} - ${cv?.profile_snapshot?.full_name||'IKHTIAR'}`);
 return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${printCSS}</style></head><body>${cvMarkup(cv,{type})}</body></html>`;
}
export function cvPrintStyles(){return printCSS;}
