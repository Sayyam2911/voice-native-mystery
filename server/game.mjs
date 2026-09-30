import { randomUUID } from 'node:crypto';
import { initialState, commitClues, projectGame, ruleSatisfied } from './cases.mjs';
import { callModel, approveProposal, splitSpeech, heardSegmentCount } from './dialogue.mjs';
import { HttpError, requireThat } from './errors.mjs';

export class GameService {
  constructor(store,config=process.env,model=callModel) {this.store=store;this.config=config;this.model=model;}
  async session(sid) {const s=await this.store.getSession(sid);requireThat(s,404,'Investigation not found. Start a new case.');requireThat(new Date(s.expiresAt)>new Date(),410,'This case has expired. Start a new investigation.');return s;}
  async start(caseId) {const pack=await this.store.getCase(caseId);requireThat(pack,404,'Case not found.');const s={_id:randomUUID(),caseId:pack.id,caseVersion:pack.version,state:initialState(pack),revision:0,turnCount:0,createdAt:new Date(),lastActiveAt:new Date(),expiresAt:new Date(Date.now()+86400000),activeVoice:null,turnLock:null,voiceSeconds:0};await this.store.createSession(s,Number(this.config.MAX_DAILY_SESSIONS||20));return s;}
  async projection(sid) {const s=await this.session(sid);const [pack,turns,events]=await Promise.all([this.store.getCase(s.caseId,s.caseVersion),this.store.getTurns(sid),this.store.getEvents(sid)]);return projectGame(pack,s,turns,events);}
  async select(sid,cid) {await this.store.transaction(sid,async s=>{requireThat(s.state.unlockedCharacterIds.includes(cid),403,'That person is not available yet.');s.state.selectedCharacterId=cid;});return this.projection(sid);}
  async inspect(sid,clueId) {const s=await this.session(sid),pack=await this.store.getCase(s.caseId,s.caseVersion);await this.store.transaction(sid,async(s,ops)=>{const clue=pack.clues.find(x=>x.id===clueId);requireThat(clue?.inspectable&&ruleSatisfied(clue.requires,s.state),403,'That exhibit is not available.');const source={kind:'exhibit',id:clue.id,label:clue.source};await this.addClues(pack,s,ops,[clue.id],source);});return this.projection(sid);}
  async investigate(sid,leadId) {const s=await this.session(sid),pack=await this.store.getCase(s.caseId,s.caseVersion);await this.store.transaction(sid,async(s,ops)=>{const lead=pack.leads.find(x=>x.id===leadId);requireThat(lead&&ruleSatisfied(lead.requires,s.state),403,'Follow the available scene evidence before pursuing this lead.');await this.addClues(pack,s,ops,lead.clueIds,{kind:'investigation',id:lead.id,label:lead.title});if(!s.state.completedLeadIds.includes(lead.id))s.state.completedLeadIds.push(lead.id);});return this.projection(sid);}
  async addClues(pack,s,ops,ids,source) {for(const e of commitClues(pack,s.state,ids,source)) await ops.addEvent({...e,_id:`${s._id}:clue:${e.clueId}`,sessionId:s._id,expiresAt:s.expiresAt});}
  async alertSeen(sid) {await this.store.transaction(sid,async s=>{if(s.state.partnerAlert)s.state.partnerAlert.acknowledged=true;});return this.projection(sid);}
  async accuse(sid,culpritId,evidenceIds) {const s=await this.session(sid),pack=await this.store.getCase(s.caseId,s.caseVersion);let feedback;await this.store.transaction(sid,async(s,ops)=>{
    requireThat(s.state.status==='active',409,'This investigation is already resolved.');
    const selected=new Set(evidenceIds.filter(id=>s.state.knownClueIds.includes(id)));
    const sufficient=pack.resolution.proofGroups.every(group=>group.some(id=>selected.has(id)));
    if(culpritId===pack.resolution.culpritId&&sufficient){s.state.status='resolved';s.state.resolution={route:'reconstruction',culpritId,text:pack.resolution.reconstruction};feedback={success:true,message:'Your reconstruction connects the person, the incident, and the staged scene.'};}
    else feedback={success:false,message:'The reconstruction is not supported yet. Connect evidence for presence, the death, and the misleading scene; naming a person alone is insufficient.'};
    await ops.addEvent({_id:randomUUID(),sessionId:sid,type:'accusation.made',culpritId,evidenceIds:[...selected],success:feedback.success,occurredAt:new Date(),expiresAt:s.expiresAt});
  });return {...await this.projection(sid),feedback};}
  async generateTurn(sid,cid,text,{requestId=randomUUID(),channel='text',leaseId=null}={}) {
    requireThat(typeof text==='string'&&text.trim().length>0&&text.length<=2000,400,'Ask a question of up to 2,000 characters.');
    const id=`${sid}:${requestId}`;let cached=false;
    await this.store.transaction(sid,async(s,ops)=>{
      const existing=await ops.getTurn(id);
      if(existing){requireThat(existing.status!=='pending',409,'That reply is still being prepared.');cached=true;return;}
      requireThat(s.state.status==='active',409,'The investigation is already resolved.');
      requireThat(s.state.selectedCharacterId===cid&&s.state.unlockedCharacterIds.includes(cid),409,'This character is no longer selected.');
      if(channel==='voice')requireThat(s.activeVoice?.id===leaseId&&new Date(s.activeVoice.expiresAt)>new Date(),403,'Voice session is no longer active.');
      requireThat(!s.turnLock||s.turnLock.until<new Date(),409,'Please wait for the current response.');
      requireThat(s.turnCount<Number(this.config.MAX_TURNS_PER_SESSION||100),429,'This case has reached its interview limit. You can still inspect evidence and submit a reconstruction.');
      s.turnCount++;s.turnLock={id,until:new Date(Date.now()+30000)};
      await ops.putTurn({_id:id,sessionId:sid,turnNo:s.turnCount,characterId:cid,playerTranscript:text.trim(),channel,status:'pending',createdAt:new Date(),expiresAt:s.expiresAt});
    });
    if(cached){const turns=await this.store.getTurns(sid,100);return turns.find(x=>x._id===id);}
    const s=await this.session(sid),pack=await this.store.getCase(s.caseId,s.caseVersion),history=(await this.store.getTurns(sid,10)).filter(t=>t._id!==id&&t.characterId===cid&&t.heardText);
    let result;
    try {
      const generated=await this.model(pack,s.state,cid,text,history,this.config);
      const approved=approveProposal(pack,s.state,cid,generated.proposal);
      const segments=splitSpeech(approved.text).map((text,index)=>({id:`${id}:${index}`,text,heard:false}));
      await this.store.transaction(sid,async(s,ops)=>{
        const turn=await ops.getTurn(id);
        if(channel==='voice')requireThat(s.activeVoice?.id===leaseId,409,'The interview changed while a reply was being prepared.');
        turn.approvedReply={text:approved.text,segments};turn.candidate=approved;turn.status='approved';turn.modelMode=generated.mode;turn.warning=generated.warning||null;
        await ops.putTurn(turn);if(s.turnLock?.id===id)s.turnLock=null;result=turn;
      });
    }catch(error){await this.store.transaction(sid,async(s,ops)=>{const t=await ops.getTurn(id);if(t){t.status='failed';await ops.putTurn(t);}if(s.turnLock?.id===id)s.turnLock=null;});throw error;}
    return result;
  }
  async acknowledge(sid,turnId,heardText,interrupted=false) {
    requireThat(typeof heardText==='string'&&heardText.length<=1000,400,'Invalid playback acknowledgement.');
    const s=await this.session(sid),pack=await this.store.getCase(s.caseId,s.caseVersion);
    await this.store.transaction(sid,async(s,ops)=>{
      const t=await ops.getTurn(turnId);requireThat(t?.sessionId===sid&&t.approvedReply,404,'Approved reply not found.');
      const segments=t.approvedReply.segments;const count=heardSegmentCount(segments,heardText);
      for(let i=0;i<count;i++)segments[i].heard=true;
      t.heardText=segments.filter(x=>x.heard).map(x=>x.text).join(' ');
      const complete=segments.every(x=>x.heard);t.status=complete?'heard':interrupted?'interrupted':'partially_heard';
      if(complete&&!t.committed){
        const a=t.candidate;
        // Re-check prerequisites at the commitment boundary; client flags are not authority.
        if(a.revealId){const r=pack.reveals.find(x=>x.id===a.revealId&&x.characterId===t.characterId);requireThat(r&&ruleSatisfied(r.requires,s.state),403,'Reveal is not authorized.');if(!s.state.revealedIds.includes(r.id))s.state.revealedIds.push(r.id);s.state.characterLevels[t.characterId]=r.level;}
        if(a.leadId&&!s.state.completedLeadIds.includes(a.leadId))s.state.completedLeadIds.push(a.leadId);
        await this.addClues(pack,s,ops,a.clueIds,{kind:'interview',turnId:t._id,characterId:t.characterId,label:pack.characters.find(x=>x.id===t.characterId).name});t.committed=true;
      }
      await ops.putTurn(t);
    });return this.projection(sid);
  }
}
