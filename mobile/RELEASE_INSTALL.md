# Installing a SynergySphere mobile release

The downloadable GitHub Actions artifact is a ZIP file. Extract it first, then transfer the contained `.apk` or `.ipa` file to the phone.

## Android

Open `SynergySphere.apk` on an Android phone and allow installs from the app used to open the file when Android asks. Every new build has a higher Android version code.

To let phones install later builds as updates, configure these repository secrets before starting the workflow:

- `ANDROID_KEYSTORE_BASE64` — your long-lived Android keystore file, Base64 encoded.
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

Without those secrets, the workflow creates a valid first-install APK using a temporary debug signing key. Android will reject it as an update if a SynergySphere app signed with a different key is already installed. Uninstall the previous SynergySphere app first in that case (this removes its on-device data).

## iPhone / iPad

Apple does not allow an IPA to be opened or installed directly from Files. The workflow deliberately creates an unsigned IPA so that Sideloadly can apply your Apple account's device-specific signature.

1. Extract `SynergySphere-unsigned.ipa` from the GitHub artifact ZIP.
2. On a computer, open the IPA in Sideloadly and sign/install it using the Apple account intended for that phone.
3. On the phone, trust the developer profile if iOS prompts you to do so.

For direct installation without Sideloadly, the app must instead be distributed through TestFlight, the App Store, or an Apple Developer Enterprise/Ad Hoc profile that contains the target device UDID.
