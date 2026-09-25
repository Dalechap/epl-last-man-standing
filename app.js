const teams=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'];
const defaults=[];

const freshState=()=>({
round:4,
startRound:null,
registrationClosed:false,
selectedPlayer:'',
deadlinePassed:false,
deadline:null,
roundProcessed:false,
results:{},
fixtures:{},
players:defaults.map(name=>({
name,
alive:true,
picks:{},
used:[],
eliminatedRound:null
}))
});

let state=JSON.parse(localStorage.getItem('lms-state')||'null')||freshState();

if(state.registrationClosed===undefined){
  state.registrationClosed=state.round>4 || state.deadlinePassed===true;
}
if(state.startRound===undefined || state.startRound===null){
  state.startRound=state.round;
}
if(state.deadlinePassed===undefined) state.deadlinePassed=false;
if(state.deadline===undefined) state.deadline=null;
if(state.roundProcessed===undefined) state.roundProcessed=false;
if(!state.results) state.results={};
if(!state.fixtures) state.fixtures={};
if(!state.processSnapshot) state.processSnapshot=null;

state.players.forEach(p=>{
if(!p.picks)p.picks={};
if(!p.used)p.used=[];
if(p.alive===undefined)p.alive=true;
if(p.eliminatedRound===undefined)p.eliminatedRound=null;
});

const requestedTab =
  new URLSearchParams(window.location.search)
    .get('tab');

let tab =
  requestedTab === 'pick'
    ? 'pick'
    : 'home';
let adminUnlocked=false;
let authenticatedPlayer=null;
let authenticatedPin=null;

let plannerFixturesCache=null;
let plannerFixturesCacheRound=null;

let authenticatedAdminPin=null;

const COMPETITION_CODE='lms3973';
let competitionUnlocked=
localStorage.getItem('lms-access')===COMPETITION_CODE;

const appShell=document.querySelector('.shell');

if(appShell && !competitionUnlocked){
appShell.style.display='none';
}

if(!competitionUnlocked){

const accessGate=document.createElement('main');
accessGate.className='shell';

accessGate.innerHTML=`
<section class='card formCard'>
<h2>Enter Competition</h2>

<p>
Enter the competition access code to continue.
</p>

<input
id='competitionCodeInput'
type='text'
placeholder='Competition code'
autocomplete='off'
>

<button
class='primary'
id='competitionCodeBtn'
>
Enter
</button>

<div id='competitionCodeError'></div>
</section>
`;

document.body.prepend(accessGate);

document.getElementById('competitionCodeBtn').onclick=()=>{

const entered=
document.getElementById('competitionCodeInput').value
.trim()
.toLowerCase();

if(entered!==COMPETITION_CODE){

document.getElementById('competitionCodeError').innerHTML=
`<p class='error'>Incorrect competition code.</p>`;

return;
}

competitionUnlocked=true;
localStorage.setItem('lms-access',COMPETITION_CODE);

accessGate.remove();

if(appShell){
appShell.style.display='';
}

};

}
const $=s=>document.querySelector(s);

const esc=s=>String(s).replace(/[&<>\"']/g,c=>({
'&':'&amp;',
'<':'&lt;',
'>':'&gt;',
'\"':'&quot;',
"'":'&#39;'
}[c]));



function saveAdmin(){
  localStorage.setItem(
    'lms-state',
    JSON.stringify(state)
  );

  return fetch('/api/admin-state',{
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
   adminPin:authenticatedAdminPin,
      state:state
    })
  })
  .then(async response=>{
    const data=await response.json();

    if(!response.ok){
      throw new Error(
        data.error||'Admin save failed'
      );
    }

    return data;
  })
  .catch(error=>{
    console.error(
      'Admin database save failed:',
      error
    );

    notice(
      `Admin save failed: ${error.message}`,
      'warn'
    );
  });
}

function deadlineTimePassed(){
if(!state.deadline) return false;

const deadlineTime=new Date(state.deadline).getTime();

return Number.isFinite(deadlineTime) && Date.now()>=deadlineTime;
}

function syncDeadline(){
if(!state.deadlinePassed && deadlineTimePassed()){
  state.deadlinePassed=true;

  if(state.round===state.startRound){
  state.registrationClosed=true;
  }

  return true;
}

return false;
}

async function loadState(){
try{
const response=await fetch('/api/state');

if(response.ok){
const serverState=await response.json();

if(serverState){
state=serverState;

  if(state.registrationClosed===undefined){
  state.registrationClosed=
    state.round>4 ||
    state.deadlinePassed===true;
}
if(state.deadlinePassed===undefined) state.deadlinePassed=false;
if(state.deadline===undefined) state.deadline=null;
if(state.roundProcessed===undefined) state.roundProcessed=false;
if(!state.results) state.results={};
if(!state.fixtures) state.fixtures={};
if(!state.processSnapshot) state.processSnapshot=null;

state.players.forEach(p=>{
if(!p.picks)p.picks={};
if(!p.used)p.used=[];
if(p.alive===undefined)p.alive=true;
if(p.eliminatedRound===undefined)p.eliminatedRound=null;
});

syncDeadline();

localStorage.setItem('lms-state',JSON.stringify(state));
}
}
}catch(error){
console.error('Database load failed:',error);
}

render();
}

function notice(t,type='ok'){
const n=$('#notice');

n.innerHTML=t
?`<div class='notice ${type==='warn'?'warn':''}'>${esc(t)}</div>`
:'';
}

function alivePlayers(){
return state.players.filter(p=>p.alive);
}

function alive(){
return alivePlayers().length;
}

function winner(){
return state.roundProcessed&&alive()===1
?state.players.find(p=>p.alive)
:null;
}

function player(){
return state.players.find(
p=>p.name===state.selectedPlayer&&p.alive
)
||state.players.find(p=>p.alive)
||state.players[0];
}

function roundPicks(){
return state.players
.filter(p=>p.alive&&p.picks[state.round])
.map(p=>p.picks[state.round]);
}

function pickedTeams(){
return [...new Set(roundPicks())].sort();
}

function roundFixtures(){
return state.fixtures[state.round]||[];
}

