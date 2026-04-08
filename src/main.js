import * as echarts from 'echarts';
import { data, metadata } from './data.js';
import { HISTORICAL_EVENTS } from '../data/HistoricalEvents.js';
import { RETAILER_PROFILES } from '../data/RetailerProfiles.js';

let chart = null;
let sparkline = null;
let currentFuelType = 'Gazole';
let currentRetailer = 'National';
let isPercentageMode = false;

function initChart() {
    const chartDom = document.getElementById('mainChart');
    const sparkDom = document.getElementById('sparklineChart');
    
    if (chart) chart.dispose();
    if (sparkline) sparkline.dispose();

    const theme = document.body.getAttribute('data-theme');
    chart = echarts.init(chartDom, theme);
    sparkline = echarts.init(sparkDom, theme);

    populateSidebar();
    updateChart();
}

function populateSidebar() {
    const list = document.getElementById('eventList');
    list.innerHTML = '';
    [...HISTORICAL_EVENTS].reverse().forEach(ev => {
        const card = document.createElement('div');
        card.className = 'event-card';
        if (ev.title === 'Alignement des Taxes ⚖️') card.style.borderLeftColor = 'var(--accent-color)';
        card.innerHTML = `
            <div class="date">${ev.date}</div>
            <div class="title">${ev.title}</div>
            <div class="description">${ev.desc}</div>
        `;
        card.onclick = () => {
            const index = data.findIndex(d => d.date === ev.date || d.date === ev.label);
            if (index !== -1) {
                const start = Math.max(0, (index / data.length) * 100 - 5);
                const end = Math.min(100, (index / data.length) * 100 + 5);
                chart.setOption({ dataZoom: [{ start, end }, { start, end }] });
            }
        };
        list.appendChild(card);
    });
}

