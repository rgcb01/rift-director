#!/usr/bin/env python3
"""Validate decoded pixels, formats, RGB, sRGB, budgets and catalog references."""
import json, subprocess
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'assets/card-art/manifest.json').read_text())
ids=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {CHARACTER_CATALOG,TACTIC_CATALOG} from './src/card-game/catalog.mjs'; console.log(JSON.stringify([...CHARACTER_CATALOG,...TACTIC_CATALOG].map(c=>c.id)))"],cwd=ROOT))
expected={'hero-centinela','hero-astral','hero-sombra','great-convergence','disrupt','line-guard'}
assert set(manifest)==expected
assert set(manifest)<=set(ids)
assert (ROOT/'assets/card-art/manifest.mjs').read_text().split('export const CARD_ART = ',1)[1].strip().removesuffix(';') == json.dumps(manifest,ensure_ascii=False,indent=2)
for id,a in manifest.items():
 assert a['alt'] and all(0<=a['focal'][k]<=1 for k in ('x','y'))
 assert a['generation']['promptVersion'] and a['generation']['date']
 for path,size,fmt,budget in [(a['source'],a['sourceSize'],'PNG',None),(a['master'],[1536,2048],'PNG',None)]+[(a['variants'][str(w)],[w,w*4//3],'WEBP',b*1024) for w,b in [(192,45),(384,130),(768,350)]]:
  p=ROOT/path
  with Image.open(p) as im:
   im.load()
   assert list(im.size)==size,(path,im.size)
   assert im.format==fmt and im.mode=='RGB',(path,im.format,im.mode)
   if path!=a['source']: assert im.info.get('icc_profile'),path
  assert budget is None or p.stat().st_size<=budget,(path,p.stat().st_size)
  print(f'{path}: {size[0]}×{size[1]}, {p.stat().st_size/1024:.1f} KiB')
print('PASS: six native sources, six masters and eighteen WebP; catalog and manifests agree.')