async function loadEplFixtures(){
try{
notice(`Loading EPL Matchweek ${state.round} fixtures...`);

const r=await fetch(`/api/football?round=${state.round}`);
const data=await r.json();

if(!r.ok){
throw new Error(
data.error||'Could not load fixtures'
);
}

state.fixtures[state.round]=(data.matches||[]).map(m=>({
home:m.homeTeam.name,
away:m.awayTeam.name,
homeCrest:m.homeTeam.crest,
awayCrest:m.awayTeam.crest,
kickoff:m.utcDate
}));

const kickoffTimes=state.fixtures[state.round]
.map(f=>new Date(f.kickoff).getTime())
.filter(t=>Number.isFinite(t));

if(kickoffTimes.length){
state.deadline=
new Date(Math.min(...kickoffTimes)).toISOString();

state.deadlinePassed=false;

syncDeadline();
}

saveAdmin();

notice(
`Loaded ${state.fixtures[state.round].length} EPL fixtures for Matchweek ${state.round}.`
);

render();

}catch(e){
notice(
e.message||'Could not load EPL fixtures.',
'warn'
);
}
}

function resultForTeam(match,team){
if(match.status!=='FINISHED') return null;

const h=match.score.fullTime.home;
const a=match.score.fullTime.away;
const isHome=match.homeTeam.name===team;
const mine=isHome?h:a;
const theirs=isHome?a:h;

if(mine>theirs) return 'win';

if(mine<theirs) return 'loss';

if(mine===0&&theirs===0){
return isHome?'zero-home':'zero-away';
}

return 'score-draw';
}

function matchForTeam(matches,team){
return (matches||[]).find(m=>
m.homeTeam.name===team ||
m.awayTeam.name===team
);
}

function updateResultsFromMatches(matches){
let updated=0;

pickedTeams().forEach(team=>{
const match=matchForTeam(matches,team);

if(!match) return;

const result=resultForTeam(match,team);

if(result && state.results[team]!==result){
state.results[team]=result;
updated++;
}
});

return updated;
}

function selectedTeamMatchesFinished(matches){
const selectedTeams=pickedTeams();

if(selectedTeams.length===0){
return true;
}

return selectedTeams.every(team=>{
const match=matchForTeam(matches,team);

return match && match.status==='FINISHED';
});
}

async function loadEplResults(){
try{
notice(`Checking EPL Matchweek ${state.round} results...`);

const r=await fetch(`/api/football?round=${state.round}`);
const data=await r.json();

if(!r.ok){
throw new Error(
data.error||'Could not load EPL results'
);
}

const updated=updateResultsFromMatches(
data.matches||[]
);

saveAdmin();
render();

notice(
updated
?`Updated ${updated} EPL result${updated===1?'':'s'}`
:'No new finished selected-team matches yet'
);

}catch(e){
notice(
e.message||'Could not load EPL results',
'warn'
);
}
}

function outcomeSurvives(outcome){
return outcome==='win'||outcome==='zero-away';
}
function livePlayerStatus(p){
  if(!p.alive){
    return 'eliminated';
  }

  const pick=p.picks[state.round];

  if(!pick){
    return 'alive';
  }

  const outcome=state.results[pick];

  if(!outcome){
    return 'alive';
  }

  return outcomeSurvives(outcome)
    ?'surviving'
    :'pending-elimination';
}
function shortTeam(t){
return t
.split(' ')
.map(x=>x[0])
.join('')
.slice(0,3)
.toUpperCase();
}

function savePick(team){
 if(!authenticatedPlayer){
  return notice(
    'Please authenticate before making a pick.',
    'warn'
  );
}
if(syncDeadline()){
fetch('/api/deadline',{
  method:'POST'
}).catch(error=>
  console.error('Deadline save failed:',error)
);
render();

return notice(
`Matchweek ${state.round} selections are closed because the first match has kicked off.`,
'warn'
);
}

if(state.deadlinePassed){
return notice(
`Selections are closed for Matchweek ${state.round}.`,
'warn'
);
}

const p=state.players.find(
  x=>x.name===authenticatedPlayer
);

if(!p){
  authenticatedPlayer=null;
  return notice(
    'Player authentication has expired. Please authenticate again.',
    'warn'
  );
}

if(!p.alive){
return notice(
'This player has been eliminated.',
'warn'
);
}

if(!team){
return notice(
'Choose a team first.',
'warn'
);
}

if(
p.used.some(
t=>t.replace(/ FC$/,'')===team.replace(/ FC$/,'')
)
&&p.picks[state.round]!==team
){
return notice(
'That team has already been used.',
'warn'
);
}

const prev=p.picks[state.round];

if(prev){
p.used=p.used.filter(t=>t!==prev);
}

p.picks[state.round]=team;
p.used=[...new Set([...p.used,team])];

fetch('/api/pick',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
  playerName:p.name,
  team:team,
  round:state.round,
 pin:authenticatedPin
})
})
.then(async response=>{
const data=await response.json();

if(!response.ok){
throw new Error(data.error||'Could not save pick');
}

if(data.state){
state=data.state;
state.selectedPlayer=authenticatedPlayer;
localStorage.setItem('lms-state',JSON.stringify(state));
}

render();
})
.catch(error=>{
notice(
`Pick could not be saved: ${error.message}`,
'warn'
);
});

render();
}

function processRound(automatic=false){
syncDeadline();

if(!state.deadlinePassed){
return false;
}

if(state.roundProcessed){
return false;
}

const active=state.players.filter(p=>p.alive);

const missingResults=pickedTeams().filter(
t=>!state.results[t]
);

if(missingResults.length){
if(!automatic){
notice(
`Enter a result for: ${missingResults.join(', ')}`,
'warn'
);
}

return false;
}

state.processSnapshot={
alive:Object.fromEntries(
state.players.map(p=>[p.name,p.alive])
),
eliminatedRound:Object.fromEntries(
state.players.map(
p=>[p.name,p.eliminatedRound||null]
)
),
results:{...state.results}
};

const wouldEliminate=[];

active.forEach(p=>{
const pick=p.picks[state.round];

if(!pick){
wouldEliminate.push(p);
return;
}

if(!outcomeSurvives(state.results[pick])){
wouldEliminate.push(p);
}
});

if(
wouldEliminate.length===active.length
&&active.length>0
){
state.roundProcessed=true;

saveAdmin();
render();

notice(
automatic
?`Matchweek ${state.round} was processed automatically. Everyone failed, so all remaining players stay alive. Their selected teams still count as used.`
:'Everyone failed this Matchweek, so all remaining players stay alive. Their selected teams still count as used.'
);

return true;
}

wouldEliminate.forEach(p=>{
p.alive=false;
p.eliminatedRound=state.round;
});

state.roundProcessed=true;

saveAdmin();
render();

notice(
automatic
?`Matchweek ${state.round} was processed automatically. ${alive()} player${alive()===1?'':'s'} remain alive.`
:`Matchweek ${state.round} processed. ${alive()} player${alive()===1?'':'s'} remain alive.`
);

return true;
}

