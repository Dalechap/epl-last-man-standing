const teams=['Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'];

const SPORTS=[
  {
    id:'football',
    label:'Football',
    image:'/EPL.jpg',
    pickNoun:'team',
    leagues:[
      {id:'PL',label:'Premier League',image:'/EPL.jpg'},
      {id:'PD',label:'La Liga',image:'/assets/sports/leagues/laliga.svg'},
      {id:'SA',label:'Serie A',image:'/assets/sports/leagues/seriea.svg'},
      {id:'BL1',label:'Bundesliga',image:'/assets/sports/leagues/bundesliga.svg'},
      {id:'FL1',label:'Ligue 1',image:'/assets/sports/leagues/ligue1.svg'},
      {id:'ELC',label:'Championship',image:'/assets/sports/leagues/championship.svg'},
      {id:'MLS',label:'MLS',image:'/assets/sports/leagues/mls.svg'},
      {id:'APL',label:'A-League',image:'/assets/sports/leagues/aleague.svg'}
    ],
    rules:[
      'The competition continues until one player remains.',
      'Pick one team each Matchweek. A team can only be used once by each player.',
      'Win = survive. Loss or score draw = eliminated.',
      'For a 0–0 draw, the away-team picker survives; the home-team picker is eliminated.',
      'No pick before the deadline = eliminated.',
      'If every remaining player is eliminated in the same Matchweek, they all stay alive, but their selected teams still count as used.'
    ]
  },
  {
    id:'nba',
    label:'NBA',
    image:'/assets/sports/nba.svg',
    pickNoun:'team',
    leagues:[],
    rules:[
      'The competition continues until one player remains.',
      'Pick one team each round. A team can only be used once.',
      'Win = survive. Loss or tie = eliminated.',
      'No pick before the deadline = eliminated.',
      'If every remaining player fails in the same round, they all stay alive, but their picks still count as used.'
    ]
  },
  {
    id:'nfl',
    label:'NFL',
    image:'/assets/sports/nfl.svg',
    pickNoun:'team',
    leagues:[],
    rules:[
      'The competition continues until one player remains.',
      'Pick one team each round. A team can only be used once.',
      'Win = survive. Loss or tie = eliminated.',
      'No pick before the deadline = eliminated.',
      'If every remaining player fails in the same round, they all stay alive, but their picks still count as used.'
    ]
  },
  {
    id:'tennis',
    label:'Tennis',
    image:'/assets/sports/tennis.svg',
    pickNoun:'player',
    leagues:[],
    rules:[
      'The competition continues until one player remains.',
      'Pick one player in a match. A player can only be used once.',
      'Your player must win the match or you are eliminated.',
      'No pick before the deadline = eliminated.',
      'If every remaining player fails in the same round, they all stay alive, but their picks still count as used.'
    ]
  },
  {
    id:'f1',
    label:'Formula 1',
    image:'/assets/sports/f1.svg',
    pickNoun:'driver',
    leagues:[],
    rules:[
      'The competition continues until one player remains.',
      'Pick one driver for the race. A driver can only be used once.',
      'Only the race winner survives.',
      'No pick before the deadline = eliminated.',
      'If every remaining player fails in the same race, they all stay alive, but their picks still count as used.'
    ]
  },
  {
    id:'cricket',
    label:'Cricket',
    image:'/assets/sports/cricket.svg',
    pickNoun:'team',
    leagues:[],
    rules:[
      'The competition continues until one player remains.',
      'Pick one team to win the match. A team can only be used once.',
      'A loss eliminates you. If there is no result, you stay alive and the team still counts as used.',
      'No pick before the deadline = eliminated.',
      'If every remaining player fails in the same round, they all stay alive, but their picks still count as used.'
    ]
  }
];

// Shared survival rules for team sports.
function teamSportRules(){
  return [
    'The competition continues until one player remains.',
    'Pick one team each round. A team can only be used once.',
    'Win = survive. Loss or tie = eliminated.',
    'No pick before the deadline = eliminated.',
    'If every remaining player fails in the same round, they all stay alive, but their picks still count as used.'
  ];
}

SPORTS.push(
  {
    id:'mlb',
    label:'MLB',
    image:'/assets/sports/mlb.svg',
    pickNoun:'team',
    leagues:[],
    rules:teamSportRules()
  },
  {
    id:'nhl',
    label:'NHL',
    image:'/assets/sports/nhl.svg',
    pickNoun:'team',
    leagues:[],
    rules:teamSportRules()
  },
  {
    id:'afl',
    label:'AFL',
    image:'/assets/sports/afl.svg',
    pickNoun:'team',
    leagues:[],
    rules:teamSportRules()
  },
  {
    id:'nrl',
    label:'NRL',
    image:'/assets/sports/nrl.svg',
    pickNoun:'team',
    leagues:[],
    rules:teamSportRules()
  },
  {
    id:'rugby',
    label:'Rugby Union',
    image:'/assets/sports/rugby.svg',
    pickNoun:'team',
    leagues:[],
    rules:teamSportRules()
  },
  {
    id:'superleague',
    label:'Super League',
    image:'/assets/sports/superleague.svg',
    pickNoun:'team',
    leagues:[],
    rules:teamSportRules()
  }
);

let selectedSport=localStorage.getItem('lms-sport')||'';
let selectedLeague=localStorage.getItem('lms-league')||'PL';
const TERMS_KEY='lms-terms';

// Find one sport in the catalog.
function sportById(id){
  return SPORTS.find(sport=>sport.id===id)||null;
}

// The word used for one round in this sport.
function roundNoun(){
  const id=selectedSport||'football';

  if(id==='f1'){
    return 'Race';
  }

  if(id==='football'){
    return 'Matchweek';
  }

  return 'Round';
}

// A round label such as Race 3 or Matchweek 4.
function roundTitle(round){
  return `${roundNoun()} ${round}`;
}

// Show a kickoff in the viewer's local time, with the zone name.
function kickoffLabel(value){
  const date=new Date(value);

  if(!Number.isFinite(date.getTime())){
    return '';
  }

  return date.toLocaleString('en-GB',{
    day:'numeric',
    month:'short',
    hour:'2-digit',
    minute:'2-digit',
    timeZoneName:'short'
  });
}

// Split a kickoff into a short local time and its zone name.
function kickoffParts(value){
  const date=new Date(value);

  if(!Number.isFinite(date.getTime())){
    return {when:'', zone:''};
  }

  const parts=new Intl.DateTimeFormat('en-GB',{
    day:'numeric',
    month:'short',
    hour:'2-digit',
    minute:'2-digit',
    timeZoneName:'short'
  }).formatToParts(date);
  const pick=type=>parts.find(part=>part.type===type)?.value||'';

  return {
    when:`${pick('day')} ${pick('month')} · ${pick('hour')}:${pick('minute')}`,
    zone:pick('timeZoneName')
  };
}

