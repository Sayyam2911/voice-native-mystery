import { MongoClient } from 'mongodb';
import { createHash } from 'node:crypto';
import { authoredCases } from './cases.mjs';
import { HttpError } from './errors.mjs';

const clone = x => x ? structuredClone(x) : x;
export class MemoryStore {
  constructor() { this.sessions = new Map(); this.turns = new Map(); this.events = new Map(); this.packs = new Map(authoredCases.map(p => [`${p.id}:${p.version}`, clone(p)])); this.queue = new Map(); this.limits = new Map(); this.voiceSlots = new Map(); this.mode = 'offline'; }
  async listCases() { return [...this.packs.values()].map(clone); }
  async getCase(id, version) { return clone([...this.packs.values()].find(x => x.id === id && (!version || x.version === version))); }
  async getSession(id) { return clone(this.sessions.get(id)); }
  async createSession(session, cap = 20) { const day = new Date().toISOString().slice(0, 10); const count = this.limits.get(day) || 0; if (count >= cap) throw new HttpError(429, 'The daily demo capacity is reached. Please try again tomorrow.'); this.limits.set(day, count + 1); this.sessions.set(session._id, clone(session)); }
  async getTurns(sid, limit = 50) { return [...this.turns.values()].filter(x => x.sessionId === sid).sort((a,b) => a.turnNo - b.turnNo).slice(-limit).map(clone); }
  async getEvents(sid) { return [...this.events.values()].filter(x => x.sessionId === sid).map(clone); }
  async transaction(sid, fn) {
    const previous = this.queue.get(sid) || Promise.resolve();
    let release; const next = new Promise(resolve => { release = resolve; }); this.queue.set(sid, next);
    await previous;
    try {
      const session = clone(this.sessions.get(sid));
      if (!session) throw new HttpError(404, 'Investigation not found. Start a new case.');
      if (new Date(session.expiresAt) <= new Date()) throw new HttpError(410, 'This investigation has expired. Start a new case.');
      const turnChanges = new Map(), events = [];
      const ops = { getTurn: async id => clone(turnChanges.get(id) || this.turns.get(id)), putTurn: async t => { turnChanges.set(t._id, clone(t)); }, addEvent: async e => { events.push(clone(e)); } };
      const result = await fn(session, ops);
      session.revision++; session.lastActiveAt = new Date();
      this.sessions.set(sid, clone(session));
      for (const [id,t] of turnChanges) this.turns.set(id, t);
      for (const e of events) if (!this.events.has(e._id)) this.events.set(e._id, e);
      return result;
    } finally { release(); if (this.queue.get(sid) === next) this.queue.delete(sid); }
  }
  async reserveVoiceSlot(owner, expiresAt, cap) { for (let i=0;i<cap;i++) { const slot=this.voiceSlots.get(i); if (!slot || slot.expiresAt <= new Date()) { this.voiceSlots.set(i, {owner,expiresAt}); return i; } } throw new HttpError(429, 'All voice seats are occupied. You can continue using text or try voice shortly.'); }
  async releaseVoiceSlot(owner) { for (const [i,slot] of this.voiceSlots) if(slot.owner===owner) this.voiceSlots.delete(i); }
}

