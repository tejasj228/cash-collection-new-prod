# Patient photos

The patient-detail banner and its enlarged photo view consume `patient.photoUrl` (`string | null`). Each URL must identify the photo for that patient's CR number. The proposed optional API field is `photo_url`; omitted, null or blank values mean no photo and show the existing avatar.

The dedicated photo endpoint URL, response shape and authentication contract are pending. No endpoint, ticket or patient-photo lookup has been invented. When provided, connect it through the existing session-aware service layer and resolve it into `photoUrl`; do not expose SSO tickets in image URLs or persist patient photos.

For local development only, the runtime decorates successfully loaded patients with the user-supplied `src/mocks/prototype-patient-photo.png`. It does not create patients, replace failed API requests or override a real `photoUrl`. The conditional development import keeps this sample image out of production builds. Production displays only patient-specific API photos or the existing avatar.
