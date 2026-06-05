/**
 * Map Firebase error codes to user-friendly messages
 */
export function getAuthErrorMessage(error) {
  const code = error.code || '';
  
  const errorMap = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'This email is already registered. Please sign in or use a different email.',
    'auth/weak-password': 'Password should be at least 6 characters long.',
    'auth/invalid-credential': 'Invalid email or password. Please check and try again.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
    'auth/account-exists-with-different-credential': 'An account already exists with this email using a different sign-in method.',
    'auth/operation-not-allowed': 'Sign up is temporarily unavailable. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  };
  
  return errorMap[code] || error.message || 'An error occurred. Please try again.';
}
