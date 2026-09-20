const teams=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'];
const defaults=[];

const freshState=()=>({
round:4,
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

let tab='home';
let adminUnlocked=false;
let authenticatedPlayer=null;
let authenticatedPin=null;
let authenticatedAdminPin=null;

const COMPETITION_CODE='lms2026';
let competitionUnlocked=
sessionStorage.getItem('lms-access')==='ok';

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
sessionStorage.setItem('lms-access','ok');

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

  if(state.round===4){
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
notice(`Loading EPL Round ${state.round} fixtures...`);

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
`Loaded ${state.fixtures[state.round].length} EPL fixtures for Round ${state.round}.`
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
notice(`Checking EPL Round ${state.round} results...`);

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
`Round ${state.round} selections are closed because the first match has kicked off.`,
'warn'
);
}

if(state.deadlinePassed){
return notice(
`Selections are closed for Round ${state.round}.`,
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
notice(
`${p.name} selected ${team} for Round ${state.round}.`
);

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
?`Round ${state.round} was processed automatically. Everyone failed, so all remaining players stay alive. Their selected teams still count as used.`
:'Everyone failed this round, so all remaining players stay alive. Their selected teams still count as used.'
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
?`Round ${state.round} was processed automatically. ${alive()} player${alive()===1?'':'s'} remain alive.`
:`Round ${state.round} processed. ${alive()} player${alive()===1?'':'s'} remain alive.`
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



function undoProcessedRound(){
if(!state.roundProcessed){
return notice(
'This round has not been processed yet.',
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
?`Round ${state.round} processing undone. Selections remain closed because the deadline has passed.`
:`Round ${state.round} processing undone. Selections are open again.`
);
saveAdmin();
render();
}

function advanceRound(){
if(!state.roundProcessed){
return notice(
'Process the current round results first.',
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

saveAdmin();

notice(
`Round ${state.round} is now open for selections.`
);

render();
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

async function render(){
syncDeadline();

$('#summary').textContent=
`Round ${state.round} · ${alive()} player${alive()==1?'':'s'} alive`;

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

c.innerHTML=`
<div class='card'>
<h2>Join Competition</h2>

<p>
<b>New player?</b>
Register your name and create a 4-digit PIN.
</p>

<button
class='primary'
id='joinBtn'
>
Join Competition
</button>

<div id='joinMessage'></div>

<p class='muted'>
<b>Already joined?</b>
Tap Make Pick in the menu to choose your team.
</p>
</div>
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

<div class='grid stats'>
<div class='card'>
<span>Current round</span>
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

<div class='card rules'>
<h2>Competition rules</h2>

<ul>
<li>
Competition starts at EPL Round 4 and continues until one player remains.
</li>

<li>
Pick one EPL team each round. A team can only be used once by each player.
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
If every remaining player is eliminated in the same round, they all stay alive, but their selected teams still count as used.
</li>
</ul>
</div>
`;



$('#joinBtn').onclick=()=>{
if(state.registrationClosed){
  $('#joinMessage').innerHTML=
    `<div class='notice warn'>Registration is closed. The competition has already started.</div>`;
  return;
}


const name=prompt(
'Enter your name:'
);

if(!name||!name.trim()){
return;
}

const pin=prompt(
'Create a 4-digit PIN:'
);

if(!/^\d{4}$/.test(pin||'')){
return notice(
'PIN must be exactly 4 digits.',
'warn'
);
}

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
}

if(tab==='pick'){
 if(!authenticatedPlayer){
  const selectedName=prompt('Enter your player name:');

  if(!selectedName){
    tab='home';
    render();
    return;
  }

  const selected=state.players.find(
    p=>p.alive && p.name.toLowerCase()===selectedName.trim().toLowerCase()
  );

  if(!selected){
    notice('Player not found or already eliminated.','warn');
    tab='home';
    render();
    return;
  }

const pin=prompt(`Enter PIN for ${selected.name}:`);

if(!pin){
  tab='home';
  render();
  return;
}

try{
  const response=await fetch('/api/auth',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      playerName:selected.name,
      pin:pin
    })
  });

  const data=await response.json();

  if(!response.ok){
    notice(data.error||'Incorrect PIN.','warn');
    tab='home';
    render();
    return;
  }

  authenticatedPlayer=selected.name;
  authenticatedPin=pin;
  state.selectedPlayer=selected.name;

}catch(error){
  notice('Unable to authenticate. Please try again.','warn');
  tab='home';
  render();
  return;
}
}
const p=player();

const current=
p.picks[state.round]||'';

const avail=teams.filter(
t=>
!p.used.includes(t) ||
t===current
);

const fixtures=roundFixtures();

c.innerHTML=`
<section class='card formCard'>
<div class='sectionHead'>
<div>
<div class='eyebrow dark'>
ROUND ${state.round}
</div>

<h2>Make my pick</h2>
</div>
</div>

<label>Player</label>

<select id='playerSel'>
${
state.players
.filter(x=>x.alive)
.map(x=>
`<option
${x.name===p.name?'selected':''}
>
${esc(x.name)}
</option>`
)
.join('')
}
</select>

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
Selections are closed for Round ${state.round}.
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

$('#playerSel').onchange=async e=>{
  const target=
  state.players.find(
  p=>p.name===e.target.value
  );

  if(target){
  const pin=prompt(
    `Enter PIN for ${target.name}:`
  );

  if(!pin){
    render();
    return;
  }

  try{
    const response=await fetch('/api/auth',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        playerName:target.name,
        pin:pin
      })
    });

    const data=await response.json();

    if(!response.ok){
      notice(data.error||'Incorrect PIN.','warn');
      render();
      return;
    }

    authenticatedPlayer=target.name;
    authenticatedPin=pin;

  }catch(error){
    notice(
      'Unable to authenticate. Please try again.',
      'warn'
    );
    render();
    return;
  }
}

state.selectedPlayer=target.name;

  notice('');

  render();
};

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

if(tab==='players'){
c.innerHTML=`
<h2>Players</h2>

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
Round ${displayRound}:
${esc(shown)}
</div>

<div class='muted'>
Teams used:
${
visibleUsed.length
?visibleUsed.join(', ')
:'None'
}
</div>
</div>`;
}).join('')
}
</div>

${
!state.deadlinePassed
?`<p class='privacyNote'>
Current team selections stay hidden until the selection deadline is closed.
</p>`
:''
}
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
<h2>Admin</h2>

<button
class='primary'
id='loadEpl'
>
Load EPL fixtures
</button>

<button
class='primary'
id='loadResults'
>
Update EPL results
</button>

<label>
Round ${state.round} fixtures
</label>

<div id='fixtureList'>
${
fixtures.length
?fixtures.map((f,i)=>
`<div class='fixtureAdmin'>
<span>
${esc(f.home)}
<b>v</b>
${esc(f.away)}
</span>

<button
class='hidden removeFixture'
data-i='${i}'
${state.deadlinePassed?'disabled':''}
>
Remove
</button>
</div>`
).join('')
:`<p class='muted'>
No fixtures added yet.
</p>`
}
</div>

${
!state.deadlinePassed
?`<div class='fixtureAdd'>
<select id='homeTeam'>
<option value=''>
Home team…
</option>

${
teams
.map(t=>
`<option>
${t}
</option>`
)
.join('')
}
</select>

<select id='awayTeam'>
<option value=''>
Away team…
</option>

${
teams
.map(t=>
`<option>
${t}
</option>`
)
.join('')
}
</select>

<button id='addFixture'>
Add fixture
</button>
</div>`
:''
}

<hr>

<label>
Round ${state.round} selection deadline
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
Selections close automatically when the first EPL match of the round kicks off.
</p>

<hr>

<label>
Match results
</label>

<p class='muted'>
Results are checked automatically after the deadline. The round processes automatically once all selected-team matches are finished.
</p>

${teamRows}

${
state.deadlinePassed &&
!state.roundProcessed
?`<button
class='primary'
id='process'
>
Process Round ${state.round}
</button>`
:''
}

${
state.roundProcessed
?`<div class='processedBox'>
Round ${state.round} has been processed.
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
Undo Round ${state.round} Processing
</button>

${
!w
?`<button
class='primary'
id='advance'
>
Open Round ${state.round+1}
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
`Round ${state.round} selections are closed because the first match has kicked off.`,
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
?`Round ${state.round} selections are now closed and picks are revealed.`
:`Round ${state.round} selections have been re-opened.`
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
`Undo Round ${state.round} processing?`
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
)
){
state=freshState();

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
`Round ${state.round} selections are now closed.`
);

autoCheckResults();
}
},15000);

/*
After selections close, check EPL results every 5 minutes.
When every selected team's match is finished,
process the round automatically.
*/
setInterval(()=>{
autoCheckResults();
},300000);

/*
Load the shared state, then immediately check results.
This means if nobody had the app open when matches finished,
the round will be processed the next time somebody opens it.
*/
loadState().then(()=>{
autoCheckResults();
});
