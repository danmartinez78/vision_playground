/** True on phones and tablets, where a finger is the pointer. */
export const TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
