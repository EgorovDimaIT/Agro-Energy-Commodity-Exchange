// src/lib/ais-oracle.ts
// Реальный AIS оракул через aisstream.io (БЕСПЛАТНО)

import WebSocket from 'ws';

// ════════════════════════════════════════════
//  ПОРТЫ И ИХ КООРДИНАТЫ (Bounding Boxes)
// ════════════════════════════════════════════

export const PORT_BOUNDING_BOXES = {
    ROTTERDAM: {
        locode: 'NLRTM',
        name: 'Port of Rotterdam',
        // [lat_max, lng_min], [lat_min, lng_max]
        bbox: [[52.1, 3.8], [51.7, 4.8]] as [[number, number], [number, number]],
        lat: 51.9225,
        lng: 4.4792,
    },
    HOUSTON: {
        locode: 'USHOU',
        name: 'Port of Houston',
        bbox: [[29.9, -95.5], [29.6, -95.0]] as [[number, number], [number, number]],
        lat: 29.7604,
        lng: -95.3698,
    },
    ODESA: {
        locode: 'UAODS',
        name: 'Port of Odesa',
        bbox: [[46.6, 30.5], [46.3, 31.0]] as [[number, number], [number, number]],
        lat: 46.4825,
        lng: 30.7233,
    },
    JEBEL_ALI: {
        locode: 'AEJEA',
        name: 'Jebel Ali Port',
        bbox: [[25.1, 54.9], [24.9, 55.2]] as [[number, number], [number, number]],
        lat: 25.0118,
        lng: 55.0694,
    },
    ANTWERP: {
        locode: 'BEANR',
        name: 'Port of Antwerp',
        bbox: [[51.4, 4.0], [51.1, 4.7]] as [[number, number], [number, number]],
        lat: 51.2194,
        lng: 4.4025,
    },
};

// Соответствие токен → порт
export const TOKEN_PORT_MAP: Record<string, keyof typeof PORT_BOUNDING_BOXES> = {
    oBBL: 'ROTTERDAM',
    oLNG: 'HOUSTON',
    oWHT: 'ODESA',
    oCRN: 'HOUSTON',
    oUREA: 'JEBEL_ALI',
    oAMN: 'ANTWERP',
};

// ════════════════════════════════════════════
//  ТИПЫ
// ════════════════════════════════════════════

export interface VesselData {
    mmsi: string;
    shipName: string;
    latitude: number;
    longitude: number;
    speed: number;             // knots
    heading: number;           // degrees
    status: string;
    destination: string;
    timestamp: string;
    distanceToPort: number;    // km
    isInPort: boolean;
}

export interface OracleResult {
    portLocode: string;
    portName: string;
    tokenSymbol: string;
    vessels: VesselData[];
    activeVessels: number;
    lastUpdated: string;
    source: 'LIVE_AIS' | 'MOCK_FALLBACK';
}

// ════════════════════════════════════════════
//  AIS ORACLE — РЕАЛЬНЫЕ ДАННЫЕ
// ════════════════════════════════════════════

