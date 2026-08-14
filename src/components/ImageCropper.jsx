import { useState, useRef, useEffect, useCallback } from 'react';
import { fileToImage, releaseImage, cropToFile, formatBytes } from '../lib/imageTools';

// ============================================================================
//  src/components/ImageCropper.jsx
// ----------------------------------------------------------------------------
//  Decupare cu RAPORT FIX. Dealerul (sau tu) muți și mărești imaginea în
//  interiorul unui cadru; nu poți salva altceva decât cadrul.
//
//  De ce raport fix și nu decupare liberă: pentru că atunci nu POATE ieși
//  prost. Cu decupare liberă primești bannere pătrate, verticale, cu subiectul
//  tăiat — și fiecare site nou ar cere 20 de minute de corecturi manuale.
//
//  Folosește Pointer Events, deci merge identic cu mouse-ul și pe touch, fără
//  cod separat. Zoom-ul e pe slider, nu pinch: pe un panou de admin folosit
//  majoritar pe desktop, sliderul e mai precis și nu se ceartă cu scroll-ul
//  paginii.
//
//  Dacă vreodată devine incomod (mai ales în panoul dealerului, Batch 8),
//  `react-easy-crop` (MIT) e un înlocuitor direct cu aceeași interfață de date.
// ============================================================================

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function ImageCropper({
    file,
    aspect = 3,           // 3:1 pentru banner, 1 pentru logo
    outW = 1920,
    outH = 640,
    label = 'Ajustează încadrarea',
    onCancel,
    onDone,
}) {
    const [img, setImg] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [frame, setFrame] = useState({ w: 0, h: 0 });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const frameRef = useRef(null);
    const drag = useRef(null);

    // ── Încărcare ───────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        let loaded = null;
        setError(null);
        fileToImage(file)
            .then((i) => {
                if (cancelled) { releaseImage(i); return; }
                loaded = i;
                setImg(i);
                setZoom(1);
                setOffset({ x: 0, y: 0 });
            })
            .catch((e) => !cancelled && setError(e.message));
        return () => { cancelled = true; if (loaded) releaseImage(loaded); };
    }, [file]);

    // ── Măsurarea cadrului ──────────────────────────────────────────────────
    useEffect(() => {
        const measure = () => {
            const el = frameRef.current;
            if (!el) return;
            const w = el.clientWidth;
            setFrame({ w, h: Math.round(w / aspect) });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [aspect, img]);

    // Scara de bază acoperă complet cadrul (echivalentul lui object-fit: cover).
    const baseScale = img && frame.w
        ? Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight)
        : 1;
    const scale = baseScale * zoom;
    const dispW = img ? img.naturalWidth * scale : 0;
    const dispH = img ? img.naturalHeight * scale : 0;

    // Limitele de deplasare: imaginea nu poate lăsa niciodată margini goale.
    const clampOffset = useCallback((o) => ({
        x: clamp(o.x, Math.min(0, frame.w - dispW), 0),
        y: clamp(o.y, Math.min(0, frame.h - dispH), 0),
    }), [frame.w, frame.h, dispW, dispH]);

    useEffect(() => { setOffset((o) => clampOffset(o)); }, [clampOffset]);

    // ── Deplasare ───────────────────────────────────────────────────────────
    const onPointerDown = (e) => {
        if (!img) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
    };
    const onPointerMove = (e) => {
        if (!drag.current) return;
        const d = drag.current;
        setOffset(clampOffset({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
    };
    const onPointerUp = (e) => {
        drag.current = null;
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* deja eliberat */ }
    };

    // ── Zoom centrat pe mijlocul cadrului ───────────────────────────────────
    // Fără corecția de offset, mărirea ar „fugi" spre colțul stânga-sus și
    // ai pierde subiectul din cadru la fiecare ajustare.
    const onZoomChange = (nz) => {
        if (!img) return;
        const prevScale = baseScale * zoom;
        const nextScale = baseScale * nz;
        const cx = frame.w / 2, cy = frame.h / 2;
        const ix = (cx - offset.x) / prevScale;
        const iy = (cy - offset.y) / prevScale;
        setZoom(nz);
        setOffset(clampOffset({ x: cx - ix * nextScale, y: cy - iy * nextScale }));
    };

    // ── Export ──────────────────────────────────────────────────────────────
    const handleDone = async () => {
        if (!img || busy) return;
        setBusy(true);
        try {
            const rect = {
                sx: -offset.x / scale,
                sy: -offset.y / scale,
                sw: frame.w / scale,
                sh: frame.h / scale,
            };
            const out = await cropToFile(img, rect, { outW, outH, quality: 0.85, name: file.name });
            onDone(out);
        } catch (e) {
            setError(e.message || 'Nu am putut genera imaginea.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="popup-overlay" onClick={onCancel}>
            <div className="cropper" onClick={(e) => e.stopPropagation()}>
                <div className="cropper-head">
                    <strong>{label}</strong>
                    <span className="cropper-hint">Trage pentru a muta · slider pentru zoom</span>
                </div>

                {error && <p className="cropper-error">{error}</p>}

                <div
                    ref={frameRef}
                    className="cropper-frame"
                    style={{ height: frame.h || 160 }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {img && (
                        <img
                            src={img.src}
                            alt=""
                            draggable={false}
                            style={{
                                width: dispW,
                                height: dispH,
                                transform: `translate(${offset.x}px, ${offset.y}px)`,
                            }}
                        />
                    )}
                    {/* Suprapunerea arată exact ce va acoperi textul pe site,
                        ca să nu alegi o încadrare unde titlul devine ilizibil. */}
                    <div className="cropper-scrim" />
                </div>

                <div className="cropper-zoom">
                    <span>Zoom</span>
                    <input
                        type="range" min="1" max="3" step="0.02" value={zoom}
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                    />
                    <span className="cropper-zoom-val">{zoom.toFixed(2)}×</span>
                </div>

                <div className="cropper-meta">
                    {img
                        ? <>Sursă {img.naturalWidth}×{img.naturalHeight} · {formatBytes(file.size)} → rezultat {outW}×{outH}</>
                        : 'Se încarcă...'}
                </div>

                <div className="popup-actions">
                    <button className="confirm-btn" onClick={handleDone} disabled={!img || busy}>
                        {busy ? 'Se procesează...' : 'Folosește imaginea'}
                    </button>
                    <button className="cancel-btn" onClick={onCancel} disabled={busy}>Renunță</button>
                </div>
            </div>
        </div>
    );
}
