// Contact Form Handler
class ContactManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.initializeContactForm();
    }

    initializeContactForm() {
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => this.handleContactSubmit(e));
        }
    }

    async handleContactSubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const submission = {
            name: formData.get('name'),
            email: formData.get('email') || formData.get('_replyto'),
            message: formData.get('message')
        };

        // Validate form data
        if (!submission.name || !submission.email || !submission.message) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Validate email format
        if (!this.isValidEmail(submission.email)) {
            this.showMessage('Please enter a valid email address.', 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            // Insert into database
            const { data, error } = await this.supabase
                .from('contact_submissions')
                .insert([submission]);

            if (error) throw error;

            // Success
            this.showMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
            form.reset();

            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error('Error submitting contact form:', error);
            this.showMessage('There was an error sending your message. Please try again.', 'error');
            
            // Reset button
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Send ➤';
            submitBtn.disabled = false;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('contact-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'contact-message';
            messageEl.style.cssText = `
                margin: 20px 0;
                padding: 15px;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
            `;
            
            // Insert after form
            const form = document.getElementById('contact-form');
            if (form) {
                form.parentNode.insertBefore(messageEl, form.nextSibling);
            }
        }

        // Set message and style based on type
        messageEl.textContent = message;
        messageEl.className = `message message-${type}`;
        
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            info: '#d1ecf1',
            warning: '#fff3cd'
        };
        
        const textColors = {
            success: '#155724',
            error: '#721c24',
            info: '#0c5460',
            warning: '#856404'
        };
        
        messageEl.style.backgroundColor = colors[type] || colors.info;
        messageEl.style.color = textColors[type] || textColors.info;
        messageEl.style.display = 'block';

        // Auto-hide after 8 seconds
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 8000);
    }
}

// Initialize contact manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.contactManager = new ContactManager();
});