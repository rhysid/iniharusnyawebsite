const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

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
app.get('/surah/:id', async (req, res) => {
    try {
        // Ambil data Surah dan Tafsir berbarengan biar cepet
        const [surahResponse, tafsirResponse] = await Promise.all([
            axios.get(`https://equran.id/api/v2/surat/${req.params.id}`),
            axios.get(`https://equran.id/api/v2/tafsir/${req.params.id}`)
        ]);

        const surah = surahResponse.data.data;
        const tafsir = tafsirResponse.data.data; // Data tafsir siap pakai

        res.render('surah', { surah, tafsir, path: '/surah' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Gagal mengambil detail surah dan tafsir.');
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