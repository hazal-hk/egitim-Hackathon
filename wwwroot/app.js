// ═══════ PARTICLES ═══════
(function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 14) + 's';
        p.style.animationDelay = (Math.random() * 10) + 's';
        p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
        if (Math.random() > 0.7) p.style.background = 'var(--magenta)';
        container.appendChild(p);
    }
})();

// ═══════ DÜNYA SAATLERİ & HUD CLOCK ═══════
document.addEventListener('DOMContentLoaded', () => {
    let selectedTimeZone = 'Europe/Istanbul';
    let selectedCityText = 'İSTANBUL';

    const toggleBtn = document.getElementById('world-clock-toggle');
    const dropdown = document.getElementById('world-clock-dropdown');
    const cityNameEl = document.getElementById('hud-city-name');
    const timeEl = document.getElementById('hud-time');

    if (toggleBtn && dropdown) {
        // Paneli aç/kapat tık olayı
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        // Sayfa içinde başka bir yere tıklanınca paneli kapat
        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        // Şehir seçimi
        const options = dropdown.querySelectorAll('.city-time-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedTimeZone = option.getAttribute('data-timezone');
                selectedCityText = option.getAttribute('data-city');
                if (cityNameEl) cityNameEl.textContent = selectedCityText;
                dropdown.classList.remove('active');
            });
        });

        // Saatleri her saniye güncelle
        function updateClocks() {
            const now = new Date();

            // Ana saati güncelle
            if (timeEl) {
                try {
                    const mainTimeStr = now.toLocaleTimeString('tr-TR', { timeZone: selectedTimeZone });
                    timeEl.textContent = `${mainTimeStr}`;
                } catch (err) {
                    timeEl.textContent = now.toLocaleTimeString();
                }
            }

            // Açılır menüdeki tüm şehirlerin saatlerini canlı güncelle
            options.forEach(option => {
                const tz = option.getAttribute('data-timezone');
                const timeSpan = option.querySelector('.city-time');
                if (timeSpan) {
                    try {
                        const cityTimeStr = now.toLocaleTimeString('tr-TR', {
                            timeZone: tz,
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        timeSpan.textContent = cityTimeStr;
                    } catch (e) {
                        timeSpan.textContent = "--:--";
                    }
                }
            });
        }

        setInterval(updateClocks, 1000);
        updateClocks();
    }
});

// ═══════ LOADING SIMULATION ═══════
let loadProgress = 0;
const loadingScreen = document.getElementById('loading-screen');
const loadInterval = setInterval(() => {
    loadProgress += Math.random() * 15 + 5;
    if (loadProgress > 100) loadProgress = 100;
    document.getElementById('loading-bar').style.width = loadProgress + '%';
    if (loadProgress >= 100) {
        clearInterval(loadInterval);
        const showStartPrompt = () => {
            setTimeout(() => loadingScreen.classList.add('ready'), 600);
        };

        if (map.loaded()) {
            showStartPrompt();
        } else {
            map.once('idle', showStartPrompt);
        }
    }
}, 200);

loadingScreen.addEventListener('click', (event) => {
    if (!loadingScreen.classList.contains('ready') || event.button !== 0) return;
    loadingScreen.classList.add('hidden');
});

// ═══════ MAP INIT ═══════
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxwZXJpdHRvNSIsImEiOiJjbXV4ZzZ4d3gwOTh3MnhzZmgxNmUwOGpvIn0.Izv0zJRodMPyWUY2CrB_SQ';

const baslangicMerkezi = [20, 15];
const baslangicZoom = 1.8;
const countryBoundaryOpacityByZoom = ['interpolate', ['linear'], ['zoom'], 1.5, 0.14, 3, 0.22, 5, 0.38, 7, 0.52];
const countryLabelOpacityByZoom = ['interpolate', ['linear'], ['zoom'], 1.5, 0.7, 2.5, 0.72, 3.5, 0.76, 5, 0.82, 6.5, 0.9, 7.5, 0.95];
const countryNameOverrides = {
    'Bhutan': 'Butan',
    'Brunei': 'Brunei Darüsselam',
    'Curaçao': 'Kurasao',
    'Åland': 'Aland Adaları'
};

function getCountryDisplayName(properties) {
    const sourceName = properties.NAME || properties.name || '';
    return countryNameOverrides[sourceName] || properties.NAME_TR || properties.name_tr || sourceName;
}

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    center: baslangicMerkezi,
    zoom: baslangicZoom,
    minZoom: 1.5,
    maxZoom: 7.5,
    pitch: 35,
    minPitch: 10,
    maxPitch: 60,
    antialias: true,
    optimizeForTerrain: true
});
let terrainEnabled = true;
const compassNeedle = document.getElementById('compass-needle');
const updateCompassBearing = () => {
    if (compassNeedle) compassNeedle.style.transform = `rotate(${-map.getBearing()}deg)`;
};
map.on('rotate', updateCompassBearing);
updateCompassBearing();

// ═══════ COORDS TRACKING ═══════
map.on('mousemove', (e) => {
    const lat = e.lngLat.lat.toFixed(4);
    const lng = e.lngLat.lng.toFixed(4);
    document.getElementById('hud-coords').textContent = `LAT ${lat} · LNG ${lng}`;
});

