-- Supabase Database Schema for Otter English

-- Enable RLS (Row Level Security)
--ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id)
);

-- Create lesson types table
CREATE TABLE IF NOT EXISTS lesson_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    price_cents INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability slots table (for instructor scheduling)
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    instructor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_type_id UUID REFERENCES lesson_types(id),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_availability_slots_instructor_day ON availability_slots(instructor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_instructor_id ON bookings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_lesson_type_id ON bookings(lesson_type_id);
-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: Users can read their own profile, instructors/admins can read all
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING ((auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING ((auth.uid()) = id);

CREATE POLICY "Instructors can read all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role IN ('instructor', 'admin')
        )
    );

-- Contact submissions: Anyone can insert, only admins/instructors can read
CREATE POLICY "Anyone can submit contact form" ON contact_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Instructors can read contact submissions" ON contact_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role IN ('instructor', 'admin')
        )
    );

CREATE POLICY "Instructors can update contact submissions" ON contact_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role IN ('instructor', 'admin')
        )
    );

-- Lesson types: Everyone can read, only admins can modify
CREATE POLICY "Anyone can read lesson types" ON lesson_types
    FOR SELECT USING (active = true);

CREATE POLICY "Admins can insert lesson types" ON lesson_types
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update lesson types" ON lesson_types
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete lesson types" ON lesson_types
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role = 'admin'
        )
    );

-- Availability slots: Everyone can read, only instructors can manage their own
CREATE POLICY "Anyone can read availability slots" ON availability_slots
    FOR SELECT USING (active = true);
  
CREATE POLICY "Instructors can insert availability" ON availability_slots
    FOR INSERT WITH CHECK (
        (auth.uid()) = instructor_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can update availability" ON availability_slots
    FOR UPDATE USING (
        (auth.uid()) = instructor_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can delete availability" ON availability_slots
    FOR DELETE USING (
        (auth.uid()) = instructor_id OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = (auth.uid()) 
            AND role = 'admin'
        )
    );

-- Bookings: Users can read their own bookings, instructors can read their assigned bookings
CREATE POLICY "Students can read own bookings" ON bookings
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Instructors can read assigned bookings" ON bookings
    FOR SELECT USING (auth.uid() = instructor_id);

CREATE POLICY "Students can create bookings" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own bookings" ON bookings
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Instructors can update assigned bookings" ON bookings
    FOR UPDATE USING (auth.uid() = instructor_id);

-- Insert default lesson types
INSERT INTO lesson_types (name, description, duration_minutes, price_cents) VALUES
    ('IELTS Preparation', 'Intensive IELTS exam preparation', 60, 5000),
    ('TOEFL Preparation', 'TOEFL exam preparation and practice', 60, 5000),
    ('EIKEN Preparation', 'EIKEN test preparation', 45, 4000),
    ('Business English', 'Professional English for business contexts', 60, 5500),
    ('Conversation Practice', 'Casual conversation practice', 30, 3000),
    ('Grammar Focus', 'Focused grammar lessons', 45, 4000)
ON CONFLICT DO NOTHING;

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search_path to empty for security
    SET search_path = '';
    
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set search_path to empty for security
    SET search_path = '';
    
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
