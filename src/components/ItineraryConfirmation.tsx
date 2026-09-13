import { useEffect, useRef } from 'react';
export function ItineraryConfirmation({title,description,confirmLabel,cancelLabel='取消',onConfirm,onCancel}:{title:string;description:string;confirmLabel:string;cancelLabel?:string;onConfirm:()=>void;onCancel:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current!;const previous=document.activeElement;dialog.showModal();return()=>{dialog.close();if(previous instanceof HTMLElement)previous.focus();};},[]);
  return <dialog className="itinerary-dialog" ref={ref} aria-labelledby="itinerary-confirm-title" aria-describedby="itinerary-confirm-description" onCancel={e=>{e.preventDefault();onCancel();}}><h2 id="itinerary-confirm-title">{title}</h2><p id="itinerary-confirm-description">{description}</p><div><button autoFocus type="button" className="secondary-button" onClick={onCancel}>{cancelLabel}</button><button type="button" className="primary-button" onClick={onConfirm}>{confirmLabel}</button></div></dialog>;
}
