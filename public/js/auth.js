// Authentication and User Management
class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
        this.initializeAuth();
    }

    async initializeAuth() {
        // Check if user is already logged in
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
            this.currentUser = user;
            this.onAuthStateChange(user);
        }

        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            this.onAuthStateChange(this.currentUser);
        });
    }

    onAuthStateChange(user) {
        // Update UI based on auth state
        const authElements = document.querySelectorAll('.auth-required');
        const guestElements = document.querySelectorAll('.guest-only');
        
        if (user) {
            authElements.forEach(el => el.style.display = 'block');
            guestElements.forEach(el => el.style.display = 'none');
            this.updateUserInfo(user);
        } else {
            authElements.forEach(el => el.style.display = 'none');
            guestElements.forEach(el => el.style.display = 'block');
        }
    }

    async signUp(email, password, fullName) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });

            if (error) throw error;

            // Show success message
            this.showMessage('Please check your email to verify your account!', 'success');
            return { success: true, data };
        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            this.showMessage('Welcome back!', 'success');
            return { success: true, data };
        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error };
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            
            this.showMessage('You have been signed out.', 'info');
            return { success: true };
        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error };
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            
            this.showMessage('Password reset email sent!', 'success');
            return { success: true };
        } catch (error) {
            this.showMessage(error.message, 'error');
            return { success: false, error };
        }
    }

    updateUserInfo(user) {
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        userNameElements.forEach(el => {
            el.textContent = user.user_metadata?.full_name || user.email;
        });
        
        userEmailElements.forEach(el => {
            el.textContent = user.email;
        });
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('auth-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'auth-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(messageEl);
        }

        // Set message and style based on type
        messageEl.textContent = message;
        messageEl.className = `message message-${type}`;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8',
            warning: '#ffc107'
        };
        
        messageEl.style.backgroundColor = colors[type] || colors.info;
        messageEl.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }

    // Utility method to check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Initialize auth manager
window.authManager = new AuthManager();