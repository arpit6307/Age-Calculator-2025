/* Beautiful Age Calculator with:
   - Live countdown to next birthday
   - Zodiac + personality
   - Browser notifications for upcoming birthdays (works while page open)
   - Theme toggle (light/dark/romantic) with hearts animation
   - Confetti canvas celebration
*/

const nameInput = document.getElementById('name');
const dobInput = document.getElementById('dob');
const calcBtn = document.getElementById('calcBtn');
const clearBtn = document.getElementById('clearBtn');
const ageText = document.getElementById('ageText');
const countdownEl = document.getElementById('countdown');
const zodiacEl = document.getElementById('zodiac');
const personalityEl = document.getElementById('personality');
const recordsList = document.getElementById('recordsList');
const recordsEmpty = document.getElementById('recordsEmpty');
const themeSelect = document.getElementById('themeSelect');
const themeToggle = document.getElementById('themeToggle');

const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas.getContext('2d');
const heartsContainer = document.getElementById('hearts');

let countdownTimer = null;
let checkInterval = null;
let confettiParticles = [];

/* ---------- Utilities ---------- */

function pad(n){return n<10? '0'+n : ''+n}

function calcAgeParts(birthDate, now = new Date()){
  // returns years, months, days
  let y = now.getFullYear() - birthDate.getFullYear();
  let m = now.getMonth() - birthDate.getMonth();
  let d = now.getDate() - birthDate.getDate();
  if (d < 0) {
    m--;
    // days in previous month relative to now
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    d += prevMonthLastDay;
  }
  if (m < 0) {
    y--;
    m += 12;
  }
  return {years: y, months: m, days: d};
}

function nextBirthdayDate(birthDate, fromDate = new Date()){
  const by = birthDate.getFullYear();
  const bm = birthDate.getMonth();
  const bd = birthDate.getDate();
  let year = fromDate.getFullYear();
  // handle Feb 29 births: choose Feb 28 on non-leap years
  const isLeap = y => (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
  let cand = new Date(year, bm, bd);
  if (bm === 1 && bd === 29 && !isLeap(year)){ // feb29
    cand = new Date(year, 1, 28);
  }
  if (cand <= fromDate) {
    year++;
    cand = new Date(year, bm, bd);
    if (bm === 1 && bd === 29 && !isLeap(year)) cand = new Date(year,1,28);
  }
  cand.setHours(0,0,0,0); // start of birthday day
  return cand;
}

function timeDiffParts(future, now = new Date()){
  let ms = future - now;
  if (ms < 0) ms = 0;
  const sec = Math.floor(ms/1000)%60;
  const min = Math.floor(ms/60000)%60;
  const hrs = Math.floor(ms/3600000)%24;
  const days = Math.floor(ms/86400000);
  return {days, hrs, min, sec, totalMs: future-now};
}

/* ---------- Zodiac ---------- */

const zodiacRanges = [
  {name:'Capricorn', start:'12-22', end:'01-19', msg:"Responsible, disciplined, and steady — you build things that last."},
  {name:'Aquarius', start:'01-20', end:'02-18', msg:"Independent, inventive, and a little rebellious — you dream big."},
  {name:'Pisces', start:'02-19', end:'03-20', msg:"Sensitive, artistic, and compassionate — your heart feels deeply."},
  {name:'Aries', start:'03-21', end:'04-19', msg:"Brave, energetic, and adventurous — you lead with passion."},
  {name:'Taurus', start:'04-20', end:'05-20', msg:"Loyal, practical, and comfort-loving — you enjoy the finer things."},
  {name:'Gemini', start:'05-21', end:'06-20', msg:"Curious, quick-witted, and social — your mind never rests."},
  {name:'Cancer', start:'06-21', end:'07-22', msg:"Caring, protective, and intuitive — you cherish close bonds."},
  {name:'Leo', start:'07-23', end:'08-22', msg:"Warm, creative, and confident — you shine on stage of life."},
  {name:'Virgo', start:'08-23', end:'09-22', msg:"Detail-focused, practical, and kind — you make things better."},
  {name:'Libra', start:'09-23', end:'10-22', msg:"Diplomatic, charming, and fair-minded — you value harmony."},
  {name:'Scorpio', start:'10-23', end:'11-21', msg:"Intense, brave, and magnetic — you feel things to the core."},
  {name:'Sagittarius', start:'11-22', end:'12-21', msg:"Adventurous, optimistic, and free-spirited — you seek truth."}
];

function getZodiacFor(date){
  const mm = pad(date.getMonth()+1);
  const dd = pad(date.getDate());
  const key = `${mm}-${dd}`;
  for (const z of zodiacRanges){
    const s = z.start, e = z.end;
    // handle ranges that cross year boundary: Capricorn (12-22 -> 01-19)
    if (s > e){
      if (key >= s || key <= e) return z;
    } else {
      if (key >= s && key <= e) return z;
    }
  }
  return null;
}

/* ---------- Storage ---------- */

function loadRecords(){
  return JSON.parse(localStorage.getItem('age_records_v1') || '[]');
}
function saveRecords(records){
  localStorage.setItem('age_records_v1', JSON.stringify(records));
}

/* ---------- Render Records ---------- */

function renderRecords(){
  const recs = loadRecords();
  recordsList.innerHTML = '';
  if (!recs.length){
    recordsEmpty.style.display = 'block';
    return;
  }
  recordsEmpty.style.display = 'none';
  recs.slice().reverse().forEach((r, idx) => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.className = 'record-left';
    const nameEl = document.createElement('div'); nameEl.className='record-name'; nameEl.textContent = r.name;
    const meta = document.createElement('div'); meta.className='record-meta';
    meta.textContent = `${r.ageText} • Born: ${r.dob} • Saved: ${r.savedAt}`;
    left.appendChild(nameEl); left.appendChild(meta);
    const actions = document.createElement('div'); actions.className='record-actions';
    const notifyBtn = document.createElement('button'); notifyBtn.className='small-btn'; notifyBtn.textContent='Notify in app';
    notifyBtn.onclick = ()=> alert(`Reminder set: we'll notify you while page is open before ${r.name}'s birthday.`);
    const delBtn = document.createElement('button'); delBtn.className='small-btn'; delBtn.textContent='Delete';
    delBtn.onclick = ()=>{
      let arr = loadRecords();
      arr.splice(arr.length - 1 - idx, 1);
      saveRecords(arr);
      renderRecords();
    };
    actions.appendChild(notifyBtn); actions.appendChild(delBtn);
    li.appendChild(left); li.appendChild(actions);
    recordsList.appendChild(li);
  });
}