map.on('style.load', () => {

    // Uzay arka planı
    map.setFog({
        'color': '#031429',
        'high-color': '#031429',
        'space-color': '#031429',
        'star-intensity': 0,
        'horizon-blend': 0.02
    });

    // 3D Arazi
    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
    });
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 11.0 });

    map.on('zoom', () => {
        const zoom = map.getZoom();
        if (terrainEnabled && zoom >= 6.4) {
            terrainEnabled = false;
            map.setTerrain(null);
        } else if (!terrainEnabled && zoom <= 6.2) {
            terrainEnabled = true;
            map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 11.0 });
        }
    });

    // Denizler derin okyanus rengi (Siyah ile mavi tonunun tam ortası - Gece mavisi)
    map.addSource('mapbox-streets', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8'
    });
    map.addLayer({
        id: 'siyah-denizler',
        type: 'fill',
        source: 'mapbox-streets',
        'source-layer': 'water',
        paint: {
            'fill-color': '#031429',
            'fill-opacity': 1
        }
    });

    // ═══════ DÜNYA DENİZLERİ VE OKYANUSLARI (Natural Earth 50m Marine Polygons) ═══════
    map.addSource('dunya-denizler', {
        'type': 'geojson',
        'data': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_geography_marine_polys.geojson'
    });

    // Denizlerin iç dolgusu (holografik okyanus derinlik tonu)
    map.addLayer({
        'id': 'denizler-dolgu',
        'type': 'fill',
        'source': 'dunya-denizler',
        'paint': {
            'fill-color': '#003366',
            'fill-opacity': 0.18,
            'fill-opacity-transition': { duration: 1200 }
        }
    });

    // Deniz hover dolgusu
    map.addLayer({
        'id': 'denizler-hover',
        'type': 'fill',
        'source': 'dunya-denizler',
        'paint': {
            'fill-color': '#00d4ff',
            'fill-opacity': 0.0,
            'fill-opacity-transition': { duration: 300 }
        },
        'filter': ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']
    });

    // Seçilen deniz dolgusu
    map.addLayer({
        'id': 'secili-deniz-dolgu',
        'type': 'fill',
        'source': 'dunya-denizler',
        'paint': {
            'fill-color': '#00ffff',
            'fill-opacity': 0.0,
            'fill-opacity-transition': { duration: 1200 }
        },
        'filter': ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']
    });

    // Deniz sınırları dış ışıması (Soft bathymetric glow)
    map.addLayer({
        'id': 'denizler-sinir-glow',
        'type': 'line',
        'source': 'dunya-denizler',
        'paint': {
            'line-color': '#00aaff',
            'line-width': 3.0,
            'line-blur': 3,
            'line-opacity': 0.12
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        }
    });

    // Deniz ve okyanus sınır çizgileri (Taktiksel kesikli su sınırları)
    map.addLayer({
        'id': 'denizler-sinir',
        'type': 'line',
        'source': 'dunya-denizler',
        'paint': {
            'line-color': '#00d4ff',
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                1.5, 0.6,
                3, 0.9,
                5, 1.3
            ],
            'line-dasharray': [3, 2],
            'line-opacity': 0.35,
            'line-opacity-transition': { duration: 1200 }
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        }
    });

    // Seçilen denizin dış ışıması (Glow Aura)
    map.addLayer({
        'id': 'secili-deniz-glow',
        'type': 'line',
        'source': 'dunya-denizler',
        'paint': {
            'line-color': '#00ffff',
            'line-width': 8.0,
            'line-blur': 6,
            'line-opacity': 0.0,
            'line-opacity-transition': { duration: 1000 }
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'filter': ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']
    });

    // Seçilen denizin parlayan sınırı
    map.addLayer({
        'id': 'secili-deniz-sinir',
        'type': 'line',
        'source': 'dunya-denizler',
        'paint': {
            'line-color': '#00ffff',
            'line-width': 2.2,
            'line-opacity': 0.0,
            'line-opacity-transition': { duration: 1000 }
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'filter': ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']
    });

    // Deniz ve Okyanus İsimleri (Ülke etiketleriyle aynı tipografide)
    map.addLayer({
        'id': 'denizler-isimler',
        'type': 'symbol',
        'source': 'dunya-denizler',
        'layout': {
            'text-field': ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
            'text-size': [
                'interpolate', ['linear'], ['zoom'],
                1.5, 9,
                3, 11,
                5, 13
            ],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-letter-spacing': 0.2,
            'text-transform': 'uppercase'
        },
        'paint': {
            'text-color': '#80e5ff',
            'text-opacity': 0.65,
            'text-opacity-transition': { duration: 1200 },
            'text-halo-color': 'rgba(0, 10, 25, 0.85)',
            'text-halo-width': 1.8
        }
    });

    // ═══════ DÜNYA ÜLKELERİ GEOJSON KAYNAĞI (Natural Earth 50m - Yüksek Çözünürlüklü ve Kıvrımlı) ═══════
    const countryGeoJsonUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
    map.addSource('dunya-ulkeler', {
        'type': 'geojson',
        'data': { type: 'FeatureCollection', features: [] }
    });
    map.addSource('ulke-etiket-noktalari', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });

    fetch(countryGeoJsonUrl)
        .then(response => {
            if (!response.ok) throw new Error(`Ülke verisi yüklenemedi: ${response.status}`);
            return response.json();
        })
        .then(geoJson => {
            const seenCountryNames = new Set();
            const labelFeatures = geoJson.features.reduce((labels, feature) => {
                const properties = feature.properties || {};
                const countryName = properties.NAME;
                const longitude = Number(properties.LABEL_X);
                const latitude = Number(properties.LABEL_Y);

                if (!countryName || seenCountryNames.has(countryName) || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
                    return labels;
                }

                seenCountryNames.add(countryName);
                labels.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [longitude, latitude]
                    },
                    properties: {
                        NAME: countryName,
                        label: getCountryDisplayName(properties)
                    }
                });
                return labels;
            }, []);

            map.getSource('dunya-ulkeler').setData(geoJson);
            map.getSource('ulke-etiket-noktalari').setData({
                type: 'FeatureCollection',
                features: labelFeatures
            });
        })
        .catch(error => console.error('Ülke harita verisi yüklenemedi:', error));

    // Ülkelerin iç dolgusu (transparan holografik parıltı)
    map.addLayer({
        'id': 'ulkeler-dolgu',
        type: 'fill',
        source: 'dunya-ulkeler',
        paint: {
            'fill-color': '#00ffff',
            'fill-opacity': 0.02,
            'fill-opacity-transition': { duration: 1200 }
        }
    });

    // Hover dolgusu
    map.addLayer({
        'id': 'ulkeler-hover',
        type: 'fill',
        source: 'dunya-ulkeler',
        paint: {
            'fill-color': '#00ffff',
            'fill-opacity': 0.0,
            'fill-opacity-transition': { duration: 300 }
        },
        'filter': ['==', 'NAME', '']
    });

    // Diğer ülkeleri karartma katmanı (Seçili ülke haricindeki tüm karaları pürüzsüzce karartır)
    map.addLayer({
        'id': 'diger-ulkeler-karartma',
        type: 'fill',
        source: 'dunya-ulkeler',
        paint: {
            'fill-color': '#00040a',
            'fill-opacity': 0.0,
            'fill-opacity-transition': { duration: 1200 }
        }
    });

    // Seçilen ülke vurgu dolgusu
    map.addLayer({
        'id': 'secili-ulke-dolgu',
        type: 'fill',
        source: 'dunya-ulkeler',
        paint: {
            'fill-color': '#00ffff',
            'fill-opacity': 0.0,
            'fill-opacity-transition': { duration: 1200 }
        },
        'filter': ['==', 'NAME', '']
    });

    // ═══════ KUSURSUZ SINIR ÇİZGİLERİ (Aynı geometriden - kıyılarda ve sınırlarda sıfır bozulma) ═══════
    // Genel ülke sınırları (Kıyılar ve sınırlar düzgün eğrilerle çizilir)
    map.addLayer({
        'id': 'ulkeler-sinir',
        'type': 'line',
        'source': 'dunya-ulkeler',
        'paint': {
            'line-color': '#00ffff',
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                1.5, 0.7,
                3, 1.1,
                5, 1.5,
                7, 1.9
            ],
            'line-opacity': countryBoundaryOpacityByZoom,
            'line-opacity-transition': { duration: 1200 },
            'line-blur': 0.3
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        }
    });

    // Seçilen ülkenin dış ışıması (Hologram Glow Aura)
    map.addLayer({
        'id': 'secili-ulke-glow',
        'type': 'line',
        'source': 'dunya-ulkeler',
        'paint': {
            'line-color': '#00ffff',
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                1.5, 5,
                3, 7,
                5, 10,
                7, 12
            ],
            'line-opacity': 0.0,
            'line-blur': 5,
            'line-opacity-transition': { duration: 1000 }
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'filter': ['==', 'NAME', '']
    });

    // Seçilen ülkenin parlak net sınırı (Bozulmasız, kıvrımlı ve tam poligon kenarında)
    map.addLayer({
        'id': 'secili-ulke-sinir',
        'type': 'line',
        'source': 'dunya-ulkeler',
        'paint': {
            'line-color': '#00ffff',
            'line-width': [
                'interpolate', ['linear'], ['zoom'],
                1.5, 2.0,
                3, 2.5,
                5, 3.2,
                7, 3.8
            ],
            'line-opacity': 0.0,
            'line-opacity-transition': { duration: 1000 }
        },
        'layout': {
            'line-cap': 'round',
            'line-join': 'round'
        },
        'filter': ['==', 'NAME', '']
    });

    // Ülke isimleri
    map.addLayer({
        'id': 'ulkeler-isimler',
        type: 'symbol',
        source: 'ulke-etiket-noktalari',
        layout: {
            'text-field': ['get', 'label'],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
            'text-size': [
                'interpolate', ['linear'], ['zoom'],
                1.5, 9,
                3, 11,
                5, 14
            ],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'text-letter-spacing': 0.1
        },
        paint: {
            'text-color': '#ffffff',
            'text-opacity': countryLabelOpacityByZoom,
            'text-opacity-transition': { duration: 1500 },
            'text-halo-color': 'rgba(0, 0, 0, 0.7)',
            'text-halo-width': 1.5
        }
    });

    // Tekil seçili ülke merkez noktası kaynağı (büyük ülkelerde birden fazla isim çıkmasını önler)
    map.addSource('secili-ulke-nokta', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Seçilen ülke ismi (tekil ve sınırların tam ortasında büyük olarak gösterilir)
    map.addLayer({
        'id': 'secili-ulke-isim',
        type: 'symbol',
        source: 'secili-ulke-nokta',
        layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Regular'],
            'text-size': ['coalesce', ['get', 'textSize'], 20],
            'text-anchor': 'center',
            'text-justify': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-letter-spacing': 0.05,
            'text-transform': 'uppercase'
        },
        paint: {
            'text-color': '#d9e6ee',
            'text-halo-color': 'rgba(0, 8, 18, 0.94)',
            'text-halo-width': 1.1,
            'text-halo-blur': 0.1,
            'text-opacity': 0.0,
            'text-opacity-transition': { duration: 800 }
        }
    });
});