// True after the player accepts the terms.
function termsAccepted(){
  return localStorage.getItem(TERMS_KEY)==='accepted';
}

// Shared terms text. The checkbox is only on the accept step.
function termsMarkup(checkId){
  const check=checkId
    ?`
      <label class='termsCheck'>
        <input id='${checkId}' type='checkbox'>
        <span>I have read this and I agree before I join or make a pick.</span>
      </label>
    `
    :'';

  return `
    <ul class='termsList'>
      <li>This website is only a sports prediction and entertainment game.</li>
      <li>You may choose a sport, choose a team or player, make a prediction, and see results, history, and scores.</li>
      <li>There is no betting, no deposits, no withdrawals, no odds, no betting pools, and no cash prizes.</li>
      <li>This app does not collect, hold, manage, or transfer money between players.</li>
      <li>Picks and scores have no cash value.</li>
    </ul>
    ${check}
  `;
}

// Save or clear the terms tick in this browser.
function saveTermsAcceptance(accepted){
  if(accepted===false){
    localStorage.removeItem(TERMS_KEY);
    return;
  }

  localStorage.setItem(TERMS_KEY, 'accepted');
}

// Query string for the sport and league now in use.
function fixtureQuery(){
  const sport=selectedSport||'football';
  const league=(typeof state!=='undefined'&&state.league)||selectedLeague||'PL';
  return `sport=${encodeURIComponent(sport)}&league=${encodeURIComponent(league)}`;
}
const defaults=[];

const freshState=()=>({
sport:selectedSport||'football',
league:selectedLeague||'PL',
round:(selectedSport||'football')==='football'&&(selectedLeague||'PL')==='PL'?8:1,
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
})),
resultMode:'live'
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

// Key for the player saved in this browser.
function playerSessionKey(){
  return `lms-player:${selectedSport||'football'}:${selectedLeague||''}`;
}

// Keep the signed-in player after a refresh.
function rememberPlayer(){
  if(!authenticatedPlayer||!authenticatedPin){
    localStorage.removeItem(playerSessionKey());
    return;
  }

  localStorage.setItem(playerSessionKey(), JSON.stringify({
    name:authenticatedPlayer,
    pin:authenticatedPin
  }));
}

// Sign the player out of this browser.
function logOut(){
  authenticatedPlayer=null;
  authenticatedPin=null;
  localStorage.removeItem(playerSessionKey());
  tab='home';
  notice('You are signed out.');
  render();
}

// Sign in again from the name and PIN saved in this browser.
function restorePlayer(){
  try{
    const saved=JSON.parse(
      localStorage.getItem(playerSessionKey())||'null'
    );

    if(
      saved?.name &&
      saved.pin &&
      state.players.some(player=>player.name===saved.name)
    ){
      authenticatedPlayer=saved.name;
      authenticatedPin=saved.pin;
    }
  }catch{
    authenticatedPlayer=null;
    authenticatedPin=null;
  }
}

let plannerFixturesCache=null;
let plannerFixturesCacheRound=null;

let authenticatedAdminPin=null;

const COMPETITION_CODE='lmsmw8';
let competitionUnlocked=
localStorage.getItem('lms-access')===COMPETITION_CODE;

const appShell=document.querySelector('.shell');

if(appShell && !competitionUnlocked){
appShell.style.display='none';
}

if(appShell && competitionUnlocked && (!selectedSport || !termsAccepted())){
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
continueAfterAccess();

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
if(state.keepPicksOpen){
  return false;
}

if(!state.deadlinePassed && deadlineTimePassed()){
  state.deadlinePassed=true;

  if(state.round===state.startRound){
  state.registrationClosed=true;
  }

  return true;
}

return false;
}

// Earliest kickoff stored for the round that is open.
function currentKickoff(){
  const times=roundFixtures()
    .map(fixture=>new Date(fixture.kickoff).getTime())
    .filter(Number.isFinite);

  if(!times.length){
    return null;
  }

  return new Date(Math.min(...times));
}

// Turn the time left into a clock such as 02:14:09.
function deadlineLeftLabel(endTime){
  const left=new Date(endTime).getTime()-Date.now();

  if(!Number.isFinite(left) || left<=0){
    return '';
  }

  const total=Math.floor(left/1000);
  const days=Math.floor(total/86400);
  const hours=Math.floor((total%86400)/3600);
  const minutes=Math.floor((total%3600)/60);
  const seconds=total%60;
  const pad=value=>String(value).padStart(2,'0');
  const clock=`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return days?`${days}d ${clock}`:clock;
}

// Update the countdown under the title without redrawing the page.
function paintDeadlineClock(){
  const clock=document.getElementById('deadlineClock');

  if(!clock){
    return;
  }

  const endTime=state.deadline
    ?new Date(state.deadline)
    :currentKickoff();

  if(!endTime || !Number.isFinite(endTime.getTime())){
    clock.hidden=true;
    return;
  }

  const label=deadlineLeftLabel(endTime);
  const left=endTime.getTime()-Date.now();
  const urgent=Boolean(label) && left>0 && left<60*60*1000;
  clock.hidden=false;
  clock.classList.toggle('urgent', !state.deadlinePassed && urgent);

  if(state.deadlinePassed){
    clock.innerHTML='<span class="kickLabel">Picks</span><span class="kickTime">Closed</span>';
    return;
  }

  if(label){
    if(!state.deadline){
      state.deadline=endTime.toISOString();
    }

    clock.innerHTML=`<span class="kickLabel">Closes in</span><span class="kickTime">${esc(label)}</span>`;
    return;
  }

  const parts=kickoffParts(endTime);
  clock.innerHTML=`<span class="kickLabel">Kickoff</span><span class="kickTime">${esc(parts.when)}<span class="kickZone">${esc(parts.zone)}</span></span>`;
}

async function loadState(){
try{
const response=await fetch(`/api/state?${fixtureQuery()}`);

if(response.ok){
const serverState=await response.json();

if(serverState){
if(serverState.sport) selectedSport=serverState.sport;
if(serverState.league) selectedLeague=serverState.league;
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

restorePlayer();

syncDeadline();

localStorage.setItem('lms-state',JSON.stringify(state));
}
}
}catch(error){
console.error('Database load failed:',error);
}

render();
}

// Show a short toast, or clear all toasts when the text is empty.
function notice(t,type='ok'){
  const stack=document.getElementById('toastStack');

  if(!stack){
    return;
  }

  if(stack.parentElement!==document.body){
    document.body.appendChild(stack);
  }

  if(!t){
    stack.innerHTML='';
    return;
  }

  const alreadyOpen=[...stack.querySelectorAll('.toastMessage')]
    .some(node=>node.textContent===t);

  if(alreadyOpen){
    return;
  }

  const toast=document.createElement('div');
  toast.className=`toast ${type==='warn'?'warn':'ok'}`;
  toast.innerHTML=`
    <div class='toastIcon' aria-hidden='true'>${type==='warn'?'!':'✓'}</div>
    <p class='toastMessage'>${esc(t)}</p>
    <button class='toastClose' type='button' aria-label='Close'>×</button>
    <span class='toastProgress'></span>
  `;

  const remove=()=>{
    if(toast.classList.contains('toastOut')){
      return;
    }

    toast.classList.add('toastOut');
    setTimeout(()=>toast.remove(), 220);
  };
  toast.querySelector('.toastClose').onclick=remove;
  stack.appendChild(toast);
  setTimeout(remove, 4500);
}

// Ask before a change that is hard to undo.
function confirmModal(title, message){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');
    overlay.className='loginOverlay';
    overlay.innerHTML=`
      <div class='loginModal'>
        <h2>${esc(title)}</h2>
        <p class='muted'>${esc(message)}</p>
        <button id='confirmYes' class='loginContinue' type='button'>Yes, continue</button>
        <button id='confirmNo' class='loginCancel' type='button'>Cancel</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const close=value=>{
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('#confirmYes').onclick=()=>close(true);
    overlay.querySelector('#confirmNo').onclick=()=>close(false);
  });
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

