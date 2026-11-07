# Forget Me Nots

A responsive household plant-care prototype inspired by Sheikh Elias’s [AI Plant Care Mobile App](https://dribbble.com/shots/27550819-AI-Plant-Care-Mobile-App). Built with HTML, CSS and JavaScript, with no installation or API keys needed.

## Run

Requires Node.js 18 or newer.

```sh
npm start
```

Open http://127.0.0.1:5173. Run `npm run check` for JavaScript syntax checks.

## Features

- Three-step animated botanical onboarding with skip, back, saved completion and reduced-motion support.
- Add and remove household plants, with room filters and plant details.
- Set watering intervals and next watering dates; mark plants as watered.
- Upload a plant image and receive a clearly labeled, randomized mock assessment. No image is sent to a server.
- Rotate through a collection of plant facts.
- Save plant records and watering dates in browser local storage.

The initial garden contains sample plants. Watering reminders appear inside the app; there are no background or push notifications. Photo identification is a mock, not computer vision. Plant images use Unsplash; the hero is AI-generated. An internet connection is needed for the card photos and font, with system-font fallback.