async function autoCheckResults(){
  if(autoResultsCheckInProgress){
    return;
  }

  const deadlineJustClosed=syncDeadline();

  if(deadlineJustClosed){
    try{
      await fetch('/api/deadline',{
        method:'POST'
      });
    }catch(error){
      console.error(
        'Deadline save failed:',
        error
      );
    }

    render();
  }

  if(
    !state.deadlinePassed ||
    state.roundProcessed
  ){
    return;
  }

  autoResultsCheckInProgress=true;

  try{
    const response=await fetch(
      '/api/auto-results',
      {
        method:'POST'
      }
    );

    const data=await response.json();

    if(!response.ok){
      throw new Error(
        data.error||
        'Could not check automatic results'
      );
    }

   if(data.changed){
  await loadState();
  await checkNotifications();
}
  }catch(error){
    console.error(
      'Automatic EPL results check failed:',
      error
    );
 }finally{
    autoResultsCheckInProgress=false;
  }
}

async function checkNotifications(){
  try{
    const response=
      await fetch('/api/notifications',{
        method:'POST'
      });

    if(!response.ok){
      const data=
        await response.json();

      throw new Error(
        data.error||
        'Notification check failed'
      );
    }

  }catch(error){
    console.error(
      'Notification reminder check failed:',
      error
    );
  }
}


function undoProcessedRound(){
if(!state.roundProcessed){
return notice(
'This Matchweek has not been processed yet.',
'warn'
);
}

if(
state.processSnapshot &&
state.processSnapshot.alive
){
state.players.forEach(p=>{
if(
Object.prototype.hasOwnProperty.call(
state.processSnapshot.alive,
p.name
)
){
p.alive=
state.processSnapshot.alive[p.name];
}

if(
state.processSnapshot.eliminatedRound &&
Object.prototype.hasOwnProperty.call(
state.processSnapshot.eliminatedRound,
p.name
)
){
p.eliminatedRound=
state.processSnapshot.eliminatedRound[p.name];
}
});
}

state.roundProcessed=false;

state.deadlinePassed=
deadlineTimePassed();

state.results={};
state.processSnapshot=null;

const p=state.players.find(x=>x.alive);

if(p){
state.selectedPlayer=p.name;
}

notice(
state.deadlinePassed
?`Matchweek ${state.round} processing undone. Selections remain closed because the deadline has passed.`
:`Matchweek ${state.round} processing undone. Selections are open again.`
);
saveAdmin();
render();
}

async function advanceRound(){
if(!state.roundProcessed){
return notice(
'Process the current Matchweek results first.',
'warn'
);
}

if(winner()){
return notice(
'The competition is finished. There is already a Last Man Standing.',
'warn'
);
}

state.round++;
state.deadlinePassed=false;
state.deadline=null;
state.roundProcessed=false;
state.results={};
state.processSnapshot=null;

await saveAdmin();

notice(
`Matchweek ${state.round} is now open. Loading EPL fixtures...`
);

render();

await loadEplFixtures();
}

function renderStandings(){
return `<div class='standings'>${
state.players.map((p,i)=>{
let r=p.alive
?state.round
:(p.eliminatedRound||state.round);

let pick=p.picks[r];
let liveStatus=livePlayerStatus(p);

let shown=p.alive&&!state.deadlinePassed
?(pick?'Pick submitted':'No pick submitted')
:(pick||'No pick');

let statusText=!p.alive
?'Eliminated'
:(liveStatus==='pending-elimination'
?'Pending elimination'
:'Alive');

return `<div class='standingRow'>
<div class='pos'>${i+1}</div>
<div class='standingName'>
<strong>${esc(p.name)}</strong>
<span>${statusText}</span>
</div>
<div class='standingPick'>${esc(shown)}</div>
<div class='usedCount'>${p.used.length} used</div>
<span class='dot ${liveStatus==='pending-elimination'?'off':(p.alive?'on':'off')}'></span>
</div>`;
}).join('')
}</div>`;
}
function fixtureCard(home,away,current,p,homeCrest,awayCrest){
const hUsed=
p.used.includes(home)&&current!==home;

const aUsed=
p.used.includes(away)&&current!==away;

return `<div class='fixtureCard'>
<button
class='teamPick ${current===home?'selected':''}'
data-team='${esc(home)}'
${hUsed?'disabled':''}
>
<span class='crest'>
${homeCrest
?`<img src='${esc(homeCrest)}' alt='${esc(home)} badge'>`
:shortTeam(home)
}
</span>

<span>${esc(home)}</span>

${hUsed?`<small>Used</small>`:''}
</button>

<div class='vs'>v</div>

<button
class='teamPick ${current===away?'selected':''}'
data-team='${esc(away)}'
${aUsed?'disabled':''}
>
<span class='crest'>
${awayCrest
?`<img src='${esc(awayCrest)}' alt='${esc(away)} badge'>`
:shortTeam(away)
}
</span>

<span>${esc(away)}</span>

${aUsed?`<small>Used</small>`:''}
</button>
</div>`;
}

function urlBase64ToUint8Array(base64String){
  const padding=
    '='.repeat((4-base64String.length%4)%4);

  const base64=
    (base64String+padding)
      .replace(/-/g,'+')
      .replace(/_/g,'/');

  const rawData=window.atob(base64);

  return Uint8Array.from(
    [...rawData].map(
      char=>char.charCodeAt(0)
    )
  );
}
async function enableNotifications(){
  if(!('Notification' in window)){
    notice(
      'Notifications are not supported on this device.',
      'warn'
    );
    return;
  }

  if(!('serviceWorker' in navigator)){
    notice(
      'Notifications are not supported in this browser.',
      'warn'
    );
    return;
  }

  try{
    const permission=
      await Notification.requestPermission();

    if(permission!=='granted'){
      notice(
        'Notifications were not enabled.',
        'warn'
      );
      render();
      return;
    }

    const keyResponse=
      await fetch('/api/push-public-key');

    const keyData=
      await keyResponse.json();

    if(!keyResponse.ok){
      throw new Error(
        keyData.error||
        'Could not load notification key'
      );
    }

    const registration=
      await navigator.serviceWorker.ready;

    let subscription=
      await registration.pushManager
        .getSubscription();

    if(!subscription){
      subscription=
        await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:
            urlBase64ToUint8Array(
              keyData.publicKey
            )
        });
    }

    const playerName=
  prompt('Enter your player name');

if(!playerName){
  notice(
    'Notification setup cancelled.',
    'warn'
  );
  render();
  return;
}

const pin=
  prompt(
    `Enter the 4-digit PIN for ${playerName}`
  );

if(!pin){
  notice(
    'Notification setup cancelled.',
    'warn'
  );
  render();
  return;
}