// ═══════ TYPEWRITER EFFECT ═══════
let yazmaAnimasyonu;

function daktiloYaz(sablon, metinler, elementId, hiz) {
    const templateElement = document.getElementById(`${elementId}-template`);
    if (!templateElement) return;

    templateElement.innerHTML = sablon;
    const textSlots = [...templateElement.querySelectorAll('[data-text-slot]')];
    const textValues = metinler.map(value => String(value ?? ''));
    textSlots.forEach(slot => { slot.textContent = ''; });
    clearInterval(yazmaAnimasyonu);

    let slotIndex = 0;
    let characterIndex = 0;
    yazmaAnimasyonu = setInterval(() => {
        while (slotIndex < textSlots.length && characterIndex >= textValues[slotIndex].length) {
            slotIndex++;
            characterIndex = 0;
        }

        if (slotIndex >= textSlots.length || slotIndex >= textValues.length) {
            clearInterval(yazmaAnimasyonu);
            return;
        }

        textSlots[slotIndex].textContent += textValues[slotIndex].charAt(characterIndex);
        characterIndex++;
    }, hiz);
}

// ═══════ RANDOM STAT VALUES ═══════
function randomStats() {
    const signals = ['98.2%', '97.5%', '99.1%', '96.8%', '95.4%'];
    const threats = ['DÜŞÜK', 'ORTA', 'YOK', 'DÜŞÜK', 'BELİRSİZ'];
    const statuses = ['AKTİF', 'İZLEME', 'TARAMA', 'AKTİF', 'BAĞLI'];

    document.getElementById('stat-signal').textContent = signals[Math.floor(Math.random() * signals.length)];
    const threatEl = document.getElementById('stat-threat');
    const threat = threats[Math.floor(Math.random() * threats.length)];
    threatEl.textContent = threat;
    threatEl.style.color = threat === 'ORTA' ? 'var(--gold)' : threat === 'BELİRSİZ' ? 'var(--magenta)' : 'var(--neon-green)';
    document.getElementById('stat-status').textContent = statuses[Math.floor(Math.random() * statuses.length)];
}

// ═══════ TOOLTIP ═══════
const tooltip = document.getElementById('hover-tooltip');
let hoveredCountry = null;

