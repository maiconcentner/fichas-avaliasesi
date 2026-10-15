import sys,time; sys.path.insert(0,'/home/claude/fichas/tool')
from extract_year import *
t=time.time()
a=parse_all('/mnt/user-data/uploads/Plano_de_estudos/CE_026_Jau','/home/claude/fichas/tool/data/alunos_oficiais.json')
print(len(a),'alunos',round(time.time()-t),'s')