const subscribeResponse=
  await fetch('/api/push-subscribe',{
    method:'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body:JSON.stringify({
      playerName,
      pin,
      subscription:
        subscription.toJSON()
    })
  });

const subscribeData=
  await subscribeResponse.json();

if(!subscribeResponse.ok){
  throw new Error(
    subscribeData.error||
    'Could not save notification subscription'
  );
}

localStorage.setItem(
  'lms-notification-player',
  subscribeData.playerName
);
    
notice(
  `Notifications are enabled for ${subscribeData.playerName}.`,
  'ok'
);

render();
  }catch(error){
    console.error(
      'Notification setup failed:',
      error
    );

    notice(
      'Could not enable notifications.',
      'warn'
    );
  }
}

async function loadPlannerFixtures(){

    const currentRound = Number(state.round);

  if(
    plannerFixturesCache &&
    plannerFixturesCacheRound === currentRound
  ){
    return plannerFixturesCache;
  }
  
  const matchweeks = [
    Number(state.round),
    Number(state.round) + 1,
    Number(state.round) + 2,
    Number(state.round) + 3
  ];

  async function loadMatchweek(matchweek){
    const response = await fetch(
      `/api/football?round=${matchweek}`
    );

    const data = await response.json();

    if(!response.ok){
      throw new Error(
        data.error ||
        `Could not load Matchweek ${matchweek}`
      );
    }

    return {
      matchweek,
      matches:data.matches || []
    };
  }

  const results = await Promise.all(
    matchweeks.map(async matchweek => {
      try{
        return await loadMatchweek(matchweek);

      }catch(firstError){
        console.warn(
          `Retrying Matchweek ${matchweek}:`,
          firstError
        );

        await new Promise(
          resolve => setTimeout(resolve, 500)
        );

        try{
          return await loadMatchweek(matchweek);

        }catch(secondError){
          console.error(
            `Could not load Matchweek ${matchweek}:`,
            secondError
          );

          return {
            matchweek,
            matches:[]
          };
        }
      }
    })
  );

    const hasFixtures = results.some(
    item => item.matches && item.matches.length
  );

  if(!hasFixtures){
    return results;
  }
  plannerFixturesCache = results;
  plannerFixturesCacheRound = currentRound;

  return plannerFixturesCache;

       }
