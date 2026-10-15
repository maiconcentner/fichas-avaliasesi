import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import fit_templates as F
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'templates.json')
T = json.load(open(p))
F.fit(T)
json.dump(T, open(p, 'w'), ensure_ascii=False)
print('ok')