// List every team in the loaded matches.
function fixtureTeams(){
  return [...new Set(
    roundFixtures().flatMap(item=>[item.home,item.away].filter(Boolean))
  )].sort();
}

function roundFixtures(){
return state.fixtures[state.round]||[];
}

// Copy one API match into the shape the screen uses.
function mapApiMatch(match){
  return {
    home:match.homeTeam?.name||'',
    away:match.awayTeam?.name||'',
    homeCrest:match.homeTeam?.crest||'',
    awayCrest:match.awayTeam?.crest||'',
    kickoff:match.utcDate,
    kind:match.kind||'match',
    position:match.position||null,
    homeScore:match.score?.fullTime?.home??null,
    awayScore:match.score?.fullTime?.away??null
  };
}

// Read the real result for one picked team from the loaded match.
function outcomeFromFixture(team){
  const fixture=roundFixtures().find(item=>
    item.home===team || item.away===team
  );

  if(!fixture || fixture.homeScore==null || fixture.awayScore==null){
    return '';
  }

  const isHome=fixture.home===team;
  const mine=Number(isHome?fixture.homeScore:fixture.awayScore);
  const theirs=Number(isHome?fixture.awayScore:fixture.homeScore);

  if(mine>theirs){
    return 'win';
  }

  if(mine<theirs){
    return 'loss';
  }

  if(mine===0 && theirs===0){
    return isHome?'zero-home':'zero-away';
  }

  return 'score-draw';
}

// Short words for a stored result.
function resultWords(result){
  if(result==='win') return 'Won';
  if(result==='loss') return 'Lost';
  if(result==='score-draw') return 'Draw';
  if(result==='zero-home') return '0–0 at home';
  if(result==='zero-away') return '0–0 away';
  if(result==='no-result') return 'No result';
  return '';
}

