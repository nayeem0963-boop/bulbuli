// Every picture in src/assets/avatars/, bundled by Vite: { '../assets/avatars/animals/leo.webp': url }.
// Shared by PlayerAvatar (on screen) and the certificate / share-image painters (on a canvas).
const IMAGES = import.meta.glob('../assets/avatars/**/*.{webp,png,jpg,svg}', { eager: true, import: 'default' })

/** The bundled image URL for an 'image' avatar, or undefined. */
export const avatarImageUrl = (avatar) => (avatar?.image ? IMAGES[`../assets/avatars/${avatar.image}`] : undefined)
