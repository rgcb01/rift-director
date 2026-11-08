import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
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
  const candidates=(found.artifacts||[]).filter(a=>!a.expired&&
    /^balance-report-\d+\.\d+\.\d+-alpha$/.test(a.name)&&a.workflow_run?.id)
    .map(a=>({...a,version:a.name.slice('balance-report-'.length)}))
    .filter(a=>compareVersions(a.version,version)<0)
    .sort((a,b)=>compareVersions(b.version,a.version)||b.created_at.localeCompare(a.created_at));
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
 previous=JSON.parse(readFileSync('benchmarks/baselines/0.7.6-alpha.json','utf8'));
 source='frozen baseline 0.7.6-alpha';
}
previous.baselineSource=source;
writeFileSync(dst,JSON.stringify(previous,null,2)+'\n');
console.log('Comparacion con: '+previous.version+' ['+source+']');
