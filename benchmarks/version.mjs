import {readFileSync,appendFileSync} from 'node:fs';

export function latestChangelogVersion(text) {
 const found=text.match(/^## \[(\d+\.\d+\.\d+(?:-alpha)?)\]/m);
 if(!found)throw Error('CHANGELOG: falta heading de version 0.x.y');
 return found[1];
}
export function compareVersions(a,b){
 const parts=v=>v.replace(/^v/,'').split(/[-.]/).slice(0,3).map(Number);
 const x=parts(a),y=parts(b);
 for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]-y[i];
 return 0;
}
const executed=process.argv[1]?.endsWith('/version.mjs');
if(executed){
 const version=latestChangelogVersion(readFileSync('CHANGELOG.md','utf8'));
 const ref=process.env.GITHUB_REF||'';
 const tag=ref.startsWith('refs/tags/')?ref.slice(10).replace(/^v/,''):null;
 if(tag&&tag!==version)throw Error('Tag '+tag+' no coincide con CHANGELOG '+version);
 if(!/^\d+\.\d+\.\d+-alpha$/.test(version))throw Error('Formato esperado: 0.7.7-alpha en CHANGELOG');
 console.log('Version del benchmark: '+version);
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'version='+version+'\n');
}