export class MongoStore {
  constructor(client, db) { this.client = client; this.db = db; this.mode = 'mongodb'; }
  async init() {
    const db=this.db;
    await Promise.all([
      db.collection('case_packs').createIndex({id:1,version:1},{unique:true}),
      db.collection('turns').createIndex({sessionId:1,turnNo:1},{unique:true}),
      db.collection('session_events').createIndex({sessionId:1,occurredAt:1}),
      ...['sessions','turns','session_events','limits'].map(c=>db.collection(c).createIndex({expiresAt:1},{expireAfterSeconds:0}))
    ]);
    for (const pack of authoredCases) {
      const hash=createHash('sha256').update(JSON.stringify(pack)).digest('hex');
      const id=`${pack.id}:${pack.version}`;
      const existing=await db.collection('case_packs').findOne({_id:id});
      if (existing && existing.contentHash !== hash) throw new Error(`Case ${id} changed without a version bump`);
      await db.collection('case_packs').updateOne({_id:id},{$setOnInsert:{...pack,_id:id,contentHash:hash,publishedAt:new Date()}},{upsert:true});
    }
  }
  async listCases() { return this.db.collection('case_packs').find({}).toArray(); }
  async getCase(id,version) { return this.db.collection('case_packs').findOne({id,...(version?{version}:{})},{sort:{version:-1}}); }
  async getSession(id) { return this.db.collection('sessions').findOne({_id:id}); }
  async createSession(session,cap=20) {
    const tx=this.client.startSession();
    try { await tx.withTransaction(async()=>{
      const day=`sessions:${new Date().toISOString().slice(0,10)}`;
      const count=await this.db.collection('limits').findOne({_id:day},{session:tx});
      if ((count?.count||0)>=cap) throw new HttpError(429,'The daily demo capacity is reached. Please try again tomorrow.');
      await this.db.collection('limits').updateOne({_id:day},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+2*86400000)}},{upsert:true,session:tx});
      await this.db.collection('sessions').insertOne(session,{session:tx});
    }); } finally { await tx.endSession(); }
  }
  async getTurns(sessionId,limit=50) { const rows=await this.db.collection('turns').find({sessionId}).sort({turnNo:-1}).limit(limit).toArray(); return rows.reverse(); }
  async getEvents(sessionId) { return this.db.collection('session_events').find({sessionId}).sort({occurredAt:1}).toArray(); }
  async transaction(sid,fn) {
    const tx=this.client.startSession(); let result;
    try { await tx.withTransaction(async()=>{
      const session=await this.db.collection('sessions').findOne({_id:sid},{session:tx});
      if(!session) throw new HttpError(404,'Investigation not found. Start a new case.');
      if(session.expiresAt<=new Date()) throw new HttpError(410,'This investigation has expired. Start a new case.');
      const opts={session:tx};
      const ops={getTurn:id=>this.db.collection('turns').findOne({_id:id},opts),putTurn:t=>this.db.collection('turns').replaceOne({_id:t._id},t,{...opts,upsert:true}),addEvent:e=>this.db.collection('session_events').updateOne({_id:e._id},{$setOnInsert:e},{...opts,upsert:true})};
      result=await fn(session,ops);
      session.revision++; session.lastActiveAt=new Date();
      await this.db.collection('sessions').replaceOne({_id:sid},session,opts);
    },{maxCommitTimeMS:5000}); return result; } finally { await tx.endSession(); }
  }
  async reserveVoiceSlot(owner,expiresAt,cap) {
    for(let i=0;i<cap;i++) {
      const id=`voice-slot:${i}`;
      await this.db.collection('limits').updateOne({_id:id},{$setOnInsert:{expiresAt:new Date(0)}},{upsert:true});
      const slot=await this.db.collection('limits').findOneAndUpdate({_id:id,expiresAt:{$lte:new Date()}},{$set:{owner,expiresAt}},{returnDocument:'after'});
      if(slot) return i;
    }
    throw new HttpError(429,'All voice seats are occupied. You can continue using text or try voice shortly.');
  }
  async releaseVoiceSlot(owner) { await this.db.collection('limits').updateMany({owner},{$set:{expiresAt:new Date(0)},$unset:{owner:''}}); }
}

let connectionPromise;
export async function getStore(config=process.env) {
  if(connectionPromise) return connectionPromise;
  connectionPromise=(async()=>{
    if(!config.MONGODB_URI) {
      if(config.ALLOW_OFFLINE_DEMO==='true' && !config.VERCEL) return new MemoryStore();
      throw new HttpError(503,'Database is not configured. Add MONGODB_URI on the server.','database_unconfigured');
    }
    const client=new MongoClient(config.MONGODB_URI,{maxPoolSize:5,minPoolSize:0,serverSelectionTimeoutMS:7000,connectTimeoutMS:7000});
    await client.connect();
    const store=new MongoStore(client,client.db(config.MONGODB_DB||'voice_native_mystery'));
    await store.init(); return store;
  })();
  try {return await connectionPromise;} catch(error) {connectionPromise=undefined; throw error;}
}