map.on('mousemove', 'ulkeler-dolgu', (e) => {
    const properties = e.features[0].properties;
    const name = properties.NAME || properties.name;
    const displayName = getCountryDisplayName(properties);
    if (name && name !== hoveredCountry) {
        hoveredCountry = name;
        map.setFilter('ulkeler-hover', ['==', 'NAME', name]);
        map.setPaintProperty('ulkeler-hover', 'fill-opacity', 0.11);
    }

    tooltip.textContent = displayName || '';
    tooltip.style.left = (e.point.x + 16) + 'px';
    tooltip.style.top = (e.point.y - 10) + 'px';
    tooltip.classList.add('visible');
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'ulkeler-dolgu', () => {
    hoveredCountry = null;
    map.setFilter('ulkeler-hover', ['==', 'NAME', '']);
    map.setPaintProperty('ulkeler-hover', 'fill-opacity', 0.0);
    tooltip.classList.remove('visible');
    map.getCanvas().style.cursor = '';
});

// ═══════ DENİZ HOVER TOOLTIP ═══════
let hoveredSea = null;
map.on('mousemove', 'denizler-dolgu', (e) => {
    const seaInfo = getStaticSeaInformation(e.features[0]);
    const seaName = seaInfo.displayName;
    if (seaName && seaName !== hoveredSea) {
        hoveredSea = seaName;
        map.setFilter('denizler-hover', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], seaInfo.filterName]);
        map.setPaintProperty('denizler-hover', 'fill-opacity', 0.12);
    }

    tooltip.textContent = `≋ ${seaName}`;
    tooltip.style.left = (e.point.x + 16) + 'px';
    tooltip.style.top = (e.point.y - 10) + 'px';
    tooltip.classList.add('visible');
    map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'denizler-dolgu', () => {
    hoveredSea = null;
    map.setFilter('denizler-hover', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('denizler-hover', 'fill-opacity', 0.0);
    tooltip.classList.remove('visible');
    map.getCanvas().style.cursor = '';
});

const seaNameTranslations = {
    'Arctic Ocean': 'Arktik Okyanusu',
    'Mediterranean Sea': 'Akdeniz',
    'Atlantic Ocean': 'Atlas Okyanusu',
    'Pacific Ocean': 'Pasifik Okyanusu',
    'Indian Ocean': 'Hint Okyanusu',
    'Southern Ocean': 'Güney Okyanusu',
    'North Atlantic Ocean': 'Kuzey Atlas Okyanusu',
    'South Atlantic Ocean': 'Güney Atlas Okyanusu',
    'North Pacific Ocean': 'Kuzey Pasifik Okyanusu',
    'South Pacific Ocean': 'Güney Pasifik Okyanusu',
    'Black Sea': 'Karadeniz',
    'Red Sea': 'Kızıldeniz',
    'Baltic Sea': 'Baltık Denizi',
    'North Sea': 'Kuzey Denizi',
    'Aegean Sea': 'Ege Denizi',
    'Adriatic Sea': 'Adriyatik Denizi',
    'Arabian Sea': 'Arap Denizi',
    'Persian Gulf': 'Basra Körfezi',
    'Gulf of Mexico': 'Meksika Körfezi',
    'Bay of Bengal': 'Bengal Körfezi',
    'Caribbean Sea': 'Karayip Denizi',
    'South China Sea': 'Güney Çin Denizi',
    'East China Sea': 'Doğu Çin Denizi',
    'Sea of Japan': 'Japon Denizi',
    'Philippine Sea': 'Filipin Denizi',
    'Bering Sea': 'Bering Denizi',
    'Barents Sea': 'Barents Denizi',
    'Kara Sea': 'Kara Denizi',
    'Laptev Sea': 'Laptev Denizi',
    'Beaufort Sea': 'Beaufort Denizi',
    'Norwegian Sea': 'Norveç Denizi',
    'Greenland Sea': 'Grönland Denizi',
    'Sea of Okhotsk': 'Ohotsk Denizi',
    'Coral Sea': 'Mercan Denizi',
    'Tasman Sea': 'Tasmanya Denizi',
    'Caspian Sea': 'Hazar Denizi',
    'Dead Sea': 'Ölü Deniz'
};
const seaSalinityEstimates = {
    'Arctic Ocean': 30,
    'Mediterranean Sea': 38,
    'Atlantic Ocean': 35,
    'Pacific Ocean': 35,
    'Indian Ocean': 35,
    'Southern Ocean': 34,
    'Black Sea': 18,
    'Red Sea': 40,
    'Baltic Sea': 7,
    'North Sea': 35,
    'Aegean Sea': 39,
    'Adriatic Sea': 38,
    'Arabian Sea': 36,
    'Persian Gulf': 40,
    'Gulf of Mexico': 36,
    'Bay of Bengal': 34,
    'Caribbean Sea': 35,
    'South China Sea': 34,
    'East China Sea': 33,
    'Sea of Japan': 34,
    'Philippine Sea': 34,
    'Bering Sea': 33,
    'Barents Sea': 34,
    'Kara Sea': 32,
    'Laptev Sea': 30,
    'Beaufort Sea': 28,
    'Norwegian Sea': 35,
    'Greenland Sea': 34,
    'Sea of Okhotsk': 33,
    'Coral Sea': 35,
    'Tasman Sea': 35,
    'Caspian Sea': 12,
    'Dead Sea': 300
};
const seaDescriptionsTr = {
    'Arctic Ocean': 'Arktik Okyanusu, Kuzey Kutbu çevresindeki soğuk ve sığ okyanustur. Nehirlerden gelen tatlı su ve deniz buzları yüzey tuzluluğunu düşürür.',
    'Mediterranean Sea': 'Akdeniz; Avrupa, Afrika ve Asya arasında uzanır, Cebelitarık Boğazı üzerinden Atlas Okyanusu’na bağlanır.',
    'Atlantic Ocean': 'Atlas Okyanusu, Avrupa ve Afrika ile Amerika kıtaları arasında yer alan dünyanın ikinci büyük okyanusudur.',
    'Pacific Ocean': 'Pasifik Okyanusu, kıtalar arasındaki en büyük ve en derin okyanustur.',
    'Indian Ocean': 'Hint Okyanusu; Afrika, Asya ve Avustralya arasında uzanır, muson rüzgârlarından güçlü biçimde etkilenir.',
    'Southern Ocean': 'Güney Okyanusu, Antarktika’yı çevreler ve güçlü çevresel akıntısıyla diğer okyanusları birbirine bağlar.',
    'Black Sea': 'Karadeniz, Avrupa ile Batı Asya arasında bulunan ve boğazlarla Akdeniz sistemine bağlanan iç denizdir.',
    'Red Sea': 'Kızıldeniz, Afrika ile Arap Yarımadası arasındadır. Sıcak iklimi ve yüksek buharlaşması tuzluluğunu artırır.',
    'Baltic Sea': 'Baltık Denizi, Kuzey Avrupa’da yer alır. Çok sayıda nehir ve sınırlı su alışverişi nedeniyle tuzluluğu düşüktür.',
    'North Sea': 'Kuzey Denizi, Büyük Britanya ile Kuzey Avrupa kıyıları arasında, Atlas Okyanusu’na açık sığ bir denizdir.',
    'Aegean Sea': 'Ege Denizi, Yunanistan ile Türkiye arasında, çok sayıda ada ve boğazla çevrili Akdeniz’in bir koludur.',
    'Adriatic Sea': 'Adriyatik Denizi, İtalya Yarımadası ile Balkanlar arasında uzanan Akdeniz’in kuzey koludur.',
    'Arabian Sea': 'Arap Denizi, Arap Yarımadası ile Hindistan arasında, Hint Okyanusu’nun kuzeybatı bölümünde bulunur.',
    'Persian Gulf': 'Basra Körfezi, İran ile Arap Yarımadası arasında yer alır; sığ ve sıcak suları yüksek buharlaşma görür.',
    'Gulf of Mexico': 'Meksika Körfezi, Kuzey Amerika kıyılarıyla çevrili, Karayip Denizi ve Atlas Okyanusu’na bağlı büyük bir körfezdir.',
    'Bay of Bengal': 'Bengal Körfezi, Hint Okyanusu’nun kuzeydoğusunda bulunur ve büyük nehirlerin taşıdığı tatlı sudan etkilenir.',
    'Caribbean Sea': 'Karayip Denizi, Orta Amerika ile Antiller arasında, Atlas Okyanusu’na bağlı tropikal bir denizdır.',
    'South China Sea': 'Güney Çin Denizi, Güneydoğu Asya kıyıları ve adaları arasında uzanan önemli bir batı Pasifik denizidir.',
    'East China Sea': 'Doğu Çin Denizi, Çin, Kore ve Japonya kıyıları arasında yer alan batı Pasifik denizidir.',
    'Sea of Japan': 'Japon Denizi, Japonya ile Kore ve Rusya’nın doğu kıyıları arasında bulunur.',
    'Philippine Sea': 'Filipin Denizi, Filipinler’in doğusunda bulunan, batı Pasifik’in derin denizlerinden biridir.'
};

function getStaticSeaInformation(feature) {
    const properties = feature.properties || {};
    const sourceName = properties.NAME || properties.name_en || properties.name || '';
    const displayName = properties.NAME_TR || properties.name_tr || seaNameTranslations[sourceName] || 'Seçili deniz/okyanus';
    const featureClass = String(properties.featurecla || properties.FEATURECLA || '').toLowerCase();
    const type = featureClass.includes('ocean') ? 'Okyanus'
        : featureClass.includes('gulf') || featureClass.includes('bay') ? 'Körfez'
            : featureClass.includes('strait') ? 'Boğaz'
                : featureClass.includes('sea') ? 'Deniz'
                    : 'Su kütlesi';

    return {
        displayName,
        filterName: properties.NAME_TR || properties.name_tr || properties.NAME || properties.name || displayName,
        type,
        salinity: seaSalinityEstimates[sourceName] ?? seaSalinityEstimates[displayName] ?? 35,
        description: seaDescriptionsTr[sourceName] || `${displayName}, çevresindeki kıyılar ve açık denizlerle etkileşim içindeki bir su kütlesidir. Tuzluluğu konuma, mevsime ve tatlı su girişine göre değişir.`
    };
}

// ═══════ DÜNYA BOYUTU SARMA (Antimeridyen / Pasifik kesintisiz uçuş) ═══════
function getUnwrappedTargetLng(targetLng, currentLng) {
    let diff = (targetLng - currentLng) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return currentLng + diff;
}

// ═══════ ÜLKE SINIRLARININ TAM ORTA NOKTASI VE BOUNDS HESAPLAMA ═══════
function getUlkeSinirMerkeziVeBounds(feature, fallbackLngLat) {
    const fallbackPoint = fallbackLngLat ? [fallbackLngLat.lng, fallbackLngLat.lat] : [0, 0];
    if (!feature || !feature.geometry) {
        return {
            center: fallbackPoint,
            bounds: new mapboxgl.LngLatBounds(fallbackPoint, fallbackPoint)
        };
    }

    let anaPoligonlar = [];

    if (feature.geometry.type === 'Polygon') {
        anaPoligonlar = [feature.geometry.coordinates[0]];
    } else if (feature.geometry.type === 'MultiPolygon') {
        const poligonListesi = feature.geometry.coordinates.map((poly) => {
            const halka = poly[0];
            if (!halka || halka.length < 3) return null;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < halka.length; i++) {
                const pt = halka[i];
                if (pt[0] < minX) minX = pt[0];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] < minY) minY = pt[1];
                if (pt[1] > maxY) maxY = pt[1];
            }
            const alan = (maxX - minX) * (maxY - minY);
            return { halka, alan, minX, maxX, minY, maxY };
        }).filter(Boolean);

        if (poligonListesi.length === 0) {
            return {
                center: fallbackPoint,
                bounds: new mapboxgl.LngLatBounds(fallbackPoint, fallbackPoint)
            };
        }

        poligonListesi.sort((a, b) => b.alan - a.alan);
        const enBuyuk = poligonListesi[0];

        if (enBuyuk.minX >= 0 && enBuyuk.alan > 80) {
            anaPoligonlar = poligonListesi
                .filter(p => p.minX >= 0 && p.alan > enBuyuk.alan * 0.005)
                .map(p => p.halka);
        } else if (enBuyuk.maxX <= 0 && enBuyuk.alan > 80) {
            anaPoligonlar = poligonListesi
                .filter(p => p.maxX <= 0 && p.alan > enBuyuk.alan * 0.005)
                .map(p => p.halka);
        } else {
            anaPoligonlar = poligonListesi
                .filter(p => p.alan >= enBuyuk.alan * 0.02)
                .map(p => p.halka);
        }

        if (anaPoligonlar.length === 0) {
            anaPoligonlar = [enBuyuk.halka];
        }
    }

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    anaPoligonlar.forEach(halka => {
        halka.forEach(pt => {
            if (pt[0] < minLng) minLng = pt[0];
            if (pt[0] > maxLng) maxLng = pt[0];
            if (pt[1] < minLat) minLat = pt[1];
            if (pt[1] > maxLat) maxLat = pt[1];
        });
    });

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const bounds = new mapboxgl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);

    return {
        center: [centerLng, centerLat],
        bounds: bounds
    };
}