function updateChart() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const profile = RETAILER_PROFILES[currentRetailer];

    const fuelData = data.map(d => {
        const raw = d[currentFuelType];
        if (!raw) return null;
        const adjTTC = raw.total_ttc + profile.priceDelta;
        const adjDistro = Math.max(0.01, raw.marge_distribution + profile.marginDelta);

        if (!isPercentageMode) {
            return { ...raw, total_ttc: adjTTC, marge_distribution: adjDistro };
        }
        const total = adjTTC || 1;
        return {
            label: raw.label,
            brut: (raw.brut / total) * 100,
            ticpe: (raw.ticpe / total) * 100,
            cee: (raw.cee / total) * 100,
            tva: (raw.tva / total) * 100,
            marge_raffinage: (raw.marge_raffinage / total) * 100,
            marge_distribution: (adjDistro / total) * 100,
            total_ttc: 100
        };
    }).filter(d => d !== null);

    const markerStyle = {
        symbol: ['none', 'none'],
        lineStyle: { type: 'dashed', color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)', width: 2 },
        label: {
            position: 'end', fontSize: 10, fontWeight: 'bold', borderRadius: 4, padding: [4, 6],
            backgroundColor: isDark ? '#1e293b' : '#f8fafc', color: isDark ? '#fff' : '#1e293b'
        },
        data: HISTORICAL_EVENTS.map((ev, i) => ({
            xAxis: ev.label || ev.date,
            label: {
                formatter: ev.markerLabel,
                offset: ev.offsetLeft ? [-60, 10] : (i % 2 === 0 ? [0, 10] : [0, 50])
            }
        }))
    };

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis', axisPointer: { type: 'cross' },
            formatter: (p) => {
                let res = `<strong>${p[0].name}</strong><br/>`;
                const raw = fuelData[p[0].dataIndex];
                if (raw && raw.brentUSD) {
                    res += `<span style="font-size:0.75rem; color:var(--text-secondary); opacity:0.8;">(Base: Baril Spot ${raw.brentUSD.toFixed(1)}$ / Taux EUR/USD ${raw.ex.toFixed(3)})</span><br/><br/>`;
                }
                
                p.forEach(s => {
                    if (s.seriesName === 'Prix à la Pompe (TTC)' && isPercentageMode) return;
                    res += `${s.marker} ${s.seriesName}: <b>${s.value.toFixed(3)}${isPercentageMode ? '%' : '€'}</b><br/>`;
                });
                return res;
            }
        },
        grid: { left: '2%', right: '5%', bottom: '15%', top: '8%', containLabel: true },
        dataZoom: [
            { type: 'inside', start: 70, end: 100 },
            {
                show: true, type: 'slider', bottom: '2%', start: 70, end: 100,
                height: 25, borderColor: 'transparent',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                fillerColor: 'rgba(37, 99, 235, 0.2)',
                handleStyle: { color: '#2563eb', shadowBlur: 3, shadowColor: 'rgba(0,0,0,0.3)' },
                moveHandleStyle: { color: 'rgba(37, 99, 235, 0.4)' },
                textStyle: { color: 'transparent' },
                showDetail: false
            }
        ],
        xAxis: { type: 'category', boundaryGap: false, data: fuelData.map(d => d.label) },
        yAxis: { type: 'value', min: 0, max: isPercentageMode ? 100 : null },
        series: [
            { name: 'Pétrole (Brut)',         type: 'line', stack: 'base', itemStyle: { color: isDark ? '#64748b' : '#4b5563' }, areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.brut), markLine: markerStyle },
            { name: 'Taxe État (TICPE)',       type: 'line', stack: 'base', itemStyle: { color: '#2563eb' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.ticpe) },
            { name: 'Taxe Écolo (CEE)',        type: 'line', stack: 'base', itemStyle: { color: '#0ea5e9' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.cee) },
            { name: 'TVA',                     type: 'line', stack: 'base', itemStyle: { color: '#ef4444' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.tva) },
            { name: 'Marge Raffinage',         type: 'line', stack: 'base', itemStyle: { color: '#f59e0b' },                     areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.marge_raffinage) },
            { name: 'Distribution & Logistique', type: 'line', stack: 'base', itemStyle: { color: '#10b981' },                   areaStyle: { opacity: 1 }, showSymbol: false, data: fuelData.map(d => d.marge_distribution) }
        ]
    };

    if (!isPercentageMode) {
        option.series.push({
            name: 'Prix à la Pompe (TTC)', type: 'line', symbol: 'none',
            itemStyle: { color: isDark ? '#ffffff' : '#000000' },
            lineStyle: { width: 3 },
            data: fuelData.map(d => d.total_ttc)
        });
    }

    chart.setOption(option, true);
    
    // Les encarts statistiques du haut DOIVENT toujours rester en mode Euros (€), même quand le graphique passe en "%"
    const latestRaw = data[data.length - 1][currentFuelType];
    const prevDayRaw = data[data.length - 2] ? data[data.length - 2][currentFuelType] : latestRaw;
    const prev7DaysRaw = data[data.length - 8] ? data[data.length - 8][currentFuelType] : (data[0][currentFuelType] || latestRaw);

    const latestReal = {
        ...latestRaw,
        total_ttc: latestRaw.total_ttc + profile.priceDelta,
        marge_raffinage: Math.max(0.01, latestRaw.marge_raffinage + profile.marginDelta),
        marge_distribution: Math.max(0.01, latestRaw.marge_distribution + profile.marginDelta)
    };

    const comparisons = {
        yesterday: prevDayRaw.total_ttc + profile.priceDelta,
        sevenDays: prev7DaysRaw.total_ttc + profile.priceDelta
    };
    updateStats(latestReal, comparisons);
}

