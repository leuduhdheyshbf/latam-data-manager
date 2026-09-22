import { useState } from "react";
import { Database, Plus, Search, Trash2, Table2, LayoutDashboard, Settings, Link2, ChevronRight, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type Source = { id:string; name:string; url:string; token?:string; connected?:boolean; status?:string };
type Row = Record<string,string>;

const API = "https://latam-data-manager-api.nyxaria.workers.dev";

function App({ onLogout }: { onLogout: () => void }){
  type TableDef = { id:string; name:string; columns:string[]; rows:Row[] };
  const [sources,setSources]=useState<Source[]>(()=>JSON.parse(localStorage.getItem("latam-sources")||"[]"));
  const [tables,setTables]=useState<TableDef[]>(()=>JSON.parse(localStorage.getItem("latam-tables")||"[]"));
  const [active,setActive]=useState("dashboard");
  const [q,setQ]=useState("");
  const [modal,setModal]=useState<"source"|"table"|null>(null);
  const [name,setName]=useState(""); const [columns,setColumns]=useState("Nome, Status, Cargo");
  const [url,setUrl]=useState(""); const [token,setToken]=useState("");
  const [testing,setTesting]=useState(false); const [result,setResult]=useState<{ok:boolean;message:string}|null>(null);

  function persistSources(list:Source[]){localStorage.setItem("latam-sources",JSON.stringify(list));setSources(list)}
  function persistTables(list:TableDef[]){localStorage.setItem("latam-tables",JSON.stringify(list));setTables(list)}
  const currentTable=tables.find(t=>t.id===active);
  const currentSource=sources.find(s=>s.id===active);

  async function testConnection(){
    if(!url.trim()){setResult({ok:false,message:"Informe a URL da fonte."});return}
    setTesting(true);setResult(null);
    try{
      const r=await fetch(API+"/api/source/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:url.trim(),token:token.trim()||undefined})});
      const data=await r.json();
      setResult(data.connected?{ok:true,message:"Conexão funcionando."}:{ok:false,message:"A fonte respondeu com status "+(data.status||"desconhecido")});
    }catch{setResult({ok:false,message:"Não foi possível acessar o backend."})}finally{setTesting(false)}
  }
  async function addSource(){
    if(!name.trim()||!url.trim()){setResult({ok:false,message:"Preencha nome e URL."});return}
    setTesting(true);setResult(null);
    try{
      const r=await fetch(API+"/api/source/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:url.trim(),token:token.trim()||undefined})});
      const data=await r.json(); if(!data.connected){setResult({ok:false,message:"Não conectou. Status: "+(data.status||"erro")});return}
      const s={id:crypto.randomUUID(),name:name.trim(),url:url.trim(),token:token.trim()||undefined,connected:true,status:"online"};
      persistSources([...sources,s]);setActive(s.id);resetModal();setModal(null);
    }catch{setResult({ok:false,message:"Falha ao testar a fonte."})}finally{setTesting(false)}
  }
  function addTable(){
    const cols=columns.split(",").map(x=>x.trim()).filter(Boolean);
    if(!name.trim())return setResult({ok:false,message:"Informe o nome da tabela."});
    if(!cols.length)return setResult({ok:false,message:"Adicione pelo menos uma coluna."});
    const t={id:crypto.randomUUID(),name:name.trim(),columns:[...new Set(cols)],rows:[]};
    persistTables([...tables,t]);setActive(t.id);resetModal();setModal(null);
  }
  function resetModal(){setName("");setColumns("Nome, Status, Cargo");setUrl("");setToken("");setResult(null)}
  function removeTable(id:string){persistTables(tables.filter(t=>t.id!==id));if(active===id)setActive("dashboard")}
  function updateTable(t:TableDef){persistTables(tables.map(x=>x.id===t.id?t:x))}
  function addRow(t:TableDef){
    const row:Row={};t.columns.forEach(c=>row[c]="");
    updateTable({...t,rows:[...t.rows,row]})
  }
  function removeRow(t:TableDef,i:number){updateTable({...t,rows:t.rows.filter((_,x)=>x!==i)})}
  function editCell(t:TableDef,i:number,col:string,value:string){
    const rows=t.rows.map((r,x)=>x===i?{...r,[col]:value}:r);updateTable({...t,rows})
  }

  return <div className="app">
    <aside>
      <div className="brand"><span>✦</span><b>LATAM</b><small>DATA MANAGER</small></div>
      <button className={active==="dashboard"?"sel":""} onClick={()=>setActive("dashboard")}><LayoutDashboard/>Dashboard</button>
      <div className="label">TABELAS</div>
      {tables.map(t=><button className={active===t.id?"sel":""} onClick={()=>{setActive(t.id);setQ("")}} key={t.id}><Table2/>{t.name}<ChevronRight className="chev"/></button>)}
      <button onClick={()=>{resetModal();setModal("table")}} className="connect"><Plus/>Nova tabela</button>
      <div className="label source-label">FONTES</div>
      {sources.map(s=><button className={active===s.id?"sel":""} onClick={()=>setActive(s.id)} key={s.id}><Link2/>{s.name}<ChevronRight className="chev"/></button>)}
      <button onClick={()=>{resetModal();setModal("source")}}><Plus/>Conectar fonte</button>
      <div className="bottom"><button><Settings/>Configurações</button><button onClick={onLogout}>Sair</button></div>
    </aside>
    <main>
      <header>
        <div><h1>{active==="dashboard"?"Dashboard":currentTable?.name||currentSource?.name||"Fonte"}</h1><p>{active==="dashboard"?"Gerencie suas tabelas e fontes de dados.":currentTable?"Tabela de dados": "Fonte conectada via URL + API/Token"}</p></div>
        <div className="actions"><button onClick={()=>{resetModal();setModal("table")}}><Plus/>Nova tabela</button></div>
      </header>

      {active==="dashboard" ? <section className="cards">
        <div><Table2/><b>{tables.length}</b><span>Tabelas</span></div>
        <div><Database/><b>{sources.length}</b><span>Fontes conectadas</span></div>
        <div><Settings/><b>{tables.reduce((n,t)=>n+t.rows.length,0)}</b><span>Registros</span></div>
      </section> :
      currentTable ? <section className="panel">
        <div className="sourcebar">
          <div><strong>{currentTable.name}</strong><small>{currentTable.columns.length} colunas · {currentTable.rows.length} registros</small></div>
          <div className="source-actions"><button onClick={()=>addRow(currentTable)}><Plus/> Adicionar registro</button><button className="danger" onClick={()=>removeTable(currentTable.id)}><Trash2/> Excluir tabela</button></div>
        </div>
        <div className="toolbar">
          <div className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar registros..."/></div>
        </div>
        {currentTable.rows.length===0?<div className="empty"><Table2/><h3>Tabela vazia</h3><p>Adicione um registro para começar a preencher esta tabela.</p><button className="primary" onClick={()=>addRow(currentTable)}><Plus/>Adicionar registro</button></div>:
        <div className="tablewrap"><table><thead><tr>{currentTable.columns.map(k=><th key={k}>{k}</th>)}<th>Ações</th></tr></thead><tbody>
          {currentTable.rows.map((r,i)=>Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase())?<tr key={i}>{currentTable.columns.map(k=><td key={k}><input value={r[k]||""} onChange={e=>editCell(currentTable,i,k,e.target.value)} /></td>)}<td><button className="icon" onClick={()=>removeRow(currentTable,i)}><Trash2/></button></td></tr>:null)}
        </tbody></table></div>}
      </section> :
      currentSource ? <section className="panel"><div className="sourcebar"><div><strong>{currentSource.name}</strong><small>{currentSource.url}</small></div><div className="source-actions"><button onClick={()=>{resetModal();setModal("source")}}><RefreshCw/> Testar / conectar</button></div></div><div className="empty"><Table2/><h3>Fonte conectada</h3><p>O conector de leitura será ligado a esta fonte em seguida.</p></div></section>:null}
      <footer>by Souza</footer>
    </main>

    {modal&&<div className="overlay"><div className="modal">
      <div className="modalhead"><div><h2>{modal==="table"?"Nova tabela":"Conectar fonte"}</h2><p>{modal==="table"?"Crie uma tabela com as colunas que você quiser.":"Informe a URL da API/planilha e, se necessário, uma API Key ou Bearer Token."}</p></div><button className="close" onClick={()=>setModal(null)}>×</button></div>
      {modal==="table"?<>
        <label>Nome da tabela<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Membros"/></label>
        <label>Colunas <span>(separadas por vírgula)</span><input value={columns} onChange={e=>setColumns(e.target.value)} placeholder="Nome, ID, Status, Cargo"/></label>
      </>:<>
        <label>Nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Recrutamentos"/></label>
        <label>URL da fonte<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://api.exemplo.com/data"/></label>
        <label>API Key / Token <span>(opcional)</span><input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Cole sua chave ou token"/></label>
        {result&&<div className={result.ok?"result ok":"result error"}>{result.ok?<CheckCircle2/>:<XCircle/>}{result.message}</div>}
      </>}
      <div className="modalactions"><button onClick={()=>setModal(null)}>Cancelar</button>{modal==="source"&&<button onClick={testConnection} disabled={testing}>{testing?"Testando...":"Testar conexão"}</button>}<button className="primary" onClick={modal==="table"?addTable:addSource} disabled={testing}>{modal==="table"?"Criar tabela":testing?"Aguarde...":"Conectar"}</button></div>
    </div></div>}
  </div>
}

export default App;