// ═══════ DENİZ SINIRLARININ MERKEZİ VE BOUNDS HESAPLAMA (Tıklanan Yakaya Özel) ═══════
function getDenizSinirMerkeziVeBounds(feature, clickLngLat) {
    const rawLng = clickLngLat ? clickLngLat.lng : 0;
    const clickLat = clickLngLat ? clickLngLat.lat : 0;
    let normLng = ((rawLng + 180) % 360 + 360) % 360 - 180;

    let poligonlar = [];

    if (feature.geometry.type === 'Polygon') {
        poligonlar = [feature.geometry.coordinates[0]];
    } else if (feature.geometry.type === 'MultiPolygon') {
        const parcalar = feature.geometry.coordinates.map(poly => {
            const ring = poly[0];
            if (!ring || ring.length < 3) return null;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < ring.length; i++) {
                const pt = ring[i];
                if (pt[0] < minX) minX = pt[0];
                if (pt[0] > maxX) maxX = pt[0];
                if (pt[1] < minY) minY = pt[1];
                if (pt[1] > maxY) maxY = pt[1];
            }
            const alan = (maxX - minX) * (maxY - minY);
            return { ring, alan, minX, maxX, minY, maxY };
        }).filter(Boolean);

        if (parcalar.length === 0) {
            return {
                center: [normLng, clickLat],
                bounds: new mapboxgl.LngLatBounds([normLng - 5, clickLat - 5], [normLng + 5, clickLat + 5])
            };
        }

        let secilen = parcalar.find(p =>
            normLng >= p.minX - 3 && normLng <= p.maxX + 3 &&
            clickLat >= p.minY - 3 && clickLat <= p.maxY + 3
        );

        if (!secilen) {
            let minD = Infinity;
            parcalar.forEach(p => {
                const cX = (p.minX + p.maxX) / 2;
                const cY = (p.minY + p.maxY) / 2;
                let dX = Math.abs(normLng - cX);
                if (dX > 180) dX = 360 - dX;
                const dY = Math.abs(clickLat - cY);
                const dist = dX * dX + dY * dY;
                if (dist < minD) {
                    minD = dist;
                    secilen = p;
                }
            });
        }

        poligonlar = [secilen ? secilen.ring : parcalar[0].ring];
    }

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    poligonlar.forEach(halka => {
        halka.forEach(pt => {
            if (pt[0] < minLng) minLng = pt[0];
            if (pt[0] > maxLng) maxLng = pt[0];
            if (pt[1] < minLat) minLat = pt[1];
            if (pt[1] > maxLat) maxLat = pt[1];
        });
    });

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const bounds = new mapboxgl.LngLatBounds([minLng, minLat], [maxLng, maxLat]);

    return {
        center: [centerLng, centerLat],
        bounds: bounds
    };
}

let countryOrbitFrame = null;
let countryOrbitState = {
    active: false,
    paused: false,
    center: null,
    zoom: null,
    key: null,
    bearing: 0,
    speed: 11,
    lastTime: 0
};
let lastFocusedCountryName = null;
let countrySelectionToken = 0;
let countryFocusOrbitTarget = null;
let spacePausedCountryOrbit = false;

function getOrbitKey(center, zoom) {
    if (!center || typeof zoom !== 'number') return null;
    return `${Number(center[0]).toFixed(4)}|${Number(center[1]).toFixed(4)}|${Number(zoom).toFixed(4)}`;
}

function stopCountryOrbit() {
    if (countryOrbitFrame) {
        cancelAnimationFrame(countryOrbitFrame);
        countryOrbitFrame = null;
    }

    countryOrbitState.active = false;
    countryOrbitState.paused = false;
    countryOrbitState.center = null;
    countryOrbitState.zoom = null;
    countryOrbitState.key = null;
}

function resetCountryFocusState() {
    lastFocusedCountryName = null;
    countryFocusOrbitTarget = null;
    spacePausedCountryOrbit = false;
    stopCountryOrbit();
}

function startCountryOrbit(center, zoom = map.getZoom()) {
    if (!center) return;

    const orbitKey = getOrbitKey(center, zoom);
    const sameTarget = countryOrbitState.active && countryOrbitState.key === orbitKey;

    if (sameTarget) {
        countryOrbitState.paused = false;
        return;
    }

    if (countryOrbitState.active) {
        stopCountryOrbit();
    }

    const nextState = {
        active: true,
        paused: false,
        center: center,
        zoom: zoom,
        key: orbitKey,
        bearing: map.getBearing() || 0,
        speed: 11,
        lastTime: performance.now()
    };
    countryOrbitState = nextState;

    const tick = (now) => {
        if (!countryOrbitState.active || countryOrbitState.paused) return;

        const delta = (now - countryOrbitState.lastTime) / 1000;
        countryOrbitState.lastTime = now;
        countryOrbitState.bearing = (countryOrbitState.bearing + countryOrbitState.speed * delta) % 360;

        map.setCenter(countryOrbitState.center);
        map.setZoom(countryOrbitState.zoom);
        map.setBearing(countryOrbitState.bearing);
        map.setPitch(45);

        countryOrbitFrame = requestAnimationFrame(tick);
    };

    countryOrbitFrame = requestAnimationFrame(tick);
}

function pauseCountryOrbit() {
    if (!countryOrbitState.active) return;
    countryOrbitState.paused = true;
    if (countryOrbitFrame) {
        cancelAnimationFrame(countryOrbitFrame);
        countryOrbitFrame = null;
    }
}

function resumeCountryOrbit() {
    if (!countryOrbitState.active || !countryOrbitState.center) return;
    if (countryOrbitState.paused) {
        countryOrbitState.paused = false;
        countryOrbitState.lastTime = performance.now();

        const tick = (now) => {
            if (!countryOrbitState.active || countryOrbitState.paused) return;

            const delta = (now - countryOrbitState.lastTime) / 1000;
            countryOrbitState.lastTime = now;
            countryOrbitState.bearing = (countryOrbitState.bearing + countryOrbitState.speed * delta) % 360;

            map.setCenter(countryOrbitState.center);
            map.setZoom(countryOrbitState.zoom);
            map.setBearing(countryOrbitState.bearing);
            map.setPitch(45);

            countryOrbitFrame = requestAnimationFrame(tick);
        };

        countryOrbitFrame = requestAnimationFrame(tick);
    }
}