function playerLoginModal(){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');
    overlay.className='loginOverlay';

    overlay.innerHTML=`
      <div class='loginModal'>
        <div class='eyebrow dark'>PLAYER LOGIN</div>

        <h2>Welcome back</h2>

        <p class='muted'>
          Enter your player name and 4-digit PIN.
        </p>

        <label class='loginLabel'>
          Player name
        </label>

        <input
          id='loginPlayerName'
          class='loginInput'
          type='text'
          autocomplete='name'
          placeholder='Your name'
        >

        <label class='loginLabel'>
          PIN
        </label>

        <input
          id='loginPlayerPin'
          class='loginInput'
          type='password'
          inputmode='numeric'
          maxlength='4'
          autocomplete='off'
          placeholder='••••'
        >

        <div id='loginError' class='loginError'></div>

        <button id='loginContinue' class='loginContinue'>
          Continue
        </button>

        <button id='loginCancel' class='loginCancel'>
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const nameInput=
      overlay.querySelector('#loginPlayerName');

    const pinInput=
      overlay.querySelector('#loginPlayerPin');

    const finish=value=>{
      overlay.remove();
      resolve(value);
    };

    overlay
      .querySelector('#loginContinue')
      .onclick=()=>{
        const name=nameInput.value.trim();
        const pin=pinInput.value.trim();

        if(!name || !pin){
          overlay.querySelector('#loginError')
            .textContent=
              'Enter your player name and PIN.';
          return;
        }

        finish({
  name,
  pin
});
};

    overlay
      .querySelector('#loginCancel')
      .onclick=()=>finish(null);

    pinInput.addEventListener(
      'keydown',
      e=>{
        if(e.key==='Enter'){
          overlay
            .querySelector('#loginContinue')
            .click();
        }
      }
    );

    setTimeout(
      ()=>nameInput.focus(),
      50
    );
  });
}

function joinCompetitionModal(){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');
    overlay.className='loginOverlay';

    overlay.innerHTML=`
      <div class='loginModal'>
        <div class='eyebrow dark'>JOIN COMPETITION</div>

        <h2>Create your player</h2>

        <p class='muted'>
          Enter your name and create a 4-digit PIN.
        </p>

        <label class='loginLabel'>
          Player name
        </label>

        <input
          id='joinPlayerName'
          class='loginInput'
          type='text'
          autocomplete='name'
          placeholder='Your name'
        >

        <label class='loginLabel'>
          Create PIN
        </label>

        <input
          id='joinPlayerPin'
          class='loginInput'
          type='password'
          inputmode='numeric'
          maxlength='4'
          autocomplete='off'
          placeholder='••••'
        >

        <div id='joinError' class='loginError'></div>

        <button id='joinContinue' class='loginContinue'>
          Join Competition
        </button>

        <button id='joinCancel' class='loginCancel'>
          Cancel
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const nameInput=
      overlay.querySelector('#joinPlayerName');

    const pinInput=
      overlay.querySelector('#joinPlayerPin');

    const error=
      overlay.querySelector('#joinError');

    const finish=value=>{
      overlay.remove();
      resolve(value);
    };

    overlay
      .querySelector('#joinContinue')
      .onclick=()=>{
        const name=nameInput.value.trim();
        const pin=pinInput.value.trim();

        if(!name){
          error.textContent=
            'Enter your player name.';
          return;
        }

        if(!/^\d{4}$/.test(pin)){
          error.textContent=
            'PIN must be exactly 4 digits.';
          return;
        }

        finish({
          name,
          pin
        });
      };

    overlay
      .querySelector('#joinCancel')
      .onclick=()=>finish(null);

    pinInput.addEventListener(
      'keydown',
      e=>{
        if(e.key==='Enter'){
          overlay
            .querySelector('#joinContinue')
            .click();
        }
      }
    );

    setTimeout(
      ()=>nameInput.focus(),
      50
    );
  });
}
async function render(){
syncDeadline();

$('#summary').textContent=
`Matchweek ${state.round} · ${alive()} player${alive()==1?'':'s'} alive`;

document
.querySelectorAll('.tabs button')
.forEach(b=>
b.classList.toggle(
'active',
b.dataset.tab===tab
)
);

const c=$('#content');

if(tab==='home'){
const w=winner();

const notificationsSupported=
  'Notification' in window &&
  'serviceWorker' in navigator;

const notificationPlayer=
  localStorage.getItem(
    'lms-notification-player'
  );

c.innerHTML=`

${
notificationsSupported&&!notificationPlayer
?`
<div class='card'>
<h2>Notifications</h2>
<p>
Turn on notifications for Matchweek updates and pick reminders.
</p>

<button
class='primary'
id='enableNotifications'
>
Enable Notifications
</button>
</div>
`
:''
}

${
!authenticatedPlayer && !winner()
?`
<div class='card'>

${
!state.registrationClosed
?`
<h2>Join Competition</h2>

<p class='joinIntro'>
  New here? Create your player profile and 4-digit PIN.
</p>

<button
  class='primary'
  id='joinBtn'
>
  Join Competition
</button>

<div id='joinMessage'></div>
`
:''
}

<div class='homeLogin'>
  <p class='muted'>
    ${
      !state.registrationClosed
      ?'Already playing?'
      :'Already playing? Sign in below.'
    }
  </p>

  <button
    class='secondary'
    id='homePlayerLogin'
  >
    Player Login
  </button>
</div>

</div>
`
:''
}
${
w
?`<div class='winnerCard'>
<div class='trophy'>🏆</div>

<div>
<div class='winnerLabel'>
COMPETITION WINNER
</div>

<h2>
${esc(w.name)} is the Last Man Standing!
</h2>

<p>
The competition is complete.
</p>
</div>
</div>`
:''
}

${
authenticatedPlayer
?(()=>{
  const me=
    state.players.find(
      p=>
        p.name===authenticatedPlayer
    );

  if(!me){
    return '';
  }
const myPick=
  me.picks?.[state.round]||'';
const myFixture=
  roundFixtures().find(
    f=>
      f.home.replace(/ FC$/,'')===
        myPick.replace(/ FC$/,'') ||
      f.away.replace(/ FC$/,'')===
        myPick.replace(/ FC$/,'')
  );

const myCrest=
  myFixture
    ?(
      myFixture.home.replace(/ FC$/,'')===
        myPick.replace(/ FC$/,'')
        ?myFixture.homeCrest
        :myFixture.awayCrest
    )
    :'';
 
  const myCrestHtml=
  myCrest
    ?`<img
        class='myCompetitionCrest'
        src='${esc(myCrest)}'
        alt='${esc(myPick)} badge'
      >`
    :'';
  return `
    <div class='card'>
  <div class='homePickDisplay'>
    ${myCrestHtml}
    ${
      myPick
        ?`<div class='homePickText'>Pick: <b>${esc(myPick)}</b></div>`
        :''
    }
  </div>
      <div class='eyebrow dark'>
        MY COMPETITION
      </div>

      <h2>
        ${esc(me.name)}
        ${me.alive?'— Alive':'— Eliminated'}
      </h2>

      <p>
        <b>Matchweek ${state.round}</b>
      </p>


      <p class='muted'>
        <b>Teams used:</b>
        ${
          me.used?.length
          ?me.used.map(esc).join(', ')
          :'None yet'
        }
      </p>
${
  me.alive
  ?''
   
  :`<p class='muted'>
      Eliminated in Matchweek ${me.eliminatedRound||''}.
    </p>`
}

    </div>
  `;
})()
:''
}

<div class='grid stats'>
<div class='card'>
<span>Current Matchweek</span>
<strong>${state.round}</strong>
</div>

<div class='card'>
<span>Still alive</span>
<strong>${alive()}</strong>
</div>

<div class='card'>
<span>Selections</span>
<strong>
${state.deadlinePassed?'Closed':'Open'}
</strong>
</div>
</div>

<div class='card tableCard'>
<div class='sectionHead'>
<div>
<div class='eyebrow dark'>
COMPETITION
</div>

<h2>Standings</h2>
</div>
</div>

${renderStandings()}
</div>

<details class='card rules'>
<summary><h2>Competition rules</h2></summary>

<ul>
<li>
The competition continues until one player remains.
</li>

<li>
Pick one EPL team each Matchweek. A team can only be used once by each player.
</li>

<li>
Win = survive. Loss or score draw = eliminated.
</li>

<li>
For a 0–0 draw, the away-team picker survives; the home-team picker is eliminated.
</li>

<li>
No pick before the deadline = eliminated.
</li>

<li>
If every remaining player is eliminated in the same Matchweek, they all stay alive, but their selected teams still count as used.
</li>
</ul>
</details>
`;


  c.innerHTML += `
    <div class='homeAdmin'>
      <button id='homeAdminBtn' class='secondary'>
        ⚙ Admin
      </button>
    </div>
  `;

  if($('#homePlayerLogin')) $('#homePlayerLogin').onclick=async ()=>{
  const login=await playerLoginModal();

  if(!login){
    return;
  }

  const selected=
    state.players.find(
      p=>
        p.alive &&
        p.name.toLowerCase()===
        login.name.toLowerCase()
    );

  if(!selected){
    notice(
      'Player not found or already eliminated.',
      'warn'
    );
    return;
  }

  try{
    const response=
      await fetch('/api/auth',{
        method:'POST',
        headers:{
          'Content-Type':'application/json'
        },
        body:JSON.stringify({
          playerName:selected.name,
          pin:login.pin
        })
      });

    const data=
      await response.json();

    if(!response.ok){
      notice(
        data.error||'Incorrect PIN.',
        'warn'
      );
      return;
    }

    authenticatedPlayer=selected.name;
    authenticatedPin=login.pin;
    state.selectedPlayer=selected.name;

    notice('');
    render();

  }catch(error){
    notice(
      'Unable to authenticate. Please try again.',
      'warn'
    );
  }
};
  if($('#joinBtn')) $('#joinBtn').onclick=async ()=>{
if(state.registrationClosed){
  $('#joinMessage').innerHTML=
    `<div class='notice warn'>Registration is closed. The competition has already started.</div>`;
  return;
}

const join=
  await joinCompetitionModal();

if(!join){
  return;
}

const name=join.name;
const pin=join.pin;

if(
state.players.some(
p=>
p.name.toLowerCase()===
name.trim().toLowerCase()
)
){
return notice(
'That player already exists.',
'warn'
);
}

fetch('/api/join',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
name:name.trim(),
pin
})
})
.then(async response=>{
const data=await response.json();

if(!response.ok){
throw new Error(data.error||'Could not join competition');
}

if(data.state){
  state=data.state;
  authenticatedPlayer=name.trim();
  authenticatedPin=pin;
  state.selectedPlayer=authenticatedPlayer;
  localStorage.setItem('lms-state',JSON.stringify(state));
}

notice(
`${name.trim()} joined the competition.`
);

render();
})
.catch(error=>{
notice(
`Could not join competition: ${error.message}`,
'warn'
);
});
};
const enableNotificationsBtn=
  $('#enableNotifications');

