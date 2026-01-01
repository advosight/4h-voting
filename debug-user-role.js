// Debug script to check current user role and update if needed
// Run this in the browser console on your app

async function debugUserRole() {
  try {
    // Get current user from Amplify
    const { getCurrentUser } = await import('aws-amplify/auth');
    const currentUser = await getCurrentUser();
    
    console.log('Current User Info:', {
      userId: currentUser.userId,
      username: currentUser.username,
      signInDetails: currentUser.signInDetails,
      attributes: currentUser.attributes
    });
    
    // Check custom attributes
    if (currentUser.attributes) {
      console.log('Custom Role:', currentUser.attributes['custom:role']);
      console.log('Judge ID:', currentUser.attributes['custom:judgeId']);
    }
    
    return currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
  }
}

// Call the function
debugUserRole();