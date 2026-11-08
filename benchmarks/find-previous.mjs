import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {compareVersions} from './version.mjs';
const version=process.argv[2]||'0.7.6-alpha';
const out=process.argv[3]||'.balance-output';
mkdirSync(out,{recursive:true});
const dst=out+'/previous.json';
let previous=null,source='frozen baseline 0.7.6-alpha';
try{
 if(process.env.GH_TOKEN&&process.env.GITHUB_REPOSITORY){
  const cmd=path=>JSON.parse(execFileSync('gh',['api',path],{encoding:'utf8',timeout:60000}));
  const found=cmd('/repos/'+process.env.GITHUB_REPOSITORY+'/actions/artifacts?per_page=100');
  const released=new Map();
  const isPublished=a=>{
    const branch=a.workflow_run.head_branch||'';
    if(branch==='main'||/^(?:v)?\d+\.\d+\.\d+(?:-alpha)?$/.test(branch))return true;
    // A successful PR benchmark becomes a valid release baseline only if
    // that *exact head SHA* is an ancestor of main after a real merge.
    // Do not import failed or merely open experimental PRs.
    const sha=a.workflow_run.head_sha;
    if(!/^[a-f0-9]{40}$/.test(sha||''))return false;
    if(released.has(sha))return released.get(sha);
    let ok=false;
    try{
      const comparison=cmd('/repos/'+process.env.GITHUB_REPOSITORY+'/compare/'+sha+'...main');
      ok=comparison.behind_by===0&&['ahead','identical'].includes(comparison.status);
    }catch(e){console.warn('No se pudo verificar ancestry '+sha+': '+e.message)}
    released.set(sha,ok);
    return ok;
  };
  const candidates=(found.artifacts||[]).filter(a=>!a.expired&&
    /^balance-report-\d+\.\d+\.\d+-alpha$/.test(a.name)&&a.workflow_run?.id)
    .map(a=>({...a,version:a.name.slice('balance-report-'.length)}))
    .filter(a=>compareVersions(a.version,version)<0)
    .sort((a,b)=>compareVersions(b.version,a.version)||b.created_at.localeCompare(a.created_at))
    .filter(isPublished);
  for(const a of candidates){
   try{
    const dir=out+'/download';
    execFileSync('gh',['run','download',String(a.workflow_run.id),
      '--name',a.name,'--dir',dir],{encoding:'utf8',timeout:60000,stdio:'pipe'});
    if(existsSync(dir+'/summary.json')){
     const imported=JSON.parse(readFileSync(dir+'/summary.json','utf8'));
     if(imported.standard&&imported.mirror){
      previous=imported;source='Actions artifact '+a.name+' (run '+a.workflow_run.id+')';break;
     }
    }
   }catch(e){console.warn('No se pudo descargar '+a.name+': '+e.message)}
  }
 }
}catch(e){console.warn('Consulta de artifacts no disponible: '+e.message)}
if(!previous){
 // Release candidates not merged into main yet still have an auditable,
 // versioned predecessor. Never compare a newer alpha to 0.7.6 just
 // because its 0.7.7 Actions artifact belongs to an unmerged PR.
 const archived=readdirSync('benchmarks/baselines')
  .filter(n=>/^\d+\.\d+\.\d+-alpha\.json$/.test(n))
  .map(n=>({path:'benchmarks/baselines/'+n,version:n.slice(0,-5)}))
  .filter(x=>compareVersions(x.version,version)<0)
  .sort((a,b)=>compareVersions(b.version,a.version));
 if(!archived.length)throw Error('No existe baseline anterior a '+version);
 const chosen=archived[0];
 previous=JSON.parse(readFileSync(chosen.path,'utf8'));
 source='frozen baseline '+chosen.version+
  (previous.source?' — '+previous.source:'');
}
// Fail closed: a newer version must not silently compare against an older
// available artifact if its immediate released predecessor is missing.
const headings=[...readFileSync('CHANGELOG.md','utf8').matchAll(/^## \[(\d+\.\d+\.\d+-alpha)\]/gm)]
 .map(x=>x[1]).filter(v=>compareVersions(v,version)<0);
const immediate=headings.sort((a,b)=>compareVersions(b,a))[0];
if(immediate&&previous.version!==immediate)
 throw Error('Se exige baseline inmediatamente anterior '+immediate+
  ', pero solo se encontro '+previous.version+' ('+source+')');
previous.baselineSource=source;
writeFileSync(dst,JSON.stringify(previous,null,2)+'\n');
console.log('Comparacion con: '+previous.version+' ['+source+']');
