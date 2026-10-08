const express = require('express');
const compression = require('compression'); // Tambahin ini
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

app.use(compression());
// Simpan cache file statis selama 1 hari di browser user
app.use(express.static('public', { maxAge: '1d' }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
let cachedSurahs = null;

// Fungsi helper buat ngambil daftar surah (pakai cache)
async function getSurahList() {
    if (cachedSurahs) return cachedSurahs;
    const response = await axios.get('https://equran.id/api/v2/surat');
    cachedSurahs = response.data.data;
    return cachedSurahs;
}

// Fungsi helper buat bikin slug
function createSlug(namaLatin) {
    return namaLatin.toLowerCase().replace(/['\s]+/g, '-').replace(/[^a-z0-9-]/g, '');
}
// 1. Endpoint Beranda (List Surah)
app.get('/', async (req, res) => {
    try {
        const response = await axios.get('https://equran.id/api/v2/surat');
        const surahs = response.data.data;
        res.render('index', { surahs, path: '/' });
    } catch (error) {
        res.status(500).send('Gagal mengambil data dari API.');
    }
});
app.get('/sitemap.xml', async (req, res) => {
    try {
        // Panggil getSurahList() yang udah pakai sistem cache di memori biar enteng
        const surahs = await getSurahList(); 
        
        // PENTING: Ganti dengan domain asli lo nanti pas udah online (pakai https)
        const baseUrl = 'https://quraan.web.id'; 

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // URL Halaman Statis
        xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
        xml += `  <url>\n    <loc>${baseUrl}/bookmark</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
        xml += `  <url>\n    <loc>${baseUrl}/history</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
        xml += `  <url>\n    <loc>${baseUrl}/donate</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.3</priority>\n  </url>\n`;

        // URL 114 Surah (Menggunakan URL Slug Final, bukan ID Angka)
        surahs.forEach(surah => {
            const slug = createSlug(surah.namaLatin); // Fungsi createSlug dari update sebelumnya
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/surah/${slug}</loc>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;
        });

        xml += '</urlset>';

        // Set response header jadi XML biar Google ngebacanya sebagai sitemap
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error(error);
        res.status(500).send('Gagal membuat sitemap.');
    }
});

app.get('/surah/:identifier', async (req, res) => {
    try {
        const identifier = req.params.identifier.toLowerCase();
        const allSurahs = await getSurahList(); // Ambil dari cache, bukan dari API terus-terusan
        const baseUrl = 'http://localhost:3000'; // Ganti pakai domain asli lo nanti

        if (!isNaN(identifier)) {
            const nomor = parseInt(identifier);
            const matchedSurah = allSurahs.find(s => s.nomor === nomor);

            if (!matchedSurah) return res.status(404).render('404', { title: 'Surah Tidak Ditemukan' });

            const slug = createSlug(matchedSurah.namaLatin);
            // 301 Permanent Redirect ke URL SEO (Slug)
            return res.redirect(301, `/surah/${slug}`);
        }

        const matchedSurah = allSurahs.find(s => createSlug(s.namaLatin) === identifier);

        if (!matchedSurah) return res.status(404).render('404', { title: 'Surah Tidak Ditemukan' });

        const nomor = matchedSurah.nomor;

        // Fetch detail surah & tafsir barengan
        const [surahResponse, tafsirResponse] = await Promise.all([
            axios.get(`https://equran.id/api/v2/surat/${nomor}`),
            axios.get(`https://equran.id/api/v2/tafsir/${nomor}`)
        ]);

        const surah = surahResponse.data.data;
        const tafsir = tafsirResponse.data.data;
        const currentSlug = createSlug(surah.namaLatin);

        res.render('surah', { 
            surah, 
            tafsir, 
            path: '/surah',
            canonicalUrl: `${baseUrl}/surah/${currentSlug}` // Kirim URL canonical ke EJS
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Gagal mengambil detail surah.');
    }
});
// 3. Endpoint Bookmark
app.get('/bookmark', (req, res) => {
    res.render('bookmark', { path: '/bookmark' });
});

// 4. Endpoint History (Terakhir Dibaca)
app.get('/history', (req, res) => {
    res.render('history', { path: '/history' });
});

// Tambahkan endpoint ini di app.js lo
app.get('/donate', (req, res) => {
    res.render('donate', { path: '/donate' });
});
app.listen(port, () => {
    console.log(`Server gaul jalan di http://localhost:${port}`);
});
