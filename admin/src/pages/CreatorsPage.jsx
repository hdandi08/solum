import { useState, useEffect, useCallback, Fragment } from 'react'
import { useEnv } from '../context/EnvContext'

const STAGES = ['candidate', 'applied', 'vetting', 'contacted', 'in_talks', 'active', 'declined', 'archived']
const NICHES = ['grooming', 'fitness', 'everyday', 'lifestyle']
const DEALS = ['ugc', 'affiliate', 'paid']
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'

const EMPTY = { name: '', email: '', instagram_handle: '', tiktok_handle: '', niches: [], deal_types: [], follower_count: '', location: '', portfolio_url: '', aesthetic_score: '', notes: '' }

export default function CreatorsPage() {
  const { config } = useEnv()
  const [rows, setRows] = useState([])
  const [emails, setEmails] = useState({})   // creator_id -> [creator_emails]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [openId, setOpenId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data, error } = await config.client.from('creators').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setRows(data || [])
      const { data: em } = await config.client.from('creator_emails').select('*').order('sent_at', { ascending: true })
      const by = {}; for (const e of em || []) (by[e.creator_id] ||= []).push(e); setEmails(by)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, [config])

  useEffect(() => { load() }, [load])

  const toggle = (field, val) => setForm(f => ({ ...f, [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val] }))

  async function addCreator(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        email: form.email.trim(),
        follower_count: form.follower_count ? Number(form.follower_count) : null,
        aesthetic_score: form.aesthetic_score ? Number(form.aesthetic_score) : null,
        stage: 'contacted', source: 'manual', sequence_status: 'active', sequence_step: 0,
        next_email_at: new Date().toISOString(),
      }
      const { error } = await config.client.from('creators').insert(payload)
      if (error) throw error
      // Fire the Day-0 email immediately (same function the daily cron uses).
      const response = await fetch(`${config.url}/functions/v1/creator-outreach-run`, {
        method: 'POST', headers: { 'apikey': config.anonKey, 'Content-Type': 'application/json' }, body: '{}',
      })
      if (!response.ok) setError('Creator added. Intro email will send on the next scheduled run.')
      setForm(EMPTY); await load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  async function setStage(id, stage) {
    const patch = { stage, updated_at: new Date().toISOString() }
    if (['in_talks', 'active', 'declined', 'archived'].includes(stage)) patch.sequence_status = 'stopped'
    await config.client.from('creators').update(patch).eq('id', id)
    await load()
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Creators</h1>
      {error && <p style={{ color: '#e57373' }}>{error}</p>}

      <form onSubmit={addCreator} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24, maxWidth: 900 }}>
        <input required placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <input placeholder="Instagram @" value={form.instagram_handle} onChange={e => setForm(f => ({ ...f, instagram_handle: e.target.value }))} />
        <input placeholder="TikTok @" value={form.tiktok_handle} onChange={e => setForm(f => ({ ...f, tiktok_handle: e.target.value }))} />
        <input placeholder="Followers" value={form.follower_count} onChange={e => setForm(f => ({ ...f, follower_count: e.target.value }))} />
        <input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
        <input placeholder="Portfolio URL" value={form.portfolio_url} onChange={e => setForm(f => ({ ...f, portfolio_url: e.target.value }))} />
        <input placeholder="Aesthetic 1-5" value={form.aesthetic_score} onChange={e => setForm(f => ({ ...f, aesthetic_score: e.target.value }))} />
        <div style={{ gridColumn: '1 / -1', fontSize: 12 }}>Niches: {NICHES.map(n => <label key={n} style={{ marginRight: 10 }}><input type="checkbox" checked={form.niches.includes(n)} onChange={() => toggle('niches', n)} /> {n}</label>)}</div>
        <div style={{ gridColumn: '1 / -1', fontSize: 12 }}>Deals: {DEALS.map(d => <label key={d} style={{ marginRight: 10 }}><input type="checkbox" checked={form.deal_types.includes(d)} onChange={() => toggle('deal_types', d)} /> {d}</label>)}</div>
        <textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
        <button disabled={saving} type="submit" style={{ gridColumn: '1 / -1', padding: '10px' }}>{saving ? 'Adding + sending intro…' : 'Add creator (sends intro now)'}</button>
      </form>

      {loading ? <p>Loading…</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr><th align="left">Email</th><th align="left">Handles</th><th align="left">Stage</th><th align="left">Sequence</th><th align="left">Last email</th></tr></thead>
          <tbody>
            {rows.map(c => {
              const em = emails[c.id] || []
              const last = em[em.length - 1]
              return (
                <Fragment key={c.id}>
                  <tr style={{ borderTop: '1px solid #222', cursor: 'pointer' }} onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                    <td>{c.email}{c.unsubscribed && <span style={{ color: '#e57373' }}> · unsub</span>}</td>
                    <td>{c.instagram_handle || ''} {c.tiktok_handle || ''}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <select value={c.stage} onChange={e => setStage(c.id, e.target.value)}>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </td>
                    <td>{c.sequence_status} · {c.sequence_step}/3</td>
                    <td>{last ? `${last.template_key} ${fmt(last.sent_at)}${last.opened_at ? ' · opened' : ''}${last.clicked_at ? ' · clicked' : ''}` : '—'}</td>
                  </tr>
                  {openId === c.id && (
                    <tr><td colSpan={5} style={{ background: '#101216', padding: 12 }}>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>Niches: {c.niches?.join(', ') || '—'} · Deals: {c.deal_types?.join(', ') || '—'} · Followers: {c.follower_count ?? '—'} · Aesthetic: {c.aesthetic_score ?? '—'} · {c.location || '—'}</div>
                      {c.portfolio_url && <div style={{ fontSize: 12 }}><a href={c.portfolio_url} target="_blank" rel="noreferrer" style={{ color: '#4A8FC7' }}>{c.portfolio_url}</a></div>}
                      {c.notes && <div style={{ fontSize: 12, marginTop: 4 }}>{c.notes}</div>}
                      <div style={{ marginTop: 8, fontSize: 12 }}>
                        {em.length === 0 ? 'No emails sent yet.' : em.map(e => (
                          <div key={e.id}>{e.step}. {e.template_key} · sent {fmt(e.sent_at)}{e.delivered_at ? ' · delivered' : ''}{e.opened_at ? ` · opened ${e.open_count}x` : ''}{e.clicked_at ? ` · clicked ${e.click_count}x` : ''}{e.bounced_at ? ' · bounced' : ''}</div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