/* ---------- Countdown & Display ---------- */

function displayAgeResult(name, dobStr){
  const dob = new Date(dobStr);
  const parts = calcAgeParts(dob, new Date());
  const text = `${name}, you are ${parts.years} years, ${parts.months} months, and ${parts.days} days old.`;
  ageText.textContent = text;

  // Zodiac
  const z = getZodiacFor(dob);
  zodiacEl.textContent = `Zodiac: ${z ? z.name : '—'}`;
  personalityEl.textContent = z ? z.msg : '';

  // store
  const recs = loadRecords();
  recs.push({name, dob: dobStr, ageText: text, savedAt: new Date().toLocaleString()});
  saveRecords(recs);
  renderRecords();

  // celebrate if today is birthday
  const today = new Date();
  if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()){
    celebrate();
    notify(`${name} turns ${parts.years} today! 🎉`);
  }
  // start countdown
  startCountdownToBirthday(dob);
  fireConfetti(); // small confetti on calculate
}

function startCountdownToBirthday(birthDate){
  if (countdownTimer) clearInterval(countdownTimer);
  function update(){
    const nxt = nextBirthdayDate(birthDate);
    const parts = timeDiffParts(nxt);
    countdownEl.textContent = `Next birthday in: ${parts.days} days, ${pad(parts.hrs)}:${pad(parts.min)}:${pad(parts.sec)}`;
    // if countdown hits zero (birthday today) then celebrate
    if (parts.totalMs === 0){
      celebrate();
      // also notify
      notify(`It's birthday today! 🎉`);
    }
  }
  update();
  countdownTimer = setInterval(update, 1000);
}

/* ---------- Notifications ---------- */

function notify(message, title='Birthday Reminder'){
  // In-app toast (simple)
  showToast(message);
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted'){
    new Notification(title, {body: message, icon: null});
  }
}

function requestNotificationPermission(){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default'){
    Notification.requestPermission().then(perm => {
      console.log('Notification permission:', perm);
    });
  }
}

/* ---------- Periodic check for upcoming birthdays ---------- */

// check stored records every minute for birthdays within next 24 hours (or 1 day left)
function startRecordChecker(){
  if (checkInterval) clearInterval(checkInterval);
  function checkNow(){
    const recs = loadRecords();
    const now = new Date();
    recs.forEach(r => {
      const dob = new Date(r.dob);
      const nxt = nextBirthdayDate(dob, now);
      const diffMs = nxt - now;
      const oneDay = 24*60*60*1000;
      // if between 0 and 1 day -> notify (only once per load). use flag in record
      if (diffMs > 0 && diffMs <= oneDay && !r.notifiedThisSession){
        notify(`${r.name}'s birthday is coming up on ${nxt.toDateString()}!`, 'Upcoming Birthday');
        r.notifiedThisSession = true;
      }
    });
    saveRecords(recs);
  }
  checkNow();
  checkInterval = setInterval(checkNow, 60*1000);
}

