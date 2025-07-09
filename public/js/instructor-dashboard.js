// Instructor Dashboard Manager
class InstructorDashboard {
    constructor() {
        this.supabase = window.supabaseClient;
        this.currentUser = null;
        this.availability = [];
        this.bookings = [];
        this.initializeDashboard();
    }

    async initializeDashboard() {
        // Wait for auth to be ready
        await this.waitForAuth();
        
        // Check if user is instructor
        if (!this.isInstructor()) {
            this.showNotAuthorized();
            return;
        }

        this.showInstructorContent();
        this.setupEventListeners();
        await this.loadAvailability();
        await this.loadBookings();
    }

    async waitForAuth() {
        // Wait for auth manager to be ready
        while (!window.authManager) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Wait for user to be loaded
        let attempts = 0;
        while (!window.authManager.getCurrentUser() && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        this.currentUser = window.authManager.getCurrentUser();
    }

    isInstructor() {
        // For now, we'll assume any authenticated user can be an instructor
        // In a real app, you'd check the user's role from the profiles table
        return this.currentUser !== null;
    }

    showNotAuthorized() {
        document.getElementById('not-authorized').style.display = 'block';
    }

    showInstructorContent() {
        document.querySelector('.instructor-only').style.display = 'block';
        document.querySelector('.auth-required').style.display = 'block';
    }

    setupEventListeners() {
        const availabilityForm = document.getElementById('availability-form');
        if (availabilityForm) {
            availabilityForm.addEventListener('submit', (e) => this.handleAvailabilitySubmit(e));
        }
    }

    async handleAvailabilitySubmit(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        
        const availability = {
            instructor_id: this.currentUser.id,
            day_of_week: parseInt(formData.get('dayOfWeek')),
            start_time: formData.get('startTime'),
            end_time: formData.get('endTime'),
            active: true
        };

        // Validate times
        if (availability.start_time >= availability.end_time) {
            this.showMessage('End time must be after start time.', 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Adding...';
            submitBtn.disabled = true;

            // Insert availability
            const { data, error } = await this.supabase
                .from('availability_slots')
                .insert([availability]);

            if (error) throw error;

            // Success
            this.showMessage('Availability added successfully!', 'success');
            form.reset();
            await this.loadAvailability();

            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error('Error adding availability:', error);
            this.showMessage('Error adding availability. Please try again.', 'error');
            
            // Reset button
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Add Availability';
            submitBtn.disabled = false;
        }
    }

    async loadAvailability() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('availability_slots')
                .select('*')
                .eq('instructor_id', this.currentUser.id)
                .eq('active', true)
                .order('day_of_week, start_time');

            if (error) throw error;

            this.availability = data || [];
            this.renderAvailability();
        } catch (error) {
            console.error('Error loading availability:', error);
            this.showMessage('Error loading availability.', 'error');
        }
    }

    renderAvailability() {
        const container = document.getElementById('availability-list');
        if (!container) return;

        if (this.availability.length === 0) {
            container.innerHTML = '<p>No availability slots set up yet.</p>';
            return;
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        let html = '';
        this.availability.forEach(slot => {
            html += `
                <div class="availability-item">
                    <div class="availability-info">
                        <strong>${dayNames[slot.day_of_week]}</strong><br>
                        ${slot.start_time} - ${slot.end_time}
                    </div>
                    <div class="availability-actions">
                        <button class="btn btn-danger" onclick="instructorDashboard.deleteAvailability('${slot.id}')">
                            Delete
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async deleteAvailability(id) {
        if (!confirm('Are you sure you want to delete this availability slot?')) {
            return;
        }

        try {
            const { error } = await this.supabase
                .from('availability_slots')
                .update({ active: false })
                .eq('id', id);

            if (error) throw error;

            this.showMessage('Availability slot deleted.', 'success');
            await this.loadAvailability();
        } catch (error) {
            console.error('Error deleting availability:', error);
            this.showMessage('Error deleting availability slot.', 'error');
        }
    }

    async loadBookings() {
        if (!this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('bookings')
                .select(`
                    *,
                    student:student_id (
                        full_name,
                        email
                    ),
                    lesson_type:lesson_type_id (
                        name,
                        duration_minutes
                    )
                `)
                .eq('instructor_id', this.currentUser.id)
                .order('scheduled_date', { ascending: false });

            if (error) throw error;

            this.bookings = data || [];
            this.renderBookings();
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showMessage('Error loading bookings.', 'error');
        }
    }

    renderBookings() {
        const container = document.getElementById('bookings-list');
        if (!container) return;

        if (this.bookings.length === 0) {
            container.innerHTML = '<p>No bookings yet.</p>';
            return;
        }

        let html = '';
        this.bookings.forEach(booking => {
            const date = new Date(booking.scheduled_date).toLocaleDateString();
            const studentName = booking.student?.full_name || 'Unknown Student';
            const lessonType = booking.lesson_type?.name || 'Unknown Lesson';
            
            html += `
                <div class="booking-item ${booking.status}">
                    <div class="booking-info">
                        <strong>${studentName}</strong><br>
                        ${lessonType} - ${date} at ${booking.scheduled_time}<br>
                        <span class="status-badge status-${booking.status}">${booking.status}</span>
                        ${booking.notes ? `<br><small>Notes: ${booking.notes}</small>` : ''}
                    </div>
                    <div class="booking-actions">
                        ${booking.status === 'pending' ? `
                            <button class="btn" onclick="instructorDashboard.updateBookingStatus('${booking.id}', 'confirmed')">
                                Confirm
                            </button>
                            <button class="btn btn-danger" onclick="instructorDashboard.updateBookingStatus('${booking.id}', 'cancelled')">
                                Cancel
                            </button>
                        ` : ''}
                        ${booking.status === 'confirmed' ? `
                            <button class="btn" onclick="instructorDashboard.updateBookingStatus('${booking.id}', 'completed')">
                                Mark Complete
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async updateBookingStatus(id, status) {
        try {
            const { error } = await this.supabase
                .from('bookings')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            this.showMessage(`Booking ${status} successfully.`, 'success');
            await this.loadBookings();
        } catch (error) {
            console.error('Error updating booking status:', error);
            this.showMessage('Error updating booking status.', 'error');
        }
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('dashboard-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'dashboard-message';
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
}

// Initialize instructor dashboard
document.addEventListener('DOMContentLoaded', () => {
    window.instructorDashboard = new InstructorDashboard();
});