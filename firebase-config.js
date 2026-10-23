/* ============================================================================
   NOVA CHAT — FIREBASE CONFIGURATION  (the whole "Firebase console" lives here)
   ----------------------------------------------------------------------------
   1. Go to https://console.firebase.google.com  ->  Add project.
   2. Build -> Authentication -> Get started -> enable:  Email/Password  and  Google.
   3. Build -> Firestore Database -> Create database (start in production mode),
      then paste the RULES below into the "Rules" tab and Publish.
   4. Project settings -> General -> "Your apps" -> Web app (</>) -> copy the config
      values and paste them into FIREBASE_CONFIG below.
   5. Authentication -> Settings -> Authorized domains: add the domain you host on
      (localhost is already allowed). Google sign-in needs http(s), not file://.
   6. OPTIONAL: enable Storage (Blaze plan) and set USE_FIREBASE_STORAGE = true for
      big videos / images. Without Storage, media is stored inline in Firestore
      (images are auto-compressed; files must stay under ~700 KB).

   Until you replace the placeholder values, the app runs in built-in DEMO MODE
   (everything stored in your browser, with friendly bot contacts).

   ---------------------------- FIRESTORE RULES -------------------------------
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && request.auth.uid == uid;
       }
       match /chats/{chatId} {
         allow read, create, update: if request.auth != null;   // invite-link joins need this
         allow delete: if false;
         match /messages/{mid} {
           allow read, create, update: if request.auth != null;
           allow delete: if false;
         }
       }
       match /statuses/{id} { allow read, create, update: if request.auth != null;
                              allow delete: if request.auth != null && resource.data.uid == request.auth.uid; }
       match /calls/{id}    { allow read, create, update: if request.auth != null; }
     }
   }
   ========================================================================== */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDJds7YtmPb1eiwSXKD_rbChZZ79Re4m4Y",
  authDomain: "chat-d34f1.firebaseapp.com",
  databaseURL: "https://chat-d34f1-default-rtdb.firebaseio.com",
  projectId: "chat-d34f1",
  storageBucket: "chat-d34f1.firebasestorage.app",
  messagingSenderId: "431049338103",
  appId: "1:431049338103:web:c005b827913fd2d92377f2",
  measurementId: "G-79GRPR99J0"
};

window.USE_FIREBASE_STORAGE = false; // true only if Storage is enabled in your project
window.FORCE_DEMO = false;           // true = always use Demo mode, even with a valid config
window.SESSION_PER_TAB = false;  // true = every browser tab has its own login (handy for testing two users in one browser).
                                 // false (recommended for real use) = login is shared by all tabs and survives closing the tab.
