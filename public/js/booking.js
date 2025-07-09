// Booking System
class BookingManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.selectedDate = null;
        this.selectedTime = null;
        this.availableSlots = [];
        this.lessonTypes = [];
        this.initializeBookingSystem();
    }

    async initializeBookingSystem() {
        await this.loadLessonTypes();
        await this.loadAvailableSlots();
        this.setupBookingForm();
        this.setupCalendar();
    }

    async loadLessonTypes() {
        try {
            const { data, error } = await this.supabase
                .from('lesson_types')
                .select('*')
                .eq('active', true)
                .order('name');

            if (error) throw error;
            this.lessonTypes = data || [];
            this.populateLessonTypes();
        } catch (error) {
            console.error('Error loading lesson types:', error);
        }
    }

    async loadAvailableSlots() {
        try {
            const { data, error } = await this.supabase
                .from('availability_slots')
                .select(`
                    *,
                    instructor:instructor_id (
                        full_name,
                        email
                    )
                `)
                .eq('active', true)
                .order('day_of_week, start_time');

            if (error) throw error;
            this.availableSlots = data || [];
        } catch (error) {
            console.error('Error loading availability slots:', error);
        }
    }

    populateLessonTypes() {
        const lessonTypeSelect = document.getElementById('lesson-type');
        if (lessonTypeSelect) {
            lessonTypeSelect.innerHTML = '<option value="">Select a lesson type</option>';
            this.lessonTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = `${type.name} (${type.duration_minutes} min - $${(type.price_cents / 100).toFixed(2)})`;
                lessonTypeSelect.appendChild(option);
            });
        }
    }

    setupBookingForm() {
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
        }
    }

    setupCalendar() {
        this.renderCalendar();
        
        // Add navigation buttons
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateMonth(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateMonth(1));
    }

    renderCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Calendar header
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        
        const calendarHeader = document.getElementById('calendar-header');
        if (calendarHeader) {
            calendarHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        }

        // Generate calendar grid
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        let calendarHTML = '<div class="calendar-grid">';
        
        // Day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            calendarHTML += `<div class="calendar-day-header">${day}</div>`;
        });

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const dayOfWeek = date.getDay();
            const hasAvailability = this.hasAvailabilityForDay(dayOfWeek);
            const isPast = date < now.setHours(0, 0, 0, 0);
            
            let dayClass = 'calendar-day';
            if (hasAvailability && !isPast) dayClass += ' available';
            if (isPast) dayClass += ' past';
            
            calendarHTML += `<div class="${dayClass}" data-date="${date.toISOString().split('T')[0]}" onclick="bookingManager.selectDate('${date.toISOString().split('T')[0]}')">${day}</div>`;
        }

        calendarHTML += '</div>';
        calendarEl.innerHTML = calendarHTML;
    }

    hasAvailabilityForDay(dayOfWeek) {
        return this.availableSlots.some(slot => slot.day_of_week === dayOfWeek);
    }

    selectDate(dateString) {
        this.selectedDate = dateString;
        
        // Update UI
        document.querySelectorAll('.calendar-day').forEach(el => {
            el.classList.remove('selected');
        });
        
        const selectedEl = document.querySelector(`[data-date="${dateString}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }

        // Show available times for selected date
        this.renderAvailableTimes(dateString);
    }

    renderAvailableTimes(dateString) {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay();
        
        const timeSlotsEl = document.getElementById('time-slots');
        if (!timeSlotsEl) return;

        const daySlots = this.availableSlots.filter(slot => slot.day_of_week === dayOfWeek);
        
        if (daySlots.length === 0) {
            timeSlotsEl.innerHTML = '<p>No availability for this day.</p>';
            return;
        }

        let timeSlotsHTML = '<h3>Available Times:</h3><div class="time-slots-grid">';
        
        daySlots.forEach(slot => {
            const startTime = slot.start_time;
            const endTime = slot.end_time;
            
            // Generate 30-minute slots between start and end time
            const slots = this.generateTimeSlots(startTime, endTime);
            
            slots.forEach(timeSlot => {
                timeSlotsHTML += `
                    <button type="button" class="time-slot" 
                            data-time="${timeSlot}" 
                            data-instructor="${slot.instructor_id}"
                            onclick="bookingManager.selectTime('${timeSlot}', '${slot.instructor_id}')">
                        ${timeSlot}
                    </button>
                `;
            });
        });
        
        timeSlotsHTML += '</div>';
        timeSlotsEl.innerHTML = timeSlotsHTML;
    }

    generateTimeSlots(startTime, endTime) {
        const slots = [];
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        let current = new Date(start);
        while (current < end) {
            slots.push(current.toTimeString().substring(0, 5));
            current.setMinutes(current.getMinutes() + 30);
        }
        
        return slots;
    }

    selectTime(timeString, instructorId) {
        this.selectedTime = timeString;
        this.selectedInstructor = instructorId;
        
        // Update UI
        document.querySelectorAll('.time-slot').forEach(el => {
            el.classList.remove('selected');
        });
        
        const selectedEl = document.querySelector(`[data-time="${timeString}"]`);
        if (selectedEl) {
            selectedEl.classList.add('selected');
        }

        // Show booking form
        const bookingFormEl = document.getElementById('booking-form-container');
        if (bookingFormEl) {
            bookingFormEl.style.display = 'block';
        }
    }

    async handleBookingSubmit(event) {
        event.preventDefault();
        
        if (!window.authManager.isAuthenticated()) {
            this.showMessage('Please sign in to book a lesson.', 'error');
            return;
        }

        const form = event.target;
        const formData = new FormData(form);
        
        const booking = {
            student_id: window.authManager.getCurrentUser().id,
            instructor_id: this.selectedInstructor,
            lesson_type_id: formData.get('lesson-type'),
            scheduled_date: this.selectedDate,
            scheduled_time: this.selectedTime,
            notes: formData.get('notes') || null
        };

        // Validate required fields
        if (!booking.lesson_type_id || !booking.scheduled_date || !booking.scheduled_time) {
            this.showMessage('Please select a lesson type, date, and time.', 'error');
            return;
        }

        try {
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Booking...';
            submitBtn.disabled = true;

            // Insert booking
            const { data, error } = await this.supabase
                .from('bookings')
                .insert([booking]);

            if (error) throw error;

            // Success
            this.showMessage('Lesson booked successfully! You will receive a confirmation email.', 'success');
            form.reset();
            
            // Hide booking form
            const bookingFormEl = document.getElementById('booking-form-container');
            if (bookingFormEl) {
                bookingFormEl.style.display = 'none';
            }

            // Reset selections
            this.selectedDate = null;
            this.selectedTime = null;
            this.selectedInstructor = null;

            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;

        } catch (error) {
            console.error('Error booking lesson:', error);
            this.showMessage('There was an error booking your lesson. Please try again.', 'error');
            
            // Reset button
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Book Lesson';
            submitBtn.disabled = false;
        }
    }

    navigateMonth(direction) {
        // Implementation for month navigation
        // This would update the calendar display
        console.log('Navigate month:', direction);
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('booking-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'booking-message';
            messageEl.style.cssText = `
                margin: 20px 0;
                padding: 15px;
                border-radius: 5px;
                font-weight: bold;
                text-align: center;
            `;
            
            // Insert at top of booking section
            const bookingSection = document.getElementById('booking-section');
            if (bookingSection) {
                bookingSection.insertBefore(messageEl, bookingSection.firstChild);
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

// Initialize booking manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.bookingManager = new BookingManager();
});