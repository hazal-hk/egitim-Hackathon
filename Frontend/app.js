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

        // ═══════ HUD CLOCK ═══════
        function updateHudTime() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('hud-time').textContent = `${h}:${m}:${s} UTC+3`;
        }
        setInterval(updateHudTime, 1000);
        updateHudTime();

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
            // Denizler ve okyanuslar
            map.addSource('dunya-denizler', {
                'type': 'geojson',
                'data': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_geography_marine_polys.geojson'
            });

            // Denizlerin ic dolgusu
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

            // Secilen deniz dolgusu
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

            // Deniz sinirlari glow efekti
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

            // Deniz ve okyanus sinir cizgileri
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

            // secilen denize glow efekti
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

            // secilen deniz siniri glow
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

            // deniz ve okyanus isimleri
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