// ═══════ CLICK: ÜLKEYE TIKLAMA ═══════
const handledMapLayerClicks = new WeakSet();
map.on('click', 'ulkeler-dolgu', (e) => {
    if (e.originalEvent) handledMapLayerClicks.add(e.originalEvent);
    const feature = e.features[0];
    const ulkeAdi = feature.properties.NAME || feature.properties.name;
    const ulkeGorunenAdi = getCountryDisplayName(feature.properties);
    const sameCountryFocus = lastFocusedCountryName === ulkeAdi && countryOrbitState.active;
    if (sameCountryFocus) {
        if (countryOrbitState.paused) resumeCountryOrbit();
        return;
    }

    const selectionToken = ++countrySelectionToken;
    stopCountryOrbit();
    countryFocusOrbitTarget = null;
    spacePausedCountryOrbit = false;
    lastFocusedCountryName = ulkeAdi;
    map.setPaintProperty('secili-ulke-isim', 'text-opacity-transition', { duration: 0 });
    map.setPaintProperty('secili-ulke-isim', 'text-opacity', 0);

    // Deniz vurgularını temizle
    map.setFilter('secili-deniz-dolgu', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('secili-deniz-dolgu', 'fill-opacity', 0.0);
    map.setFilter('secili-deniz-sinir', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('secili-deniz-sinir', 'line-opacity', 0.0);
    map.setFilter('secili-deniz-glow', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('secili-deniz-glow', 'line-opacity', 0.0);

    const statLabels = document.querySelectorAll('.card-footer .stat-label');
    if (statLabels[0]) statLabels[0].textContent = 'Sinyal';
    if (statLabels[1]) statLabels[1].textContent = 'Tehdit';
    if (statLabels[2]) statLabels[2].textContent = 'Durum';

    const geoBilgi = getUlkeSinirMerkeziVeBounds(feature, e.lngLat);
    let bounds = geoBilgi.bounds;
    const tamOrtaNokta = geoBilgi.center;
    let labelPoints = [{ coordinates: tamOrtaNokta, textSize: 20 }];

    if (ulkeAdi === 'United States of America' || ulkeAdi === 'United States') {
        const normalizedClickLng = ((e.lngLat.lng + 180) % 360 + 360) % 360 - 180;
        const clickedAlaska = e.lngLat.lat >= 50 && (normalizedClickLng <= -130 || normalizedClickLng >= 170);
        labelPoints = [
            { coordinates: [-98, 39], textSize: 20 },
            { coordinates: [-152, 64], textSize: 12 }
        ];

        if (clickedAlaska) {
            const alaskaWestLng = getUnwrappedTargetLng(-180, e.lngLat.lng);
            bounds = new mapboxgl.LngLatBounds([alaskaWestLng, 50], [alaskaWestLng + 52, 72]);
        } else {
            bounds = new mapboxgl.LngLatBounds([-179, 24], [-66, 72]);
        }
    } else if (ulkeAdi === 'Russia') {
        bounds = new mapboxgl.LngLatBounds([19, 41], [180, 82]);
        labelPoints = [{ coordinates: [100, 60], textSize: 20 }];
    }

    map.setFilter('diger-ulkeler-karartma', ['!=', 'NAME', ulkeAdi]);
    map.setPaintProperty('diger-ulkeler-karartma', 'fill-opacity', 0.82);
    map.setFilter('secili-ulke-dolgu', ['==', 'NAME', ulkeAdi]);
    map.setPaintProperty('secili-ulke-dolgu', 'fill-opacity', 0.08);

    map.setPaintProperty('ulkeler-sinir', 'line-opacity', 0.15);
    map.setFilter('secili-ulke-sinir', ['==', 'NAME', ulkeAdi]);
    map.setPaintProperty('secili-ulke-sinir', 'line-opacity', 1.0);
    map.setFilter('secili-ulke-glow', ['==', 'NAME', ulkeAdi]);
    map.setPaintProperty('secili-ulke-glow', 'line-opacity', 0.4);

    map.setPaintProperty('ulkeler-isimler', 'text-opacity', 0.0);

    const noktaKaynagi = map.getSource('secili-ulke-nokta');
    if (noktaKaynagi) {
        noktaKaynagi.setData({
            type: 'FeatureCollection',
            features: labelPoints.map(labelPoint => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: labelPoint.coordinates
                },
                properties: {
                    name: ulkeGorunenAdi,
                    textSize: labelPoint.textSize
                }
            }))
        });
    }

    const optimumKamera = map.cameraForBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 420 },
        pitch: 45
    });

    const currentLng = map.getCenter().lng;
    const targetLng = getUnwrappedTargetLng(optimumKamera.center.lng, currentLng);
    const finalZoom = Math.min(optimumKamera.zoom - 0.2, 6.5);
    const orbitCenter = [targetLng, optimumKamera.center.lat];
    countryFocusOrbitTarget = { center: orbitCenter, zoom: finalZoom };

    map.flyTo({
        center: orbitCenter,
        zoom: finalZoom,
        pitch: 45,
        bearing: 0,
        speed: 1.2,
        curve: 1,
        essential: true
    });

    map.once('moveend', () => {
        if (selectionToken !== countrySelectionToken) return;

        // Ülke seçildiğinde ana butonları tekrar görünür yap, alt menüleri gizle
        const mainButtons = document.getElementById('main-buttons-container');
        const subButtons = document.getElementById('sub-buttons-container');
        if (subButtons) subButtons.style.display = 'none';
        if (mainButtons) mainButtons.style.display = 'grid';

        map.setPaintProperty('secili-ulke-isim', 'text-opacity-transition', { duration: 800 });
        map.setPaintProperty('secili-ulke-isim', 'text-opacity', 1);

        const kart = document.getElementById('hologram-card');
        document.getElementById('country-name').textContent = ulkeGorunenAdi;
        document.getElementById('card-subtitle').textContent = `// BÖLGE: ${ulkeGorunenAdi.toLocaleUpperCase('tr-TR')} · BAĞLANTI KURULDU`;
        kart.classList.remove('sea-mode');
        kart.classList.add('show');
        randomStats();

        const orbitKey = getOrbitKey(orbitCenter, finalZoom);
        const sameTarget = countryOrbitState.active && countryOrbitState.key === orbitKey;

        if (!sameTarget) {
            startCountryOrbit(orbitCenter, finalZoom);
        } else if (countryOrbitState.paused) {
            resumeCountryOrbit();
        }

        const ornekSablon = `<span class="prompt">&gt;</span> <span data-text-slot></span><br><br><span class="prompt">&gt;</span> <span data-text-slot></span><span class="highlight" data-text-slot></span><br><span class="prompt">&gt;</span> <span data-text-slot></span><span class="warn" data-text-slot></span>.<br><br><span data-text-slot></span>`;
        const ornekIcerik = [
            'GLOBAL BAĞLANTI KURULDU.',
            'BÖLGE: ',
            ulkeGorunenAdi,
            'DURUM: ',
            'Uydu ve coğrafi tarama aktif',
            'Seçilen bölgenin stratejik, coğrafi ve eğitim verileri yükleniyor...'
        ];
        setTimeout(() => {
            daktiloYaz(ornekSablon, ornekIcerik, 'country-info', 25);
        }, 400);
    });
});

// ═══════ CLICK: DENİZ / OKYANUSA TIKLAMA ═══════
function handleSeaSelection(feature, clickLngLat) {
    const seaInfo = getStaticSeaInformation(feature);
    const seaName = seaInfo.displayName;
    clearInterval(yazmaAnimasyonu);

    stopCountryOrbit();

    map.setFilter('secili-ulke-dolgu', ['==', 'NAME', '']);
    map.setPaintProperty('secili-ulke-dolgu', 'fill-opacity', 0.0);
    map.setFilter('secili-ulke-sinir', ['==', 'NAME', '']);
    map.setPaintProperty('secili-ulke-sinir', 'line-opacity', 0.0);
    map.setFilter('secili-ulke-glow', ['==', 'NAME', '']);
    map.setPaintProperty('secili-ulke-glow', 'line-opacity', 0.0);
    map.setPaintProperty('diger-ulkeler-karartma', 'fill-opacity', 0.0);
    map.setPaintProperty('ulkeler-sinir', 'line-opacity', 0.35);

    const seaNameExpression = ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']];
    map.setFilter('secili-deniz-dolgu', ['==', seaNameExpression, seaInfo.filterName]);
    map.setPaintProperty('secili-deniz-dolgu', 'fill-opacity', 0.15);
    map.setFilter('secili-deniz-sinir', ['==', seaNameExpression, seaInfo.filterName]);
    map.setPaintProperty('secili-deniz-sinir', 'line-opacity', 1.0);
    map.setFilter('secili-deniz-glow', ['==', seaNameExpression, seaInfo.filterName]);
    map.setPaintProperty('secili-deniz-glow', 'line-opacity', 0.45);

    const geoBilgi = getDenizSinirMerkeziVeBounds(feature, clickLngLat);
    const bounds = geoBilgi.bounds;
    const tamOrtaNokta = geoBilgi.center;

    const noktaKaynagi = map.getSource('secili-ulke-nokta');
    if (noktaKaynagi) {
        noktaKaynagi.setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: tamOrtaNokta
                },
                properties: {
                    name: seaName
                }
            }]
        });
    }

    const optimumKamera = map.cameraForBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 420 },
        pitch: 45
    });

    const currentLng = map.getCenter().lng;
    const targetLng = getUnwrappedTargetLng(optimumKamera.center.lng, currentLng);
    const finalZoom = Math.min(optimumKamera.zoom - 0.2, 5.0);

    map.flyTo({
        center: [targetLng, optimumKamera.center.lat],
        zoom: finalZoom,
        pitch: 45,
        bearing: 0,
        speed: 1.2,
        curve: 1,
        essential: true
    });

    map.once('moveend', () => {
        const kart = document.getElementById('hologram-card');
        document.getElementById('country-name').textContent = seaName;
        document.getElementById('card-subtitle').textContent = `// BÖLGE: ${seaName.toLocaleUpperCase('tr-TR')} · TÜR: ${seaInfo.type.toLocaleUpperCase('tr-TR')}`;
        kart.classList.add('show', 'sea-mode');

        // Deniz seçildiğinde alt butonları gizle
        const mainButtons = document.getElementById('main-buttons-container');
        const subButtons = document.getElementById('sub-buttons-container');
        if (mainButtons) mainButtons.style.display = 'none';
        if (subButtons) subButtons.style.display = 'none';

        const statLabels = document.querySelectorAll('.card-footer .stat-label');
        if (statLabels[0]) statLabels[0].textContent = 'Tuzluluk (tahmini)';
        document.getElementById('stat-signal').textContent = `~${seaInfo.salinity} PSU`;
        document.getElementById('stat-status').textContent = '';

        const seaTemplate = '<span class="prompt">&gt;</span> <span data-text-slot></span><br><br><span class="prompt">&gt;</span> <span data-text-slot></span>';
        const seaText = [
            seaInfo.description,
            `Yüzey tuzluluğu yaklaşık ${seaInfo.salinity} PSU’dur. Değer, konum ve mevsime göre değişebilir.`
        ];
        daktiloYaz(seaTemplate, seaText, 'country-info', 12);
    });
}

