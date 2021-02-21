# Mapping Earthquakes

> Interactive maps using jQuery, Leaflet, GeoJSON data to map earthquakes.

![Earthquake](./resources/earth.jpg)

<span>Photo by <a href="https://unsplash.com/@nasa?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">NASA</a> on <a href="https://unsplash.com/s/photos/earth-quakes?utm_source=unsplash&amp;utm_medium=referral&amp;utm_content=creditCopyText">Unsplash</a></span>

## Overview of Project

The purpose of this project is to visually show the differences between the magnitudes of earthquakes all over the world for the last seven days with jQuery, Leaflet, GeoJSON data.

## Analysis

Use a set of URLs to map earthquake data (USGS) and retrieve geographical coordinates and the magnitudes of earthquakes for the last seven days and use different styles of maps to display the information.

Data:

https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson

https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson

https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json

https://raw.githubusercontent.com/josem279/Mapping_Earthquakes/main/4.5_week.geojson

## Results

Your approach will be to use jQuery library to retrieve the coordinates and magnitudes of the earthquakes from the GeoJSON data that is hosted on earthquake.usgs.gov. Using a Mapbox API, the Leaflet JS library through an API request and create interactivity for the earthquake data.

### Maps

https://mapping-earthquakes.netlify.app/

https://public.tableau.com/profile/jovanipink#!/vizhome/MappingEarthquakes_16129898573230/MappingEarthquakes

### Theme Colors

https://learnui.design/tools/data-color-picker.html#palette

- #2454a4
- #7153ac
- #a94da7
- #d74896
- #f84d7b
- #ff635c
- #ff8339
- #ffa600

## Todo Checklist

A helpful checklist to gauge how your README is coming on what I would like to finish:

- [ ] Trying to finish a time series control where you could scrub back and forth between dates.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

1. Fork this repository;
2. Create your branch: `git checkout -b my-new-feature`;
3. Commit your changes: `git commit -m 'Add some feature'`;
4. Push to the branch: `git push origin my-new-feature`.

**After your pull request is merged**, you can safely delete your branch.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for more information.