/* ---------- Confetti & Celebrate ---------- */

function setupConfettiCanvas(){
  function resize(){
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(confettiLoop);
}

function fireConfetti(count = 60){
  for (let i=0;i<count;i++){
    confettiParticles.push({
      x: Math.random()*confettiCanvas.width,
      y: -Math.random()*200,
      vx: (Math.random()-0.5)*6,
      vy: 2 + Math.random()*6,
      size: 6 + Math.random()*8,
      rot: Math.random()*360,
      color: `hsl(${Math.floor(Math.random()*360)} 80% 60%)`,
      life: 100 + Math.random()*100
    });
  }
}

function confettiLoop(){
  confettiCtx.clearRect(0,0,confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length-1;i>=0;i--){
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06; // gravity
    p.rot += p.vx;
    p.life--;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot * Math.PI/180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
    confettiCtx.restore();
    if (p.y > confettiCanvas.height + 50 || p.life <= 0) confettiParticles.splice(i,1);
  }
  requestAnimationFrame(confettiLoop);
}

function celebrate(){
  fireConfetti(120);
  spawnHearts(18);
}

/* ---------- Hearts animation (romantic mode) ---------- */

function spawnHearts(n=12){
  for (let i=0;i<n;i++){
    const h = document.createElement('div');
    h.className = 'heart';
    const startX = Math.random()*100;
    const size = 12 + Math.random()*28;
    h.style.left = startX + '%';
    h.style.bottom = '-5%';
    h.style.width = size+'px';
    h.style.height = size+'px';
    heartsContainer.appendChild(h);

    const duration = 4000 + Math.random()*4000;
    h.animate([
      {transform: `translateY(0) scale(0.6) rotate(${Math.random()*360}deg)`, opacity: 1},
      {transform: `translateY(-120vh) scale(1.1) rotate(${Math.random()*720}deg)`, opacity: 0}
    ], {duration, easing: 'cubic-bezier(.2,.8,.2,1)'});

    setTimeout(()=> h.remove(), duration);
  }
}

/* ---------- Small UI helpers ---------- */

function showToast(msg){
  // small ephemeral toast in bottom-right
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.position='fixed';
  t.style.right='18px';
  t.style.bottom='18px';
  t.style.background='rgba(0,0,0,0.7)';
  t.style.color='white';
  t.style.padding='10px 14px';
  t.style.borderRadius='10px';
  t.style.zIndex = 9999;
  document.body.appendChild(t);
  setTimeout(()=> {
    t.style.transition='opacity 0.4s'; t.style.opacity='0';
    setTimeout(()=> t.remove(),400);
  }, 3500);
}

/* ---------- Events ---------- */

calcBtn.addEventListener('click', ()=>{
  const name = nameInput.value.trim();
  const dob = dobInput.value;
  if (!name || !dob){ alert('Please enter name and date of birth'); return; }
  displayAgeResult(name, dob);
});

clearBtn.addEventListener('click', ()=>{
  nameInput.value = ''; dobInput.value = '';
  ageText.textContent = '—'; countdownEl.textContent='Next birthday in: —'; zodiacEl.textContent='Zodiac: —'; personalityEl.textContent='—';
  if (countdownTimer) clearInterval(countdownTimer);
});

// theme handling
function applyTheme(theme){
  document.documentElement.classList.remove('light-mode','romantic-mode');
  if (theme === 'light') document.documentElement.classList.add('light-mode');
  else if (theme === 'romantic') document.documentElement.classList.add('romantic-mode');
  // hearts effect enabled automatically for romantic in celebration
}
themeSelect.addEventListener('change', (e)=> applyTheme(e.target.value));
themeToggle.addEventListener('change', ()=>{
  // quick toggle between dark and light
  const mode = themeToggle.checked ? 'light' : 'dark';
  themeSelect.value = mode;
  applyTheme(mode);
});

/* ---------- Init ---------- */

function init(){
  requestNotificationPermission();
  setupConfettiCanvas();
  renderRecords();
  startRecordChecker();
  // restore last selected theme from localStorage
  const savedTheme = localStorage.getItem('ac_theme') || 'dark';
  themeSelect.value = savedTheme;
  applyTheme(savedTheme);
  themeSelect.addEventListener('change', ()=> localStorage.setItem('ac_theme', themeSelect.value));
  // try to auto-fill name from localStorage last record
  const recs = loadRecords();
  if (recs.length) {
    nameInput.value = recs[recs.length-1].name;
    dobInput.value = recs[recs.length-1].dob;
  }
}

init();