if(enableNotificationsBtn){
  enableNotificationsBtn.onclick=
    enableNotifications;
}
  
  $('#homeAdminBtn').onclick=async ()=>{
  if(!adminUnlocked){
    const pin=prompt('Enter Admin PIN:');

    if(!pin){
      return;
    }

    try{
      const response=await fetch('/api/admin-auth',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({pin})
      });

      const data=await response.json();

      if(!response.ok){
        notice(data.error||'Incorrect Admin PIN.','warn');
        return;
      }

      adminUnlocked=true;
      authenticatedAdminPin=pin;

    }catch(error){
      notice(
        'Unable to authenticate Admin. Please try again.',
        'warn'
      );
      return;
    }
  }

  tab='admin';
  notice('');
  render();
};
}

if(tab==='pick'){
  if(!authenticatedPlayer){
    const login=
      await playerLoginModal();

    if(!login){
      tab='home';
      render();
      return;
    }

    const selected=
      state.players.find(
        p=>
          p.alive &&
          p.name.toLowerCase()===
          login.name.toLowerCase()
      );

    if(!selected){
      notice(
        'Player not found or already eliminated.',
        'warn'
      );
      tab='home';
      render();
      return;
    }

    try{
      const response=
        await fetch('/api/auth',{
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            playerName:selected.name,
            pin:login.pin
          })
        });

      const data=
        await response.json();

      if(!response.ok){
        notice(
          data.error||'Incorrect PIN.',
          'warn'
        );
        tab='home';
        render();
        return;
      }

      authenticatedPlayer=selected.name;
      authenticatedPin=login.pin;
      state.selectedPlayer=selected.name;

    }catch(error){
      notice(
        'Unable to authenticate. Please try again.',
        'warn'
      );
      tab='home';
      render();
      return;
    }
  }
const p=
  state.players.find(
    player=>
      player.name===authenticatedPlayer &&
      player.alive
  );

const current=
p.picks[state.round]||'';

const avail=teams.filter(
t=>
!p.used.includes(t) ||
t===current
);

let fixtures=roundFixtures();

if(!fixtures.length){
  try{
    const response=
      await fetch(
        `/api/football?round=${state.round}`
      );

    const data=
      await response.json();

    if(response.ok){
      fixtures=
        (data.matches||[]).map(m=>({
          home:m.homeTeam.name,
          away:m.awayTeam.name,
          homeCrest:m.homeTeam.crest,
          awayCrest:m.awayTeam.crest,
          kickoff:m.utcDate
        }));
    }
  }catch(error){
    console.error(
      'Could not load Make Pick fixtures:',
      error
    );
  }
}

c.innerHTML=`
<section class='card formCard'>
<div class='sectionHead'>
<div>
<div class='eyebrow dark'>
Matchweek ${state.round}
</div>


</div>
</div>

<div class='pickGreeting'>
  Hi ${esc(authenticatedPlayer)}, choose your team for Matchweek ${state.round}.
</div>

${
current
?`<p class='current'>
Current pick:
<b>${esc(current)}</b>
</p>`
:''
}

${
state.deadlinePassed
?`<div class='closedBox'>
Selections are closed for Matchweek ${state.round}.
</div>`
:fixtures.length
?`<label>Fixtures</label>

<div class='fixtures'>
${
fixtures
.map(f=>
fixtureCard(
f.home,
f.away,
current,
p,
f.homeCrest,
f.awayCrest
)
)
.join('')
}
</div>`
:`<label>Team</label>

<select id='teamSel'>
<option value=''>
Select a team…
</option>

${
avail
.map(t=>
`<option
${t===current?'selected':''}
>
${t}
</option>`
)
.join('')
}
</select>

<button
class='primary'
id='savePick'
>
Save Pick
</button>

<p class='muted'>
No fixtures entered yet — team-list mode is active.
</p>`
}

<p class='usedTeams'>
<b>Used:</b>
${
p.used.length
?p.used.join(', ')
:'None yet'
}
</p>
</section>
`;

if(!state.deadlinePassed){
if($('#savePick')){
$('#savePick').onclick=()=>
savePick(
$('#teamSel').value
);
}

document
.querySelectorAll('.teamPick')
.forEach(
b=>
b.onclick=()=>
savePick(
b.dataset.team
)
);
}
}

if(tab==='fixtures'){
    const fixturesTabAtLoad = tab;
  if(!authenticatedPlayer){
    const login=
      await playerLoginModal();

    if(!login){
      tab='home';
      render();
      return;
    }

    const selected=
      state.players.find(
        p=>
          p.alive &&
          p.name.toLowerCase()===
          login.name.toLowerCase()
      );

    if(!selected){
      notice(
        'Player not found or already eliminated.',
        'warn'
      );
      tab='home';
      render();
      return;
    }

    try{
      const response=
        await fetch('/api/auth',{
          method:'POST',
          headers:{
            'Content-Type':'application/json'
          },
          body:JSON.stringify({
            playerName:selected.name,
            pin:login.pin
          })
        });

      const data=
        await response.json();

      if(!response.ok){
        notice(
          data.error||'Incorrect PIN.',
          'warn'
        );
        tab='home';
        render();
        return;
      }

      authenticatedPlayer=selected.name;
      authenticatedPin=login.pin;

    }catch(error){
      notice(
        'Unable to authenticate. Please try again.',
        'warn'
      );
      tab='home';
      render();
      return;
    }
  }

  const plannerPlayer=
    state.players.find(
      p=>p.name===authenticatedPlayer
    );
  c.innerHTML=`
    <h2>Fixtures</h2>

    <div class='card'>
      <p>
        Loading the next four Matchweeks…
      </p>
    </div>
  `;

  try{
    const planner=
      await loadPlannerFixtures();

        if(tab !== fixturesTabAtLoad){
      return;
    }
    c.innerHTML=`
   <h2>Fixtures</h2>

   ${    
        planner.map(item=>`
         <details class='card matchweekDropdown'>
            <summary class='matchweekSummary'>
  <div class='sectionHead'>
    <div>
      <div class='eyebrow dark'>
        ${
  item.matchweek===Number(state.round)
    ?'CURRENT MATCHWEEK'
  :'UPCOMING'
}
      </div>

      <h2>
        Matchweek ${item.matchweek}
      </h2>
    </div>
  </div>
</summary>
            <div class='fixtures'>
              ${
item.matches.length
 ?item.matches.map(match=>{
  const home=
    match.homeTeam?.name || '';

  const away=
    match.awayTeam?.name || '';

  const homeUsed=
    plannerPlayer?.used?.some(
      team=>
        team.replace(/ FC$/,'')===
        home.replace(/ FC$/,'')
    );

  const awayUsed=
    plannerPlayer?.used?.some(
      team=>
        team.replace(/ FC$/,'')===
        away.replace(/ FC$/,'')
    );

  return `
    <div class='fixtureCard'>

      <div class='plannerTeam ${homeUsed?'plannerTeamUsed':''}'>
        ${
          match.homeTeam?.crest
            ?`<img
                class='plannerCrest'
                src='${esc(match.homeTeam.crest)}'
                alt=''
              >`
            :''
        }

        <span class='plannerTeamName'>
          ${esc(home)}
        </span>

        ${
          homeUsed
            ?`<span class='plannerUsed'>Used</span>`
            :''
        }
      </div>

      <div class='muted'>
        v
      </div>

      <div class='plannerTeam ${awayUsed?'plannerTeamUsed':''}'>
        ${
          match.awayTeam?.crest
            ?`<img
                class='plannerCrest'
                src='${esc(match.awayTeam.crest)}'
                alt=''
              >`
            :''
        }

        <span class='plannerTeamName'>
          ${esc(away)}
        </span>

        ${
          awayUsed
            ?`<span class='plannerUsed'>Used</span>`
            :''
        }
      </div>

    </div>
  `;
}).join('')
                  :`<p class='muted'>
                      Fixtures not available yet.
                    </p>`
              }
            </div>
         </details>
        `).join('')
      }
    `;

  }catch(error){
    console.error(
      'Fixture planner failed:',
      error
    );

    c.innerHTML=`
      <h2>Fixtures</h2>

      <div class='notice warn'>
        Could not load upcoming fixtures.
      </div>
    `;
  }
}
  
