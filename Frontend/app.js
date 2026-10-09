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
            // dunya ulkeleri
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

            // ulkelerin ust dolgusu
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

            // diger ulkeler karartma layeri
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

            // secilen ulke vurgu
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

            // sinir cizgileri
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

            // secilen ulke glow
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

            // secilen ulke sinirlari
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

            // ulke isimleri
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

            // tekli isim
            map.addSource('secili-ulke-nokta', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });

            // secilen ulke isim
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

        // yazma animasyonu
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

        // deniz hover
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
            'Caribbean Sea': 'Karayip Denizi, Orta Amerika ile Antiller arasında, Atlas Okyanusu’na bağlı tropikal bir denizdir.',
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