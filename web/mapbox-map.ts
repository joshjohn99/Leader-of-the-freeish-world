import type { World } from '../shared/schemas/oil-crisis.ts';
import './world-map.css';
import { countryForMapEvent, mapCountries, worldMapProjection, type MapCountryId } from './world-map.ts';

type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
type Boundary = { properties: { id: MapCountryId }; geometry: Geometry };
type MapView = { width: number; height: number; center: [number, number]; zoom: number };
const worldView: MapView = { width: 1200, height: 660, center: [0, 20], zoom: 1.1 };
const europeView: MapView = { width: 460, height: 230, center: [27, 51.8], zoom: 3.5 };
const stripView: MapView = { width: 460, height: 230, center: [34.85, 31.8], zoom: 6.6 };
const ns = 'http://www.w3.org/2000/svg';
let boundaries: Promise<Boundary[]> | undefined;

function mercator(latitude: number) {
  const angle = Math.max(-85, Math.min(85, latitude)) * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + angle / 2));
}
function project(location: readonly number[], view: MapView) {
  const scale = 512 * 2 ** view.zoom;
  return [view.width / 2 + (location[0] - view.center[0]) / 360 * scale,
    view.height / 2 - (mercator(location[1]) - mercator(view.center[1])) / (2 * Math.PI) * scale];
}
function pathFor(geometry: Geometry, view: MapView) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  return polygons.map(polygon => polygon.map(ring => ring.map((point, i) => {
    const [x, y] = project(point, view);
    return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + 'Z').join(' ')).join(' ');
}
function element<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string> = {}) {
  const node = document.createElementNS(ns, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

/** A fixed Mapbox world overview: imagery, borders and labels share one projection.
 * No camera or WebGL context is required; SVG controls remain keyboard accessible. */
export function mountMapboxMap(container: HTMLElement, buttons: HTMLButtonElement[], world: World, openPanel: (panel: string) => void) {
  const projection = worldMapProjection(world);
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
  container.classList.add('world-atlas');
  container.closest('.strategy-map')?.classList.add('has-mapbox', 'has-world-atlas');
  const status = document.createElement('p');
  status.className = 'atlas-status';
  status.setAttribute('role', 'status');
  status.textContent = 'World overview · Red countries have an active territorial conflict';
  container.append(status);
  const worldFrame = document.createElement('div');
  worldFrame.className = 'atlas-world';
  container.append(worldFrame);
  const insets = document.createElement('div');
  insets.className = 'atlas-insets';
  container.append(insets);
  const views: { svg: SVGSVGElement; view: MapView; ids: readonly MapCountryId[]; world: boolean }[] = [];
  let selected: MapCountryId = 'freedoma';
  const inspector = document.createElement('div');
  inspector.className = 'atlas-inspector';
  inspector.setAttribute('aria-live', 'polite');
  const countries = document.createElement('nav');
  countries.className = 'atlas-countries';
  countries.setAttribute('aria-label', 'Select a country');

  function select(id: MapCountryId) {
    selected = id;
    const country = projection.countries.find(item => item.id === id)!;
    const ties = projection.ties.filter(tie => tie.a === id || tie.b === id).map(tie => {
      const neighbor = mapCountries.find(item => item.id === (tie.a === id ? tie.b : tie.a))!;
      return `${neighbor.name}: ${tie.label.toLowerCase()}`;
    });
    inspector.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = country.name;
    const description = document.createElement('span');
    description.textContent = `${country.reason}${ties.length ? ` Border ties — ${ties.join('; ')}.` : ''}`;
    const action = document.createElement('button');
    action.textContent = country.panel === 'voss' ? 'Open security channel →' : country.panel === 'phone' ? 'Call Petrov →' : country.panel === 'news' ? 'Open PNN →' : 'Enter office →';
    action.onclick = () => openPanel(country.panel);
    inspector.append(title, description, action);
    container.querySelectorAll<HTMLElement>('[data-country]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.country === selected)));
  }

  function makeView(host: HTMLElement, view: MapView, ids: readonly MapCountryId[], isWorld = false) {
    const svg = element('svg', { viewBox: `0 0 ${view.width} ${view.height}`, class: 'atlas-svg', role: 'group', 'aria-label': isWorld ? 'World map with fictional countries' : 'Regional border close-up' });
    const base = element('rect', { width: String(view.width), height: String(view.height), fill: '#142c39' });
    svg.append(base);
    if (token) {
      const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${view.center.join(',')},${view.zoom},0/${view.width}x${view.height}@2x?access_token=${encodeURIComponent(token)}`;
      const image = element('image', { href: url, width: String(view.width), height: String(view.height), 'aria-hidden': 'true' });
      image.addEventListener('error', () => { status.textContent = 'Satellite imagery unavailable · Country borders and controls remain available'; });
      svg.append(image);
    } else status.textContent = 'Satellite imagery needs a Mapbox token · Country borders remain available';
    host.append(svg);
    views.push({ svg, view, ids, world: isWorld });
  }
  makeView(worldFrame, worldView, mapCountries.map(country => country.id), true);
  for (const [title, view, ids] of [
    ['NORTHERN BORDERLANDS', europeView, ['eastmere', 'bellara', 'northhaven']],
    ['KARMENIA / LYDIAN STRIP', stripView, ['karmenia', 'lydian']],
  ] as const) {
    const inset = document.createElement('section');
    const heading = document.createElement('h3');
    heading.textContent = title;
    inset.append(heading);
    makeView(inset, view, ids);
    insets.append(inset);
  }
  for (const country of projection.countries) {
    const button = document.createElement('button');
    button.className = `atlas-country${country.conflict ? ' in-conflict' : ''}`;
    button.dataset.country = country.id;
    button.setAttribute('aria-pressed', String(country.id === selected));
    const flag = document.createElement('span');
    flag.className = 'atlas-flag';
    flag.style.setProperty('--flag-color', country.flag);
    flag.textContent = '✦';
    flag.setAttribute('aria-hidden', 'true');
    button.append(flag, `${country.name}${country.conflict ? ' · ⚠ Conflict' : ''}`);
    button.onclick = () => select(country.id);
    countries.append(button);
  }
  const legend = document.createElement('p');
  legend.className = 'atlas-legend';
  legend.textContent = '⚠ Red fill + dashed border: territorial conflict · Gold border: mapped country · Thin lines: shared borders';
  container.append(countries, inspector, legend);
  select(selected);

  boundaries ??= fetch('/maps/countries.geojson').then(response => {
    if (!response.ok) throw Error('Country outlines unavailable');
    return response.json();
  }).then(data => data.features);
  void boundaries.then(features => {
    if (!container.isConnected) return;
    for (const { svg, view, ids, world: isWorld } of views) {
      for (const boundary of features) {
        if (!ids.includes(boundary.properties.id)) continue;
        const country = projection.countries.find(item => item.id === boundary.properties.id)!;
        const path = element('path', { d: pathFor(boundary.geometry, view), class: `atlas-border${country.conflict ? ' in-conflict' : ''}`,
          fill: country.conflict ? '#ed3f4c' : country.color, 'fill-opacity': country.conflict ? '.64' : '.22',
          stroke: country.conflict ? '#ff8990' : '#e0c783', 'stroke-width': isWorld ? '1.2' : '1.6',
          'fill-rule': 'evenodd', 'vector-effect': 'non-scaling-stroke', role: 'button', tabindex: '0',
          'aria-label': `${country.name}: ${country.conflict ? 'territorial conflict' : 'no territorial conflict recorded'}`, 'data-country': country.id });
        path.addEventListener('click', () => select(country.id));
        path.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(country.id); } });
        svg.append(path);
      }
      // Labels are geographic anchors, with short leader lines to avoid overlaps.
      const offsets: Partial<Record<MapCountryId, [number, number]>> = isWorld
        ? { eastmere: [-81, -43], northhaven: [0, -76], bellara: [71, -24], karmenia: [72, 9], lydian: [58, 41] }
        : view === stripView ? { karmenia: [63, -5], lydian: [-49, 14] } : { eastmere: [-15, -14], northhaven: [0, -14], bellara: [18, 9] };
      for (const country of projection.countries.filter(country => ids.includes(country.id))) {
        const [x, y] = project(country.location, view);
        const [dx, dy] = offsets[country.id] ?? [0, 0];
        if (dx || dy) svg.append(element('line', { x1: String(x), y1: String(y), x2: String(x + dx), y2: String(y + dy), stroke: '#fff1ca', 'stroke-width': '1', opacity: '.7' }));
        const label = element('text', { x: String(x + dx), y: String(y + dy), class: 'atlas-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
        label.textContent = `${country.conflict ? '⚠ ' : ''}${country.name}`;
        svg.append(label);
      }
    }
    select(selected);
  }).catch(() => { boundaries = undefined; status.textContent = 'Country borders could not load. Reload to retry; country controls are still available.'; });

  // Retain the existing event buttons and their handlers, anchored to countries.
  const markerLayer = document.createElement('div');
  markerLayer.className = 'atlas-event-markers';
  worldFrame.append(markerLayer);
  const counts = new Map<string, number>();
  for (const button of buttons) {
    const eventId = Number(button.dataset.marker?.split('-').at(-1));
    const id = countryForMapEvent(world.events.find(event => event.id === eventId));
    const country = mapCountries.find(item => item.id === id)!;
    const [x, y] = project(country.location, worldView);
    const count = counts.get(id) ?? 0;
    counts.set(id, count + 1);
    button.style.left = `${(x + (count % 3) * 35) / worldView.width * 100}%`;
    button.style.top = `${(y + 25 + Math.floor(count / 3) * 35) / worldView.height * 100}%`;
    markerLayer.append(button);
  }
  return { remove: () => container.replaceChildren() };
}