map.on('click', 'denizler-dolgu', (e) => {
    if (e.originalEvent) handledMapLayerClicks.add(e.originalEvent);
    handleSeaSelection(e.features[0], e.lngLat);
});

map.on('click', (e) => {
    if (e.lngLat.lat < 66) return;

    const originalEvent = e.originalEvent;
    const clickPoint = e.point;
    const clickLngLat = e.lngLat;

    setTimeout(() => {
        if (originalEvent && handledMapLayerClicks.has(originalEvent)) return;

        const existingFeature = map.queryRenderedFeatures(clickPoint, {
            layers: ['ulkeler-dolgu', 'denizler-dolgu']
        })[0];
        if (existingFeature) return;

        const latitude = clickLngLat.lat;
        const longitude = clickLngLat.lng;
        const latMin = Math.max(66, latitude - 5);
        const latMax = Math.min(85, latitude + 5);
        const ring = [
            [longitude - 5, latMin],
            [longitude + 5, latMin],
            [longitude + 5, latMax],
            [longitude - 5, latMax],
            [longitude - 5, latMin]
        ];

        handleSeaSelection({
            properties: {
                NAME: 'Arctic Ocean',
                NAME_TR: 'Arktik Okyanusu',
                featurecla: 'Ocean'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [ring]
            }
        }, clickLngLat);
    }, 0);
});

// ═══════ CLOSE BUTTON ═══════
document.getElementById('card-close').addEventListener('click', resetView);

// ═══════ SAĞ TIKLAMA → RESET ═══════
map.on('contextmenu', (e) => {
    e.originalEvent.preventDefault();
    resetView();
});

map.on('dragstart', () => {
    if (countryOrbitState.active) {
        pauseCountryOrbit();
    }
});

