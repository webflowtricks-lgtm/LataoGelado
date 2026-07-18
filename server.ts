import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Helper functions for delivery info calculation
  function getStreetAndNumber(address: string): { street: string; number: string } {
    let normalized = address.trim();

    // 1. Remove CEP (e.g. 86060-000)
    normalized = normalized.replace(/\b\d{5}-?\d{3}\b/g, '');

    // 2. Remove typical complements and everything after
    const complementsRegex = /\b(apto|ap|casa|bloco|bl|loja|lj|sala|sl|fundos|sobrado|condomínio|cond|residencial|lote|qd|qda|quadra)\b.*/gi;
    normalized = normalized.replace(complementsRegex, '');

    let street = "";
    let number = "";

    // Split by comma
    const parts = normalized.split(',').map(p => p.trim()).filter(Boolean);
    
    if (parts.length > 0) {
      street = parts[0];
      
      // Check if the first part contains a number at the end, e.g., "Rua Waldomiro Fernandes 90"
      const endNumMatch = street.match(/\s+(\d+[a-zA-Z]?)$/);
      if (endNumMatch) {
        number = endNumMatch[1];
        street = street.substring(0, street.length - endNumMatch[0].length).trim();
      } else if (parts.length > 1) {
        // The second part might be the number
        const secondPart = parts[1];
        const numMatch = secondPart.match(/^\s*(?:nº|n|num|numero)?\s*(\d+[a-zA-Z]?)(?:\s+|-|$)/i);
        if (numMatch) {
          number = numMatch[1];
        }
      }
    }

    // If we still don't have a number, search for any standalone number in the whole address
    if (!number) {
      const anyNumMatch = normalized.match(/\b\d+[a-zA-Z]?\b/);
      if (anyNumMatch) {
        number = anyNumMatch[0];
        // Remove that number from the street name if it's there
        street = street.replace(new RegExp(`\\b${number}\\b`), '').trim();
      }
    }

    // Clean street name from common abbreviations and junk
    street = street
      .replace(/\b[rR]\b\.?/g, 'Rua')
      .replace(/\b[aA]v\b\.?/g, 'Avenida')
      .replace(/\b[aA]ve\b\.?/g, 'Avenida')
      .replace(/\b(londrina|parana|pr|brasil|brazil)\b/gi, '')
      .replace(/[-–—,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { street, number };
  }

  async function fallbackGeocode(address: string): Promise<{ lat: number; lon: number } | null> {
    const cepMatch = address.match(/\b(\d{5})-?(\d{3})\b/);
    if (cepMatch) {
      const cep = cepMatch[1] + cepMatch[2];
      try {
        const response = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.lat && data.lng) {
            if (data.city && data.city.toLowerCase().includes('londrina')) {
              return { lat: parseFloat(data.lat), lon: parseFloat(data.lng) };
            }
          }
        }
      } catch (e) {
        console.error("Error fetching CEP from AwesomeAPI in backend:", e);
      }

      try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.location && data.location.coordinates) {
            const lat = parseFloat(data.location.coordinates.latitude);
            const lon = parseFloat(data.location.coordinates.longitude);
            if (data.city && data.city.toLowerCase().includes('londrina')) {
              return { lat, lon };
            }
          }
        }
      } catch (e) {
        console.error("Error fetching CEP from BrasilAPI in backend:", e);
      }
    }

    const { street, number } = getStreetAndNumber(address);
    if (!street) return null;

    const isStreetNameMatch = (requested: string, returned: string): boolean => {
      if (!requested || !returned) return false;
      const clean = (s: string) => s.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/\b(rua|avenida|av|r|travessa|tv|alameda|al|praca|pc|rodovia|rod)\b\.?/gi, "") // remove types
        .replace(/[^a-z0-9]/g, " ") // remove special chars
        .replace(/\s+/g, " ")
        .trim();
      const reqClean = clean(requested);
      const retClean = clean(returned);
      if (!reqClean || !retClean) return false;
      return reqClean.includes(retClean) || retClean.includes(reqClean);
    };

    // 1. Try structured search with address details (extremely reliable for Nominatim)
    try {
      const streetQuery = number ? `${number} ${street}` : street;
      const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(streetQuery)}&city=Londrina&state=Parana&country=Brazil&limit=10&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'CardapioDigital/1.0', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          for (const d of data) {
            if (!d.address) continue;
            const road = d.address.road || d.address.pedestrian || d.address.cycleway || d.address.footway || d.address.path;
            if (road && isStreetNameMatch(street, road)) {
              return { lat: parseFloat(d.lat), lon: parseFloat(d.lon) };
            }
          }
        }
      }
    } catch (e) {
      console.error("Error in backend Geocode (Structured):", e);
    }

    // 2. Try unstructured search query with address details
    try {
      const query = `${street}${number ? ' ' + number : ''}, Londrina, PR, Brasil`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'CardapioDigital/1.0', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          for (const d of data) {
            if (!d.address) continue;
            const road = d.address.road || d.address.pedestrian || d.address.cycleway || d.address.footway || d.address.path;
            if (road && isStreetNameMatch(street, road)) {
              return { lat: parseFloat(d.lat), lon: parseFloat(d.lon) };
            }
          }
        }
      }
    } catch (e) {
      console.error("Error in backend Geocode (Unstructured):", e);
    }

    // 3. Fallback: Search without house number (street only) to ensure we get coordinates on the correct street
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&street=${encodeURIComponent(street)}&city=Londrina&state=Parana&country=Brazil&limit=10&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'CardapioDigital/1.0', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          for (const d of data) {
            if (!d.address) continue;
            const road = d.address.road || d.address.pedestrian || d.address.cycleway || d.address.footway || d.address.path;
            if (road && isStreetNameMatch(street, road)) {
              return { lat: parseFloat(d.lat), lon: parseFloat(d.lon) };
            }
          }
        }
      }
    } catch (e) {
      console.error("Error in backend Geocode (Street fallback):", e);
    }

    // 4. Ultimate unstructured fallback
    try {
      const query = `${street}, Londrina, PR, Brasil`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const response = await fetch(url, { headers: { 'User-Agent': 'CardapioDigital/1.0', 'Accept-Language': 'pt-BR,pt;q=0.9' } });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          for (const d of data) {
            if (!d.address) continue;
            const road = d.address.road || d.address.pedestrian || d.address.cycleway || d.address.footway || d.address.path;
            if (road && isStreetNameMatch(street, road)) {
              return { lat: parseFloat(d.lat), lon: parseFloat(d.lon) };
            }
          }
          // If still no exact road match in addressdetails but we got results, return the first one as absolute last resort
          return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
      }
    } catch (e) {
      console.error("Error in backend Geocode (Ultimate fallback):", e);
    }

    return null;
  }

  function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return parseFloat(d.toFixed(2));
  }

  async function fallbackDrivingDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.routes && data.routes.length > 0) {
          const distanceMeters = data.routes[0].distance;
          return parseFloat((distanceMeters / 1000).toFixed(2));
        }
      }
    } catch (e) {
      console.error("Backend OSRM driving distance error, falling back to Haversine:", e);
    }
    
    const haversine = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    return parseFloat((haversine * 1.3).toFixed(2));
  }

  function calculateDeliveryFeeByDistance(distance: number): number {
    if (distance <= 1.0) return 3.00;
    if (distance <= 2.5) return 5.00;
    if (distance <= 5.0) return 8.00;
    if (distance <= 8.0) return 12.00;
    if (distance <= 12.0) return 15.00;
    return 20.00;
  }

  async function googleGeocode(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return { lat: loc.lat, lng: loc.lng };
        }
        console.warn(`Google Maps Geocode API returned status: ${data.status} for address: ${address}`);
      }
    } catch (e) {
      console.error("Google Geocode Error:", e);
    }
    return null;
  }

  async function googleDirectionsRoute(origin: string, destination: string, apiKey: string): Promise<{ distanceKm: number; startCoords: { lat: number; lng: number }; endCoords: { lat: number; lng: number } } | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving&key=${apiKey}&language=pt-BR`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.routes && data.routes.length > 0 && data.routes[0].legs && data.routes[0].legs.length > 0) {
          const leg = data.routes[0].legs[0];
          const distanceMeters = leg.distance.value;
          const distanceKm = parseFloat((distanceMeters / 1000).toFixed(2));
          const startCoords = { lat: leg.start_location.lat, lng: leg.start_location.lng };
          const endCoords = { lat: leg.end_location.lat, lng: leg.end_location.lng };
          return { distanceKm, startCoords, endCoords };
        }
        console.warn(`Google Maps Directions API returned non-OK status: ${data.status} for route from "${origin}" to "${destination}"`);
      }
    } catch (e) {
      console.error("Google Directions Error:", e);
    }
    return null;
  }

  app.post("/api/delivery-info", async (req, res) => {
    try {
      const { storeAddress, deliveryAddress } = req.body;
      if (!deliveryAddress || !deliveryAddress.trim()) {
        return res.status(400).json({ error: "Endereço de entrega é obrigatório." });
      }

      const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
      const isGoogleEnabled = !!apiKey && apiKey !== "YOUR_API_KEY" && apiKey.trim() !== "";

      // Construct precise queries for starting and ending points, ensuring we stay within Londrina, PR
      let originQuery = storeAddress && storeAddress.trim() ? storeAddress : "Rua Waldomiro Fernandes, 90 - Tokio, Londrina - PR, Brasil";
      if (!originQuery.toLowerCase().includes("londrina")) {
        originQuery += ", Londrina - PR, Brasil";
      }

      let destQuery = deliveryAddress.trim();
      if (!destQuery.toLowerCase().includes("londrina")) {
        destQuery += ", Londrina - PR, Brasil";
      }

      let distanceKm = 0;
      let sLat = -23.3112214;
      let sLon = -51.1968773; // Defaults for Rua Waldomiro Fernandes, 90
      let dLat: number | null = null;
      let dLon: number | null = null;
      let source = "fallback";

      if (isGoogleEnabled) {
        // Try the highly accurate Directions API which calculates the exact closest driving route based on actual road network
        const routeResult = await googleDirectionsRoute(originQuery, destQuery, apiKey!);
        if (routeResult) {
          distanceKm = routeResult.distanceKm;
          sLat = routeResult.startCoords.lat;
          sLon = routeResult.startCoords.lng;
          dLat = routeResult.endCoords.lat;
          dLon = routeResult.endCoords.lng;
          source = "google-maps";
        }
      }

      if (source === "fallback") {
        // Fallback to custom Nominatim geocoding and OSRM routing
        const cleanStoreAddr = originQuery.toLowerCase();
        const isDefaultStore = cleanStoreAddr.includes("waldomiro") && cleanStoreAddr.includes("londrina");
        
        if (!isDefaultStore) {
          const coordsFallback = await fallbackGeocode(originQuery);
          if (coordsFallback) {
            sLat = coordsFallback.lat;
            sLon = coordsFallback.lon;
          }
        }

        const coordsFallback = await fallbackGeocode(destQuery);
        if (coordsFallback) {
          dLat = coordsFallback.lat;
          dLon = coordsFallback.lon;
        }

        if (dLat === null || dLon === null) {
          return res.status(404).json({ error: "Endereço de entrega não localizado. Verifique se o endereço é válido em Londrina." });
        }

        distanceKm = await fallbackDrivingDistance(sLat, sLon, dLat, dLon);
      }

      // Calculate delivery fee based on the exact driving distance
      const deliveryFee = calculateDeliveryFeeByDistance(distanceKm);

      return res.json({
        success: true,
        distanceKm,
        deliveryFee,
        storeCoords: { lat: sLat, lon: sLon },
        deliveryCoords: { lat: dLat, lon: dLon },
        source
      });

    } catch (error: any) {
      console.error("Error in /api/delivery-info:", error);
      return res.status(500).json({ error: "Erro interno ao calcular distância de entrega." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
