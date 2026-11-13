# Daily Life Bridge (Android)

A small Android companion that forwards **new notification previews only** from selected messaging apps to the existing private Daily Life text inbox.

## Set up

1. In Daily Life, open **Texts · private inbox** and create a phone connection. Copy the one-time token.
2. Build and install this Android project (Android Studio: open the `android-bridge` folder, let Gradle sync, then Run).
3. Paste the token, choose which apps may forward notifications, save, then enable **Notification access** for Daily Life Bridge in Android Settings.
4. Send a test message to the phone and check the Daily Life text inbox.

The token is stored with Android encrypted preferences. The app sends only notification title/body text that Android exposes, plus the package name and a deduplication ID. It does not read message history, MMS media, contacts, or notification actions. Uncheck apps or revoke the connection in Daily Life to stop forwarding.

## Limits

- Android must expose a preview in the notification. Apps with previews hidden, silent notifications without text, and MMS attachments cannot be forwarded.
- Android may stop background services; reopen the bridge if forwarding pauses.
- The GitHub Actions build creates a downloadable debug APK artifact. Download the `daily-life-bridge-debug` artifact from the repository Actions run, unzip it, and install `app-debug.apk` on your Android phone. Android may ask you to allow installs from the browser or file manager you use.
- Review applicable workplace rules and let people know when their conversation may appear in notifications.

## Security

The one-time token is a bearer secret. Keep it private. Revoke it from the Daily Life inbox if the phone is lost or the token is exposed. Message previews are sent over HTTPS and remain in the private inbox until deleted.
