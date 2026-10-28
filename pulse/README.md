# Mochi Pulse

The HR app for Mochi for Teams. It shows team totals only: mood check-in
mix, worry themes, real breaks, late nights, meeting load and feature use,
with a team picker and issues flagged for the wellness team. Teams under 8
people are hidden.

It also shows the company's weekly question results and wellness campaigns,
and makes the reports HR takes to leadership: a pilot report and a quarterly
review (PDF, with suggested actions) and BRSR Principle 3 figures (CSV).

It is a separate app from Mochi, so the people using Mochi never have an HR
view on their laptop.

HR opens it with a Pulse key from Little Smoke Studio (see
`server/ADMIN.md`), and it loads the company's real totals and seat count from
the Mochi for Teams server. "Look around with sample data" shows the
fictional Acme Demo Pvt Ltd (`sample-data.js`, made by `tools/make-sample.py`)
for demos.

Build on Windows (or run the "Build Mochi Pulse" workflow):

    npx electron-builder --config pulse/electron-builder.yml --win nsis portable
