import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('./check-model.mjs', import.meta.url));
const jar = process.env.TLA2TOOLS;
async function run(args, env=process.env) {
 try { const r=await exec(process.execPath,[script,...args],{env,timeout:40000}); return {...r,code:0}; }
 catch(e) { return {code:e.code,stdout:e.stdout,stderr:e.stderr}; }
}
async function fixture(fn) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'teacher-tlc-test-'));
 try {await fn(root);} finally {await fs.rm(root,{recursive:true,force:true});}
}
const spec = `---------------- MODULE Tiny ----------------
EXTENDS Naturals
VARIABLE n
vars == <<n>>
Init == n = 0
Inc == n < 1 /\\ n' = n + 1
Done == n = 1 /\\ UNCHANGED vars
Next == Inc \\/ Done
Spec == Init /\\ [][Next]_vars
Safe == n <= 1
Wrong == n < 1
Live == <>(n = 1)
==============================================
`;
test('preflight preserves a populated output and never creates evidence for missing input', async()=>fixture(async root=>{
 const target=path.join(root,'existing');await fs.mkdir(target);await fs.writeFile(path.join(target,'keep'),'original');
 const r=await run([path.join(root,'missing.tla'),'--config','missing.cfg','--out',target]);
 assert.equal(r.code,2);assert.equal(await fs.readFile(path.join(target,'keep'),'utf8'),'original');
 assert.deepEqual(await fs.readdir(target),['keep']);
}));
test('real parallel TLC checks distinguish safety/liveness/deadlock and isolate standard-module extraction', {skip:!jar}, async()=>fixture(async root=>{
 const folder=path.join(root,'模型 with spaces');await fs.mkdir(folder);
 const file=path.join(folder,'Tiny.tla');await fs.writeFile(file,spec);
 const cases=[['safe','INVARIANT Safe',0,'holds'],['wrong','INVARIANT Wrong',1,'violated'],['live','PROPERTY Live',1,'violated'],['dead','INVARIANT Safe',1,'violated']];
 await Promise.all(cases.map(async ([name,checks,expected,outcome])=>{
  const model=name==='dead'?path.join(folder,'Dead.tla'):file;
  if(name==='dead')await fs.writeFile(model,spec.replace('MODULE Tiny','MODULE Dead').replace('Next == Inc \\/ Done','Next == Inc'));
  const cfg=path.join(folder,name+'.cfg');await fs.writeFile(cfg,`SPECIFICATION Spec\n${checks}\n`);
  const out=path.join(root,name);const r=await run([model,'--config',cfg,'--out',out]);assert.equal(r.code,expected,r.stderr+r.stdout);
  const evidence=JSON.parse(await fs.readFile(path.join(out,'result.json'),'utf8'));
  assert.equal(evidence.outcome,outcome);assert.match(evidence.toolVersion,/TLC2 Version/);
  assert.equal(evidence.graphComplete,expected===0);assert.equal(evidence.inputs.spec.sha256.length,64);
  const log=await fs.readFile(path.join(out,'tlc.out'),'utf8');assert.match(log,/Finished/);
  if(name==='dead')assert.match(log,/Deadlock reached/);
  if(name==='live')assert.match(log,/Stuttering/);
  if(name==='wrong')assert.match(log,/Invariant Wrong is violated/);
 }));
}));
test('semantic errors and killed checks remain tool outcomes, never successful checks', {skip:!jar}, async()=>fixture(async root=>{
 const file=path.join(root,'Tiny.tla');const cfg=path.join(root,'Tiny.cfg');await fs.writeFile(file,spec.replace('n = 0','unknownName = 0'));await fs.writeFile(cfg,'SPECIFICATION Spec\n');
 let r=await run([file,'--config',cfg,'--out',path.join(root,'invalid')]);assert.equal(r.code,2);
 let result=JSON.parse(await fs.readFile(path.join(root,'invalid/result.json'),'utf8'));assert.equal(result.outcome,'tool-error');assert.equal(result.graphComplete,false);
 await fs.writeFile(file,spec);
 r=await run([file,'--config',cfg,'--out',path.join(root,'timeout'),'--timeout-ms','1']);assert.equal(r.code,2);
 result=JSON.parse(await fs.readFile(path.join(root,'timeout/result.json'),'utf8'));assert.equal(result.outcome,'timeout');assert.equal(result.timedOut,true);assert.equal(result.signal,'SIGKILL');
}));
test('valid inputs cannot overwrite prior evidence; failed Java startup is explicit', {skip:!jar}, async()=>fixture(async root=>{
 const file=path.join(root,'Tiny.tla');const cfg=path.join(root,'Tiny.cfg');await fs.writeFile(file,spec);await fs.writeFile(cfg,'SPECIFICATION Spec\n');
 const out=path.join(root,'existing');await fs.mkdir(out);await fs.writeFile(path.join(out,'keep'),'original');
 let r=await run([file,'--config',cfg,'--out',out]);assert.equal(r.code,2);assert.match(r.stderr,/not empty/);assert.deepEqual(await fs.readdir(out),['keep']);
 const failed=path.join(root,'no-java');r=await run([file,'--config',cfg,'--out',failed],{...process.env,JAVA:path.join(root,'missing-java')});assert.equal(r.code,2);
 const result=JSON.parse(await fs.readFile(path.join(failed,'result.json'),'utf8'));assert.equal(result.outcome,'tool-error');assert.match(result.error,/ENOENT/);
}));