map.on('dragend', () => {
    if (countryOrbitState.active) {
        resumeCountryOrbit();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' || event.repeat) return;

    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, textarea, select, button, [contenteditable="true"]')) return;

    const canToggleOrbit = countryOrbitState.active || countryOrbitState.paused || spacePausedCountryOrbit;
    if (!canToggleOrbit || !countryFocusOrbitTarget || !lastFocusedCountryName) return;

    event.preventDefault();

    if (countryOrbitState.active || countryOrbitState.paused) {
        stopCountryOrbit();
        spacePausedCountryOrbit = true;
        map.easeTo({
            bearing: 0,
            pitch: 0,
            duration: 900,
            essential: true
        });
        return;
    }

    const selectionToken = countrySelectionToken;
    const focusedCountry = lastFocusedCountryName;
    const orbitTarget = countryFocusOrbitTarget;
    spacePausedCountryOrbit = false;

    map.easeTo({
        center: orbitTarget.center,
        zoom: orbitTarget.zoom,
        bearing: 0,
        pitch: 45,
        duration: 900,
        essential: true
    });
    map.once('moveend', () => {
        if (selectionToken !== countrySelectionToken || lastFocusedCountryName !== focusedCountry || spacePausedCountryOrbit) return;
        startCountryOrbit(orbitTarget.center, orbitTarget.zoom);
    });
});

function resetView() {
    clearInterval(yazmaAnimasyonu);
    resetCountryFocusState();

    // Görünüm sıfırlandığında ana butonları tekrar göster
    const mainButtons = document.getElementById('main-buttons-container');
    const subButtons = document.getElementById('sub-buttons-container');
    if (subButtons) subButtons.style.display = 'none';
    if (mainButtons) mainButtons.style.display = 'grid';

    map.setPaintProperty('diger-ulkeler-karartma', 'fill-opacity', 0.0);
    map.setFilter('secili-ulke-dolgu', ['==', 'NAME', '']);
    map.setPaintProperty('secili-ulke-dolgu', 'fill-opacity', 0.0);

    map.setPaintProperty('ulkeler-sinir', 'line-opacity', countryBoundaryOpacityByZoom);
    map.setFilter('secili-ulke-sinir', ['==', 'NAME', '']);
    map.setPaintProperty('secili-ulke-sinir', 'line-opacity', 0.0);
    map.setFilter('secili-ulke-glow', ['==', 'NAME', '']);
    map.setPaintProperty('secili-ulke-glow', 'line-opacity', 0.0);

    map.setFilter('secili-deniz-dolgu', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('secili-deniz-dolgu', 'fill-opacity', 0.0);
    map.setFilter('secili-deniz-sinir', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('secili-deniz-sinir', 'line-opacity', 0.0);
    map.setFilter('secili-deniz-glow', ['==', ['coalesce', ['get', 'NAME_TR'], ['get', 'name_tr'], ['get', 'NAME'], ['get', 'name']], '']);
    map.setPaintProperty('secili-deniz-glow', 'line-opacity', 0.0);

    map.setPaintProperty('ulkeler-isimler', 'text-opacity', countryLabelOpacityByZoom);

    const statLabels = document.querySelectorAll('.card-footer .stat-label');
    if (statLabels[0]) statLabels[0].textContent = 'Sinyal';
    if (statLabels[1]) statLabels[1].textContent = 'Tehdit';
    if (statLabels[2]) statLabels[2].textContent = 'Durum';

    const noktaKaynagi = map.getSource('secili-ulke-nokta');
    if (noktaKaynagi) {
        noktaKaynagi.setData({
            type: 'FeatureCollection',
            features: []
        });
    }

    map.flyTo({
        center: baslangicMerkezi,
        zoom: baslangicZoom,
        pitch: 35,
        bearing: 0,
        speed: 1.5,
        curve: 1,
        essential: true
    });

    document.getElementById('hologram-card').classList.remove('show', 'sea-mode');
    setTimeout(() => {
        document.getElementById('country-info-template').innerHTML = '';
    }, 600);
}

// ============================================================================
// ═══════ API ENTEGRASYONU VE DİNAMİK KATEGORİ / İÇERİK YÖNETİMİ ═══════
// ============================================================================

const countryIdMap = {
    'Türkiye': 1,
    'Japonya': 2,
    'Mısır': 3,
    'İtalya': 4,
    'Brezilya': 5,
    'Afganistan': 6,
    'Almanya': 7,
    'Amerika': 8,
    'Birleşik': 9,
    'Devletleri': 10,
    'Andorra': 11,
    'Angola': 12,
    'Antigua': 13,
    'Amerika Birleşik Devletleri': 14,
    'United States of America': 14,
    'United States': 14,
    'Antigua ve Barbuda': 15,
    'Arjantin': 16,
    'Arnavutluk': 17,
    'Avustralya': 18,
    'Avusturya': 19,
    'Azerbaycan': 20,
    'Bahamalar': 21,
    'Bahreyn': 22,
    'Bangladeş': 23,
    'Barbados': 24,
    'Belarus': 25,
    'Belçika': 26,
    'Belize': 27,
    'Benin': 28,
    'Birleşik Arap Emirlikleri': 29,
    'Birleşik Krallık': 30,
    'United Kingdom': 30,
    'Bolivya': 31,
    'Bosna-Hersek': 32,
    'Botsvana': 33,
    'Brunei': 34,
    'Bulgaristan': 35,
    'Burkina Faso': 36,
    'Burundi': 37,
    'Cabo Verde': 38,
    'Cezayir': 39,
    'Cibuti': 40,
    'Çad': 41,
    'Çekya': 42,
    'Çin': 43,
    'Danimarka': 44,
    'Doğu Timor': 45,
    'Dominik Cumhuriyeti': 46,
    'Dominika': 47,
    'Ekvador': 48,
    'Ekvator Ginesi': 49,
    'El Salvador': 50,
    'Endonezya': 51,
    'Eritre': 52,
    'Ermenistan': 53,
    'Estonya': 54,
    'Eswatini': 55,
    'Etiyopya': 56,
    'Fas': 57,
    'Fiji': 58,
    'Fildişi Sahili': 59,
    'Filipinler': 60,
    'Filistin': 61,
    'Finlandiya': 62,
    'Fransa': 63,
    'Gabon': 64,
    'Gambiya': 65,
    'Gana': 66,
    'Gine': 67,
    'Gine-Bissau': 68,
    'Grenada': 69,
    'Guatemala': 70,
    'Guyana': 71,
    'Güney Afrika': 72,
    'Güney Kore': 73,
    'Güney Sudan': 74,
    'Gürcistan': 75,
    'Haiti': 76,
    'Hırvatistan': 77,
    'Hindistan': 78,
    'Hollanda': 79,
    'Honduras': 80,
    'Irak': 81,
    'İran': 82,
    'İrlanda': 83,
    'İspanya': 84,
    'İsrail': 85,
    'İsveç': 86,
    'İsviçre': 87,
    'İzlanda': 88,
    'Jamaika': 89,
    'Kamboçya': 90,
    'Kamerun': 91,
    'Kanada': 92,
    'Karadağ': 93,
    'Katar': 94,
    'Kazakistan': 95,
    'Kenya': 96,
    'Kırgızistan': 97,
    'Kiribati': 98,
    'Kolombiya': 99,
    'Komorlar': 100,
    'Kongo Cumhuriyeti': 101,
    'Kongo Demokratik Cumhuriyeti': 102,
    'Kosta Rika': 103,
    'Kuveyt': 104,
    'Kuzey Kore': 105,
    'Kuzey Makedonya': 106,
    'Küba': 107,
    'Kıbrıs Cumhuriyeti': 108,
    'Laos': 109,
    'Lesotho': 110,
    'Letonya': 111,
    'Liberya': 112,
    'Libya': 113,
    'Lihtenştayn': 114,
    'Litvanya': 115,
    'Lübnan': 116,
    'Lüksemburg': 117,
    'Macaristan': 118,
    'Madagaskar': 119,
    'Malavi': 120,
    'Maldivler': 121,
    'Malezya': 122,
    'Mali': 123,
    'Malta': 124,
    'Marshall Adaları': 125,
    'Mauritius': 126,
    'Meksika': 127,
    'Mikronezya': 128,
    'Moldova': 129,
    'Monako': 130,
    'Moğolistan': 131,
    'Moritanya': 132,
    'Mozambik': 133,
    'Myanmar': 134,
    'Namibya': 135,
    'Nauru': 136,
    'Nepal': 137,
    'Nijer': 138,
    'Nijerya': 139,
    'Nikaragua': 140,
    'Norveç': 141,
    'Özbekistan': 142,
    'Pakistan': 143,
    'Palau': 144,
    'Panama': 145,
    'Papua Yeni Gine': 146,
    'Paraguay': 147,
    'Peru': 148,
    'Polonya': 149,
    'Portekiz': 150,
    'Romanya': 151,
    'Ruanda': 152,
    'Rusya': 153,
    'Saint Kitts ve Nevis': 154,
    'Saint Lucia': 155,
    'Saint Vincent ve Grenadinler': 156,
    'Samoa': 157,
    'San Marino': 158,
    'São Tomé ve Príncipe': 159,
    'Senegal': 160,
    'Sırbistan': 161,
    'Seyşeller': 162,
    'Sierra Leone': 163,
    'Singapur': 164,
    'Slovakya': 165,
    'Slovenya': 166,
    'Solomon Adaları': 167,
    'Somali': 168,
    'Sri Lanka': 169,
    'Sudan': 170,
    'Surinam': 171,
    'Suriye': 172,
    'Suudi Arabistan': 173,
    'Şili': 174,
    'Tacikistan': 175,
    'Tanzanya': 176,
    'Tayland': 177,
    'Togo': 178,
    'Tonga': 179,
    'Trinidad ve Tobago': 180,
    'Tunus': 181,
    'Tuvalu': 182,
    'Türkmenistan': 183,
    'Uganda': 184,
    'Ukrayna': 185,
    'Umman': 186,
    'Uruguay': 187,
    'Vatikan': 188,
    'Vanuatu': 189,
    'Venezuela': 190,
    'Vietnam': 191,
    'Yemen': 192,
    'Yeni Zelanda': 193,
    'Yunanistan': 194,
    'Zambiya': 195,
    'Zimbabve': 196
};

// Alt kategori başlıkları ve SQL'deki ID karşılıkları
const subCategories = {
    geography: [
        { name: "Genel Coğrafya", id: 9 },
        { name: "Fiziki Coğrafya", id: 10 }
    ],
    culture: [
        { name: "Kültür ve Gelenek", id: 12 },
        { name: "Yemekler", id: 13 }
    ],
    history: [
        { name: "Genel Tarih", id: 15 }
    ],
    economy: [
        { name: "Genel Ekonomi", id: 17 },
        { name: "Tarım ve Sanayi", id: 18 }
    ]
};

const mainContainer = document.getElementById('main-buttons-container');
const subContainer = document.getElementById('sub-buttons-container');
const dynamicSubButtons = document.getElementById('dynamic-sub-buttons');
const backButton = document.getElementById('back-to-main');

// 1. Ana kategori butonlarına tıklama olayı
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const categoryKey = btn.getAttribute('data-category');
        const items = subCategories[categoryKey] || [];

        // Dinamik alt butonları oluştur
        dynamicSubButtons.innerHTML = '';
        items.forEach(subItem => {
            const subBtn = document.createElement('button');
            subBtn.className = 'stat-box';
            subBtn.innerHTML = `
                <div class="stat-value">${subItem.name}</div>
            `;

            // ALT BUTONA TIKLANDIĞINDA API'YE BAĞLANMA İŞLEMİ
            subBtn.addEventListener('click', async () => {
                // Devam eden daktilo animasyonunu durdur
                if (typeof yazmaAnimasyonu !== 'undefined') {
                    clearInterval(yazmaAnimasyonu);
                }

                const activeCountryName = document.getElementById('country-name').textContent;
                const countryId = countryIdMap[activeCountryName];

                const infoTemplate = '<span class="prompt">&gt;</span> <span class="highlight" data-text-slot></span><br><br><span data-text-slot></span>';

                if (!countryId) {
                    daktiloYaz(infoTemplate, [`BÖLGE TANIMSIZ: ${activeCountryName}`, "Bu ülkenin harita eşleşmesi bulunamadı."], 'country-info', 15);
                    return;
                }

                // Animasyon bozulmasın diye country-info-template hedefleniyor
                document.getElementById('country-info-template').innerHTML = `<span class="prompt">&gt;</span> Veriler sunucudan çekiliyor... <span class="highlight">Lütfen bekleyin</span>`;

                try {
                    // API'DEN VERİ ÇEKİLİYOR
                    const response = await fetch(`/api/countrycontent/country/${countryId}/category/${subItem.id}`);

                    if (response.ok) {
                        const data = await response.json();
                        const infoText = [
                            `${activeCountryName.toUpperCase()} - ${subItem.name.toUpperCase()}`,
                            data.contentText
                        ];
                        daktiloYaz(infoTemplate, infoText, 'country-info', 12);

                    } else if (response.status === 404) {
                        daktiloYaz(infoTemplate, ["VERİ BULUNAMADI", "Bu ülke için veritabanında henüz bu kategoride bir içerik girilmemiş."], 'country-info', 15);
                    } else {
                        throw new Error("Sunucu Yanıt Hatası");
                    }
                } catch (error) {
                    console.error("API Bağlantı Hatası:", error);
                    daktiloYaz(infoTemplate, ["BAĞLANTI KOPTU", "Veritabanı sunucusuna ulaşılamadı. Lütfen API'nin çalıştığından emin olun."], 'country-info', 15);
                }
            });

            dynamicSubButtons.appendChild(subBtn);
        });

        // Ana butonları gizle, alt butonları göster
        mainContainer.style.display = 'none';
        subContainer.style.display = 'grid';
    });
});

// 2. "Geri Dön" butonuna tıklama olayı
if (backButton) {
    backButton.addEventListener('click', () => {
        subContainer.style.display = 'none';
        mainContainer.style.display = 'grid';
    });
}