if(tab==='players'){
c.innerHTML=`
<h2>Players</h2>
${
  !state.deadlinePassed
  ?`<p class='privacyNote'>
     Selections hidden until Matchweek commences
    </p>`
  :''
}
<div class='playerList'>
${
state.players.map(p=>{
let displayRound=
state.round;

let shown;

 const currentPick=p.picks[state.round];

const visibleUsed=
state.deadlinePassed
?p.used
:p.used.filter(team=>team!==currentPick);
 
if(p.alive){
  const pick=p.picks[state.round];
  const liveStatus=livePlayerStatus(p);

  if(state.deadlinePassed && liveStatus==='pending-elimination'){
    shown=pick
      ?`${pick} — Pending elimination`
      :'Pending elimination';
  }else if(state.deadlinePassed){
    shown=pick||'No pick';
  }else{
    shown=pick
      ?'Pick submitted'
      :'No pick submitted';
  }
}else{
displayRound=
p.eliminatedRound
||Math.max(
0,
...Object.keys(
p.picks
).map(Number)
)
||state.round;

const pick=
p.picks[displayRound];

shown=
pick||'No pick';
}

return `<div class='card player'>
<div>
<strong>
${esc(p.name)}
</strong>

<span
class='${p.alive?'alive':'out'}'
>
${
  !p.alive
    ?'Eliminated'
    :livePlayerStatus(p)==='pending-elimination'
    ?'Pending elimination'
    :'Alive'
}
</span>
</div>

<div class='pickLine'>
Matchweek ${displayRound}:
${esc(shown)}
</div>

<div class='muted'>
<strong>Pick history:</strong>
${
Object.keys(p.picks || {})
  .map(Number)
  .filter(matchweek =>
    matchweek < Number(state.round)
  )
  .sort((a,b) => a-b)
  .map(matchweek => {
  const pick=p.picks[matchweek];
  const fixture=(state.fixtures[matchweek]||[]).find(
    f=>
      f.home.replace(/ FC$/,'')===pick.replace(/ FC$/,'') ||
      f.away.replace(/ FC$/,'')===pick.replace(/ FC$/,'')
  );

  const crest=fixture
    ?(
      fixture.home.replace(/ FC$/,'')===pick.replace(/ FC$/,'')
        ?fixture.homeCrest
        :fixture.awayCrest
    )
    :'';

  return crest
    ?`MW${matchweek}: <img class='historyCrest' src='${esc(crest)}' alt='${esc(pick)} badge'>`
    :`MW${matchweek}: ${esc(pick)}`;
})
.join(' · ')
|| 'None'
}
</div>
</div>`;
}).join('')
}
</div>

`;
}

