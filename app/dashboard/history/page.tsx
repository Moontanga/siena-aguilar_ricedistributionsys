'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, ArrowLeft, History } from 'lucide-react';

type AuditRow = { id:string; action:string; entityType:string; entityId:string|null; createdAt:string; details:any; actor:{username:string;name:string;role:string} };
const pretty = (value:any) => JSON.stringify(value, null, 2);
export default function DataChangeHistoryPage() {
  const [rows,setRows] = useState<AuditRow[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [filter,setFilter] = useState('all');
  async function load() {
    setLoading(true); setError('');
    try {
      const url = filter==='all' ? '/api/audit-logs?limit=300' : '/api/audit-logs?limit=300&entityType='+encodeURIComponent(filter);
      const response = await fetch(url,{cache:'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load history.');
      setRows(data.history || []);
    } catch (e:any) { setError(e.message || 'Unable to load history.'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ void load(); },[filter]);
  return <main style={{maxWidth:1200,margin:'0 auto',padding:'24px 16px',color:'var(--foreground,#202020)'}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',marginBottom:20}}>
      <div><Link href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:6,marginBottom:12}}><ArrowLeft size={16}/> Back to dashboard</Link><h1 style={{fontSize:26,fontWeight:750,margin:0,display:'flex',alignItems:'center',gap:10}}><History/> Data Change History</h1><p style={{opacity:.75,marginTop:6}}>Account attribution, timestamps, and recorded before/after values for business changes.</p></div>
      <button onClick={()=>void load()} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #999',display:'inline-flex',alignItems:'center',gap:8}}><RefreshCw size={16}/> Refresh</button>
    </div>
    <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:16,flexWrap:'wrap'}}><label htmlFor="entity-filter">Record type</label><select id="entity-filter" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:'9px 12px',borderRadius:8,border:'1px solid #999',background:'transparent'}}><option value="all">All changes</option><option value="sale">Sales</option><option value="purchase">Purchases</option><option value="payment">Payments</option><option value="product">Rice inventory</option><option value="expense">Expenses</option><option value="user">User accounts</option></select><span style={{opacity:.7}}>{rows.length} records shown (up to 300)</span></div>
    {loading && <p>Loading history…</p>}{error && <p role="alert" style={{padding:12,border:'1px solid #c44',borderRadius:8}}>{error}</p>}
    {!loading && !error && rows.length===0 && <p>No audit records found for this filter.</p>}
    <div style={{display:'grid',gap:12}}>{rows.map(row=><article key={row.id} style={{border:'1px solid #9995',borderRadius:12,padding:16,boxShadow:'0 3px 10px #0000000a'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><div><strong>{row.action.replaceAll('_',' ').toUpperCase()}</strong> · {row.entityType}{row.entityId ? <span style={{opacity:.7}}> · {row.entityId}</span>:null}<div style={{marginTop:6}}>By <strong>{row.actor.username}</strong>{row.actor.name ? ' ('+row.actor.name+')' : ''} · Role: <strong>{row.actor.role}</strong></div></div><time dateTime={row.createdAt} style={{opacity:.75}}>{new Date(row.createdAt).toLocaleString()}</time></div>
      <details style={{marginTop:12}}><summary style={{cursor:'pointer',fontWeight:600}}>View recorded details / before and after</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,padding:12,borderRadius:8,background:'var(--secondary,#f5f5f5)',marginTop:8}}>{pretty(row.details)}</pre></details>
    </article>)}</div>
  </main>;
}
