# Developer ID certificate renewal runbook

The Developer ID Application certificate expires after a fixed period. After that, new builds can no longer be signed, and the release stops. This runbook covers renewing it. It holds no secret values. The Apple developer account belongs to the CEO, so the CEO does the steps marked (CEO).

## When to start

Start at least 4 weeks before the expiry date shown in the Apple developer portal (Certificates). That leaves time for a failed build or an Apple delay. Apps already signed and notarized keep working after expiry; only new signing is affected.

## Steps

1. (CEO) Create the new certificate.
   - On a Mac, open Keychain Access, then Certificate Assistant, then Request a Certificate From a Certificate Authority. Save the request to disk.
   - In the Apple developer portal, under Certificates, create a new "Developer ID Application" certificate with that request. Download it and double-click to install it in the login keychain.
2. (CEO) Export it as a `.p12`.
   - In Keychain Access, find the new "Developer ID Application" certificate with its private key. Right-click, Export, choose `.p12`, and set a strong password.
   - Base64 it on one line: `base64 -i DeveloperID.p12 | pbcopy`
3. (CEO) Update the secrets in the `mac-signing` GitHub environment (Settings, Environments, mac-signing). These are environment secrets, not repository secrets. Names are listed in `.github/workflows/build-mac.yml` (header comment and the `signed` job):
   - `MAC_CERT_P12`: the base64 text from step 2.
   - `MAC_CERT_PASSWORD`: the `.p12` password.
   - `APPLE_ID`, `APPLE_APP_PASSWORD`, `APPLE_TEAM_ID`: these only change if the Apple ID, its app-specific password, or the team changed. Otherwise leave them.
   - Optional, only if the Mac App Store package is in use: `MAS_CERT_P12`, `MAS_CERT_PASSWORD`, `MAS_PROVISION`. These use different certificates (Apple Distribution and Mac Installer Distribution) and have their own expiry. Check them at the same time.
   Then delete the `.p12` file and clear the clipboard. Keep the old certificate in the portal until the check below passes.
4. Run one signed build. In GitHub Actions, run "Build Mac" with Run workflow on branch `main` (`workflow_dispatch`). The `signed` job on `main` signs, notarizes, and keeps the result in a private draft release named "Mac signed build N". The job stops with an error if any required secret is empty.
5. Check the result.
   - The `signed` job already runs these on the built app: `codesign --verify --deep --strict --verbose=2`, `codesign -dv` (must show `Authority=Developer ID Application`), `xcrun stapler validate`, and `spctl --assess --type execute --verbose=2`. Confirm the job is green.
   - To check a downloaded DMG by hand on a Mac, download it from the draft release into an empty folder, open it, copy the app out, then run:
     ```
     app="/path/to/Mochi.app"
     codesign --verify --deep --strict --verbose=2 "$app"
     codesign -dv "$app" 2>&1 | grep Authority
     xcrun stapler validate "$app"
     spctl --assess --type execute --verbose=2 "$app"
     ```
   - Expected: no codesign errors, an `Authority=Developer ID Application` line, "The validate action worked!", and "accepted" with source "Notarized Developer ID".
   - Also open the app once from the DMG on a Mac to confirm Gatekeeper does not block it.
6. Clean up. Delete the draft release if it is not needed. After a release has shipped with the new certificate, the old certificate can be revoked in the portal (CEO).

## If it fails

- "not signed with Developer ID": the `.p12` is missing the private key, or holds the wrong certificate type. Re-export from the Mac that made the request.
- Notarization rejected or auth error: check `APPLE_ID`, `APPLE_APP_PASSWORD` and `APPLE_TEAM_ID`. App-specific passwords can be revoked by Apple.
- Secret empty or unreadable: confirm the secret is in the `mac-signing` environment and the run is on `main` or a `v*` tag; other branches cannot read it by design.

## What the CEO does by hand

Everything involving the Apple account and certificate: steps 1 to 3, and the optional revoke in step 6. Agents never handle certificates or Apple credentials. Agents can run steps 4 and 5 once the secrets are updated.
