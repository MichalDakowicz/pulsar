/**
 * Every word the QR sign-in screens say, in pulsar's voice (PING.md §9.14). The one
 * file in features/auth/qr that is not identical across the family: the screens are
 * the same everywhere, the voice is not.
 */
export const APP_NAME = 'pulsar';

/** The shape every app's copy takes, so the components can be identical. */
export type QrCopy = typeof QR_COPY;

export const QR_COPY = {
  // Settings
  showRowTitle: 'sign in another device',
  showRowSub: 'show a code for a signed-out phone to scan',
  scanRowTitle: 'scan a code',
  scanRowSub: 'let a browser or another phone in, once you have checked it is them',

  // Sign-in screen
  loginScan: 'sign in with a qr code',
  loginShowOnWeb: 'sign in with your phone',
  webTitle: 'scan this with a signed-in ping app',
  webHelp: `open ${APP_NAME} on your phone, then settings → scan a code. radar, lidar, sonar, pulsar and cellar all work.`,

  // The two screens
  scanTitle: 'scan a code',
  showTitle: 'sign in another device',
  scanHintSignedIn: 'point the camera at the code on the screen you want to sign in.',
  scanHintSignedOut:
    'point the camera at the code on your signed-in phone. it is under settings → sign in another device.',
  showHint: `on the other phone, open ${APP_NAME} or any ping app and choose sign in with a qr code.`,
  checking: 'checking the code…',
  gettingCode: 'getting a code…',
  signingIn: 'signing you in…',

  // The camera
  cameraNeeded: `${APP_NAME} needs the camera to scan a sign-in code.`,
  cameraOff: `camera access is off for ${APP_NAME}. turn it on in your system settings.`,
  cameraAllow: 'allow camera',

  // A real Ping code, scanned by the wrong side
  scannedPhoneCodeWhileSignedIn: 'that code signs in another phone. scan it from that phone’s sign-in screen.',
  scannedBrowserCodeWhileSignedOut: 'sign in on this phone first, then scan the browser’s code.',

  // The match code
  matchCode: 'match code',
  matchHelpShowing: 'the screen you are signing in should show the same two digits.',
  matchHelpWaiting: 'your signed-in phone should show the same two digits. check, then approve there.',

  // The approving screen: the defence, so it says what it knows and what it does not
  approveTitle: 'is this you signing in?',
  approveWarning: 'if the digits are not the same, or you did not start this, decline.',
  saysItIs: 'says it is',
  seenFrom: 'seen from',
  unknownCountry: 'somewhere unknown',
  approve: 'approve',
  decline: 'decline',
  secondsLeft: (seconds: number) => `${seconds}s left`,

  // Waiting, on the side being signed in
  waitingTitle: 'waiting for approval',

  // Endings
  approvedTitle: 'signed in',
  approvedBody: 'that device is signing in now.',
  declinedTitle: 'declined',
  declinedBody: 'nothing was signed in.',
  deniedTitle: 'declined',
  deniedBody: 'the other phone said no.',
  expiredTitle: 'that code ran out',
  expiredBody: 'codes only last a minute. get a new one and try again.',
  failedTitle: 'that did not work',
  failedBody: 'something went wrong. try again.',
  tryAgain: 'try again',
  newCode: 'show a new code',
  scanAnother: 'scan another',
  done: 'done',
  cancel: 'cancel',
  back: 'back',
};