if(tab==='admin'){
if(!adminUnlocked){
tab='home';
notice('Admin access is locked.','warn');
render();
return;
}
const teamRows=
pickedTeams().length
?pickedTeams().map(t=>
`<div class='resultRow'>
<div class='resultTeam'>
${esc(t)}
</div>

<select
class='resultSel'
data-team='${esc(t)}'
${state.roundProcessed?'disabled':''}
>
<option value=''>
Select result…
</option>

<option
value='win'
${state.results[t]==='win'?'selected':''}
>
Win
</option>

<option
value='loss'
${state.results[t]==='loss'?'selected':''}
>
Loss
</option>

<option
value='score-draw'
${state.results[t]==='score-draw'?'selected':''}
>
Score draw
</option>

<option
value='zero-home'
${state.results[t]==='zero-home'?'selected':''}
>
0–0 draw — picked team was HOME
</option>

<option
value='zero-away'
${state.results[t]==='zero-away'?'selected':''}
>
0–0 draw — picked team was AWAY
</option>
</select>
</div>`
).join('')
:`<p class='muted'>
No team selections have been made yet.
</p>`;

const w=winner();
const fixtures=roundFixtures();
const automaticClosed=
deadlineTimePassed();

c.innerHTML=`
<section class='card formCard'>
<h2>Admin</h2


<p class='muted'>
${fixtures.length
?`${fixtures.length} fixtures loaded for Matchweek ${state.round}.`
:`No fixtures loaded for Matchweek ${state.round}.`
}
</p>

<hr>

<label>
Matchweek ${state.round} selection deadline
</label>

${
state.deadline
?`<p class='muted'>
Automatic cutoff:
${esc(
new Date(
state.deadline
).toLocaleString()
)}
</p>`
:`<p class='muted'>
Load EPL fixtures to set the automatic cutoff time.
</p>`
}

<div class='adminState'>
<span
class='statusPill ${state.deadlinePassed?'closed':'open'}'
>
${state.deadlinePassed?'Closed':'Open'}
</span>

<button
id='deadlineBtn'
class='${
state.deadlinePassed
?'success'
:'danger'
}'
${
state.roundProcessed ||
automaticClosed
?'disabled'
:''
}
>
${
automaticClosed
?'Closed automatically'
:state.deadlinePassed
?'Re-open selections'
:'Close selections'
}
</button>
</div>

<p class='muted'>
Selections close automatically when the first EPL match of the Matchweek kicks off.
</p>

<hr>


<details>
<summary><b>Advanced / Emergency Controls</b></summary>

<div style='margin-top:16px'>

<button
class='primary'
id='loadEpl'
>
Load EPL fixtures
</button>

<label>
Match results
</label>

<p class='muted'>
Results are checked automatically after the deadline. The Matchweek processes automatically once all selected-team matches are finished.
</p>

${teamRows}

${
state.deadlinePassed &&
!state.roundProcessed
?`<button
class='primary'
id='process'
>
Process Matchweek ${state.round}
</button>`
:''
}

${
state.roundProcessed
?`<div class='processedBox'>
Matchweek ${state.round} has been processed.
</div>

${
w
?`<div class='adminWinner'>
🏆
<b>${esc(w.name)}</b>
is the Last Man Standing.
Competition complete.
</div>`
:''
}

<button
class='danger full'
id='undoRound'
>
Undo Matchweek ${state.round} Processing
</button>

${
!w
?`<button
class='primary'
id='advance'
>
Open Matchweek ${state.round+1}
</button>`
:''
}`
:''
}

<hr>



<label>Remove player</label>

<div class='row'>
<select id='removePlayer'>
<option value=''>
Select player…
</option>

${
state.players
.map(p=>
`<option value='${esc(p.name)}'>
${esc(p.name)}
</option>`
)
.join('')
}
</select>

<button
class='danger'
id='removePlayerBtn'
>
Remove
</button>
</div>

<hr>

<button
class='danger full'
id='reset'
>
Reset competition
</button>

</div>
</details>

</section>
`;

if($('#loadEpl')){
$('#loadEpl').onclick=
loadEplFixtures;
}

if($('#loadResults')){
$('#loadResults').onclick=
loadEplResults;
}

if($('#addFixture')){
$('#addFixture').onclick=()=>{
const home=
$('#homeTeam').value;

const away=
$('#awayTeam').value;

if(!home||!away){
return notice(
'Choose both teams.',
'warn'
);
}

if(home===away){
return notice(
'Home and away teams must be different.',
'warn'
);
}

const f=roundFixtures();

if(
f.some(x=>
x.home===home ||
x.away===home ||
x.home===away ||
x.away===away
)
){
return notice(
'One of those teams is already in a fixture.',
'warn'
);
}

state.fixtures[state.round]=[
...f,
{home,away}
];

saveAdmin();

notice(
`${home} v ${away} added.`
);

render();
};
}

document
.querySelectorAll(
'.removeFixture'
)
.forEach(
b=>b.onclick=async ()=>{
state.fixtures[state.round]=
roundFixtures().filter(
(_,i)=>
i!==Number(
b.dataset.i
)
);

notice(
'Fixture removed.'
);
saveAdmin();
  
render();
}
);

if($('#deadlineBtn')){
$('#deadlineBtn').onclick=()=>{
if(deadlineTimePassed()){
state.deadlinePassed=true;

saveAdmin();

notice(
`Matchweek ${state.round} selections are closed because the first match has kicked off.`,
'warn'
);

render();

return;
}

state.deadlinePassed=
!state.deadlinePassed;
 
saveAdmin();
  
notice(
state.deadlinePassed
?`Matchweek ${state.round} selections are now closed and picks are revealed.`
:`Matchweek ${state.round} selections have been re-opened.`
);

saveAdmin();
  
render();

 
};
}

document
.querySelectorAll(
'.resultSel'
)
.forEach(
s=>s.onchange=()=>{
state.results[
s.dataset.team
]=s.value;

saveAdmin();
}
);

if($('#process')){
$('#process').onclick=()=>
processRound(false);
}

if($('#undoRound')){
$('#undoRound').onclick=()=>{
if(
confirm(
`Undo Matchweek ${state.round} processing?`
)
){
undoProcessedRound();
}
};
}

if($('#advance')){
$('#advance').onclick=
advanceRound;
}


if($('#removePlayerBtn')){
$('#removePlayerBtn').onclick=()=>{
const name=
$('#removePlayer').value;

if(!name){
return notice(
'Select a player to remove.',
'warn'
);
}

if(
!confirm(
`Remove ${name} from the competition?`
)
){
return;
}

state.players=
state.players.filter(
p=>p.name!==name
);
  
  
saveAdmin();



if(state.selectedPlayer===name){
const nextPlayer=
state.players.find(p=>p.alive)
||state.players[0];

state.selectedPlayer=
nextPlayer
?nextPlayer.name
:'';
}

notice(
`${name} removed from the competition.`
);

render();
};
}
$('#reset').onclick=()=>{
if(
confirm(
'Reset all players, picks, fixtures and used teams?'
)){
const nextRound=Number(state.round)+1;

state=freshState();
state.round=nextRound;
state.startRound=nextRound;

saveAdmin();
notice(
'Competition reset.'
);

render();
}
};
}
}




document
.querySelectorAll('.tabs button')
.forEach(
b=>b.onclick=async ()=>{
if(b.dataset.tab==='admin' && !adminUnlocked){
const pin=prompt('Enter Admin PIN:');

if(!pin){
return;
}

try{
const response=await fetch('/api/admin-auth',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({pin})
});

const data=await response.json();

if(!response.ok){
notice(data.error||'Incorrect Admin PIN.','warn');
return;
}

adminUnlocked=true;
authenticatedAdminPin=pin;

}catch(error){
notice('Unable to authenticate Admin. Please try again.','warn');
return;
}
}

tab=b.dataset.tab;
notice('');
render();
}
);

/*
Check every 15 seconds in case the first match kicks off
while somebody has the app open.
*/
setInterval(()=>{
if(syncDeadline()){
fetch('/api/deadline',{
  method:'POST'
}).catch(error=>
  console.error('Deadline save failed:',error)
);
render();

notice(
`Matchweek ${state.round} selections are now closed.`
);

autoCheckResults();
}
},15000);

/*
After selections close, check EPL results every 5 minutes.
When every selected team's match is finished,
process the Matchweek automatically.
*/
setInterval(()=>{
autoCheckResults();
},300000);

/*
Load the shared state, then immediately check results.
This means if nobody had the app open when matches finished,
the Matchweek will be processed the next time somebody opens it.
*/
loadState().then(()=>{
  autoCheckResults();
  checkNotifications();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(error => {
        console.error(
          'Service worker registration failed:',
          error
        );
      });
  });
}
