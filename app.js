const ACCESS_CODE='LMS2026';
const teams=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'];
const defaults=['Dale','Ben','Paul','Nick'];

const freshState=()=>({
round:3,
selectedPlayer:'Dale',
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
let autoResultsCheckInProgress=let accessGranted=
sessionStorage.getItem('lms-access')==='yes';

function checkAccess(){
if(accessGranted){
return true;
}

const code=prompt(
'Enter competition access code:'
);

if(code===ACCESS_CODE){
accessGranted=true;
sessionStorage.setItem(
'lms-access',
'yes'
);
return true;
}

notice(
'Incorrect competition access code.',
'warn'
);

return false;
}
const $=s=>document.querySelector(s);

const esc=s=>String(s).replace(/[&<>\"']/g,c=>({
'&':'&amp;',
'<':'&lt;',
'>':'&gt;',
'\"':'&quot;',
"'":'&#39;'
}[c]));

function save(){
localStorage.setItem('lms-state',JSON.stringify(state));

fetch('/api/state',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify(state)
}).catch(error=>console.error('Database save failed:',error));
}

function deadlineTimePassed(){
if(!state.deadline) return false;

const deadlineTime=new Date(state.deadline).getTime();

return Number.isFinite(deadlineTime) && Date.now()>=deadlineTime;
}

function syncDeadline(){
if(!state.deadlinePassed && deadlineTimePassed()){
state.deadlinePassed=true;
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

save();

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

save();
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

function shortTeam(t){
return t
.split(' ')
.map(x=>x[0])
.join('')
.slice(0,3)
.toUpperCase();
}

function savePick(team){
if(syncDeadline()){
save();
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

const p=player();

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

save();
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

save();
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
save();
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
const r=await fetch(
`/api/football?round=${state.round}`
);

const data=await r.json();

if(!r.ok){
throw new Error(
data.error||'Could not check EPL results'
);
}

const matches=data.matches||[];

const updated=updateResultsFromMatches(matches);

if(updated){
save();
}

if(selectedTeamMatchesFinished(matches)){
processRound(true);
return;
}

if(updated){
render();
}

}catch(e){
console.error(
'Automatic EPL results check failed:',
e
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

let shown=p.alive&&!state.deadlinePassed
?(pick?'Pick submitted':'No pick submitted')
:(pick||'No pick');

return `<div class='standingRow'>
<div class='pos'>${i+1}</div>
<div class='standingName'>
<strong>${esc(p.name)}</strong>
<span>${p.alive?'Alive':'Eliminated'}</span>
</div>
<div class='standingPick'>${esc(shown)}</div>
<div class='usedCount'>${p.used.length} used</div>
<span class='dot ${p.alive?'on':'off'}'></span>
</div>`;
}).join('')
}</div>`;
}

function fixtureCard(home,away,current,p){
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
${shortTeam(home)}
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
${shortTeam(away)}
</span>

<span>${esc(away)}</span>

${aUsed?`<small>Used</small>`:''}
</button>
</div>`;
}

function render(){
syncDeadline();
save();

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

c.innerHTML+=`
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

<p class='muted'>
<b>Already joined?</b>
Tap Make Pick in the menu to choose your team.
</p>
</div>
`;

$('#joinBtn').onclick=()=>{
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

state.players.push({
name:name.trim(),
pin,
alive:true,
picks:{},
used:[],
eliminatedRound:null
});

notice(
`${name.trim()} joined the competition.`
);

render();
};
}

if(tab==='pick'){
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
p
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

$('#playerSel').onchange=e=>{
const target=
state.players.find(
p=>p.name===e.target.value
);

if(target&&target.pin){
const pin=prompt(
`Enter PIN for ${target.name}:`
);

if(pin!==target.pin){
notice(
'Incorrect PIN.',
'warn'
);

render();

return;
}
}

state.selectedPlayer=
e.target.value;

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

if(p.alive){
const pick=
p.picks[state.round];

shown=
state.deadlinePassed
?(pick||'No pick')
:(pick
?'Pick submitted'
:'No pick submitted'
);
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
${p.alive?'Alive':'Eliminated'}
</span>
</div>

<div class='pickLine'>
Round ${displayRound}:
${esc(shown)}
</div>

<div class='muted'>
Teams used:
${
p.used.length
?p.used.join(', ')
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

<label>Add player</label>

<div class='row'>
<input
id='newPlayer'
placeholder='Player name'
>

<button id='addPlayer'>
Add
</button>
</div>

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
b=>b.onclick=()=>{
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

render();
}
);

if($('#deadlineBtn')){
$('#deadlineBtn').onclick=()=>{
if(deadlineTimePassed()){
state.deadlinePassed=true;

notice(
`Round ${state.round} selections are closed because the first match has kicked off.`,
'warn'
);

render();

return;
}

state.deadlinePassed=
!state.deadlinePassed;

notice(
state.deadlinePassed
?`Round ${state.round} selections are now closed and picks are revealed.`
:`Round ${state.round} selections have been re-opened.`
);

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

save();
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

$('#addPlayer').onclick=()=>{
const name=
$('#newPlayer').value.trim();

if(!name){
return;
}

if(
state.players.some(
p=>
p.name.toLowerCase()===
name.toLowerCase()
)
){
return notice(
'That player already exists.',
'warn'
);
}

state.players.push({
name,
alive:true,
picks:{},
used:[],
eliminatedRound:null
});

notice(
`${name} added.`
);

render();
};
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
b=>b.onclick=()=>{
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
save();
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
