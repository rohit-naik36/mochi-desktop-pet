# Mochi Pulse

The HR app for Mochi for Teams. It shows team totals only: mood check-in
mix, worry themes, real breaks, late nights, meeting load and feature use,
with a team picker and issues flagged for the wellness team. Teams under 8
people are hidden.

It is a separate app from Mochi, so the people using Mochi never have an HR
view on their laptop.

For now it shows sample data for the fictional Acme Demo Pvt Ltd
(`sample-data.js`, made by `tools/make-sample.py`). Real totals need the
Pulse server, which isn't built yet.

Build on Windows (or run the "Build Mochi Pulse" workflow):

    npx electron-builder --config pulse/electron-builder.yml --win nsis portable