export async function getPortActivity(
    tokenSymbol: string,
    timeoutMs: number = 8000
): Promise<OracleResult> {
    const apiKey = process.env.AISSTREAM_API_KEY;
    const portKey = TOKEN_PORT_MAP[tokenSymbol];

    if (!portKey) {
        throw new Error(`Unknown token: ${tokenSymbol}`);
    }

    const port = PORT_BOUNDING_BOXES[portKey];

    // Если нет API ключа — используем Mock fallback
    if (!apiKey || apiKey === 'your_key_here') {
        console.warn(`⚠️ No AISSTREAM_API_KEY, using mock data for ${tokenSymbol}`);
        return getMockOracleData(tokenSymbol, port.name, port.locode);
    }

    return new Promise((resolve, reject) => {
        const vessels: Map<string, VesselData> = new Map();
        let ws: any;

        const timeout = setTimeout(() => {
            ws?.close();
            // Если получили хоть что-то — возвращаем
            if (vessels.size > 0) {
                resolve(formatOracleResult(tokenSymbol, port, vessels, 'LIVE_AIS'));
            } else {
                // Fallback на mock данные
                resolve(getMockOracleData(tokenSymbol, port.name, port.locode));
            }
        }, timeoutMs);

        try {
            ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

            ws.on('open', () => {
                // Подписываемся на AIS данные в bounding box порта
                const subscription = {
                    APIKey: apiKey,
                    BoundingBoxes: [port.bbox],
                    FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
                };
                ws.send(JSON.stringify(subscription));
            });

            ws.on('message', (data: any) => {
                try {
                    const message = JSON.parse(data.toString());
                    const meta = message.MetaData;

                    if (!meta) return;

                    const mmsi = String(meta.MMSI || '');
                    const lat = meta.latitude || meta.Latitude || 0;
                    const lng = meta.longitude || meta.Longitude || 0;
                    const shipName = (meta.ShipName || `Vessel ${mmsi}`).trim();

                    // Вычисляем расстояние до порта
                    const distance = calculateDistance(lat, lng, port.lat, port.lng);
                    const isInPort = distance < 5; // в радиусе 5 км = в порту

                    const vesselData: VesselData = {
                        mmsi,
                        shipName,
                        latitude: lat,
                        longitude: lng,
                        speed: message.Message?.PositionReport?.Sog || 0,
                        heading: message.Message?.PositionReport?.TrueHeading || 0,
                        status: getNavigationalStatus(
                            message.Message?.PositionReport?.NavigationalStatus
                        ),
                        destination: message.Message?.ShipStaticData?.Destination || 'N/A',
                        timestamp: meta.time_utc || new Date().toISOString(),
                        distanceToPort: Math.round(distance * 10) / 10,
                        isInPort,
                    };

                    vessels.set(mmsi, vesselData);

                    // Достаточно 10 судов для демо
                    if (vessels.size >= 10) {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(formatOracleResult(tokenSymbol, port, vessels, 'LIVE_AIS'));
                    }
                } catch (parseError) {
                    // Игнорируем ошибки парсинга отдельных сообщений
                }
            });

            ws.on('error', () => {
                clearTimeout(timeout);
                resolve(getMockOracleData(tokenSymbol, port.name, port.locode));
            });

        } catch (error) {
            clearTimeout(timeout);
            resolve(getMockOracleData(tokenSymbol, port.name, port.locode));
        }
    });
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════

function formatOracleResult(
    tokenSymbol: string,
    port: typeof PORT_BOUNDING_BOXES[keyof typeof PORT_BOUNDING_BOXES],
    vessels: Map<string, VesselData>,
    source: 'LIVE_AIS' | 'MOCK_FALLBACK'
): OracleResult {
    const vesselArray = Array.from(vessels.values());
    return {
        portLocode: port.locode,
        portName: port.name,
        tokenSymbol,
        vessels: vesselArray,
        activeVessels: vesselArray.filter(v => v.speed > 0 || v.isInPort).length,
        lastUpdated: new Date().toISOString(),
        source,
    };
}

// Haversine формула для расстояния между координатами
function calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
): number {
    const R = 6371; // Радиус Земли в км
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNavigationalStatus(code?: number): string {
    const statuses: Record<number, string> = {
        0: 'Under way using engine',
        1: 'At anchor',
        2: 'Not under command',
        3: 'Restricted manoeuvrability',
        5: 'Moored',
        6: 'Aground',
        7: 'Engaged in fishing',
        8: 'Under way sailing',
        15: 'Not defined',
    };
    return statuses[code ?? 15] || 'Unknown';
}

// ════════════════════════════════════════════
//  MOCK FALLBACK (если нет интернета или ключа)
// ════════════════════════════════════════════

function getMockOracleData(
    tokenSymbol: string,
    portName: string,
    portLocode: string
): OracleResult {
    const mockVessels: Record<string, VesselData[]> = {
        oBBL: [
            {
                mmsi: '245257000',
                shipName: 'NORDIC HAWK',
                latitude: 51.9102,
                longitude: 4.4820,
                speed: 0,
                heading: 270,
                status: 'Moored',
                destination: 'ROTTERDAM',
                timestamp: new Date().toISOString(),
                distanceToPort: 0.8,
                isInPort: true,
            },
            {
                mmsi: '244820000',
                shipName: 'STOLT GROENLAND',
                latitude: 51.8950,
                longitude: 4.3200,
                speed: 8.2,
                heading: 95,
                status: 'Under way using engine',
                destination: 'NLRTM',
                timestamp: new Date().toISOString(),
                distanceToPort: 8.5,
                isInPort: false,
            },
        ],
        oLNG: [
            {
                mmsi: '367719770',
                shipName: 'BAYOU BEND',
                latitude: 29.7280,
                longitude: -95.1890,
                speed: 0,
                heading: 180,
                status: 'Moored',
                destination: 'USHOU',
                timestamp: new Date().toISOString(),
                distanceToPort: 2.1,
                isInPort: true,
            },
        ],
        oWHT: [
            {
                mmsi: '272070000',
                shipName: 'MV GRAIN STAR',
                latitude: 46.4950,
                longitude: 30.7180,
                speed: 0,
                heading: 0,
                status: 'Moored',
                destination: 'UAODS',
                timestamp: new Date().toISOString(),
                distanceToPort: 1.2,
                isInPort: true,
            },
            {
                mmsi: '272163000',
                shipName: 'BLACK SEA CARRIER',
                latitude: 46.3200,
                longitude: 30.8900,
                speed: 11.5,
                heading: 345,
                status: 'Under way using engine',
                destination: 'UAODS',
                timestamp: new Date().toISOString(),
                distanceToPort: 22.4,
                isInPort: false,
            },
        ],
        oCRN: [
            {
                mmsi: '367520580',
                shipName: 'AMERICAN GRAINS',
                latitude: 29.7500,
                longitude: -95.3200,
                speed: 0,
                heading: 90,
                status: 'At anchor',
                destination: 'USHOU',
                timestamp: new Date().toISOString(),
                distanceToPort: 3.8,
                isInPort: false,
            },
        ],
        oUREA: [
            {
                mmsi: '470123000',
                shipName: 'GULF FERTILIZER',
                latitude: 25.0050,
                longitude: 55.0750,
                speed: 0,
                heading: 180,
                status: 'Moored',
                destination: 'AEJEA',
                timestamp: new Date().toISOString(),
                distanceToPort: 0.9,
                isInPort: true,
            },
        ],
        oAMN: [
            {
                mmsi: '205448000',
                shipName: 'ANTWERP SPIRIT',
                latitude: 51.2300,
                longitude: 4.4100,
                speed: 3.1,
                heading: 230,
                status: 'Under way using engine',
                destination: 'BEANR',
                timestamp: new Date().toISOString(),
                distanceToPort: 1.5,
                isInPort: true,
            },
        ],
    };

    const vessels = mockVessels[tokenSymbol] || [];

    return {
        portLocode,
        portName,
        tokenSymbol,
        vessels,
        activeVessels: vessels.filter(v => v.isInPort || v.speed > 0).length,
        lastUpdated: new Date().toISOString(),
        source: 'MOCK_FALLBACK',
    };
}
