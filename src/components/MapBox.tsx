'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { geocode } from '@/lib/openstreetmap';
import { useConfig } from '@/providers/council';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import { control } from 'leaflet';

import zoom = control.zoom;

export default function MapBox() {
  const { council } = useConfig();
  const [center, setCenter] = useState<[number, number] | undefined>();
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (council?.address) {
      geocode({
        addressdetails: true,
        q: `${council.address.street}${council.address.street2 ? ` , ${council.address.street2}` : ''} ${council.address.city}, ${council.address.state} ${council.address.zipCode}`,
        countrycodes: ['us'],
        limit: 1,
      }).then((results) => {
        if (results.length > 0) {
          setCenter([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
          setResolved(results[0].display_name);
        }
      });
    }
  }, [council?.address]);

  return useMemo(
    () =>
      center && (
        <div style={{ height: '400px' }}>
          <MapContainer
            center={center}
            zoom={16}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            />
            <Marker position={center}>
              <Popup>{resolved}</Popup>
            </Marker>
          </MapContainer>
        </div>
      ),
    [center, resolved],
  );
}