async function loadEplFixtures(){
try{
const r=await fetch(`/api/football?round=${state.round}&${fixtureQuery()}`);
const data=await r.json();

if(!r.ok){
throw new Error(
data.error||'Could not load fixtures'
);
}

state.fixtures[state.round]=(data.matches||[]).map(mapApiMatch);

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
`Loaded ${state.fixtures[state.round].length} matches for ${roundTitle(state.round)}.`
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
notice(`Checking EPL ${roundTitle(state.round)} results...`);

const r=await fetch(`/api/football?round=${state.round}&${fixtureQuery()}`);
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

// Decide if this result keeps the player in the game.
function outcomeSurvives(outcome){
  const sport=selectedSport||state.sport||'football';

  if(sport==='football'){
    return outcome==='win'||outcome==='zero-away';
  }

  if(sport==='cricket'){
    return outcome==='win'||outcome==='no-result';
  }

  return outcome==='win';
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

function showPickConfirm(team){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');

    overlay.style.cssText=`
      position:fixed;
      inset:0;
      background:rgba(20,10,30,.65);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
      z-index:9999;
    `;

    const fixture=(state.fixtures[state.round]||[])
      .find(f=>f.home===team||f.away===team);

    const crest=fixture
      ?(fixture.home===team
        ?fixture.homeCrest
        :fixture.awayCrest)
      :null;

    const noun=(sportById(selectedSport)||{}).pickNoun||'team';

    overlay.innerHTML=`
      <div class="loginModal" style="text-align:center;width:100%;max-width:380px;">
        ${crest?`<img src="${crest}" alt="" style="width:76px;height:76px;object-fit:contain;margin:0 auto 16px;display:block;">`:''}

        <h2>Confirm ${esc(team)}?</h2>
        <p class="muted">${roundTitle(state.round)}</p>
        <p class="muted" style="margin-top:8px;font-size:13px;">This ${noun} cannot be used again in this competition.</p>

        <div style="display:flex;gap:12px;margin-top:24px;">
          <button class="loginCancel" id="pickCancel" style="flex:1;">
            Cancel
          </button>
          <button class="loginContinue" id="pickConfirm" style="flex:1;">
            Confirm
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const finish=value=>{
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('#pickCancel').onclick=()=>finish(false);
    overlay.querySelector('#pickConfirm').onclick=()=>finish(true);
  });
}

function showPickSuccess(team){
  const overlay=document.createElement('div');

  overlay.style.cssText=`
    position:fixed;
    inset:0;
    background:rgba(20,10,30,.65);
    display:flex;
    align-items:center;
    justify-content:center;
    padding:20px;
    z-index:9999;
  `;

  overlay.innerHTML=`
    <div class="loginModal" style="text-align:center;width:100%;max-width:380px;">
      <div style="font-size:48px;color:#168653;margin-bottom:12px;">✓</div>
      <h2>Pick confirmed!</h2>
      <p style="font-size:20px;font-weight:700;margin:16px 0;">
        ${esc(team)}
      </p>
      <p class="muted">
        You can change your pick until the deadline.
      </p>
      <button class="loginContinue" id="pickDone" style="margin-top:20px;">
        Done
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#pickDone').onclick=()=>{
    overlay.remove();
  };
}

async function savePick(team){
 if(!termsAccepted()){
  return notice(
    'Please read this and agree before you play.',
    'warn'
  );
 }
 if(!authenticatedPlayer){
  return notice(
    'Please authenticate before making a pick.',
    'warn'
  );
}
if(syncDeadline()){
fetch('/api/deadline',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({sport:selectedSport||'football'})
}).catch(error=>
  console.error('Deadline save failed:',error)
);
render();

return notice(
`${roundTitle(state.round)} selections are closed because the first match has kicked off.`,
'warn'
);
}

if(state.deadlinePassed){
return notice(
`Selections are closed for ${roundTitle(state.round)}.`,
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

const confirmationRound=state.round;

if(!(await showPickConfirm(team))){
  return;
}

if(state.round!==confirmationRound){
  return notice(
    `${roundTitle(confirmationRound)} has changed. Please select again.`,
    'warn'
  );
}

if(syncDeadline() || state.deadlinePassed){
  fetch('/api/deadline',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({sport:selectedSport||'football'})
  }).catch(error=>console.error('Deadline save failed:',error));

  render();

  return notice(
    `Selections are closed for ${roundTitle(state.round)}.`,
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
  pin:authenticatedPin,
  sport:selectedSport||'football',
  league:selectedLeague||'PL'
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

pulseTeam=team;
render();

  showPickSuccess(team);
})
.catch(error=>{
notice(
`Pick could not be saved: ${error.message}`,
'warn'
);
render();
});
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
?`${roundTitle(state.round)} was processed automatically. Everyone failed, so all remaining players stay alive. Their selected teams still count as used.`
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
?`${roundTitle(state.round)} was processed automatically. ${alive()} player${alive()===1?'':'s'} remain alive.`
:`${roundTitle(state.round)} processed. ${alive()} player${alive()===1?'':'s'} remain alive.`
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
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          sport:selectedSport||'football',
  league:selectedLeague||'PL'
        })
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
?`${roundTitle(state.round)} processing undone. Selections remain closed because the deadline has passed.`
:`${roundTitle(state.round)} processing undone. Selections are open again.`
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
`${roundTitle(state.round)} is now open. Loading EPL fixtures...`
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

<div class='standingName'>
<strong>${esc(p.name)}</strong>
<span>${statusText}</span>
</div>

<div class='standingInfo'>
<span>${esc(shown)}</span>
<span>${p.used.length} used</span>
</div>

<span class='dot ${liveStatus==='pending-elimination'?'off':(p.alive?'on':'off')}'></span>

</div>`;
}).join('')
}</div>`;
}
function fixtureCard(home,away,current,p,homeCrest,awayCrest,fixture){
const hUsed=
p.used.includes(home)&&current!==home;

const aUsed=
p.used.includes(away)&&current!==away;
const when=kickoffLabel(fixture?.kickoff);
const detail=fixture?.kind==='entry'
  ?esc(away)
  :'';
const timeLine=when
  ?`<p class='kickoffLine'>${esc(when)}</p>`
  :'';

if(fixture?.kind==='entry'){
  return `<div class='fixtureCard entryCard'>
<button
class='teamPick ${current===home?'selected':''}${pulseTeam===home?' justChosen':''}'
data-team='${esc(home)}'
${hUsed?'disabled':''}
>
<span class='crest'>${shortTeam(home)}</span>
<span>${esc(home)}</span>
${current===home?`<small>Choosing</small>`:hUsed?`<small>Picked</small>`:''}
</button>
<p class='muted'>${detail}${timeLine}</p>
</div>`;
}

return `<div class='fixtureCard'>
<button
class='teamPick ${current===home?'selected':''}${pulseTeam===home?' justChosen':''}'
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

${current===home?`<small>Choosing</small>`:hUsed?`<small>Picked</small>`:''}
</button>

<div class='vs'>v</div>

<button
class='teamPick ${current===away?'selected':''}${pulseTeam===away?' justChosen':''}'
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

${current===away?`<small>Choosing</small>`:aUsed?`<small>Picked</small>`:''}
</button>
${timeLine}
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

    const playerName=authenticatedPlayer;
    const pin=authenticatedPin;

    if(!playerName||!pin){
      notice(
        'Please log in before enabling notifications.',
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
      sport:selectedSport||'football',
  league:selectedLeague||'PL',
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
      error.message || 'Could not enable notifications.',
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
  
  const matchweeks = [];
  const firstWeek = Math.max(1, currentRound - 8);

  for (let week = currentRound; week >= firstWeek; week -= 1) {
    matchweeks.push(week);
  }

  async function loadMatchweek(matchweek){
    const response = await fetch(
      `/api/football?round=${matchweek}&${fixtureQuery()}`
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
// Ask for the admin PIN inside the page.
function adminPinModal(){
  return new Promise(resolve=>{
    const overlay=document.createElement('div');
    overlay.className='loginOverlay';

    overlay.innerHTML=`
      <div class='loginModal'>
        <div class='eyebrow dark'>ADMIN</div>
        <h2>Admin PIN</h2>
        <p class='muted'>Enter the admin PIN to continue.</p>
        <input id='adminPinInput' class='loginInput' type='password' autocomplete='off' placeholder='PIN'>
        <div id='adminPinError' class='loginError'></div>
        <button id='adminPinContinue' class='loginContinue' type='button'>Continue</button>
        <button id='adminPinCancel' class='loginCancel' type='button'>Cancel</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const input=overlay.querySelector('#adminPinInput');

    const finish=value=>{
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('#adminPinContinue').onclick=()=>{
      const pin=input.value.trim();

      if(!pin){
        overlay.querySelector('#adminPinError').textContent='Enter the admin PIN.';
        return;
      }

      finish(pin);
    };

    overlay.querySelector('#adminPinCancel').onclick=()=>finish(null);
    input.addEventListener('keydown', event=>{
      if(event.key==='Enter'){
        overlay.querySelector('#adminPinContinue').click();
      }
    });
    input.focus();
  });
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
let lastRenderedTab='';
let pulseTeam='';