function updateStats(current, comparisons) {
    const priceCard = document.getElementById('currentPriceCard');
    const prevPrice = comparisons.yesterday;
    priceCard.querySelector('.value').innerText = `${current.total_ttc.toFixed(3)}€`;
    
    // Add or Update comparison sub-row
    let compRow = priceCard.querySelector('.comparison-row');
    if (!compRow) {
        compRow = document.createElement('div');
        compRow.className = 'comparison-row';
        priceCard.appendChild(compRow);
    }
    compRow.innerHTML = `
        <div class="comp-item"><span>Veille:</span> <strong>${comparisons.yesterday.toFixed(3)}€</strong></div>
        <div class="comp-item"><span>7j:</span> <strong>${comparisons.sevenDays.toFixed(3)}€</strong></div>
    `;

    const taxShare = ((current.ticpe + current.cee + current.tva) / current.total_ttc * 100).toFixed(0);
    document.getElementById('taxShareCard').querySelector('.value').innerText = `${taxShare}%`;
    
    // Marge brute globale
    const margeTotale = current.marge_raffinage + current.marge_distribution;
    const marginDiff = margeTotale - 0.20; // Moyenne de référence 2021 (~0.20€)
    const sign = marginDiff > 0 ? '+' : '';
    const color = marginDiff > 0.05 ? '#ef4444' : (marginDiff > 0 ? '#f59e0b' : '#10b981');
    
    const marginCard = document.getElementById('marginTrendCard');
    if (marginCard) {
        const valEl = marginCard.querySelector('.value');
        if (valEl) valEl.innerText = `${margeTotale.toFixed(3)}€`;
        
        const subtext = marginCard.querySelector('.subtext');
        if (subtext) {
            subtext.innerHTML = `Écart moyenne 2021 : <span style="color:${color}; font-weight:600;">${sign}${marginDiff.toFixed(3)}€</span>`;
        }
    }
    
    // Warning Raffinage anormal
    if (current.marge_raffinage > 0.25) {
        marginCard.style.borderColor = '#ef4444';
        marginCard.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.3)';
    } else {
        marginCard.style.borderColor = '';
        marginCard.style.boxShadow = '';
    }

    updateSparkline(current, comparisons);
}

function updateSparkline(current, comparisons) {
    const last30 = data.slice(-30);
    const profile = RETAILER_PROFILES[currentRetailer];
    
    // Calcul de la série TTC brute 30j
    const seriesData = last30.map(d => {
        const raw = d[currentFuelType];
        return raw ? (raw.total_ttc + profile.priceDelta) : null;
    });

    const d1 = current.total_ttc - comparisons.yesterday;
    const d7 = current.total_ttc - comparisons.sevenDays;

    const getBadge = (val, label) => {
        const cls = val > 0.001 ? 'up' : (val < -0.001 ? 'down' : '');
        const sign = val > 0 ? '+' : '';
        const icon = val > 0.001 ? '▲' : (val < -0.001 ? '▼' : '−');
        return `<div class="var-badge ${cls}">${label} ${icon} ${sign}${val.toFixed(3)}€</div>`;
    };

    const card = document.getElementById('trendFocusCard');
    if (card) {
        card.querySelector('.variation-stats').innerHTML = getBadge(d1, '24h') + getBadge(d7, '7j');
    }

    if (sparkline) {
        sparkline.setOption({
            grid: { left: 0, right: 0, top: 4, bottom: 4 },
            xAxis: { type: 'category', show: false },
            yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
            series: [{
                data: seriesData,
                type: 'line',
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2, color: '#3b82f6' },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
                        { offset: 1, color: 'rgba(59, 130, 246, 0)' }
                    ])
                }
            }]
        });
    }
}

document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.setAttribute('data-theme', document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    initChart();
});

document.getElementById('scaleToggle').addEventListener('click', (e) => {
    isPercentageMode = !isPercentageMode;
    e.target.innerText = isPercentageMode ? 'Mode €' : 'Mode %';
    updateChart();
});

document.getElementById('fuelTypeSwitcher').addEventListener('click', (e) => {
    if (e.target.dataset.type) {
        document.querySelectorAll('#fuelTypeSwitcher .control-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFuelType = e.target.dataset.type;
        updateChart();
    }
});

document.getElementById('retailerSwitcher').addEventListener('click', (e) => {
    if (e.target.dataset.retailer) {
        document.querySelectorAll('#retailerSwitcher .control-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentRetailer = e.target.dataset.retailer;
        updateChart();
    }
});

window.addEventListener('resize', () => { if (chart) chart.resize(); });

if (metadata && metadata.generated_at) {
    const d = new Date(metadata.generated_at);
    const dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const lastUpdateSpan = document.getElementById('lastUpdateSpan');
    if (lastUpdateSpan) {
        lastUpdateSpan.innerText = `🔄 Données mises à jour le ${dateStr} à ${timeStr}`;
    }
}

initChart();

