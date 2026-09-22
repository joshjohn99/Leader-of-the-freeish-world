# World map presentation

The map uses Mapbox Static Images satellite imagery and a matching Web Mercator SVG projection. This fixed overview needs no WebGL camera. Every image and its overlay share the same center, zoom, dimensions, and aspect ratio. Regional close-ups make small countries and borders readable. The satellite images retain Mapbox's embedded attribution.

Mappings: Freedoma → United States, Petrovia → Russia, Karmenia → Israel, Lydian Strip → Gaza. The existing PNN neighbors Bellara, Northhaven and Eastmere use Ukraine, Belarus and Poland respectively. These are fictional game assignments, not assertions about real-world diplomatic relationships.

Country geometry: Natural Earth 1:50m Admin 0 countries, public domain. Downloaded from https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson on 2026-09-22. Only seven mapped geometries are retained in public/maps/countries.geojson; the Lydian geometry retains the Gaza component and excludes the West Bank. Outlines are generalized for game presentation.

Red fill, dashed outlines and a text warning indicate territorial conflict. The Karmenia–Lydian conflict belongs to the existing opening scenario. A recorded PNN border_dispute marks Bellara and Northhaven red. A mediation offer, aid or monitoring does not record a settlement; none clears the conflict. Trade disputes and low approval/relations are not territorial conflicts. No new simulation or saved state is introduced.

Add a country to web/world-map.ts and its corresponding geometry to the boundary collection. Add explicit event-to-conflict rules to worldMapProjection when new simulation events support them. Model-generated text never sets country colors.