// Draw the current tab. A new tab starts at the top.
async function render(){
const sameTab=lastRenderedTab===tab;
const keepScroll=sameTab?window.scrollY:0;
lastRenderedTab=tab;
queueMicrotask(()=>window.scrollTo(0, keepScroll));
syncDeadline();
paintDeadlineClock();
paintSport();

const pickTab=document.querySelector('[data-tab="pick"]');
if(pickTab){
  pickTab.hidden=!authenticatedPlayer;
}
if(tab==='pick'&&!authenticatedPlayer){
  tab='home';
}

const leagueName=sportById(selectedSport)
  ?.leagues
  ?.find(item=>item.id===selectedLeague)
  ?.label;

$('#summary').textContent=
`${leagueName?`${leagueName} · `:''}${roundTitle(state.round)} · ${alive()} player${alive()==1?'':'s'} alive`;

document
.querySelectorAll('.tabs button')
.forEach(b=>{
  b.classList.toggle(
    'active',
    b.dataset.tab===tab
  );

  b.onclick=async ()=>{
    if(b.dataset.tab==='admin' && !adminUnlocked){
      const pin=await adminPinModal();

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
  };
});

const c=$('#content');

if(c){
  c.classList.toggle('tabIn', !sameTab);
}

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
!termsAccepted()
?`
<div class="card">
<h2>Before you play</h2>
<p class="gateChoice">Please read this, then tick the box.</p>
${termsMarkup('homeTermsCheck')}
<button class="primary" id="acceptTerms" type="button" disabled>
I agree and want to play
</button>
</div>
`
:authenticatedPlayer&&notificationsSupported&&!notificationPlayer
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
<h2>Join ${esc(leagueName||'the competition')}</h2>

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

<div class='homeLogin${!state.registrationClosed?' homeLoginSplit':''}'>
  <p class='muted'>
    Already playing? Sign in with your name and PIN.
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
        <b>${roundTitle(state.round)}</b>
      </p>


      <p class='muted'>
        <b>Teams used:</b>
        ${
          me.used?.length
          ?me.used.map(esc).join(', ')
          :'None yet'
        }
      </p>
      <button class='logOutBtn' id='logOutBtn' type='button'>Log out</button>
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
<span>Current ${roundNoun()}</span>
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

<h2>Player Status</h2>
</div>
</div>

${renderStandings()}
</div>

<details class='card rules'>
<summary><h2>Competition rules</h2></summary>

<ul>
${
(sportById(selectedSport)||sportById('football')).rules
.map(rule=>`<li>${esc(rule)}</li>`)
.join('')
}
</ul>
</details>

<div class='card'>
  <h2>Before you play</h2>
  ${termsMarkup()}
</div>
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
          pin:login.pin,
          sport:selectedSport||'football',
  league:selectedLeague||'PL'
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
    rememberPlayer();
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
  if($('#acceptTerms')){
    const homeCheck=$('#homeTermsCheck');

    if(homeCheck){
      homeCheck.onchange=()=>{
        $('#acceptTerms').disabled=!homeCheck.checked;
        saveTermsAcceptance(homeCheck.checked);
      };
    }

    $('#acceptTerms').onclick=async ()=>{
      if(!$('#homeTermsCheck')?.checked){
        return;
      }

      saveTermsAcceptance();
      notice('You can play now.','ok');
      render();
    };
  }
  if($('#joinBtn')) $('#joinBtn').onclick=async ()=>{
if(!termsAccepted()){
  return notice(
    'Please read this and agree before you play.',
    'warn'
  );
}
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
pin,
sport:selectedSport||'football',
league:selectedLeague||'PL'
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
  rememberPlayer();
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
  
  if($('#logOutBtn')){
    $('#logOutBtn').onclick=logOut;
  }

  $('#homeAdminBtn').onclick=async ()=>{
  if(!adminUnlocked){
    const pin=await adminPinModal();

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
  if(!authenticatedPlayer||!termsAccepted()){
    tab='home';
    render();
    return;
  }
const p=
  state.players.find(
    player=>
      player.name===authenticatedPlayer &&
      player.alive
  );

if(!p){
  authenticatedPlayer=null;
  authenticatedPin=null;
  tab='home';
  notice('Please log in again before making a pick.','warn');
  render();
  return;
}

const current=
p.picks[state.round]||'';

const pickPool=
  (selectedSport||'football')==='football' &&
  (state.league||selectedLeague)==='PL'
    ?teams
    :[];

const avail=pickPool.filter(
t=>
!p.used.includes(t) ||
t===current
);

let fixtures=roundFixtures();

if(!fixtures.length){
  try{
    const response=
      await fetch(
        `/api/football?round=${state.round}&${fixtureQuery()}`
      );

    const data=
      await response.json();

    if(response.ok){
      fixtures=
        (data.matches||[]).map(mapApiMatch);
      state.fixtures[state.round]=fixtures;
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
${roundTitle(state.round)}
</div>


</div>
</div>

<div class='pickGreeting'>
  Hi ${esc(authenticatedPlayer)}, choose your ${(sportById(selectedSport)||{}).pickNoun||'team'} for ${leagueName?`${esc(leagueName)} · `:''}${roundTitle(state.round)}.
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
Selections are closed for ${roundTitle(state.round)}.
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
f.awayCrest,
f
)
)
.join('')
}
</div>`
:selectedSport==='football'
?`<label>Team</label>

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
:`<p class='muted'>
Fixtures for this round are not available yet.
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
pulseTeam='';

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

  const plannerPlayer=
    state.players.find(
      p=>p.name===authenticatedPlayer
    );
  c.innerHTML=`
    <h2>Fixtures</h2>

    <div class='card'>
      <p>
        Loading this ${roundNoun().toLowerCase()} and earlier ones…
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
         <details class='card matchweekDropdown' ${item.matchweek===Number(state.round)?'open':''}>
            <summary class='matchweekSummary'>
  <div class='sectionHead'>
    <div>
      <div class='eyebrow dark'>
        ${
  item.matchweek===Number(state.round)
    ?'THIS MATCHWEEK'
  :'EARLIER'
}
      </div>

      <h2>
        ${roundTitle(item.matchweek)}
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

  // Match team names with or without the FC suffix.
  const sameClub=(left,right)=>
    String(left||'').replace(/ FC$/,'')===
    String(right||'').replace(/ FC$/,'');
  const currentPick=
    plannerPlayer?.picks?.[state.round]||'';
  const weekIsCurrent=item.matchweek===Number(state.round);
  const homeUsed=
    plannerPlayer?.used?.some(team=>sameClub(team,home));
  const awayUsed=
    plannerPlayer?.used?.some(team=>sameClub(team,away));
  const homeChoosing=
    weekIsCurrent && sameClub(home,currentPick);
  const awayChoosing=
    weekIsCurrent && sameClub(away,currentPick);

  const homeScore=match.score?.fullTime?.home;
  const awayScore=match.score?.fullTime?.away;
  const hasScore=homeScore!=null
    && awayScore!=null
    && (!weekIsCurrent || state.deadlinePassed);

  return `
    <div class='fixtureCard'>

      <div class='plannerTeam ${homeChoosing?'plannerTeamChoosing':homeUsed?'plannerTeamUsed':''}'>
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
        ${hasScore?`<span class='plannerScore'>${esc(String(homeScore))}</span>`:''}

        ${
          homeChoosing
            ?`<span class='plannerUsed plannerChoosing'>Choosing</span>`
            :homeUsed
            ?`<span class='plannerUsed'>Picked</span>`
            :''
        }
      </div>

      <div class='muted'>
        v
      </div>

      <div class='plannerTeam ${awayChoosing?'plannerTeamChoosing':awayUsed?'plannerTeamUsed':''}'>
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
        ${hasScore?`<span class='plannerScore'>${esc(String(awayScore))}</span>`:''}

        ${
          awayChoosing
            ?`<span class='plannerUsed plannerChoosing'>Choosing</span>`
            :awayUsed
            ?`<span class='plannerUsed'>Picked</span>`
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

    notice(
      error.message||'Could not load upcoming fixtures.',
      'warn'
    );

    c.innerHTML=`
      <h2>Fixtures</h2>

      <p class='muted'>Could not load upcoming fixtures.</p>
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
${roundTitle(displayRound)}:
${esc(shown)}
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
const manual=state.resultMode==='manual';
const teams=manual?fixtureTeams():pickedTeams();
const teamRows=teams.length
?teams.map(t=>{
  if(!manual){
    const liveResult=outcomeFromFixture(t);

    if(liveResult){
      state.results[t]=liveResult;
    }

    const shown=state.results[t]||liveResult;

    return `<div class='resultRow'>
<div class='resultTeam'>${esc(t)}</div>
<p class='muted'>${shown?esc(resultWords(shown)):'The match result is not in yet.'}</p>
</div>`;
  }

  const current=state.results[t]||'';
  const options=selectedSport==='football'
    ?[
      ['','Select result…'],
      ['win','Win'],
      ['loss','Loss'],
      ['score-draw','Score draw'],
      ['zero-home','0–0 draw — this team was HOME'],
      ['zero-away','0–0 draw — this team was AWAY']
    ]
    :[
      ['','Select result…'],
      ['win','Win'],
      ['loss','Loss'],
      ['score-draw','Draw']
    ];

  return `<div class='resultRow'>
<div class='resultTeam'>${esc(t)}</div>
<select class='resultSel' data-team='${esc(t)}' ${state.roundProcessed?'disabled':''}>
${options.map(([value,label])=>`<option value='${value}' ${current===value?'selected':''}>${label}</option>`).join('')}
</select>
</div>`;
}).join('')
:`<p class='muted'>
${manual?'Download the matches first.':'No team selections have been made yet.'}
</p>`;

const w=winner();
const fixtures=roundFixtures();

c.innerHTML=`
<section class='card formCard'>
<h2>Admin</h2>

<p class='muted'>
Run the current ${roundNoun().toLowerCase()} from here. Live mode uses the real match result. Manual mode lets you set who won.
</p>

<div class='adminModes'>
<button id='modeLive' class='${state.resultMode==='manual'?'secondary':'primary'}' type='button'>Use real results</button>
<button id='modeManual' class='${state.resultMode==='manual'?'primary':'secondary'}' type='button'>Set results myself</button>
</div>

<p class='muted'>
${fixtures.length
?`${fixtures.length} matches are loaded for ${roundTitle(state.round)}.`
:`No matches are loaded for ${roundTitle(state.round)} yet.`
}
</p>

<hr>

<div class='pickStep'>
<p class='eyebrow dark'>Step 1</p>
<label>When do picks close?</label>
<p class='muted'>
${
state.deadline
?`Picks close at ${esc(new Date(state.deadline).toLocaleString('en-GB',{timeZone:'Asia/Bangkok'}))} Thailand time.`
:'Load the matches first. The closing time is the first kickoff.'
}
</p>
<p class='statusPill ${state.deadlinePassed?'closed':'open'}'>
${state.deadlinePassed?'Picks are closed':'Picks are open'}
</p>
<button
id='deadlineBtn'
class='${state.deadlinePassed?'success':'danger'} full'
type='button'
${state.roundProcessed?'disabled':''}
>
${state.deadlinePassed?'Re-open picks':'Close picks'}
</button>
<p class='muted'>The coloured words are a status. Press the button to open or close picks.</p>
</div>

<div class='pickStep'>
<p class='eyebrow dark'>Get the matches</p>
<p class='muted'>This downloads who plays whom in ${roundTitle(state.round)}, and sets the closing time from the first kickoff. Press it when this round has no matches yet.</p>
<button class='primary' id='loadEpl' type='button'>Download ${roundTitle(state.round)} matches</button>
</div>

<div class='pickStep'>
<p class='eyebrow dark'>${manual?'Set each team':'Real results'}</p>

<p class='muted'>
${manual
?'Choose what happened for each team, then close this matchweek.'
:'These are the real scores for the teams people picked.'}
</p>

${teamRows}

${
state.roundProcessed
?`<div class='processedBox'>
${roundTitle(state.round)} has been processed.
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
Undo ${roundTitle(state.round)} Processing
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
:`<button class='danger full' id='closeWeek' type='button'>Close ${roundTitle(state.round)}</button>`
}

<hr>



<hr>

<details class='adminTools'>
<summary>Testing tools</summary>
<p class='muted'>
Change the round to test. Players and their picks stay.
</p>
<div class='toolRow'>
<button class='danger full' id='rewindRound' type='button'>
Go back one ${roundNoun().toLowerCase()}
</button>
</div>
<div class='toolRow'>
<input id='debugRound' type='number' min='1' value='${state.round}'>
<button class='danger full' id='setDebugRound' type='button'>
Open ${roundNoun().toLowerCase()}
</button>
</div>
</details>

<hr>

<button
class='danger full'
id='reset'
type='button'
>
Reset competition
</button>

</section>

<section class='card formCard adminSeparate'>
<h2>Remove a player</h2>
<p class='muted'>This takes one player out. The round and the other players stay.</p>

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
class='danger full'
id='removePlayerBtn'
type='button'
>
Remove player
</button>
</div>
</section>
`;

if($('#loadEpl')){
$('#loadEpl').onclick=async ()=>{
  const ok=await confirmModal(
    'Load matches?',
    'This replaces the match list for the current round and sets the closing time from the first kickoff.'
  );

  if(ok){
    loadEplFixtures();
  }
};
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
.querySelectorAll('.removeFixture')
.forEach(b=>{
  b.onclick=async ()=>{
    state.fixtures[state.round]=
      roundFixtures().filter(
        (_,i)=>i!==Number(b.dataset.i)
      );

    notice('Fixture removed.');
    saveAdmin();
    render();
  };
});

if($('#deadlineBtn')){
$('#deadlineBtn').onclick=async ()=>{
const opening=state.deadlinePassed;
const ok=await confirmModal(
  opening?'Open picks again?':'Close picks now?',
  opening
    ?'People can pick again, even if the first match has already started.'
    :'People will not be able to make or change a pick.'
);

if(!ok){
  return;
}

state.keepPicksOpen=opening;
state.deadlinePassed=!opening;
saveAdmin();
notice(
state.deadlinePassed
?`${roundTitle(state.round)} is closed.`
:`${roundTitle(state.round)} is open again.`
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

saveAdmin();
}
);

if($('#process')){
$('#process').onclick=async ()=>{
  const ok=await confirmModal(
    'Record these results?',
    'Players who did not win this round will be out, unless everyone failed together.'
  );

  if(ok){
    processRound(false);
  }
};
}

// Close picks and record this matchweek from the results.
async function closeMatchweek(){
  const ok=await confirmModal(
    `Close ${roundTitle(state.round)}?`,
    'Picks close, and this matchweek is recorded from the results.'
  );

  if(!ok){
    return;
  }

  state.keepPicksOpen=false;
  state.deadlinePassed=true;

  if(state.resultMode!=='manual'){
    pickedTeams().forEach(team=>{
      const result=outcomeFromFixture(team);

      if(result){
        state.results[team]=result;
      }
    });
  }

  saveAdmin();

  if(!processRound(false)){
    render();
  }
}

if($('#closeWeek')){
  $('#closeWeek').onclick=closeMatchweek;
}

if($('#undoRound')){
$('#undoRound').onclick=async ()=>{
  const ok=await confirmModal(
    'Undo this round?',
    'Players go back to how they were before this round was recorded.'
  );

  if(ok){
    undoProcessedRound();
  }
};
}

if($('#advance')){
$('#advance').onclick=async ()=>{
  const ok=await confirmModal(
    'Open the next round?',
    'People will pick for a new round. This round stays recorded.'
  );

  if(ok){
    advanceRound();
  }
};
}


if($('#removePlayerBtn')){
$('#removePlayerBtn').onclick=async ()=>{
const name=
$('#removePlayer').value;

if(!name){
return notice(
'Select a player to remove.',
'warn'
);
}

const ok=await confirmModal(
  `Remove ${name}?`,
  'This player and their picks will leave this competition.'
);

if(!ok){
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
$('#reset').onclick=async ()=>{
const ok=await confirmModal(
  'Reset the competition?',
  'Players, picks, and matches for this sport or league will be cleared. This cannot be undone.'
);

if(!ok){
  return;
}

const nextRound=Number(state.round)+1;

state=freshState();
state.round=nextRound;
state.startRound=nextRound;
state.resultMode='live';

saveAdmin();
notice(
'Competition reset.'
);

render();
};

// Save whether this competition uses real scores or admin results.
async function setResultMode(mode){
  const manual=mode==='manual';
  const current=state.resultMode==='manual'?'manual':'live';

  if(mode===current){
    return;
  }
  const ok=await confirmModal(
    manual?'Set results yourself?':'Use real results?',
    manual
      ?'The game will wait for you to choose win or loss.'
      :'The game will use the real score when the match is finished.'
  );

  if(!ok){
    return;
  }

  state.resultMode=manual?'manual':'live';
  saveAdmin();
  notice(manual?'Manual results are on.':'Real results are on.');
  render();
}

if($('#modeLive')){
  $('#modeLive').onclick=()=>setResultMode('live');
}

if($('#modeManual')){
  $('#modeManual').onclick=()=>setResultMode('manual');
}

if($('#rewindRound')){
  $('#rewindRound').onclick=async ()=>{
    if(Number(state.round)<=1){
      notice('This is already the first round.','warn');
      return;
    }

    const ok=await confirmModal(
      'Go back one round?',
      'The round number goes back. Players stay in the game. Use this for testing.'
    );

    if(!ok){
      return;
    }

    state.round=Number(state.round)-1;
    state.deadlinePassed=false;
    state.roundProcessed=false;
    state.results={};
    saveAdmin();
    render();
  };
}

if($('#setDebugRound')){
  $('#setDebugRound').onclick=async ()=>{
    const next=Number($('#debugRound').value);

    if(!Number.isInteger(next)||next<1){
      notice('Enter a round number of 1 or more.','warn');
      return;
    }

    const ok=await confirmModal(
      `Open ${roundTitle(next)}?`,
      'The round number changes. Players and old picks stay saved.'
    );

    if(!ok){
      return;
    }

    state.round=next;
    state.deadlinePassed=false;
    state.roundProcessed=false;
    state.results={};
    saveAdmin();
    render();
  };
}





}

}

setInterval(paintDeadlineClock, 1000);

/*
Check every 15 seconds in case the first match kicks off
while somebody has the app open.
*/
setInterval(()=>{
if(syncDeadline()){
fetch('/api/deadline',{
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    sport:selectedSport||'football',
  league:selectedLeague||'PL'
  })
}).catch(error=>
  console.error('Deadline save failed:',error)
);
render();

notice(
`${roundTitle(state.round)} selections are now closed.`
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

// Open the next missing step, or the main screen when a sport is chosen.
function continueAfterAccess(){
  if(!selectedSport){
    showSportGate();
    return;
  }

  if(!termsAccepted()){
    showTermsStep(selectedSport, selectedLeague);
    return;
  }

  if(appShell){
    appShell.style.display='';
  }

  paintSport();
}

// Update the title to the sport that is open.
function paintSport(){
  const sport=sportById(selectedSport);
  const league=sport?.leagues?.find(item=>item.id===selectedLeague);
  const title=document.querySelector('.hero h1');

  if(title){
    const leagueName=league?.label;

    title.textContent=leagueName
      ?`${leagueName} Last Man Standing`
      :sport
        ?`${sport.label} Last Man Standing`
        :'Last Man Standing';
  }

  const ball=document.querySelector('.ball');
  const mark=document.getElementById('sportMark');
  const markImage=league?.image||sport?.image;

  if(ball && mark && markImage){
    ball.hidden=false;
    mark.src=markImage;
    mark.alt=league?.label||sport?.label||'';
  }

  const change=document.getElementById('changeSport');

  if(change){
    change.textContent=league?.label
      ?`Change · ${league.label}`
      :sport
        ?`Change · ${sport.label}`
        :'Change sport';
    change.onclick=()=>{
      authenticatedPlayer=null;
      authenticatedPin=null;
      showSportGate();
    };
  }
}

// Short line under a sport name.
function sportHint(sport){
  if(sport.leagues.length){
    return 'Choose a league next';
  }

  if(sport.pickNoun==='driver'){
    return 'Pick a driver';
  }

  if(sport.pickNoun==='player'){
    return 'Pick a player';
  }

  return 'Pick a team';
}

// Create the gate shell once and hide the competition.
function ensureSportGate(){
  if(appShell){
    appShell.style.display='none';
  }

  let gate=document.getElementById('sportGate');

  if(!gate){
    gate=document.createElement('main');
    gate.id='sportGate';
    gate.className='shell';
    document.body.prepend(gate);
  }

  return gate;
}

// Replace the gate card and play the step animation again.
function paintGate(html){
  const gate=ensureSportGate();
  gate.innerHTML=`
    <section class='card formCard gateCard gateStep'>
      ${html}
    </section>
  `;
  const card=gate.querySelector('.gateCard');
  card.classList.remove('gateStep');
  void card.offsetWidth;
  card.classList.add('gateStep');
  return gate;
}

// Show one sport card at a time.
function showSportGate(){
  const gate=paintGate(`
    <p class='gateKicker'>Step 1</p>
    <h2>Choose a sport</h2>
    <p>Each sport has its own players and results.</p>
    <div class='sportGrid' id='sportGrid'></div>
  `);
  const grid=gate.querySelector('#sportGrid');

  SPORTS.forEach(sport=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='sportBtn';
    button.innerHTML=`
      <img class='sportIcon' src='${esc(sport.image)}' alt=''>
      <span>
        <span class='sportName'>${esc(sport.label)}</span>
        <span class='sportHint'>${esc(sportHint(sport))}</span>
      </span>
    `;
    button.onclick=()=>{
      button.classList.add('isSelected');

      window.setTimeout(()=>{
        if(sport.leagues.length){
          showLeagues(sport);
          return;
        }

        openChosenSport(sport.id, null);
      }, 160);
    };
    grid.appendChild(button);
  });
}

// Show football leagues on their own screen.
function showLeagues(sport){
  const gate=paintGate(`
    <button class='gateBack' id='gateBack' type='button'>
      <span aria-hidden='true'>←</span> Back
    </button>
    <p class='gateKicker'>Step 2</p>
    <h2>Choose a league</h2>
    <p>${esc(sport.label)} keeps one competition per league.</p>
    <div class='sportGrid' id='leagueGrid'></div>
  `);

  gate.querySelector('#gateBack').onclick=()=>showSportGate();

  const grid=gate.querySelector('#leagueGrid');

  sport.leagues.forEach(league=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='sportBtn';
    button.innerHTML=`
      <img class='sportIcon' src='${esc(league.image||sport.image)}' alt=''>
      <span>
        <span class='sportName'>${esc(league.label)}</span>
        <span class='sportHint'>Football league</span>
      </span>
    `;
    button.onclick=()=>{
      button.classList.add('isSelected');
      window.setTimeout(()=>{
        openChosenSport(sport.id, league.id);
      }, 160);
    };
    grid.appendChild(button);
  });
}

// Show the full terms before the competition opens.
function showTermsStep(sportId, leagueId){
  const sport=sportById(sportId);
  const league=sport?.leagues?.find(item=>item.id===leagueId);
  const choice=league
    ?`${sport.label} · ${league.label}`
    :sport?.label||'this sport';

  const gate=paintGate(`
    <button class='gateBack' id='gateBack' type='button'>
      <span aria-hidden='true'>←</span> Back
    </button>
    <p class='gateKicker'>Step 3</p>
    <h2>Before you play</h2>
    <p class='gateChoice'>You chose <b>${esc(choice)}</b>.</p>
    ${termsMarkup('gateTermsCheck')}
    <button class='primary' id='gateAcceptTerms' type='button' disabled>
      I agree and want to play
    </button>
  `);

  gate.querySelector('#gateBack').onclick=()=>{
    if(sport?.leagues?.length){
      showLeagues(sport);
      return;
    }

    showSportGate();
  };

  const gateCheck=gate.querySelector('#gateTermsCheck');
  const gateAccept=gate.querySelector('#gateAcceptTerms');

  gateCheck.onchange=()=>{
    gateAccept.disabled=!gateCheck.checked;
    saveTermsAcceptance(gateCheck.checked);
  };

  gateAccept.onclick=async ()=>{
    if(!gateCheck.checked){
      return;
    }

    saveTermsAcceptance();
    chooseSport(sportId, leagueId);
  };
}

// Open the sport, and ask for terms only the first time.
function openChosenSport(sportId, leagueId){
  if(termsAccepted()){
    chooseSport(sportId, leagueId);
    return;
  }

  showTermsStep(sportId, leagueId);
}

// Save the sport and load that competition.
function chooseSport(id, league){
  selectedSport=id;

  if(league){
    selectedLeague=league;
  }

  localStorage.setItem('lms-sport', selectedSport);
  localStorage.setItem('lms-league', selectedLeague);

  const sameSport=state.sport===id;
  const sameLeague=!league||state.league===league;

  if(!sameSport||!sameLeague){
    if(!state.sport&&id==='football'&&(league||'PL')==='PL'){
      state.sport='football';
      state.league='PL';
    }else{
      state=freshState();
      state.league=id==='football'?selectedLeague:null;
    }
  }

  authenticatedPlayer=null;
  authenticatedPin=null;
  plannerFixturesCache=null;
  plannerFixturesCacheRound=null;
  document.getElementById('sportGate')?.remove();

  if(appShell){
    appShell.style.display='';
  }

  paintSport();
  loadState();
}

/*
Load the shared state, then immediately check results.
This means if nobody had the app open when matches finished,
the Matchweek will be processed the next time somebody opens it.
*/
// Open the saved competition, or the next setup step.
async function startApp(){
  if(!competitionUnlocked){
    return;
  }

  if(selectedSport&&termsAccepted()){
    if(appShell){
      appShell.style.display='';
    }

    await loadState();
    autoCheckResults();
    checkNotifications();
    return;
  }

  if(selectedSport){
    showTermsStep(selectedSport, selectedLeague);
    return;
  }

  showSportGate();
}

let pullStartY=0;

document.addEventListener('touchstart', event=>{
  if(window.scrollY<=0){
    pullStartY=event.touches[0].clientY;
  }else{
    pullStartY=0;
  }
}, {passive:true});

document.addEventListener('touchend', event=>{
  if(!pullStartY){
    return;
  }

  const moved=event.changedTouches[0].clientY-pullStartY;
  pullStartY=0;

  if(window.scrollY<=0 && moved>80){
    window.scrollTo(0, 0);
    plannerFixturesCache=null;
    loadState();
  }
}, {passive:true});

startApp();

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
