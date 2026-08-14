// ============================================================================
//  src/lib/imageTools.js   (panoul de admin)
// ----------------------------------------------------------------------------
//  Procesare de imagini ÎN BROWSER, înainte de upload.
//
//  De ce contează: un dealer îți trimite un banner de 6MB făcut cu telefonul.
//  Fără compresie locală, urcarea prin 4G durează un minut cu o bară care pare
//  blocată, iar serverul primește degeaba 6MB pe care oricum îi redimensionează
//  la 1920px. Cu compresie: ~250KB și câteva secunde.
//
//  Toate funcțiile lucrează pe canvas, fără nicio dependență.
// ============================================================================

/** Încarcă un File într-un HTMLImageElement, cu curățarea object URL-ului. */
export const fileToImage = (file) =>
    new Promise((resolve, reject) => {
        if (!(file instanceof Blob)) return reject(new Error('Fișier invalid.'));
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(Object.assign(img, { __objectUrl: url }));
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fișierul nu este o imagine validă.')); };
        img.src = url;
    });

export const releaseImage = (img) => {
    if (img?.__objectUrl) URL.revokeObjectURL(img.__objectUrl);
};

const canvasToBlob = (canvas, quality) =>
    new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Nu am putut genera imaginea.'))),
            'image/jpeg',
            quality
        );
    });

/**
 * Redimensionează și comprimă o imagine păstrând proporțiile.
 * Folosit pentru logo (fără decupare) și ca pas final după decupare.
 *
 * `imageSmoothingQuality: 'high'` nu e cosmetic: la reduceri mari, algoritmul
 * implicit produce artefacte vizibile pe muchii, iar un logo cu text devine
 * ilizibil.
 */
export const compressImage = async (file, { maxW = 1600, maxH = 1600, quality = 0.85 } = {}) => {
    const img = await fileToImage(file);
    try {
        const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const w = Math.round(img.naturalWidth * ratio);
        const h = Math.round(img.naturalHeight * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fundal alb: JPEG nu are canal alfa, iar fără asta transparența devine
        // NEAGRĂ. Un logo PNG cu fundal transparent ar ieși pe fond negru.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const blob = await canvasToBlob(canvas, quality);
        return new File([blob], renameToJpg(file.name), { type: 'image/jpeg' });
    } finally {
        releaseImage(img);
    }
};

/**
 * Decupează o zonă din imagine și o exportă la dimensiunea țintă.
 * @param {HTMLImageElement} img
 * @param {{sx:number, sy:number, sw:number, sh:number}} rect  în pixeli sursă
 */
export const cropToFile = async (img, rect, { outW, outH, quality = 0.85, name = 'banner.jpg' } = {}) => {
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, outW, outH);

    const blob = await canvasToBlob(canvas, quality);
    return new File([blob], renameToJpg(name), { type: 'image/jpeg' });
};

const renameToJpg = (name) => String(name || 'imagine').replace(/\.[^.]+$/, '') + '.jpg';

export const formatBytes = (n) => {
    if (!Number.isFinite(n)) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Extrage coordonatele dintr-un link Google Maps.
 *
 * Scutește de căutarea manuală a lat/lng: deschizi parcul în Maps, dai
 * „Distribuie", lipești linkul aici. Acoperă cele trei forme uzuale:
 *   .../@44.3302,23.7949,17z
 *   ...!3d44.3302!4d23.7949
 *   ...?q=44.3302,23.7949
 *
 * Linkurile scurtate (maps.app.goo.gl) NU conțin coordonate — trebuie
 * deschise întâi în browser, apoi copiat linkul complet din bara de adrese.
 */
export const parseMapsUrl = (input) => {
    const s = String(input || '');
    let m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    m = s.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    m = s.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    // Perechea simplă „44.3302, 23.7949", lipită direct.
    m = s.trim().match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };

    return null;
};

export default { fileToImage, releaseImage, compressImage, cropToFile, formatBytes, parseMapsUrl };
