import { useState } from "react";
import { Database, Plus, Search, Trash2, Table2, LayoutDashboard, Settings, Link2, ChevronRight, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type Source = { id:string; name:string; url:string; token?:string; connected?:boolean; status?:string };
type Row = Record<string,string>;

const API = "https://latam-data-manager-api.nyxaria.workers.dev";

function App({ onLogout }: { onLogout: () => void }){
  const [sources,setSources]=useState<Source[]>(()=>JSON.parse(localStorage.getItem("latam-sources")||"[]"));
  const [active,setActive]=useState("dashboard");
  const [q,setQ]=useState("");
  const [rows,setRows]=useState<Row[]>([]);
  const [modal,setModal]=useState(false);
  const [name,setName]=useState("");
  const [url,setUrl]=useState("");
  const [token,setToken]=useState("");
  const [testing,setTesting]=useState(false);
  const [result,setResult]=useState<{ok:boolean;message:string}|null>(null);

  function persist(list:Source[]){ localStorage.setItem("latam-sources",JSON.stringify(list)); setSources(list); }

  async function testConnection(){
    if(!url.trim()){setResult({ok:false,message:"Informe a URL da fonte."});return}
    setTesting(true);setResult(null);
    try{
      const r=await fetch(API+"/api/source/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:url.trim(),token:token.trim()||undefined})});
      const data=await r.json();
      setResult(data.connected?{ok:true,message:"Conexão funcionando."}:{ok:false,message:`A fonte respondeu com status ${data.status||"desconhecido"}.`});
    }catch(e){setResult({ok:false,message:"Não foi possível acessar o backend."});}
    finally{setTesting(false);}
  }

  async function add(){
    if(!name.trim()||!url.trim()){setResult({ok:false,message:"Preencha nome e URL."});return}
    setTesting(true);setResult(null);
    try{
      const r=await fetch(API+"/api/source/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:url.trim(),token:token.trim()||undefined})});
      const data=await r.json();
      if(!data.connected){setResult({ok:false,message:`Não conectou. Status: ${data.status||"erro"}`});return}
      const s={id:crypto.randomUUID(),name:name.trim(),url:url.trim(),token:token.trim()||undefined,connected:true,status:"online"};
      persist([...sources,s]); setActive(s.id); setRows([]);
      setName("");setUrl("");setToken("");setResult(null);setModal(false);
    }catch{setResult({ok:false,message:"Falha ao testar a fonte."});}
    finally{setTesting(false);}
  }

  function remove(id:string){persist(sources.filter(s=>s.id!==id));if(active===id){setActive("dashboard");setRows([])}}
  const current=sources.find(s=>s.id===active);

  return <div className="app">
    <aside>
      <div className="brand"><span>✦</span><b>LATAM</b><small>DATA MANAGER</small></div>
      <button className={active==="dashboard"?"sel":""} onClick={()=>setActive("dashboard")}><LayoutDashboard/>Dashboard</button>
      <div className="label">FONTES</div>
      {sources.map(s=><button className={active===s.id?"sel":""} onClick={()=>setActive(s.id)} key={s.id}><Table2/>{s.name}<ChevronRight className="chev"/></button>)}
      <button onClick={()=>{setResult(null);setModal(true)}} className="connect"><Plus/>Conectar fonte</button>
      <div className="bottom"><button><Settings/>Configurações</button><button onClick={onLogout}>Sair</button></div>
    </aside>
    <main>
      <header>
        <div><h1>{active==="dashboard"?"Dashboard":current?.name||"Fonte"}</h1><p>{active==="dashboard"?"Gerencie suas fontes de dados em um só lugar.":"Fonte conectada via URL + API/Token"}</p></div>
        <div className="actions"><button onClick={()=>{setResult(null);setModal(true)}}><Link2/>Conectar</button></div>
      </header>

      {active==="dashboard" ? <section className="cards">
        <div><Database/><b>{sources.length}</b><span>Fontes conectadas</span></div>
        <div><Table2/><b>{sources.length}</b><span>Fontes disponíveis</span></div>
        <div><Settings/><b>0</b><span>Atividades</span></div>
      </section> :
      <section className="panel">
        <div className="sourcebar">
          <div><strong>{current?.name}</strong><small>{current?.url}</small></div>
          <div className="source-actions"><button onClick={()=>{setResult(null);setModal(true)}}><RefreshCw/> Testar / conectar</button><button className="danger" onClick={()=>remove(active)}><Trash2/> Remover</button></div>
        </div>
        <div className="toolbar">
          <div className="search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Pesquisar registros..."/></div>
          <button onClick={()=>setRows([...rows,{Nome:"Novo registro",Status:"Ativo",Cargo:""}])}><Plus/>Adicionar</button>
        </div>
        {rows.length===0?<div className="empty"><Table2/><h3>Nenhum dado carregado</h3><p>A conexão está cadastrada. O próximo conector vai ler os registros da fonte automaticamente.</p></div>:
        <div className="tablewrap"><table><thead><tr>{Object.keys(rows[0]).map(k=><th key={k}>{k}</th>)}<th/></tr></thead><tbody>{rows.filter(r=>Object.values(r).join(" ").toLowerCase().includes(q.toLowerCase())).map((r,i)=><tr key={i}>{Object.entries(r).map(([k,v])=><td key={k}><input value={v} onChange={e=>{const n=[...rows];n[i]={...n[i],[k]:e.target.value};setRows(n)}}/></td>)}<td><button className="icon" onClick={()=>setRows(rows.filter((_,x)=>x!==i))}><Trash2/></button></td></tr>)}</tbody></table></div>}
      </section>}
      <footer>by Souza</footer>
    </main>

    {modal&&<div className="overlay"><div className="modal">
      <div className="modalhead"><div><h2>Conectar fonte</h2><p>Informe a URL da API/planilha e, se necessário, uma API Key ou Bearer Token.</p></div><button className="close" onClick={()=>setModal(false)}>×</button></div>
      <label>Nome<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Membros"/></label>
      <label>URL da fonte<input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://api.exemplo.com/data"/></label>
      <label>API Key / Token <span>(opcional)</span><input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder="Cole sua chave ou token"/></label>
      {result&&<div className={result.ok?"result ok":"result error"}>{result.ok?<CheckCircle2/>:<XCircle/>}{result.message}</div>}
      <div className="modalactions"><button onClick={()=>setModal(false)}>Cancelar</button><button onClick={testConnection} disabled={testing}>{testing?"Testando...":"Testar conexão"}</button><button className="primary" onClick={add} disabled={testing}>{testing?"Aguarde...":"Conectar"}</button></div>
    </div></div>}
  </div>
}

export default App;
