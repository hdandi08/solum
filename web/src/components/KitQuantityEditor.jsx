import { useState } from 'react';
import { changeKitQuantity, kitOrder, kitStockError, KIT_UNIT_PENCE, MAX_KIT_QUANTITY } from '../lib/kitOrder.js';
import './KitQuantityEditor.css';

export function KitQuantityControl({ kitId, quantity, disabled = false, canDecrease, canIncrease, onChange }) {
  return <div className="kit-quantity-controls">
    <button type="button" aria-label={`Decrease ${kitId.toUpperCase()} quantity`} disabled={disabled || !canDecrease} onClick={() => onChange(kitId, -1)}>−</button>
    <output aria-label={`${kitId.toUpperCase()} quantity`} aria-live="polite">{quantity}</output>
    <button type="button" aria-label={`Increase ${kitId.toUpperCase()} quantity`} disabled={disabled || !canIncrease} onClick={() => onChange(kitId, 1)}>+</button>
  </div>;
}

export function KitOrderLines({ order, controls }) {
  return <div className="kit-order-lines">
    {order.items.map(item => <div className={`kit-order-line${controls ? ' kit-order-line-editable' : ''}`} key={item.kit_id}>
      <div><strong>{item.kit_id.toUpperCase()}</strong>{controls && <small>£{item.unit_amount_pence / 100} each</small>}</div>
      {controls ? <KitQuantityControl kitId={item.kit_id} quantity={item.quantity} disabled={controls.disabled} canDecrease={controls.canChange(item.kit_id,-1)} canIncrease={controls.canChange(item.kit_id,1)} onChange={controls.onChange} /> : <span>{item.quantity} × £{item.unit_amount_pence / 100}</span>}
      <strong>£{item.line_amount_pence / 100}</strong>
    </div>)}
    {order.totalQuantity > 1 && <p className="kit-parcel-note">Your {order.totalQuantity} kits will be sent in separate parcels.</p>}
  </div>;
}

export default function KitQuantityEditor({ items, inventory, busy = false, onApply, onCancel }) {
  const [draft, setDraft] = useState(items);
  const [error, setError] = useState('');
  const order = kitOrder(draft);
  const stockError = kitStockError(draft, inventory);
  const canChange = (id, delta) => JSON.stringify(changeKitQuantity(draft, id, delta, inventory)) !== JSON.stringify(draft);
  async function apply() {
    setError('');
    try { await onApply(draft); } catch (cause) { setError(cause.message || 'We could not update your order. Please try again.'); }
  }
  return <section className="kit-quantity-editor" aria-label="Kit quantities" data-testid="kit-quantity-editor">
    <h2>Your kits</h2>
    <p>Choose up to {MAX_KIT_QUANTITY} kits. One delivery address, free UK delivery.</p>
    {order.items.map(item => <div className="kit-quantity-row" key={item.kit_id}>
      <div><strong>{item.kit_id.toUpperCase()}</strong><span>£{KIT_UNIT_PENCE[item.kit_id] / 100} each{Number.isFinite(inventory?.[item.kit_id]?.count) && inventory[item.kit_id].count <= MAX_KIT_QUANTITY ? ` · ${inventory[item.kit_id].count} available` : ''}</span></div>
      <KitQuantityControl kitId={item.kit_id} quantity={item.quantity} disabled={busy} canDecrease={canChange(item.kit_id,-1)} canIncrease={canChange(item.kit_id,1)} onChange={(id,delta) => setDraft(changeKitQuantity(draft,id,delta,inventory))} />
    </div>)}
    {Object.keys(KIT_UNIT_PENCE).filter(id => !draft.some(item => item.kit_id === id)).map(id => <button type="button" className="kit-order-link" key={id} disabled={busy || !canChange(id, 1)} onClick={() => setDraft(changeKitQuantity(draft, id, 1, inventory))}>Add {id.toUpperCase()} kit · £{KIT_UNIT_PENCE[id] / 100}</button>)}
    <p className="kit-quantity-limit" role="status">{stockError || (order.totalQuantity === MAX_KIT_QUANTITY ? 'Maximum 5 kits per order.' : 'Quantities are subject to availability.')}</p>
    <div className="kit-order-total"><span>Total</span><strong>£{order.amountPence / 100}</strong></div>
    {error && <p className="co-error" role="alert">{error}</p>}
    <div className="kit-quantity-actions">
      <button type="button" className="co-submit" disabled={busy || !!stockError} onClick={apply}>Update order</button>
      <button type="button" className="kit-order-link" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </section>;
}
